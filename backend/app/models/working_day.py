from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkingDay(Base):
    __tablename__ = "working_days"

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

    is_working: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )