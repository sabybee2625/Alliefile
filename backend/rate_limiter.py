"""
Rate limiting middleware for security
Protects sensitive endpoints from abuse
"""
import time
from collections import defaultdict
from typing import Dict, Tuple, Optional
from fastapi import HTTPException, Request
import asyncio

class RateLimiter:
    """
    Simple in-memory rate limiter
    For production, consider Redis-based implementation
    """
    
    def __init__(self):
        # Structure: {endpoint: {identifier: [(timestamp, count)]}}
        self._requests: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._lock = asyncio.Lock()
    
    async def check_rate_limit(
        self,
        endpoint: str,
        identifier: str,
        max_requests: int,
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if request is within rate limit
        Returns (is_allowed, remaining_requests)
        """
        async with self._lock:
            now = time.time()
            window_start = now - window_seconds
            
            # Get requests for this endpoint/identifier
            requests = self._requests[endpoint][identifier]
            
            # Remove old requests outside window
            requests[:] = [ts for ts in requests if ts > window_start]
            
            # Check limit
            current_count = len(requests)
            
            if current_count >= max_requests:
                return False, 0
            
            # Add new request
            requests.append(now)
            remaining = max_requests - current_count - 1
            
            return True, remaining
    
    async def cleanup_old_entries(self):
        """Cleanup entries older than 1 hour"""
        async with self._lock:
            cutoff = time.time() - 3600
            for endpoint in list(self._requests.keys()):
                for identifier in list(self._requests[endpoint].keys()):
                    self._requests[endpoint][identifier] = [
                        ts for ts in self._requests[endpoint][identifier]
                        if ts > cutoff
                    ]
                    if not self._requests[endpoint][identifier]:
                        del self._requests[endpoint][identifier]

# Global rate limiter instance
rate_limiter = RateLimiter()


async def check_rate_limit_login(request: Request, identifier: str):
    """Rate limit for login endpoint: 5 requests per minute"""
    from config import config
    allowed, remaining = await rate_limiter.check_rate_limit(
        "login", identifier, config.RATE_LIMIT_LOGIN, 60
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives de connexion. Réessayez dans 1 minute."
        )
    return remaining


async def check_rate_limit_register(request: Request, identifier: str):
    """Rate limit for register endpoint: 3 requests per minute"""
    from config import config
    allowed, remaining = await rate_limiter.check_rate_limit(
        "register", identifier, config.RATE_LIMIT_REGISTER, 60
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives d'inscription. Réessayez dans 1 minute."
        )
    return remaining


async def check_rate_limit_analysis(request: Request, user_id: str):
    """Rate limit for AI analysis: 10 requests per minute per user"""
    from config import config
    allowed, remaining = await rate_limiter.check_rate_limit(
        "analysis", user_id, config.RATE_LIMIT_ANALYSIS, 60
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Trop de demandes d'analyse. Réessayez dans 1 minute."
        )
    return remaining


async def check_rate_limit_assistant(request: Request, user_id: str):
    """Rate limit for assistant: 5 requests per minute per user"""
    from config import config
    allowed, remaining = await rate_limiter.check_rate_limit(
        "assistant", user_id, config.RATE_LIMIT_ASSISTANT, 60
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Trop de demandes à l'assistant. Réessayez dans 1 minute."
        )
    return remaining


def get_client_ip(request: Request) -> str:
    """Get client IP address, handling proxies"""
    # Check X-Forwarded-For header (from proxies/load balancers)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the first IP (original client)
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    # Fall back to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"
