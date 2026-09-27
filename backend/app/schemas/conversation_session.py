from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationSessionCreate(BaseModel):
    patient_id: int
    whatsapp_number: str


class ConversationSessionUpdate(BaseModel):
    status: str | None = None
    current_intent: str | None = None
    booking_state: str | None = None
    assigned_to_user_id: int | None = None


class ConversationSessionResponse(BaseModel):
    id: int
    patient_id: int
    whatsapp_number: str
    status: str
    current_intent: str | None
    booking_state: str | None
    assigned_to_user_id: int | None
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)