from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClinicSetting(Base):
    __tablename__ = "clinic_settings"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    setting_key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    setting_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    updated_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )