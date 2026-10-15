from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import decode_access_token
from models.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl= "/auth/swagger-login", auto_error= False)

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    bearer: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    token_from_form: str = Depends(oauth2_scheme)
) -> User:
    token = request.cookies.get("access_token") or (bearer.credentials if bearer else None) or token_from_form
    
    if not token:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated."
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid.",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user