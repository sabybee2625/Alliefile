"""
Security middleware and helpers for production-ready SaaS
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback
from typing import Callable
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HSTS in production
        from config import config
        if config.IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Handle exceptions securely:
    - Log full stack trace
    - Return sanitized error to client (no stack traces in production)
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            return await call_next(request)
        except HTTPException:
            # Let FastAPI handle HTTP exceptions normally
            raise
        except Exception as e:
            # Log full error with stack trace
            logger.error(
                f"Unhandled error on {request.method} {request.url.path}: {str(e)}\n"
                f"Stack trace:\n{traceback.format_exc()}"
            )
            
            # Return sanitized error
            from config import config
            if config.IS_PRODUCTION:
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Une erreur interne s'est produite. Veuillez réessayer."}
                )
            else:
                # In development, include error details
                return JSONResponse(
                    status_code=500,
                    content={
                        "detail": str(e),
                        "type": type(e).__name__
                    }
                )


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Log access to sensitive endpoints"""
    
    SENSITIVE_ENDPOINTS = [
        "/api/shared/",
        "/api/pieces/",
        "/api/dossiers/",
        "/api/auth/",
    ]
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        from rate_limiter import get_client_ip
        client_ip = get_client_ip(request)
        
        # Check if this is a sensitive endpoint
        path = request.url.path
        is_sensitive = any(path.startswith(ep) for ep in self.SENSITIVE_ENDPOINTS)
        
        start_time = datetime.now(timezone.utc)
        response = await call_next(request)
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        if is_sensitive:
            logger.info(
                f"ACCESS: {request.method} {path} | "
                f"IP: {client_ip} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration:.3f}s"
            )
        
        return response


async def log_share_access(
    share_token: str,
    client_ip: str,
    action: str,
    piece_id: str = None,
    db = None
):
    """
    Log access to shared links for security audit
    """
    if db is None:
        return
    
    log_entry = {
        "share_token": share_token,
        "client_ip": client_ip,
        "action": action,  # 'view', 'download', 'export'
        "piece_id": piece_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        await db.share_access_logs.insert_one(log_entry)
    except Exception as e:
        logger.error(f"Failed to log share access: {e}")


def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error message for client response
    Remove sensitive information like file paths, database details, etc.
    """
    message = str(error)
    
    # Remove file paths
    import re
    message = re.sub(r'/[^\s]+\.py', '[file]', message)
    message = re.sub(r'/app/[^\s]+', '[path]', message)
    
    # Remove potential database info
    message = re.sub(r'mongodb://[^\s]+', '[database]', message)
    
    return message


def validate_user_owns_resource(user_id: str, resource_user_id: str, resource_type: str = "resource"):
    """
    Validate that a user owns a resource
    Raises 403 if not owner
    """
    if user_id != resource_user_id:
        logger.warning(
            f"Access denied: User {user_id} attempted to access {resource_type} "
            f"owned by {resource_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vous n'avez pas accès à cette ressource"
        )
