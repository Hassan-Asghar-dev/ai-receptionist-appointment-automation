from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dentist import Dentist
from app.schemas.dentist import (
    DentistCreate,
    DentistUpdate,
    DentistResponse,
    DentistStatusUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/dentists",
    tags=["Dentists"]
)


@router.post(
    "/",
    response_model=DentistResponse,
    status_code=201
)
def create_dentist(
    dentist_data: DentistCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    new_dentist = Dentist(
        full_name=dentist_data.full_name,
        specialization=dentist_data.specialization,
        phone=dentist_data.phone,
        email=dentist_data.email,
        notes=dentist_data.notes,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(new_dentist)
    db.commit()
    db.refresh(new_dentist)

    return new_dentist


@router.get(
    "/",
    response_model=list[DentistResponse]
)
def get_dentists(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentists = (
        db.query(Dentist)
        .order_by(Dentist.id.desc())
        .all()
    )

    return dentists


@router.get(
    "/{dentist_id}",
    response_model=DentistResponse
)
def get_dentist(
    dentist_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    return dentist


@router.put(
    "/{dentist_id}",
    response_model=DentistResponse
)
def update_dentist(
    dentist_id: int,
    dentist_data: DentistUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    update_data = dentist_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(dentist, field, value)

    dentist.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dentist)

    return dentist


@router.delete(
    "/{dentist_id}",
    response_model=DentistResponse
)
def deactivate_dentist(
    dentist_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    dentist.is_active = False
    dentist.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dentist)

    return dentist

@router.patch(
    "/{dentist_id}/status",
    response_model=DentistResponse
)
def update_dentist_status(
    dentist_id: int,
    status_data: DentistStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    dentist.is_active = status_data.is_active
    dentist.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(dentist)

    return dentist