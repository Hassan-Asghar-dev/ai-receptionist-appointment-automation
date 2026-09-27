from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dentist import Dentist
from app.models.working_day import WorkingDay
from app.schemas.working_day import (
    WorkingDayCreate,
    WorkingDayResponse,
    WorkingDayUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/working-days",
    tags=["Working Days"]
)


@router.post(
    "/",
    response_model=WorkingDayResponse,
    status_code=201
)
def create_working_day(
    working_day_data: WorkingDayCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == working_day_data.dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    existing_day = (
        db.query(WorkingDay)
        .filter(
            WorkingDay.dentist_id == working_day_data.dentist_id,
            WorkingDay.day_of_week == working_day_data.day_of_week
        )
        .first()
    )

    if existing_day:
        raise HTTPException(
            status_code=400,
            detail="Working day already exists for this dentist"
        )

    new_working_day = WorkingDay(
        dentist_id=working_day_data.dentist_id,
        day_of_week=working_day_data.day_of_week,
        is_working=working_day_data.is_working
    )

    db.add(new_working_day)

    try:
        db.commit()
        db.refresh(new_working_day)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Working day already exists for this dentist"
        )

    return new_working_day


@router.get(
    "/",
    response_model=list[WorkingDayResponse]
)
def get_working_days(
    dentist_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    query = db.query(WorkingDay)

    if dentist_id is not None:
        query = query.filter(
            WorkingDay.dentist_id == dentist_id
        )

    working_days = (
        query
        .order_by(
            WorkingDay.dentist_id,
            WorkingDay.day_of_week
        )
        .all()
    )

    return working_days


@router.get(
    "/{working_day_id}",
    response_model=WorkingDayResponse
)
def get_working_day(
    working_day_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    working_day = (
        db.query(WorkingDay)
        .filter(WorkingDay.id == working_day_id)
        .first()
    )

    if not working_day:
        raise HTTPException(
            status_code=404,
            detail="Working day not found"
        )

    return working_day


@router.put(
    "/{working_day_id}",
    response_model=WorkingDayResponse
)
def update_working_day(
    working_day_id: int,
    working_day_data: WorkingDayUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    working_day = (
        db.query(WorkingDay)
        .filter(WorkingDay.id == working_day_id)
        .first()
    )

    if not working_day:
        raise HTTPException(
            status_code=404,
            detail="Working day not found"
        )

    working_day.is_working = working_day_data.is_working

    db.commit()
    db.refresh(working_day)

    return working_day