from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.security import (
    create_access_token,
    get_current_user,
    require_admin,
    require_staff
)
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    password_matches = bcrypt.checkpw(
        login_data.password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    )

    if not password_matches:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role
    }
@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(require_admin)
):
    return {
        "message": "Admin access confirmed",
        "user_id": current_user.id,
        "role": current_user.role
    }

@router.get("/staff-test")
def staff_test(
    current_user: User = Depends(require_staff)
):
    return {
        "message": "Staff access confirmed",
        "user_id": current_user.id,
        "role": current_user.role
    }