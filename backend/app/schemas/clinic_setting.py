from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClinicSettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: str | None
    updated_by_user_id: int | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClinicSettingUpdate(BaseModel):
    setting_value: str | None