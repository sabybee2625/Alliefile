import os
from typing import List, Optional
from fastapi import HTTPException, Depends
from security import get_current_user

# Liste des emails administrateurs configurés via variables d'environnement
ADMIN_EMAILS_ENV = os.environ.get("ADMIN_EMAILS", "").split(",")
# Email administrateur hardcoded pour garantir l'accès
HARDCODED_ADMIN = "sabrina.harmin@gmail.com"

def is_admin(user: dict) -> bool:
    """
    Vérifie si l'utilisateur actuel a des droits d'administration.
    Autorise l'email hardcoded ou les emails définis dans ADMIN_EMAILS.
    """
    if not user or "email" not in user:
        return False
    
    user_email = user["email"].lower().strip()
    
    # Vérification de l'email hardcoded
    if user_email == HARDCODED_ADMIN.lower().strip():
        return True
        
    # Vérification des emails dans les variables d'environnement
    admin_emails = [email.lower().strip() for email in ADMIN_EMAILS_ENV if email.strip()]
    if user_email in admin_emails:
        return True
        
    return False

async def admin_required(user: dict = Depends(get_current_user)):
    """
    Dépendance FastAPI pour restreindre l'accès aux administrateurs uniquement.
    """
    if not is_admin(user):
        raise HTTPException(
            status_code=403, 
            detail="Accès refusé : droits d'administration requis."
        )
    return user
