from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.models.patient_service_request import PatientServiceRequest
from app.models.user import User

from app.schemas.patient_service_request import (
    PatientServiceRequestCreate,
    PatientServiceRequestUpdate,
    PatientServiceRequestResponse
)

from app.security import require_staff


router = APIRouter(
    prefix="/patient-service-requests",
    tags=["Other Service Requests"]
)


@router.post(
    "/",
    response_model=PatientServiceRequestResponse,
    status_code=201
)
def create_service_request(
    request_data: PatientServiceRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == request_data.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if not patient.is_active:
        raise HTTPException(
            status_code=400,
            detail="Patient is inactive"
        )

    if not request_data.requested_service.strip():
        raise HTTPException(
            status_code=400,
            detail="Requested service cannot be empty"
        )

    service_request = PatientServiceRequest(
        patient_id=request_data.patient_id,
        appointment_id=request_data.appointment_id,
        requested_service=request_data.requested_service.strip(),
        description=request_data.description,
        status="PENDING",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(service_request)

    try:
        db.commit()
        db.refresh(service_request)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to create service request"
        )

    return service_request


@router.get(
    "/",
    response_model=list[PatientServiceRequestResponse]
)
def get_service_requests(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    requests = (
        db.query(PatientServiceRequest)
        .order_by(
            PatientServiceRequest.created_at.desc()
        )
        .all()
    )

    return requests


@router.get(
    "/{request_id}",
    response_model=PatientServiceRequestResponse
)
def get_service_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service_request = (
        db.query(PatientServiceRequest)
        .filter(
            PatientServiceRequest.id == request_id
        )
        .first()
    )

    if not service_request:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    return service_request


@router.patch(
    "/{request_id}",
    response_model=PatientServiceRequestResponse
)
def update_service_request(
    request_id: int,
    request_data: PatientServiceRequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service_request = (
        db.query(PatientServiceRequest)
        .filter(
            PatientServiceRequest.id == request_id
        )
        .first()
    )

    if not service_request:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    allowed_statuses = [
        "PENDING",
        "IN_PROGRESS",
        "RESOLVED",
        "CANCELLED"
    ]

    if request_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed statuses: "
                + ", ".join(allowed_statuses)
            )
        )

    service_request.status = request_data.status

    if request_data.status == "RESOLVED":
        service_request.resolved_by_user_id = current_user.id

    elif request_data.status != "RESOLVED":
        service_request.resolved_by_user_id = None

    service_request.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(service_request)

    return service_request