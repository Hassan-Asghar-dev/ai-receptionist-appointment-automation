from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog

from app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse
)

from app.security import require_staff


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


@router.post(
    "/",
    response_model=AuditLogResponse,
    status_code=201
)
def create_audit_log(
    audit_data: AuditLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    audit_log = AuditLog(
        user_id=current_user.id,
        action=audit_data.action,
        entity_type=audit_data.entity_type,
        entity_id=audit_data.entity_id,
        old_data=audit_data.old_data,
        new_data=audit_data.new_data,
        description=audit_data.description,
        created_at=datetime.now(timezone.utc)
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    return audit_log


@router.get(
    "/",
    response_model=list[AuditLogResponse]
)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    return logs