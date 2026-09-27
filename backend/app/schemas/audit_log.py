from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: int | None = None
    old_data: dict | None = None
    new_data: dict | None = None
    description: str | None = None


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    old_data: dict | None
    new_data: dict | None
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)