from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientStatusUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post(
    "/",
    response_model=PatientResponse,
    status_code=201
)
def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
       # Normalize WhatsApp number
    normalized_number = patient_data.whatsapp_number.strip()

    if not normalized_number.startswith("+"):
      normalized_number = "+" + normalized_number

    existing_patient = (
    db.query(Patient)
    .filter(
        Patient.whatsapp_number == normalized_number
    )
    .first()
)

    if existing_patient:
        raise HTTPException(
            status_code=400,
            detail="A patient with this WhatsApp number already exists"
        )

    current_time = datetime.now(timezone.utc)

    new_patient = Patient(
        full_name=patient_data.full_name,
        whatsapp_number=normalized_number,
        email=patient_data.email,
        medical_history=patient_data.medical_history,
        allergies=patient_data.allergies,
        notes=patient_data.notes,
        is_active=True,
        created_at=current_time,
        updated_at=current_time
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


@router.get(
    "/",
    response_model=list[PatientResponse]
)
def get_patients(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patients = (
        db.query(Patient)
        .order_by(Patient.id.desc())
        .all()
    )

    return patients

@router.get("/by-whatsapp/{whatsapp_number}")
def get_patient_by_whatsapp(
    whatsapp_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    # Normalize WhatsApp number to the format stored in PostgreSQL
    normalized_number = whatsapp_number.strip()

    if not normalized_number.startswith("+"):
        normalized_number = "+" + normalized_number

    patient = (
        db.query(Patient)
        .filter(
            Patient.whatsapp_number == normalized_number
        )
        .first()
    )

    if not patient:
        return {
            "exists": False,
            "patient": None
        }

    return {
        "exists": True,
        "patient": {
            "id": patient.id,
            "full_name": patient.full_name,
            "whatsapp_number": patient.whatsapp_number,
            "email": patient.email,
            "medical_history": patient.medical_history,
            "allergies": patient.allergies,
            "notes": patient.notes,
            "is_active": patient.is_active
        }
    }

@router.get(
    "/{patient_id}",
    response_model=PatientResponse
)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


@router.put(
    "/{patient_id}",
    response_model=PatientResponse
)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    update_data = patient_data.model_dump(
        exclude_unset=True
    )

    if "whatsapp_number" in update_data:
        existing_patient = (
            db.query(Patient)
            .filter(
                Patient.whatsapp_number
                == update_data["whatsapp_number"],
                Patient.id != patient_id
            )
            .first()
        )

        if existing_patient:
            raise HTTPException(
                status_code=400,
                detail="Another patient already uses this WhatsApp number"
            )

    for field, value in update_data.items():
        setattr(patient, field, value)

    patient.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(patient)

    return patient


@router.delete(
    "/{patient_id}",
    response_model=PatientResponse
)
def deactivate_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    patient.is_active = False
    patient.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(patient)

    return patient

@router.patch(
    "/{patient_id}/status",
    response_model=PatientResponse
)
def update_patient_status(
    patient_id: int,
    status_data: PatientStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    patient.is_active = status_data.is_active
    patient.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(patient)

    return patient


