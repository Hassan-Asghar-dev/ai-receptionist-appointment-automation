
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.automation_setting import AutomationSetting
from app.models.notification import Notification


def get_automation_minutes(
    db: Session,
    setting_key: str,
    default_minutes: int
) -> int:

    setting = (
        db.query(AutomationSetting)
        .filter(
            AutomationSetting.setting_key == setting_key
        )
        .first()
    )

    # If the automation is disabled, return 0.
    if not setting or not setting.is_enabled:
        return 0

    try:
        value = int(setting.setting_value)
    except (TypeError, ValueError):
        return default_minutes

    if value <= 0:
        return default_minutes

    return value


def create_appointment_reminders(
    db: Session,
    appointment: Appointment
) -> list[Notification]:

    karachi_timezone = ZoneInfo("Asia/Karachi")

    appointment_datetime = datetime.combine(
        appointment.appointment_date,
        appointment.start_time
    ).replace(tzinfo=karachi_timezone)

    reminder_settings = [
        (
            "REMINDER_24_HOURS",
            "24_HOUR_REMINDER"
        ),
        (
            "REMINDER_2_HOURS",
            "2_HOUR_REMINDER"
        ),
        (
            "REMINDER_FINAL_MINUTES",
            "FINAL_REMINDER"
        )
    ]

    created_notifications = []

    for setting_key, notification_type in reminder_settings:

        # Calculate reminder time
        if setting_key == "REMINDER_FINAL_MINUTES":

            minutes = get_automation_minutes(
                db=db,
                setting_key=setting_key,
                default_minutes=30
            )

            # Automation disabled
            if minutes == 0:
                continue

            reminder_time = (
                appointment_datetime
                - timedelta(minutes=minutes)
            )

        elif setting_key == "REMINDER_24_HOURS":

            hours = get_automation_minutes(
                db=db,
                setting_key=setting_key,
                default_minutes=24
            )

            # Automation disabled
            if hours == 0:
                continue

            reminder_time = (
                appointment_datetime
                - timedelta(hours=hours)
            )

        else:

            hours = get_automation_minutes(
                db=db,
                setting_key=setting_key,
                default_minutes=2
            )

            # Automation disabled
            if hours == 0:
                continue

            reminder_time = (
                appointment_datetime
                - timedelta(hours=hours)
            )

        # Do not create reminders that are already in the past.
        current_time = datetime.now(karachi_timezone)

        if reminder_time <= current_time:
            continue

        # Prevent duplicate reminders.
        existing_notification = (
            db.query(Notification)
            .filter(
                Notification.appointment_id == appointment.id,
                Notification.type == notification_type
            )
            .first()
        )

        if existing_notification:
            continue

        # Create notification.
        notification = Notification(
            user_id=None,
            patient_id=appointment.patient_id,
            appointment_id=appointment.id,
            type=notification_type,
            title="Upcoming Dental Appointment",
            message=(
                "You have an upcoming dental appointment."
            ),
            scheduled_for=reminder_time,
            sent_at=None,
            status="PENDING",
            created_at=current_time
        )

        db.add(notification)
        created_notifications.append(notification)

    db.commit()

    for notification in created_notifications:
        db.refresh(notification)

    return created_notifications

