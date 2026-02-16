"""
Stripe payment integration for SaaS subscriptions
Handles checkout sessions, webhooks, and promo codes
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Import emergentintegrations for Stripe
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionResponse, 
        CheckoutStatusResponse, 
        CheckoutSessionRequest
    )
    STRIPE_AVAILABLE = True
except ImportError:
    logger.warning("emergentintegrations not available, Stripe integration disabled")
    STRIPE_AVAILABLE = False


# ===================== PRICING PLANS =====================

# Fixed server-side pricing (NEVER accept amounts from frontend)
SUBSCRIPTION_PLANS = {
    "standard": {
        "name": "Standard",
        "price_monthly": 9.90,
        "price_yearly": 99.00,
        "currency": "eur",
        "features": [
            "5 dossiers",
            "500 pièces",
            "Export PDF + DOCX",
            "Partage avancé",
            "Assistant illimité"
        ]
    },
    "premium": {
        "name": "Premium",
        "price_monthly": 19.90,
        "price_yearly": 199.00,
        "currency": "eur",
        "features": [
            "Dossiers illimités",
            "Pièces illimitées",
            "Partage sécurisé avancé",
            "Historique complet",
            "Support prioritaire"
        ]
    }
}


# ===================== MODELS =====================

class CreateCheckoutRequest(BaseModel):
    plan_id: str = Field(..., description="Plan ID: 'standard' or 'premium'")
    billing_period: str = Field("monthly", description="'monthly' or 'yearly'")
    promo_code: Optional[str] = Field(None, description="Optional promo code")


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PaymentTransaction(BaseModel):
    id: str
    user_id: str
    user_email: str
    session_id: str
    plan_id: str
    billing_period: str
    amount: float
    currency: str
    promo_code: Optional[str] = None
    discount_applied: float = 0.0
    status: str = "pending"  # pending, paid, failed, expired
    created_at: str
    updated_at: str


# ===================== PROMO CODE HELPERS =====================

async def validate_promo_code(db, code: str, plan_id: str) -> Dict[str, Any]:
    """
    Validate a promo code and return discount info
    Returns: {"valid": bool, "discount_percent": int, "discount_amount": float, "error": str}
    """
    if not code:
        return {"valid": False, "error": "No code provided"}
    
    promo = await db.promo_codes.find_one({"code": code.upper()}, {"_id": 0})
    
    if not promo:
        return {"valid": False, "error": "Code invalide"}
    
    # Check expiration
    if promo.get("expires_at"):
        if datetime.fromisoformat(promo["expires_at"]) < datetime.now(timezone.utc):
            return {"valid": False, "error": "Code expiré"}
    
    # Check usage limit
    if promo.get("max_uses", -1) != -1:
        if promo.get("uses", 0) >= promo["max_uses"]:
            return {"valid": False, "error": "Code épuisé"}
    
    # Check plan restriction
    if promo.get("plan_restriction"):
        if promo["plan_restriction"] != plan_id:
            return {"valid": False, "error": f"Code valide uniquement pour le plan {promo['plan_restriction']}"}
    
    return {
        "valid": True,
        "discount_percent": promo.get("discount_percent", 0),
        "discount_amount": promo.get("discount_amount", 0),
        "promo_id": promo.get("id")
    }


async def apply_promo_discount(base_amount: float, discount_info: Dict) -> float:
    """Apply promo code discount to amount"""
    if not discount_info.get("valid"):
        return base_amount
    
    if discount_info.get("discount_percent", 0) > 0:
        discount = base_amount * (discount_info["discount_percent"] / 100)
        return max(0, base_amount - discount)
    
    if discount_info.get("discount_amount", 0) > 0:
        return max(0, base_amount - discount_info["discount_amount"])
    
    return base_amount


async def increment_promo_usage(db, code: str):
    """Increment usage count for a promo code"""
    await db.promo_codes.update_one(
        {"code": code.upper()},
        {"$inc": {"uses": 1}}
    )


# ===================== CHECKOUT HELPERS =====================

def get_plan_price(plan_id: str, billing_period: str) -> tuple:
    """Get price for a plan, returns (amount, currency)"""
    if plan_id not in SUBSCRIPTION_PLANS:
        raise ValueError(f"Invalid plan: {plan_id}")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    
    if billing_period == "yearly":
        return plan["price_yearly"], plan["currency"]
    else:
        return plan["price_monthly"], plan["currency"]


async def create_checkout_session(
    api_key: str,
    webhook_url: str,
    origin_url: str,
    user_id: str,
    user_email: str,
    plan_id: str,
    billing_period: str,
    amount: float,
    currency: str,
    promo_code: Optional[str] = None
) -> CheckoutSessionResponse:
    """
    Create a Stripe checkout session
    """
    if not STRIPE_AVAILABLE:
        raise RuntimeError("Stripe integration not available")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build URLs
    success_url = f"{origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/subscription/cancel"
    
    # Metadata for tracking
    metadata = {
        "user_id": user_id,
        "user_email": user_email,
        "plan_id": plan_id,
        "billing_period": billing_period,
        "promo_code": promo_code or ""
    }
    
    # Create checkout request
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),  # Must be float
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    return session


async def get_checkout_status(api_key: str, webhook_url: str, session_id: str) -> CheckoutStatusResponse:
    """
    Get the status of a checkout session
    """
    if not STRIPE_AVAILABLE:
        raise RuntimeError("Stripe integration not available")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    return await stripe_checkout.get_checkout_status(session_id)


async def handle_stripe_webhook(api_key: str, webhook_url: str, body: bytes, signature: str):
    """
    Handle incoming Stripe webhook
    """
    if not STRIPE_AVAILABLE:
        raise RuntimeError("Stripe integration not available")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    return await stripe_checkout.handle_webhook(body, signature)
