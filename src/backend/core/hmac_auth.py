import hmac
import hashlib
import time
import base64
import logging
from fastapi import Request, HTTPException

logger = logging.getLogger("hmac_auth")

HMAC_SECRET = None  
TIMESTAMP_TOLERANCE = 300 


def get_secret() -> bytes:
    global HMAC_SECRET
    if HMAC_SECRET is None:
        from core.config import settings
        HMAC_SECRET = base64.b64decode(settings.HMAC_SECRET)
    return HMAC_SECRET


def compute_signature(method: str, path: str, timestamp: str, body: bytes) -> str:
    """
    Builds the message to sign:
    METHOD + path + timestamp + body
    e.g. "POST/enroll/1234567890{...json...}"
    """
    message = f"{method.upper()}{path}{timestamp}".encode("utf-8") + body
    return hmac.new(get_secret(), message, hashlib.sha256).hexdigest()


async def verify_hmac(request: Request):
    """
    FastAPI dependency — call with Depends(verify_hmac) on any route.
    Checks X-Timestamp and X-Signature headers on every request.
    """
    timestamp = request.headers.get("X-Timestamp")
    signature = request.headers.get("X-Signature")

    
    client_ip = f"{request.client.host}:{request.client.port}" if request.client else "unknown"

    if not timestamp or not signature:
        logger.warning("HMAC FAIL [%s %s] from %s: missing headers",
                        request.method, request.url.path, client_ip)
        raise HTTPException(
            status_code=401,
            detail="Missing HMAC headers (X-Timestamp, X-Signature)."
        )

    
    try:
        request_time = int(timestamp)
    except ValueError:
        logger.warning("HMAC FAIL [%s %s] from %s: non-numeric timestamp %r",
                        request.method, request.url.path, client_ip, timestamp)
        raise HTTPException(status_code=401, detail="Invalid timestamp.")

    current_time = int(time.time())
    if abs(current_time - request_time) > TIMESTAMP_TOLERANCE:
        logger.warning("HMAC FAIL [%s %s] from %s: timestamp skew %ss",
                        request.method, request.url.path, client_ip,
                        current_time - request_time)
        raise HTTPException(
            status_code=401,
            detail="Request timestamp expired. Possible replay attack."
        )

    
    body = await request.body()
    expected = compute_signature(
        request.method,
        request.url.path,
        timestamp,
        body,
    )
    
     # ── TEMPORARY DEBUG 
    logger.warning("signature expected : %r", expected)
    logger.warning("signature received : %r", signature)
    

    
    if not hmac.compare_digest(expected, signature):
        logger.warning("HMAC FAIL [%s %s] from %s: signature mismatch",
                        request.method, request.url.path, client_ip)
        raise HTTPException(
            status_code=401,
            detail="Invalid HMAC signature."
        )

    logger.warning("HMAC OK [%s %s] from %s", request.method, request.url.path, client_ip)