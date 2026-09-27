from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.dentist import Dentist
from app.models.service import Service
from app.models.working_day import WorkingDay
from app.models.working_hour import WorkingHour
from app.models.clinic_setting import ClinicSetting


def is_dentist_available(
    db: Session,
    dentist_id: int,
    appointment_date: date,
    start_time: time,
    end_time: time
) -> bool:

    # 1. Check whether the dentist exists and is active
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist or not dentist.is_active:
        return False

    # 2. Check whether the dentist works on this day
    day_of_week = (appointment_date.weekday() + 1) % 7

    working_day = (
        db.query(WorkingDay)
        .filter(
            WorkingDay.dentist_id == dentist_id,
            WorkingDay.day_of_week == day_of_week
        )
        .first()
    )

    if not working_day or not working_day.is_working:
        return False

    # 3. Get the dentist's working hours
    working_hour = (
        db.query(WorkingHour)
        .filter(
            WorkingHour.dentist_id == dentist_id,
            WorkingHour.day_of_week == day_of_week
        )
        .first()
    )

    if not working_hour:
        return False

    # 4. Check that appointment is inside working hours
    if (
        start_time < working_hour.start_time
        or end_time > working_hour.end_time
    ):
        return False

    # 5. Check that appointment doesn't overlap the break
    if (
        working_hour.break_start is not None
        and working_hour.break_end is not None
    ):
        if (
            start_time < working_hour.break_end
            and end_time > working_hour.break_start
        ):
            return False

    # 6. Check existing appointments
    existing_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.dentist_id == dentist_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(["PENDING", "CONFIRMED"])
        )
        .all()
    )

    for appointment in existing_appointments:
        if (
            start_time < appointment.end_time
            and end_time > appointment.start_time
        ):
            return False

    return True


def get_available_slots(
    db: Session,
    dentist_id: int,
    appointment_date: date,
    service_id: int
) -> tuple[int, int, list[dict]]:

    # Default slot interval
    default_slot_interval_minutes = 15

    # 1. Check dentist
    dentist = (
        db.query(Dentist)
        .filter(Dentist.id == dentist_id)
        .first()
    )

    if not dentist or not dentist.is_active:
        return 0, default_slot_interval_minutes, []

    # 2. Get service and its actual duration from PostgreSQL
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service or not service.is_active:
        return 0, default_slot_interval_minutes, []

    duration_minutes = service.duration_minutes

    # 3. Get appointment slot interval from clinic settings
    slot_interval_setting = (
        db.query(ClinicSetting)
        .filter(
            ClinicSetting.setting_key
            == "appointment_slot_interval_minutes"
        )
        .first()
    )

    if not slot_interval_setting:
        slot_interval_minutes = default_slot_interval_minutes
    else:
        try:
            slot_interval_minutes = int(
                slot_interval_setting.setting_value
            )
        except (TypeError, ValueError):
            slot_interval_minutes = default_slot_interval_minutes

    if slot_interval_minutes <= 0:
        slot_interval_minutes = default_slot_interval_minutes

    # 4. Determine day of week
    day_of_week = (appointment_date.weekday() + 1) % 7

    # 5. Check working day
    working_day = (
        db.query(WorkingDay)
        .filter(
            WorkingDay.dentist_id == dentist_id,
            WorkingDay.day_of_week == day_of_week
        )
        .first()
    )

    if not working_day or not working_day.is_working:
        return duration_minutes, slot_interval_minutes, []

    # 6. Get working hours
    working_hour = (
        db.query(WorkingHour)
        .filter(
            WorkingHour.dentist_id == dentist_id,
            WorkingHour.day_of_week == day_of_week
        )
        .first()
    )

    if not working_hour:
        return duration_minutes, slot_interval_minutes, []

    # 7. Get existing appointments
    existing_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.dentist_id == dentist_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(["PENDING", "CONFIRMED"])
        )
        .all()
    )

    slots = []

    current_start = datetime.combine(
        appointment_date,
        working_hour.start_time
    )

    working_end = datetime.combine(
        appointment_date,
        working_hour.end_time
    )

    slot_duration = timedelta(minutes=duration_minutes)
    slot_interval = timedelta(minutes=slot_interval_minutes)

    # 8. Generate available slots
    while current_start + slot_duration <= working_end:

        current_end = current_start + slot_duration

        start_time = current_start.time()
        end_time = current_end.time()

        # Check break conflict
        break_conflict = False

        if (
            working_hour.break_start is not None
            and working_hour.break_end is not None
        ):
            if (
                start_time < working_hour.break_end
                and end_time > working_hour.break_start
            ):
                break_conflict = True

        # Check appointment conflict
        appointment_conflict = False

        for appointment in existing_appointments:
            if (
                start_time < appointment.end_time
                and end_time > appointment.start_time
            ):
                appointment_conflict = True
                break

        if not break_conflict and not appointment_conflict:
            slots.append({
                "start_time": start_time,
                "end_time": end_time
            })

        current_start += slot_interval

    return duration_minutes, slot_interval_minutes, slots