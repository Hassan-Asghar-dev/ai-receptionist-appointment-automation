from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.clinic_setting import ClinicSetting
from app.schemas.clinic_setting import ClinicSettingResponse
from app.schemas.clinic_setting import (
    ClinicSettingResponse,
    ClinicSettingUpdate
)
from app.security import require_staff
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone


router = APIRouter(
    prefix="/clinic-settings",
    tags=["Clinic Settings"]
)


@router.get(
    "/",
    response_model=list[ClinicSettingResponse]
)
def get_clinic_settings(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    settings = (
        db.query(ClinicSetting)
        .order_by(ClinicSetting.id)
        .all()
    )

    return settings

@router.patch(
    "/{setting_key}",
    response_model=ClinicSettingResponse
)
def update_clinic_setting(
    setting_key: str,
    setting_data: ClinicSettingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    setting = (
        db.query(ClinicSetting)
        .filter(ClinicSetting.setting_key == setting_key)
        .first()
    )

    if not setting:
        raise HTTPException(
            status_code=404,
            detail="Clinic setting not found"
        )

    new_value = setting_data.setting_value

    # Validate appointment slot interval
    if setting_key == "appointment_slot_interval_minutes":

        if new_value is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Appointment slot interval "
                    "cannot be empty"
                )
            )

        try:
            interval = int(new_value)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Appointment slot interval "
                    "must be a positive integer"
                )
            )

        if interval <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Appointment slot interval "
                    "must be greater than 0"
                )
            )

    # Validate timezone
    if setting_key == "timezone":

        if new_value is None or not new_value.strip():
            raise HTTPException(
                status_code=400,
                detail="Timezone cannot be empty"
            )

        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(new_value)
        except ZoneInfoNotFoundError:
            raise HTTPException(
                status_code=400,
                detail="Invalid timezone"
            )

    setting.setting_value = new_value
    setting.updated_by_user_id = current_user.id
    setting.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(setting)

    return setting