from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from core.database import get_db
from core.dependencies import get_current_user
from models.models import AuditLog, User, EnrolledFace
from schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_enrolled = db.query(EnrolledFace).filter(
        EnrolledFace.enrolled_by == current_user.id,
    ).count()
    total_verified = db.query(AuditLog).filter(
        AuditLog.event_type == "verify",
        AuditLog.success == True,
        AuditLog.user_id == current_user.id,
    ).count()
    recent_activity = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
    ).order_by(desc(AuditLog.created_at)).limit(5).all()

    return DashboardStats(
        total_enrolled=total_enrolled,
        total_verified=total_verified,
        user_full_name=current_user.full_name,
        recent_activity=recent_activity,
    )
