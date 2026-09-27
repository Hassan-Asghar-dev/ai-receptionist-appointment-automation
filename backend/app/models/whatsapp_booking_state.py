from datetime import datetime, time

from sqlalchemy import DateTime, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WhatsAppBookingState(Base):
    __tablename__ = "whatsapp_booking_state"

    whatsapp_number: Mapped[str] = mapped_column(
        String(30),
        primary_key=True
    )

    service_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    dentist_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    appointment_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    appointment_month: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    appointment_day: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    selected_time: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )