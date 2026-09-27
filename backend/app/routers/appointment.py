from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment
from app.models.dentist import Dentist
from app.models.patient import Patient
from app.models.service import Service
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    AppointmentReschedule,
    WhatsAppAppointmentCreate,
    WhatsAppAppointmentResponse,
)
from app.security import require_staff
from app.services.availability import is_dentist_available

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)


@router.post(
    "/",
    response_model=AppointmentResponse,
    status_code=201
)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    # Check patient
    patient = (
        db.query(Patient)
        .filter(Patient.id == appointment_data.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if not patient.is_active:
        raise HTTPException(
            status_code=400,
            detail="Patient account is inactive"
        )

    # Check dentist
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == appointment_data.dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    if not dentist.is_active:
        raise HTTPException(
            status_code=400,
            detail="Dentist is inactive"
        )

    # Check service
    if appointment_data.service_id is not None:
        service = (
            db.query(Service)
            .filter(Service.id == appointment_data.service_id)
            .first()
        )

        if not service:
            raise HTTPException(
                status_code=404,
                detail="Service not found"
            )

        if not service.is_active:
            raise HTTPException(
                status_code=400,
                detail="Service is inactive"
            )
                # Validate appointment duration against service duration
        appointment_duration = (
            datetime.combine(
                appointment_data.appointment_date,
                appointment_data.end_time
            )
            - datetime.combine(
                appointment_data.appointment_date,
                appointment_data.start_time
            )
        )

        appointment_duration_minutes = (
            appointment_duration.total_seconds() / 60
        )

        if appointment_duration_minutes != service.duration_minutes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Appointment duration must be "
                    f"{service.duration_minutes} minutes for this service"
                )
            )

            # Check dentist availability
    available = is_dentist_available(
        db=db,
        dentist_id=appointment_data.dentist_id,
        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=appointment_data.end_time
    )

    if not available:
        raise HTTPException(
            status_code=409,
            detail="The dentist is not available for this date and time"
        )

    current_time = datetime.now(timezone.utc)

    new_appointment = Appointment(
        patient_id=appointment_data.patient_id,
        dentist_id=appointment_data.dentist_id,
        service_id=appointment_data.service_id,
        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=appointment_data.end_time,
        status=appointment_data.status,
        booking_source=appointment_data.booking_source,
        other_service_text=appointment_data.other_service_text,
        notes=appointment_data.notes,
        created_by_user_id=(
            current_user.id
            if appointment_data.booking_source == "RECEPTIONIST"
            else appointment_data.created_by_user_id
        ),
        created_at=current_time,
        updated_at=current_time
    )

    db.add(new_appointment)

    try:
        db.commit()
        db.refresh(new_appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This dentist already has an overlapping appointment"
        )

    return new_appointment



@router.post(
    "/whatsapp",
    response_model=WhatsAppAppointmentResponse,
    status_code=201
)
def create_whatsapp_appointment(
    appointment_data: WhatsAppAppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    # ---------------------------------------------------------
    # 1. Find patient using WhatsApp number
    # ---------------------------------------------------------
    # Normalize incoming WhatsApp number
    normalized_number = appointment_data.whatsapp_number.strip()

    if not normalized_number.startswith("+"):
     normalized_number = "+" + normalized_number

    patient = (
    db.query(Patient)
    .filter(
        Patient.whatsapp_number == normalized_number
    )
    .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail=(
                "Patient not found for this WhatsApp number"
            )
        )

    if not patient.is_active:
        raise HTTPException(
            status_code=400,
            detail="Patient account is inactive"
        )

    # ---------------------------------------------------------
    # 2. Resolve dentist name -> dentist ID
    # ---------------------------------------------------------
    dentist = (
        db.query(Dentist)
        .filter(
            Dentist.full_name.ilike(
                appointment_data.dentist_name.strip()
            )
        )
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    if not dentist.is_active:
        raise HTTPException(
            status_code=400,
            detail="Dentist is inactive"
        )

    # ---------------------------------------------------------
    # 3. Resolve service name -> service ID
    # ---------------------------------------------------------
    service = (
        db.query(Service)
        .filter(
            Service.name.ilike(
                appointment_data.service_name.strip()
            )
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    if not service.is_active:
        raise HTTPException(
            status_code=400,
            detail="Service is inactive"
        )

    # ---------------------------------------------------------
    # 4. Calculate end time from DATABASE service duration
    # ---------------------------------------------------------
    start_datetime = datetime.combine(
        appointment_data.appointment_date,
        appointment_data.start_time
    )

    end_datetime = start_datetime + timedelta(
        minutes=service.duration_minutes
    )

    # Prevent an appointment from rolling into another date.
    if end_datetime.date() != appointment_data.appointment_date:
        raise HTTPException(
            status_code=400,
            detail="Appointment cannot extend into the next day"
        )

    calculated_end_time = end_datetime.time()

    # ---------------------------------------------------------
    # 5. RECHECK availability immediately before booking
    # ---------------------------------------------------------
    available = is_dentist_available(
        db=db,
        dentist_id=dentist.id,
        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=calculated_end_time
    )

    if not available:
        raise HTTPException(
            status_code=409,
            detail=(
                "The selected appointment time is no longer "
                "available. Please choose another time."
            )
        )

    # ---------------------------------------------------------
    # 6. Create appointment
    # ---------------------------------------------------------
    current_time = datetime.now(timezone.utc)

    new_appointment = Appointment(
        patient_id=patient.id,
        dentist_id=dentist.id,
        service_id=service.id,

        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=calculated_end_time,

        status="PENDING",
        booking_source="WHATSAPP",

        other_service_text=None,
        notes=None,

        # WhatsApp booking was not manually created by a staff user.
        created_by_user_id=None,

        created_at=current_time,
        updated_at=current_time
    )

    db.add(new_appointment)

    try:
        db.commit()
        db.refresh(new_appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "The selected appointment time is no longer "
                "available. Please choose another time."
            )
        )

    # ---------------------------------------------------------
    # 7. Return AI-friendly confirmation
    # ---------------------------------------------------------
    return {
        "appointment_id": new_appointment.id,

        "patient_id": patient.id,
        "patient_name": patient.full_name,
        "whatsapp_number": patient.whatsapp_number,

        "dentist_id": dentist.id,
        "dentist_name": dentist.full_name,

        "service_id": service.id,
        "service_name": service.name,

        "appointment_date": new_appointment.appointment_date,
        "start_time": new_appointment.start_time,
        "end_time": new_appointment.end_time,

        "duration_minutes": service.duration_minutes,

        "status": new_appointment.status,
        "booking_source": new_appointment.booking_source,

        "message": "Appointment created successfully"
    }


@router.get(
    "/",
    response_model=list[AppointmentResponse]
)
def get_appointments(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointments = (
        db.query(Appointment)
        .order_by(
            Appointment.appointment_date,
            Appointment.start_time
        )
        .all()
    )

    return appointments


@router.get(
    "/{appointment_id}",
    response_model=AppointmentResponse
)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return appointment


@router.put(
    "/{appointment_id}",
    response_model=AppointmentResponse
)
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    update_data = appointment_data.model_dump(
        exclude_unset=True
    )

    # Determine the final values after the requested update
    final_patient_id = update_data.get(
        "patient_id",
        appointment.patient_id
    )

    final_dentist_id = update_data.get(
        "dentist_id",
        appointment.dentist_id
    )

    final_service_id = update_data.get(
        "service_id",
        appointment.service_id
    )

    final_appointment_date = update_data.get(
        "appointment_date",
        appointment.appointment_date
    )

    final_start_time = update_data.get(
        "start_time",
        appointment.start_time
    )

    final_end_time = update_data.get(
        "end_time",
        appointment.end_time
    )

    # Check patient
    patient = (
        db.query(Patient)
        .filter(Patient.id == final_patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if not patient.is_active:
        raise HTTPException(
            status_code=400,
            detail="Patient account is inactive"
        )

    # Check dentist
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == final_dentist_id)
        .first()
    )

    if not dentist:
        raise HTTPException(
            status_code=404,
            detail="Dentist not found"
        )

    if not dentist.is_active:
        raise HTTPException(
            status_code=400,
            detail="Dentist is inactive"
        )

    # Check service
    if final_service_id is not None:
        service = (
            db.query(Service)
            .filter(Service.id == final_service_id)
            .first()
        )

        if not service:
            raise HTTPException(
                status_code=404,
                detail="Service not found"
            )

        if not service.is_active:
            raise HTTPException(
                status_code=400,
                detail="Service is inactive"
            )
                # Validate appointment duration against service duration
        appointment_duration = (
            datetime.combine(
                final_appointment_date,
                final_end_time
            )
            - datetime.combine(
                final_appointment_date,
                final_start_time
            )
        )

        appointment_duration_minutes = (
            appointment_duration.total_seconds() / 60
        )

        if appointment_duration_minutes != service.duration_minutes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Appointment duration must be "
                    f"{service.duration_minutes} minutes for this service"
                )
            )

    # Check availability only when the appointment
    # is being moved/changed
    appointment_details_changed = any(
        field in update_data
        for field in [
            "dentist_id",
            "service_id",
            "appointment_date",
            "start_time",
            "end_time"
        ]
    )

    if appointment_details_changed:

        # Temporarily exclude the current appointment from
        # the availability check so it does not conflict with itself.
        original_status = appointment.status

        if original_status in ["PENDING", "CONFIRMED"]:
            appointment.status = "CANCELLED"
            db.flush()

        available = is_dentist_available(
            db=db,
            dentist_id=final_dentist_id,
            appointment_date=final_appointment_date,
            start_time=final_start_time,
            end_time=final_end_time
        )

        appointment.status = original_status
        db.flush()

        if not available:
            raise HTTPException(
                status_code=409,
                detail="The dentist is not available for the updated date and time"
            )

    # Apply the requested changes
    for field, value in update_data.items():
        setattr(appointment, field, value)

    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This dentist already has an overlapping appointment"
        )

    return appointment

@router.patch(
    "/{appointment_id}/cancel",
    response_model=AppointmentResponse
)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Appointment is already cancelled"
        )

    if appointment.status in ["COMPLETED", "NO_SHOW"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot cancel an appointment with status "
                f"{appointment.status}"
            )
        )

    appointment.status = "CANCELLED"
    appointment.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(appointment)

    return appointment

@router.patch(
    "/{appointment_id}/confirm",
    response_model=AppointmentResponse
)
def confirm_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status == "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Appointment is already confirmed"
        )

    if appointment.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only pending appointments can be confirmed. "
                f"Current status: {appointment.status}"
            )
        )

        # Re-check availability before confirmation.
    # Temporarily exclude this appointment from the
    # availability check so it does not conflict with itself.
    appointment.status = "CANCELLED"
    db.flush()

    available = is_dentist_available(
        db=db,
        dentist_id=appointment.dentist_id,
        appointment_date=appointment.appointment_date,
        start_time=appointment.start_time,
        end_time=appointment.end_time
    )

    appointment.status = "PENDING"
    db.flush()

    if not available:
        raise HTTPException(
            status_code=409,
            detail=(
                "The appointment can no longer be confirmed "
                "because the dentist is no longer available "
                "for this time"
            )
        )

    appointment.status = "CONFIRMED"
    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This dentist already has an overlapping appointment"
        )

    return appointment

@router.patch(
    "/{appointment_id}/reject",
    response_model=AppointmentResponse
)
def reject_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only pending appointments can be rejected. "
                f"Current status: {appointment.status}"
            )
        )

    appointment.status = "REJECTED"
    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Unable to reject the appointment"
        )

    return appointment

@router.patch(
    "/{appointment_id}/complete",
    response_model=AppointmentResponse
)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only confirmed appointments can be completed. "
                f"Current status: {appointment.status}"
            )
        )

    appointment.status = "COMPLETED"
    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Unable to complete the appointment"
        )

    return appointment

@router.patch(
    "/{appointment_id}/no-show",
    response_model=AppointmentResponse
)
def mark_appointment_no_show(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only confirmed appointments can be marked as no-show. "
                f"Current status: {appointment.status}"
            )
        )

    appointment.status = "NO_SHOW"
    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Unable to mark the appointment as no-show"
        )

    return appointment

@router.patch(
    "/{appointment_id}/reschedule",
    response_model=AppointmentResponse
)
def reschedule_appointment(
    appointment_id: int,
    appointment_data: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status not in ["PENDING", "CONFIRMED"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only pending or confirmed appointments "
                f"can be rescheduled. "
                f"Current status: {appointment.status}"
            )
        )

    # Validate appointment time
    if appointment_data.end_time <= appointment_data.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )

    # Validate service duration
    if appointment.service_id is not None:

        service = (
            db.query(Service)
            .filter(Service.id == appointment.service_id)
            .first()
        )

        if not service:
            raise HTTPException(
                status_code=404,
                detail="Service not found"
            )

        appointment_duration = (
            datetime.combine(
                appointment_data.appointment_date,
                appointment_data.end_time
            )
            - datetime.combine(
                appointment_data.appointment_date,
                appointment_data.start_time
            )
        )

        appointment_duration_minutes = (
            appointment_duration.total_seconds() / 60
        )

        if appointment_duration_minutes != service.duration_minutes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Appointment duration must be "
                    f"{service.duration_minutes} minutes "
                    f"for this service"
                )
            )

    # Temporarily exclude the current appointment
    # from the availability check.
    original_status = appointment.status

    appointment.status = "CANCELLED"
    db.flush()

    available = is_dentist_available(
        db=db,
        dentist_id=appointment.dentist_id,
        appointment_date=appointment_data.appointment_date,
        start_time=appointment_data.start_time,
        end_time=appointment_data.end_time
    )

    appointment.status = original_status
    db.flush()

    if not available:
        raise HTTPException(
            status_code=409,
            detail=(
                "The dentist is not available for "
                "the new date and time"
            )
        )

    # Apply new schedule
    appointment.appointment_date = (
        appointment_data.appointment_date
    )
    appointment.start_time = appointment_data.start_time
    appointment.end_time = appointment_data.end_time
    appointment.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(appointment)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "This dentist already has an "
                "overlapping appointment"
            )
        )

    return appointment