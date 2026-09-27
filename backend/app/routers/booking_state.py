from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.whatsapp_booking_state import WhatsAppBookingState
from app.schemas.booking_state import (
    BookingStateUpdate,
    BookingStateResponse,
)
from app.security import require_staff


router = APIRouter(
    prefix="/booking-state",
    tags=["Booking State"],
)


@router.get(
    "/{whatsapp_number}",
    response_model=BookingStateResponse,
)
def get_booking_state(
    whatsapp_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    state = (
        db.query(WhatsAppBookingState)
        .filter(
            WhatsAppBookingState.whatsapp_number == whatsapp_number
        )
        .first()
    )

    if not state:
     return {
        "whatsapp_number": whatsapp_number,
        "service_name": None,
        "dentist_name": None,
        "appointment_year": None,
        "appointment_month": None,
        "appointment_day": None,
        "selected_time": None,
    }

    return state


@router.put(
    "/{whatsapp_number}",
    response_model=BookingStateResponse,
)
def update_booking_state(
    whatsapp_number: str,
    state_data: BookingStateUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    state = (
        db.query(WhatsAppBookingState)
        .filter(
            WhatsAppBookingState.whatsapp_number == whatsapp_number
        )
        .first()
    )

    if not state:
        state = WhatsAppBookingState(
            whatsapp_number=whatsapp_number,
            updated_at=datetime.now(timezone.utc),
        )

        db.add(state)

    # Only update fields actually supplied in the request.
    # This prevents omitted fields from wiping existing state.
    update_data = state_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(state, field, value)

    state.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(state)

    return state


@router.delete("/{whatsapp_number}")
def clear_booking_state(
    whatsapp_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    state = (
        db.query(WhatsAppBookingState)
        .filter(
            WhatsAppBookingState.whatsapp_number == whatsapp_number
        )
        .first()
    )

    if state:
        db.delete(state)
        db.commit()

    return {
        "message": "Booking state cleared",
        "whatsapp_number": whatsapp_number,
    }