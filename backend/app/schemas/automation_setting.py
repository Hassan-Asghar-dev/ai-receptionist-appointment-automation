from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AutomationSettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: str | None
    is_enabled: bool
    updated_by_user_id: int | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AutomationSettingUpdate(BaseModel):
    setting_value: str | None = None
    is_enabled: bool | None = None