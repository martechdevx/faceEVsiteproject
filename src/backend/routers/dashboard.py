from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from models.models import User, EnrolledFace
from schemas.schemas import DashboardStats
from routers.verification import verification_count

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_enrolled = db.query(EnrolledFace).count()
    total_verified = db.query(EnrolledFace).filter(EnrolledFace.is_verified == True).count()

    return DashboardStats(
        total_enrolled=total_enrolled,
        total_verified=total_verified,
        user_full_name=current_user.full_name,
    )
