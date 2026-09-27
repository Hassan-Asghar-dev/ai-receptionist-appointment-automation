from datetime import datetime, timezone
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.services.reminders import (
    create_appointment_reminders
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification

from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse
)

from app.security import require_staff, verify_n8n_api_key

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.post(
    "/",
    response_model=NotificationResponse,
    status_code=201
)
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    if not notification_data.type.strip():
        raise HTTPException(
            status_code=400,
            detail="Notification type cannot be empty"
        )

    if not notification_data.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Notification title cannot be empty"
        )

    if not notification_data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Notification message cannot be empty"
        )

    notification = Notification(
        user_id=notification_data.user_id,
        patient_id=notification_data.patient_id,
        appointment_id=notification_data.appointment_id,
        type=notification_data.type.strip(),
        title=notification_data.title.strip(),
        message=notification_data.message.strip(),
        scheduled_for=notification_data.scheduled_for,
        sent_at=None,
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


@router.get(
    "/",
    response_model=list[NotificationResponse]
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    notifications = (
        db.query(Notification)
        .order_by(Notification.scheduled_for.asc())
        .all()
    )

    return notifications


@router.get(
    "/due",
    response_model=list[NotificationResponse]
)
def get_due_notifications(
    db: Session = Depends(get_db),
    _n8n_authenticated=Depends(verify_n8n_api_key)
):
    current_time = datetime.now(timezone.utc)

    notifications = (
        db.query(Notification)
        .filter(
            Notification.status == "PENDING",
            Notification.scheduled_for <= current_time
        )
        .order_by(Notification.scheduled_for.asc())
        .all()
    )

    return notifications


@router.get(
    "/due-with-patient"
)
def get_due_notifications_with_patient(
    db: Session = Depends(get_db),
    _n8n_authenticated=Depends(verify_n8n_api_key)
):
    current_time = datetime.now(timezone.utc)

    results = (
        db.query(
            Notification,
            Patient.full_name.label("patient_name"),
            Patient.whatsapp_number.label("whatsapp_number"),
            Appointment.appointment_date.label("appointment_date"),
            Appointment.start_time.label("start_time"),
            Appointment.end_time.label("end_time")
        )
        .join(
            Patient,
            Patient.id == Notification.patient_id
        )
        .outerjoin(
            Appointment,
            Appointment.id == Notification.appointment_id
        )
        .filter(
            Notification.status == "PENDING",
            Notification.scheduled_for <= current_time
        )
        .order_by(
            Notification.scheduled_for.asc()
        )
        .all()
    )

    response = []

    for notification, patient_name, whatsapp_number, appointment_date, start_time, end_time in results:
        response.append({
            "id": notification.id,
            "patient_id": notification.patient_id,
            "patient_name": patient_name,
            "whatsapp_number": whatsapp_number,
            "appointment_id": notification.appointment_id,
            "appointment_date": appointment_date,
            "start_time": start_time,
            "end_time": end_time,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "scheduled_for": notification.scheduled_for,
            "status": notification.status
        })

    return response


@router.patch(
    "/{notification_id}/sent",
    response_model=NotificationResponse
)
def mark_notification_sent(
    notification_id: int,
    db: Session = Depends(get_db),
    _n8n_authenticated=Depends(verify_n8n_api_key)
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.status = "SENT"

    if notification.sent_at is None:
        notification.sent_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notification)

    return notification






@router.get(
    "/{notification_id}",
    response_model=NotificationResponse
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification


@router.patch(
    "/{notification_id}",
    response_model=NotificationResponse
)
def update_notification(
    notification_id: int,
    notification_data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    allowed_statuses = [
        "PENDING",
        "SENT",
        "READ",
        "FAILED"
    ]

    if notification_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid notification status. "
                "Allowed statuses: "
                + ", ".join(allowed_statuses)
            )
        )

    notification.status = notification_data.status

    if notification_data.status == "SENT":
        notification.sent_at = (
            notification_data.sent_at
            or datetime.now(timezone.utc)
        )

    elif notification_data.sent_at is not None:
        notification.sent_at = notification_data.sent_at

    notification_updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notification)

    return notification

@router.post(
    "/appointment/{appointment_id}/generate-reminders",
    response_model=list[NotificationResponse]
)
def generate_appointment_reminders(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.status not in [
        "PENDING",
        "CONFIRMED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Reminders can only be generated "
                "for pending or confirmed appointments"
            )
        )

    notifications = create_appointment_reminders(
        db=db,
        appointment=appointment
    )

    return notifications


