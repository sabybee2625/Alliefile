"""
Email sending via Resend.
Non-blocking helpers intended to be used with FastAPI BackgroundTasks.
"""
import os
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    logger.warning("resend SDK not installed; email sending disabled")
    RESEND_AVAILABLE = False

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "bonjour@alliefile.com")
SENDER_NAME = os.environ.get("SENDER_NAME", "AlliéFile")
APP_URL = os.environ.get("APP_PUBLIC_URL", "https://alliefile.com")


def _configure():
    """Load API key lazily so late-loaded env vars are picked up."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        return False
    if RESEND_AVAILABLE:
        resend.api_key = api_key
        return True
    return False


def _welcome_html(name: str) -> str:
    safe_name = (name or "").strip() or "à toi"
    return f"""\
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:4px;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:32px 40px 16px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#0f172a;width:32px;height:32px;border-radius:4px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:bold;">A</td>
                    <td style="padding-left:10px;font-weight:bold;font-size:18px;color:#0f172a;">AlliéFile</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 0 40px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#0f172a;">Bienvenue {safe_name} 👋</h1>
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#475569;">
                  Merci d'avoir rejoint <strong>AlliéFile</strong>, votre allié juridique intelligent.
                </p>
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#475569;">
                  Vous pouvez dès maintenant créer votre premier dossier, y ajouter vos pièces (contrats, factures, courriers, photos) et laisser notre IA les analyser, classer et structurer pour vous.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
                  Tout est gratuit pour commencer : un dossier, jusqu'à 15 pièces, et un export PDF pour partager le résultat à votre avocat ou votre association.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
                  <tr>
                    <td style="background-color:#0f172a;border-radius:4px;">
                      <a href="{APP_URL}/dashboard" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Accéder à mon tableau de bord</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#64748b;">
                  Une question ? Répondez simplement à cet email, nous lisons chaque message.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 32px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                  Vous recevez ce message car un compte AlliéFile a été créé avec cette adresse.<br>
                  AlliéFile — Votre allié juridique intelligent
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _send_sync(to_email: str, subject: str, html: str) -> Optional[str]:
    if not _configure():
        logger.info("Skipping email send: RESEND_API_KEY not configured or SDK missing")
        return None
    try:
        params = {
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        result = resend.Emails.send(params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info(f"Resend email sent to {to_email} id={email_id}")
        return email_id
    except Exception as e:
        logger.error(f"Resend email failed to {to_email}: {e}")
        return None


async def send_welcome_email(to_email: str, name: str) -> None:
    """Fire-and-forget welcome email. Runs sync SDK in a thread."""
    try:
        await asyncio.to_thread(
            _send_sync,
            to_email,
            "Bienvenue sur AlliéFile",
            _welcome_html(name),
        )
    except Exception as e:
        # Never block registration on email failure
        logger.error(f"send_welcome_email unexpected error: {e}")


def send_welcome_email_background(to_email: str, name: str) -> None:
    """Synchronous wrapper for FastAPI BackgroundTasks."""
    _send_sync(to_email, "Bienvenue sur AlliéFile", _welcome_html(name))


def _reset_html(name: str, reset_url: str) -> str:
    safe_name = (name or "").strip() or "à toi"
    return f"""\
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:4px;border:1px solid #e2e8f0;">
          <tr><td style="padding:32px 40px 16px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#0f172a;width:32px;height:32px;border-radius:4px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:bold;">A</td>
                <td style="padding-left:10px;font-weight:bold;font-size:18px;color:#0f172a;">AlliéFile</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:8px 40px 0 40px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">Réinitialisation du mot de passe</h1>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#475569;">
              Bonjour {safe_name},
            </p>
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#475569;">
              Vous avez demandé à réinitialiser le mot de passe de votre compte AlliéFile.
              Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 24px 0;">
              <tr><td style="background-color:#0f172a;border-radius:4px;">
                <a href="{reset_url}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Réinitialiser mon mot de passe</a>
              </td></tr>
            </table>
            <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#64748b;word-break:break-all;">
              Ou copiez ce lien : {reset_url}
            </p>
            <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
              Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message — votre mot de passe restera inchangé.
            </p>
          </td></tr>
          <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">AlliéFile — Votre allié juridique intelligent</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
"""


def send_password_reset_email_background(to_email: str, name: str, reset_url: str) -> None:
    """Synchronous wrapper for FastAPI BackgroundTasks."""
    _send_sync(to_email, "Réinitialisation de votre mot de passe AlliéFile", _reset_html(name, reset_url))
