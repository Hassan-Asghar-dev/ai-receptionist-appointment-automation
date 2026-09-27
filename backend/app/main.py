from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.routers.user import router as user_router
from app.routers.auth import router as auth_router
from app.routers.patient import router as patient_router
from app.routers.dentist import router as dentist_router
from app.routers.service import router as service_router
from app.routers.working_day import router as working_day_router
from app.routers.working_hour import router as working_hour_router
from app.routers.appointment import router as appointment_router
from app.routers.availability import router as availability_router
from app.routers import clinic_setting
from app.routers import automation_setting
from app.routers.patient_service_request import router as patient_service_request_router
from app.routers.conversation_session import (
    router as conversation_session_router
)
from app.routers.message import router as message_router
from app.routers.audit_log import router as audit_log_router
from app.routers.notification import router as notification_router
from app.routers.booking_state import router as booking_state_router



app = FastAPI(
    title="Dental Clinic API",
    description="Backend API for the Dental Clinic Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)

app.include_router(auth_router)

app.include_router(patient_router)

app.include_router(dentist_router)

app.include_router(service_router)

app.include_router(working_day_router)

app.include_router(working_hour_router)

app.include_router(appointment_router)

app.include_router(availability_router)

app.include_router(booking_state_router)

app.include_router(clinic_setting.router)

app.include_router(automation_setting.router)

app.include_router(patient_service_request_router)

app.include_router(conversation_session_router)

app.include_router(message_router)

app.include_router(audit_log_router)

app.include_router(notification_router)

@app.get("/")
def root():
    return {
        "message": "Dental Clinic API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/database-test")
def database_test():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            value = result.scalar()

        return {
            "database": "connected",
            "test_result": value
        }

    except Exception as error:
        return {
            "database": "connection_failed",
            "error": str(error)
        }