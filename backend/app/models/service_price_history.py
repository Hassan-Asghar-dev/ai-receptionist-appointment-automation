from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ServicePriceHistory(Base):
    __tablename__ = "service_price_history"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        index=True
    )

    service_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("services.id"),
        nullable=False
    )

    old_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    new_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    changed_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )