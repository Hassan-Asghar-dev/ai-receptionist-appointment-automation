from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    String,
    Text
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    conversation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "conversation_sessions.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    sender_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    message_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    whatsapp_message_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )