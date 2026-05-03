"""
Configuration module for production-ready SaaS
Handles environment variables, security settings, and production/dev mode
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TEST = "test"

class StorageBackend(str, Enum):
    LOCAL = "local"
    S3 = "s3"
    R2 = "r2"
    GRIDFS = "gridfs"

class Config:
    """Application configuration with production-ready defaults"""
    
    def __init__(self):
        self.ROOT_DIR = Path(__file__).parent
        
        # Environment
        self.ENV = Environment(os.environ.get("APP_ENV", "development"))
        self.IS_PRODUCTION = self.ENV == Environment.PRODUCTION
        self.DEBUG = not self.IS_PRODUCTION
        
        # Security - MANDATORY in production
        self._jwt_secret = os.environ.get("JWT_SECRET")
        if self.IS_PRODUCTION and not self._jwt_secret:
            raise RuntimeError(
                "CRITICAL: JWT_SECRET environment variable is required in production. "
                "Generate a strong secret with: openssl rand -hex 32"
            )
        self.JWT_SECRET = self._jwt_secret or "dev-only-secret-change-in-prod-2024"
        self.JWT_ALGORITHM = "HS256"
        self.JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
        
        # CORS - Restricted in production
        self.CORS_ORIGINS = self._get_cors_origins()
        
        # Database - STRICTLY LOCAL for stability
        self.MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        self.DB_NAME = os.environ.get("DB_NAME", "alliefile")
        
        # Atlas GridFS - Lazy loaded only when needed
        self.ATLAS_MONGO_URL = "mongodb+srv://forsaby_db_user:sousou@alliefile-dossier.u4ejts9.mongodb.net/alliefile?retryWrites=true&w=majority"
        self.ATLAS_DB_NAME = "alliefile"
        
        # Storage - Default to GridFS for persistence
        self.STORAGE_BACKEND = StorageBackend(os.environ.get("STORAGE_BACKEND", "gridfs"))
        self.UPLOAD_DIR = self.ROOT_DIR / "uploads"
        self.EXPORTS_DIR = self.ROOT_DIR / "exports"
        
        # S3/R2 Configuration (for future migration)
        self.S3_BUCKET = os.environ.get("S3_BUCKET")
        self.S3_REGION = os.environ.get("S3_REGION", "eu-west-1")
        self.S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY")
        self.S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY")
        self.S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL")  # For R2 or MinIO
        
        # File limits
        self.MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "50"))
        self.MAX_FILE_SIZE_BYTES = self.MAX_FILE_SIZE_MB * 1024 * 1024
        
        # Rate limiting
        self.RATE_LIMIT_LOGIN = int(os.environ.get("RATE_LIMIT_LOGIN", "5"))  # per minute
        self.RATE_LIMIT_REGISTER = int(os.environ.get("RATE_LIMIT_REGISTER", "3"))  # per minute
        self.RATE_LIMIT_ANALYSIS = int(os.environ.get("RATE_LIMIT_ANALYSIS", "10"))  # per minute
        self.RATE_LIMIT_ASSISTANT = int(os.environ.get("RATE_LIMIT_ASSISTANT", "5"))  # per minute
        
        # Analysis queue
        self.MAX_CONCURRENT_ANALYSES = int(os.environ.get("MAX_CONCURRENT_ANALYSES", "2"))
        
        # LLM
        self.EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
        
        # Stripe
        self.STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
        self.STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
        self.STRIPE_PRICE_STANDARD = os.environ.get("STRIPE_PRICE_STANDARD")
        self.STRIPE_PRICE_PREMIUM = os.environ.get("STRIPE_PRICE_PREMIUM")
        
        # Create directories
        self.UPLOAD_DIR.mkdir(exist_ok=True)
        self.EXPORTS_DIR.mkdir(exist_ok=True)
    
    def _get_cors_origins(self) -> list:
        """Get CORS origins based on environment"""
        origins_str = os.environ.get("CORS_ORIGINS", "")
        
        if self.IS_PRODUCTION:
            if not origins_str:
                raise RuntimeError(
                    "CORS_ORIGINS environment variable is required in production. "
                    "Set it to your frontend domain(s)."
                )
            return [o.strip() for o in origins_str.split(",") if o.strip()]
        
        # Development: allow all
        if origins_str:
            return [o.strip() for o in origins_str.split(",") if o.strip()]
        return ["*"]
    
    @property
    def is_stripe_configured(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY)
    
    @property
    def is_s3_configured(self) -> bool:
        return bool(self.S3_BUCKET and self.S3_ACCESS_KEY and self.S3_SECRET_KEY)

# Global config instance
config = Config()


# ===================== SUBSCRIPTION PLANS =====================

class PlanLimits(BaseModel):
    """Limits for each subscription plan"""
    max_dossiers: int
    max_pieces_per_dossier: int
    max_total_pieces: int
    max_share_links: int
    assistant_daily_limit: int  # -1 for unlimited
    can_export_docx: bool
    can_export_pdf: bool
    can_advanced_share: bool  # Filtered/selective sharing
    can_use_assistant: bool
    storage_mb: int

PLAN_LIMITS = {
    "free": PlanLimits(
        max_dossiers=1,
        max_pieces_per_dossier=15,
        max_total_pieces=15,
        max_share_links=3,
        assistant_daily_limit=1,
        can_export_docx=False,
        can_export_pdf=True,
        can_advanced_share=False,
        can_use_assistant=True,  # Only expose_faits allowed
        storage_mb=100
    ),
    "standard": PlanLimits(
        max_dossiers=5,
        max_pieces_per_dossier=100,
        max_total_pieces=500,
        max_share_links=20,
        assistant_daily_limit=-1,  # Unlimited
        can_export_docx=True,
        can_export_pdf=True,
        can_advanced_share=True,
        can_use_assistant=True,
        storage_mb=2000
    ),
    "premium": PlanLimits(
        max_dossiers=-1,  # Unlimited
        max_pieces_per_dossier=-1,
        max_total_pieces=-1,
        max_share_links=-1,
        assistant_daily_limit=-1,
        can_export_docx=True,
        can_export_pdf=True,
        can_advanced_share=True,
        can_use_assistant=True,
        storage_mb=10000
    )
}

def get_plan_limits(plan: str) -> PlanLimits:
    """Get limits for a plan, default to free"""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
