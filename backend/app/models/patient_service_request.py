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


class PatientServiceRequest(Base):
    __tablename__ = "patient_service_requests"

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

    appointment_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "appointments.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    requested_service: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING"
    )

    resolved_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "users.id",
            ondelete="SET NULL"
        ),
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