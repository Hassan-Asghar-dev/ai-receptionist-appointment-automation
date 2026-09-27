from datetime import time

from sqlalchemy import BigInteger, ForeignKey, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkingHour(Base):
    __tablename__ = "working_hours"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    dentist_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("dentists.id", ondelete="CASCADE"),
        nullable=False
    )

    day_of_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    break_start: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    break_end: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )