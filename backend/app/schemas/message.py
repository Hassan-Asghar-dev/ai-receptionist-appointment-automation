from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    conversation_id: int
    sender_type: str
    message_text: str
    whatsapp_message_id: str | None = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_type: str
    message_text: str
    whatsapp_message_id: str | None
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)