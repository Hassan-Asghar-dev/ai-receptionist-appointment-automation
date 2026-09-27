from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.automation_setting import AutomationSetting
from app.schemas.automation_setting import (
    AutomationSettingResponse,
    AutomationSettingUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/automation-settings",
    tags=["Automation Settings"]
)


@router.get(
    "/",
    response_model=list[AutomationSettingResponse]
)
def get_automation_settings(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    settings = (
        db.query(AutomationSetting)
        .order_by(AutomationSetting.id)
        .all()
    )

    return settings

@router.patch(
    "/{setting_key}",
    response_model=AutomationSettingResponse
)
def update_automation_setting(
    setting_key: str,
    setting_data: AutomationSettingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    setting = (
        db.query(AutomationSetting)
        .filter(
            AutomationSetting.setting_key == setting_key
        )
        .first()
    )

    if not setting:
        raise HTTPException(
            status_code=404,
            detail="Automation setting not found"
        )

    # Update reminder timing if provided
    if setting_data.setting_value is not None:

        try:
            value = int(setting_data.setting_value)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Reminder timing must be "
                    "a positive integer"
                )
            )

        if value <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Reminder timing must be "
                    "greater than 0"
                )
            )

        setting.setting_value = setting_data.setting_value

    # Update enabled/disabled state if provided
    if setting_data.is_enabled is not None:
        setting.is_enabled = setting_data.is_enabled

    setting.updated_by_user_id = current_user.id
    setting.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(setting)

    return setting