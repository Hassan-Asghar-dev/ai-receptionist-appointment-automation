from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    String
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    patient_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "patients.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    whatsapp_number: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="AI_ACTIVE"
    )

    current_intent: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    booking_state: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    assigned_to_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )