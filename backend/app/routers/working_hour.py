from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dentist import Dentist
from app.models.working_day import WorkingDay
from app.models.working_hour import WorkingHour
from app.schemas.working_hour import (
    WorkingHourCreate,
    WorkingHourResponse,
    WorkingHourUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/working-hours",
    tags=["Working Hours"]
)


@router.post(
    "/",
    response_model=WorkingHourResponse,
    status_code=201
)
def create_working_hour(
    working_hour_data: WorkingHourCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == working_hour_data.dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    working_day = (
        db.query(WorkingDay)
        .filter(
            WorkingDay.dentist_id == working_hour_data.dentist_id,
            WorkingDay.day_of_week == working_hour_data.day_of_week
        )
        .first()
    )

    if not working_day:
        raise HTTPException(
            status_code=400,
            detail="Working day must be configured first"
        )

    if not working_day.is_working:
        raise HTTPException(
            status_code=400,
            detail="Cannot add working hours to a non-working day"
        )

    existing_hours = (
        db.query(WorkingHour)
        .filter(
            WorkingHour.dentist_id == working_hour_data.dentist_id,
            WorkingHour.day_of_week == working_hour_data.day_of_week
        )
        .first()
    )

    if existing_hours:
        raise HTTPException(
            status_code=400,
            detail="Working hours already exist for this dentist and day"
        )

    new_working_hour = WorkingHour(
        dentist_id=working_hour_data.dentist_id,
        day_of_week=working_hour_data.day_of_week,
        start_time=working_hour_data.start_time,
        end_time=working_hour_data.end_time,
        break_start=working_hour_data.break_start,
        break_end=working_hour_data.break_end
    )

    db.add(new_working_hour)
    db.commit()
    db.refresh(new_working_hour)

    return new_working_hour


@router.get(
    "/",
    response_model=list[WorkingHourResponse]
)
def get_working_hours(
    dentist_id: int | None = None,
    day_of_week: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    query = db.query(WorkingHour)

    if dentist_id is not None:
        query = query.filter(
            WorkingHour.dentist_id == dentist_id
        )

    if day_of_week is not None:
        if not 0 <= day_of_week <= 6:
            raise HTTPException(
                status_code=400,
                detail="day_of_week must be between 0 and 6"
            )

        query = query.filter(
            WorkingHour.day_of_week == day_of_week
        )

    working_hours = (
        query
        .order_by(
            WorkingHour.dentist_id,
            WorkingHour.day_of_week
        )
        .all()
    )

    return working_hours


@router.get(
    "/{working_hour_id}",
    response_model=WorkingHourResponse
)
def get_working_hour(
    working_hour_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    working_hour = (
        db.query(WorkingHour)
        .filter(WorkingHour.id == working_hour_id)
        .first()
    )

    if not working_hour:
        raise HTTPException(
            status_code=404,
            detail="Working hours not found"
        )

    return working_hour


@router.put(
    "/{working_hour_id}",
    response_model=WorkingHourResponse
)
def update_working_hour(
    working_hour_id: int,
    working_hour_data: WorkingHourUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    working_hour = (
        db.query(WorkingHour)
        .filter(WorkingHour.id == working_hour_id)
        .first()
    )

    if not working_hour:
        raise HTTPException(
            status_code=404,
            detail="Working hours not found"
        )

    update_data = working_hour_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(working_hour, field, value)

    db.commit()
    db.refresh(working_hour)

    return working_hour