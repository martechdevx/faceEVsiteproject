from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session
from models.models import AuditLog

AUDIT_LOG_RETENTION_DAYS = 30


def prune_audit_logs(db: Session) -> None:
    cutoff = datetime.utcnow() - timedelta(days=AUDIT_LOG_RETENTION_DAYS)
    db.query(AuditLog).filter(
        or_(
            AuditLog.event_type == "login",
            AuditLog.created_at < cutoff,
        )
    ).delete(
        synchronize_session=False,
    )


def log_event(
    db: Session,
    event_type: str,
    success: bool = True,
    user_id: int | None = None,
    email: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
):
    """Writes one row to audit_logs. Call this right after the thing happens."""
    prune_audit_logs(db)
    entry = AuditLog(
        event_type=event_type,
        success=success,
        user_id=user_id,
        email=email,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()