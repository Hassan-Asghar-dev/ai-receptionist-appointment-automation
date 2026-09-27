from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.conversation_session import ConversationSession
from app.models.message import Message

from app.schemas.message import (
    MessageCreate,
    MessageResponse
)

from app.security import require_staff


router = APIRouter(
    prefix="/messages",
    tags=["Messages"]
)


@router.post(
    "/",
    response_model=MessageResponse,
    status_code=201
)
def create_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    conversation = (
        db.query(ConversationSession)
        .filter(
            ConversationSession.id
            == message_data.conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation session not found"
        )

    if message_data.whatsapp_message_id:

        existing_message = (
            db.query(Message)
            .filter(
                Message.whatsapp_message_id
                == message_data.whatsapp_message_id
            )
            .first()
        )

        if existing_message:
            raise HTTPException(
                status_code=409,
                detail="A message with this WhatsApp message ID already exists"
            )

    allowed_sender_types = [
        "PATIENT",
        "AI",
        "RECEPTIONIST",
        "SYSTEM"
    ]

    if message_data.sender_type not in allowed_sender_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sender type. Allowed types: "
                + ", ".join(allowed_sender_types)
            )
        )

    if not message_data.message_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Message text cannot be empty"
        )

    now = datetime.now(timezone.utc)

    message = Message(
        conversation_id=message_data.conversation_id,
        sender_type=message_data.sender_type,
        message_text=message_data.message_text.strip(),
        whatsapp_message_id=message_data.whatsapp_message_id,
        sent_at=now
    )

    db.add(message)

    conversation.last_message_at = now
    conversation.updated_at = now

    db.commit()
    db.refresh(message)

    return message

@router.get(
    "/conversation/{conversation_id}",
    response_model=list[MessageResponse]
)
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    conversation = (
        db.query(ConversationSession)
        .filter(
            ConversationSession.id == conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation session not found"
        )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id
        )
        .order_by(Message.sent_at.asc())
        .all()
    )

    return messages