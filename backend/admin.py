"""
Admin routes for AlliéFile.
Gated by ADMIN_EMAILS env var (comma-separated list of emails).
"""
import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_emails() -> set:
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def is_admin(user: dict) -> bool:
    # Hardcoded super-admin (toujours autorisé, en plus de ADMIN_EMAILS)
    HARDCODED_ADMINS = {"sabrina.harmin@gmail.com"}
    email = (user.get("email") or "").lower()
    if email in HARDCODED_ADMINS:
        return True
    emails = _admin_emails()
    if not emails:
        return False
    return email in emails


def require_admin_factory(get_current_user):
    """Build the dependency closure (server.py injects its own get_current_user)."""
    async def _require_admin(user: dict = Depends(get_current_user)):
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        return user
    return _require_admin


# ============ MODELS ============

class AdminStats(BaseModel):
    total_users: int
    users_by_plan: dict
    total_dossiers: int
    total_pieces: int
    total_revenue_eur: float
    transactions_paid: int
    transactions_pending: int
    promo_codes_count: int


class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: Optional[int] = None
    discount_amount: Optional[float] = None
    max_uses: int = -1
    expires_at: Optional[str] = None
    plan_restriction: Optional[str] = None


class UserAdminResponse(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    plan_status: Optional[str] = None
    plan_expires_at: Optional[str] = None
    created_at: str
    # V2 audit
    dossier_count: int = 0
    total_paid_eur: float = 0.0
    promo_code_used: Optional[str] = None
    scheduled_deletion: Optional[str] = None
    deleted_at: Optional[str] = None
    deleted_by: Optional[str] = None   # 'self' | 'admin' | None
    deletion_reason: Optional[str] = None


def register_admin_routes(api_router, db, get_current_user):
    """Attach admin routes to the provided API router."""
    require_admin = require_admin_factory(get_current_user)

    @api_router.get("/admin/stats", response_model=AdminStats)
    async def admin_stats(_: dict = Depends(require_admin)):
        users = await db.users.count_documents({})
        dossiers = await db.dossiers.count_documents({})
        pieces = await db.pieces.count_documents({})
        promos = await db.promo_codes.count_documents({})

        # Breakdown par plan
        pipeline = [{"$group": {"_id": "$plan", "count": {"$sum": 1}}}]
        plan_counts = {}
        async for row in db.users.aggregate(pipeline):
            plan_counts[row["_id"] or "free"] = row["count"]

        # Revenue
        revenue = 0.0
        paid_count = 0
        pending_count = 0
        async for tx in db.payment_transactions.find({}, {"_id": 0, "status": 1, "amount": 1}):
            if tx.get("status") == "paid":
                revenue += float(tx.get("amount", 0))
                paid_count += 1
            elif tx.get("status") == "pending":
                pending_count += 1

        return AdminStats(
            total_users=users,
            users_by_plan=plan_counts,
            total_dossiers=dossiers,
            total_pieces=pieces,
            total_revenue_eur=round(revenue, 2),
            transactions_paid=paid_count,
            transactions_pending=pending_count,
            promo_codes_count=promos,
        )

    @api_router.get("/admin/users", response_model=List[UserAdminResponse])
    async def admin_list_users(
        q: Optional[str] = Query(None, description="Filtre par email/nom"),
        plan: Optional[str] = Query(None, description="Filtre par plan"),
        status: Optional[str] = Query(None, description="'active' | 'scheduled' | 'deleted' | 'all' (default 'all')"),
        limit: int = Query(200, le=1000),
        _: dict = Depends(require_admin),
    ):
        query: dict = {}
        if plan:
            query["plan"] = plan
        if q:
            query["$or"] = [
                {"email": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
            ]
        if status == "active":
            query["deleted_at"] = {"$exists": False}
            query["scheduled_deletion"] = {"$exists": False}
        elif status == "scheduled":
            query["scheduled_deletion"] = {"$exists": True}
            query["deleted_at"] = {"$exists": False}
        elif status == "deleted":
            query["deleted_at"] = {"$exists": True}
        # status == 'all' ou None → aucun filtre : l'admin voit TOUT

        users = []
        async for u in db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(limit):
            # Compter les dossiers de cet utilisateur
            dossier_count = await db.dossiers.count_documents({"user_id": u["id"]})

            # Récupérer le total payé + le dernier code promo utilisé
            total_paid = 0.0
            promo_code_used: Optional[str] = None
            async for tx in db.payment_transactions.find(
                {"user_id": u["id"], "status": "paid"},
                {"_id": 0, "amount": 1, "promo_code": 1, "created_at": 1}
            ).sort("created_at", -1):
                total_paid += float(tx.get("amount", 0))
                if promo_code_used is None and tx.get("promo_code"):
                    promo_code_used = tx["promo_code"]

            users.append(UserAdminResponse(
                id=u["id"],
                email=u["email"],
                name=u.get("name", ""),
                plan=u.get("plan", "free"),
                plan_status=u.get("plan_status"),
                plan_expires_at=u.get("plan_expires_at") or u.get("current_period_end"),
                created_at=u.get("created_at", ""),
                dossier_count=dossier_count,
                total_paid_eur=round(total_paid, 2),
                promo_code_used=promo_code_used,
                scheduled_deletion=u.get("scheduled_deletion"),
                deleted_at=u.get("deleted_at"),
                deleted_by=u.get("deleted_by"),
                deletion_reason=u.get("deletion_reason"),
            ))
        return users

    @api_router.patch("/admin/users/{user_id}/plan")
    async def admin_update_user_plan(
        user_id: str,
        plan: str = Body(..., embed=True),
        _: dict = Depends(require_admin),
    ):
        valid = {"free", "standard", "premium", "essentiel", "pro", "serenite"}
        if plan not in valid:
            raise HTTPException(status_code=400, detail=f"Plan invalide. Autorisés: {valid}")
        # Normalize to internal keys
        plan_map = {"essentiel": "standard", "pro": "premium", "serenite": "premium"}
        plan = plan_map.get(plan, plan)

        now = datetime.now(timezone.utc).isoformat()
        update: dict = {"plan": plan, "updated_at": now}
        if plan == "free":
            update["plan_status"] = None
            update["plan_expires_at"] = None
            update["current_period_end"] = None
        else:
            update["plan_status"] = "active"
            # Grant 30 days manually
            from datetime import timedelta
            expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            update["plan_expires_at"] = expires
            update["current_period_end"] = expires

        result = await db.users.update_one({"id": user_id}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"Admin set plan={plan} for user={user_id}")
        return {"ok": True, "plan": plan}

    @api_router.delete("/admin/users/{user_id}")
    async def admin_delete_user(
        user_id: str,
        reason: Optional[str] = Query(None, description="Motif de la suppression (optionnel)"),
        admin_user: dict = Depends(require_admin),
    ):
        """Soft-delete de l'utilisateur : marque deleted_at + deleted_by='admin'.
        Ses données (dossiers, pièces, transactions) restent en base pour audit.
        Une purge automatique les efface définitivement 90 jours plus tard."""
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        now = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "deleted_at": now,
                "deleted_by": "admin",
                "deleted_by_email": (admin_user.get("email") or "").lower(),
                "deletion_reason": reason or "Suppression administrateur",
                "updated_at": now,
            }, "$unset": {"scheduled_deletion": ""}}
        )
        logger.info(f"Admin soft-delete user={user_id} email={user.get('email')} by={admin_user.get('email')}")
        return {"ok": True, "soft_deleted": True, "deleted_at": now}

    @api_router.post("/admin/users/{user_id}/restore")
    async def admin_restore_user(
        user_id: str,
        _: dict = Depends(require_admin),
    ):
        """Restaure un utilisateur soft-deleted (avant purge automatique)."""
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        now = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"id": user_id},
            {"$unset": {
                "deleted_at": "", "deleted_by": "", "deleted_by_email": "",
                "deletion_reason": "", "scheduled_deletion": ""
            }, "$set": {"updated_at": now}}
        )
        logger.info(f"Admin restored user={user_id}")
        return {"ok": True, "restored": True}

    @api_router.get("/admin/promo-codes")
    async def admin_list_promos(_: dict = Depends(require_admin)):
        promos = []
        async for p in db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1):
            promos.append(p)
        return {"promos": promos}

    @api_router.post("/admin/promo-codes", status_code=201)
    async def admin_create_promo(
        data: PromoCodeCreate,
        _: dict = Depends(require_admin),
    ):
        code = data.code.strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="Code requis")
        if data.discount_percent is None and data.discount_amount is None:
            raise HTTPException(status_code=400, detail="Indiquez un % ou un montant de remise")

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "code": code,
            "discount_percent": data.discount_percent or 0,
            "discount_amount": data.discount_amount or 0,
            "max_uses": data.max_uses,
            "uses": 0,
            "expires_at": data.expires_at,
            "plan_restriction": data.plan_restriction,
            "created_at": now,
        }
        try:
            await db.promo_codes.insert_one(doc)
        except Exception as e:
            if "duplicate" in str(e).lower():
                raise HTTPException(status_code=400, detail="Ce code existe déjà")
            raise HTTPException(status_code=500, detail="Erreur lors de la création")
        doc.pop("_id", None)
        return {"ok": True, "promo": doc}

    @api_router.delete("/admin/promo-codes/{code}")
    async def admin_delete_promo(code: str, _: dict = Depends(require_admin)):
        result = await db.promo_codes.delete_one({"code": code.upper()})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Code introuvable")
        return {"ok": True}

    @api_router.get("/admin/transactions")
    async def admin_list_transactions(
        status: Optional[str] = Query(None),
        limit: int = Query(100, le=500),
        _: dict = Depends(require_admin),
    ):
        query: dict = {}
        if status:
            query["status"] = status
        items = []
        async for t in db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit):
            items.append(t)
        return {"transactions": items}

    @api_router.post("/admin/transactions/{tx_id}/mark-paid")
    async def admin_mark_transaction_paid(
        tx_id: str,
        _: dict = Depends(require_admin),
    ):
        """Marquer manuellement une transaction comme payée ET upgrader le user (cas où Stripe a encaissé mais le webhook/polling a échoué)."""
        tx = await db.payment_transactions.find_one({"id": tx_id}, {"_id": 0})
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction introuvable")

        from datetime import timedelta
        now = datetime.now(timezone.utc).isoformat()
        await db.payment_transactions.update_one(
            {"id": tx_id},
            {"$set": {"status": "paid", "updated_at": now, "force_paid_by_admin": True}}
        )

        # Upgrade user plan
        plan_id = tx.get("plan_id")
        user_id = tx.get("user_id")
        billing_period = tx.get("billing_period", "monthly")
        if user_id and plan_id:
            # Normalize public slugs
            plan_map = {"essentiel": "standard", "pro": "premium", "serenite": "premium"}
            plan_id = plan_map.get(plan_id, plan_id)
            days = 365 if billing_period == "yearly" else 30
            expires = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "plan": plan_id,
                    "plan_status": "active",
                    "plan_expires_at": expires,
                    "current_period_end": expires,
                    "updated_at": now,
                }}
            )
        logger.info(f"Admin forced paid tx={tx_id} user={user_id} plan={plan_id}")
        return {"ok": True, "plan": plan_id}

    @api_router.delete("/admin/transactions/{tx_id}")
    async def admin_delete_transaction(
        tx_id: str,
        _: dict = Depends(require_admin),
    ):
        result = await db.payment_transactions.delete_one({"id": tx_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transaction introuvable")
        return {"ok": True}

    @api_router.get("/admin/me")
    async def admin_me(user: dict = Depends(require_admin)):
        return {"email": user["email"], "is_admin": True}

    return api_router
