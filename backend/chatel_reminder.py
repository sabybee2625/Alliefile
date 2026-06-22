"""
Vérification quotidienne de l'obligation d'information loi Chatel
(article L215-1 du Code de la consommation) pour les abonnements annuels.
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta

from emailing import send_chatel_reminder_email_sync

logger = logging.getLogger(__name__)

PLAN_NAMES = {"standard": "Essentiel", "premium": "Sérénité"}


def _format_fr(dt: datetime) -> str:
    return dt.strftime("%d/%m/%Y")


async def run_chatel_reminder_check(db):
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(days=30)
    window_end = now + timedelta(days=90)

    query = {
        "plan": {"$in": ["standard", "premium"]},
        "plan_status": "active",
        "chatel_reminder_sent": {"$ne": True},
    }

    count_checked = 0
    count_sent = 0

    async for user in db.users.find(query, {"_id": 0}):
        expires_at = user.get("plan_expires_at") or user.get("current_period_end")
        if not expires_at:
            continue
        try:
            renewal_date = datetime.fromisoformat(expires_at)
        except ValueError:
            continue
        if renewal_date.tzinfo is None:
            renewal_date = renewal_date.replace(tzinfo=timezone.utc)

        count_checked += 1
        if not (window_start <= renewal_date <= window_end):
            continue

        plan_name = PLAN_NAMES.get(user.get("plan"), user.get("plan", ""))
        deadline = renewal_date - timedelta(days=1)

        try:
            await asyncio.to_thread(
                send_chatel_reminder_email_sync,
                user["email"],
                user.get("name", ""),
                plan_name,
                _format_fr(renewal_date),
                _format_fr(deadline),
            )
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"chatel_reminder_sent": True}},
            )
            count_sent += 1
        except Exception as e:
            logger.error(f"Chatel reminder failed for user {user['id']}: {e}")

    logger.info(f"Chatel reminder check: {count_checked} checked, {count_sent} sent")
