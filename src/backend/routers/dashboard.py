from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from models.models import User, EnrolledFace
from schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_enrolled = db.query(EnrolledFace).count()

    return DashboardStats(
        total_enrolled=total_enrolled,
        total_searches=0,        # extend later with a searches log table
        user_full_name=current_user.full_name,
    )
