from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.service import Service
from app.models.service_price_history import ServicePriceHistory
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceStatusUpdate
)
from app.security import require_staff


router = APIRouter(
    prefix="/services",
    tags=["Services"]
)


@router.post(
    "/",
    response_model=ServiceResponse,
    status_code=201
)
def create_service(
    service_data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    existing_service = (
        db.query(Service)
        .filter(Service.name == service_data.name)
        .first()
    )

    if existing_service:
        raise HTTPException(
            status_code=400,
            detail="A service with this name already exists"
        )

    current_time = datetime.now(timezone.utc)

    new_service = Service(
        name=service_data.name,
        description=service_data.description,
        duration_minutes=service_data.duration_minutes,
        price=service_data.price,
        is_active=True,
        created_at=current_time,
        updated_at=current_time
    )

    db.add(new_service)

    try:
        db.commit()
        db.refresh(new_service)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="A service with this name already exists"
        )

    return new_service


@router.get(
    "/",
    response_model=list[ServiceResponse]
)
def get_services(
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    services = (
        db.query(Service)
        .order_by(Service.id.desc())
        .all()
    )

    return services


@router.get(
    "/{service_id}",
    response_model=ServiceResponse
)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    return service


@router.put(
    "/{service_id}",
    response_model=ServiceResponse
)
def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    update_data = service_data.model_dump(
        exclude_unset=True
    )

    if "name" in update_data:
        existing_service = (
            db.query(Service)
            .filter(
                Service.name == update_data["name"],
                Service.id != service_id
            )
            .first()
        )

        if existing_service:
            raise HTTPException(
                status_code=400,
                detail="Another service already uses this name"
            )

    old_price = service.price

    if "price" in update_data:
        new_price = update_data["price"]

        if new_price != old_price:
            price_history = ServicePriceHistory(
                service_id=service.id,
                old_price=old_price,
                new_price=new_price,
                changed_by_user_id=current_user.id,
                changed_at=datetime.now(timezone.utc)
            )

            db.add(price_history)

    for field, value in update_data.items():
        setattr(service, field, value)

    service.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(service)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update service"
        )

    return service


@router.delete(
    "/{service_id}",
    response_model=ServiceResponse
)
def deactivate_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    service.is_active = False
    service.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(service)

    return service

@router.patch(
    "/{service_id}/status",
    response_model=ServiceResponse
)
def update_service_status(
    service_id: int,
    status_data: ServiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_staff)
):
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    service.is_active = status_data.is_active
    service.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(service)

    return service