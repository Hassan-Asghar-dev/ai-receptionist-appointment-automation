from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.availability import (
    AvailabilityRequest,
    AvailabilityResponse,
)

from app.schemas.available_slots import (
    AvailableSlotsRequest,
    AvailableSlotsResponse,
    AvailableSlotsByNameRequest,
    AvailableSlotsByNameResponse,
)

from app.models.dentist import Dentist
from app.models.service import Service

from app.security import require_staff

from app.services.availability import (
    get_available_slots,
    is_dentist_available,
)


router = APIRouter(
    prefix="/availability",
    tags=["Availability"],
)


# =========================================================
# CHECK SPECIFIC AVAILABILITY
# Existing endpoint - unchanged
# =========================================================

@router.post(
    "/check",
    response_model=AvailabilityResponse,
)
def check_availability(
    availability_data: AvailabilityRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    available = is_dentist_available(
        db=db,
        dentist_id=availability_data.dentist_id,
        appointment_date=availability_data.appointment_date,
        start_time=availability_data.start_time,
        end_time=availability_data.end_time,
    )

    if available:
        message = "Dentist is available"
    else:
        message = "Dentist is not available"

    return {
        "dentist_id": availability_data.dentist_id,
        "appointment_date": availability_data.appointment_date,
        "start_time": availability_data.start_time,
        "end_time": availability_data.end_time,
        "available": available,
        "message": message,
    }


# =========================================================
# GET AVAILABLE SLOTS USING DATABASE IDs
# Existing endpoint - unchanged
# =========================================================

@router.post(
    "/slots",
    response_model=AvailableSlotsResponse,
)
def available_slots(
    slots_data: AvailableSlotsRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    duration_minutes, slot_interval_minutes, slots = get_available_slots(
        db=db,
        dentist_id=slots_data.dentist_id,
        appointment_date=slots_data.appointment_date,
        service_id=slots_data.service_id,
    )

    return {
        "dentist_id": slots_data.dentist_id,
        "appointment_date": slots_data.appointment_date,
        "service_id": slots_data.service_id,
        "duration_minutes": duration_minutes,
        "slot_interval_minutes": slot_interval_minutes,
        "slots": slots,
    }


# =========================================================
# GET AVAILABLE SLOTS USING NAMES
# AI / WhatsApp receptionist endpoint
# =========================================================

@router.post(
    "/slots/by-name",
    response_model=AvailableSlotsByNameResponse,
)
def available_slots_by_name(
    slots_data: AvailableSlotsByNameRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    # -----------------------------------------------------
    # Find active dentist by name
    # -----------------------------------------------------

    dentist = (
        db.query(Dentist)
        .filter(
            Dentist.full_name.ilike(slots_data.dentist_name.strip()),
            Dentist.is_active.is_(True),
        )
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail=f"Active dentist '{slots_data.dentist_name}' not found",
        )

    # -----------------------------------------------------
    # Find active service by name
    # -----------------------------------------------------

    service = (
        db.query(Service)
        .filter(
            Service.name.ilike(slots_data.service_name.strip()),
            Service.is_active.is_(True),
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail=f"Active service '{slots_data.service_name}' not found",
        )

    # -----------------------------------------------------
    # Use existing availability logic with REAL IDs
    # -----------------------------------------------------

    duration_minutes, slot_interval_minutes, slots = get_available_slots(
        db=db,
        dentist_id=dentist.id,
        appointment_date=slots_data.appointment_date,
        service_id=service.id,
    )

    # -----------------------------------------------------
    # Return resolved names + IDs + actual slots
    # -----------------------------------------------------

    return {
        "dentist_id": dentist.id,
        "dentist_name": dentist.full_name,
        "service_id": service.id,
        "service_name": service.name,
        "appointment_date": slots_data.appointment_date,
        "duration_minutes": duration_minutes,
        "slot_interval_minutes": slot_interval_minutes,
        "slots": slots,
    }