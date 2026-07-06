"""
Purge automatique des comptes soft-deleted et scheduled-deletion
au-delà de 90 jours.
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


async def run_deletion_purge(db, storage=None):
    """
    Purge définitive des utilisateurs :
      - soft-deleted (deleted_at) depuis > 90 jours
      - scheduled_deletion arrivé à échéance
    Efface user + dossiers + pièces + fichiers GridFS + share_links + payment_transactions.
    """
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=90)).isoformat()
    now_iso = now.isoformat()

    query = {
        "$or": [
            {"deleted_at": {"$lte": cutoff}},
            {"scheduled_deletion": {"$lte": now_iso}},
        ]
    }

    purged = 0
    async for user in db.users.find(query, {"_id": 0}):
        user_id = user["id"]
        dossier_ids = [d["id"] async for d in db.dossiers.find({"user_id": user_id}, {"id": 1})]

        # Fichiers GridFS
        if storage and dossier_ids:
            pieces = await db.pieces.find({"dossier_id": {"$in": dossier_ids}}, {"_id": 0, "filename": 1}).to_list(20000)
            for p in pieces:
                try:
                    await storage.delete_file(p["filename"])
                except Exception as e:
                    logger.warning(f"Purge: file delete failed {p.get('filename')}: {e}")

        if dossier_ids:
            await db.pieces.delete_many({"dossier_id": {"$in": dossier_ids}})
            await db.share_links.delete_many({"dossier_id": {"$in": dossier_ids}})
            await db.dossiers.delete_many({"user_id": user_id})
        await db.payment_transactions.delete_many({"user_id": user_id})
        await db.users.delete_one({"id": user_id})
        purged += 1
        logger.info(f"[Purge] user={user_id} email={user.get('email')} deleted_by={user.get('deleted_by')} definitive")

    logger.info(f"Deletion purge: {purged} users definitively deleted")
    return purged
