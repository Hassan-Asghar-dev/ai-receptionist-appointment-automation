from datetime import datetime, timezone

import os

import httpx

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import Session

from sqlalchemy import text

from app.database import get_db, get_n8n_db

from app.models.conversation_session import ConversationSession

from app.models.patient import Patient

from app.models.user import User

from app.models.message import Message

from pydantic import BaseModel

from app.schemas.conversation_session import (

    ConversationSessionCreate,

    ConversationSessionUpdate,

    ConversationSessionResponse

)


from app.security import require_staff


class ReceptionistReplyRequest(BaseModel):

    message: str


router = APIRouter(

    prefix="/conversation-sessions",

    tags=["Conversation Sessions"]

)


@router.post(

    "/",

    response_model=ConversationSessionResponse,

    status_code=201

)

def create_conversation_session(

    session_data: ConversationSessionCreate,

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    patient = (

        db.query(Patient)

        .filter(Patient.id == session_data.patient_id)

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


    conversation = ConversationSession(

        patient_id=patient.id,

        whatsapp_number=patient.whatsapp_number,

        status="AI_ACTIVE",

        current_intent=None,

        booking_state=None,

        assigned_to_user_id=None,

        last_message_at=None,

        created_at=datetime.now(timezone.utc),

        updated_at=datetime.now(timezone.utc)

    )


    db.add(conversation)


    try:

        db.commit()

        db.refresh(conversation)


    except IntegrityError:

        db.rollback()


        raise HTTPException(

            status_code=400,

            detail="Unable to create conversation session"

        )


    return conversation


@router.get(

    "/",

    response_model=list[ConversationSessionResponse]

)

def get_conversation_sessions(

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    conversations = (

        db.query(ConversationSession)

        .order_by(

            ConversationSession.updated_at.desc()

        )

        .all()

    )


    return conversations


@router.get("/by-whatsapp/{whatsapp_number}")

def get_conversation_by_whatsapp(

    whatsapp_number: str,

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    normalized_number = whatsapp_number.strip()


    if not normalized_number.startswith("+"):

        normalized_number = "+" + normalized_number


    conversation = (

        db.query(ConversationSession)

        .filter(

            ConversationSession.whatsapp_number == normalized_number

        )

        .order_by(ConversationSession.updated_at.desc())

        .first()

    )


    if not conversation:

        return {

            "exists": False,

            "conversation_id": None,

            "status": "AI_ACTIVE"

        }


    return {

        "exists": True,

        "conversation_id": conversation.id,

        "patient_id": conversation.patient_id,

        "whatsapp_number": conversation.whatsapp_number,

        "status": conversation.status,

        "assigned_to_user_id": conversation.assigned_to_user_id

    }


@router.get(

    "/{conversation_id}",

    response_model=ConversationSessionResponse

)

def get_conversation_session(

    conversation_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    conversation = (

        db.query(ConversationSession)

        .filter(

            ConversationSession.id == conversation_id

        )

        .first()

    )


    if not conversation:

        raise HTTPException(

            status_code=404,

            detail="Conversation session not found"

        )


    return conversation


@router.patch(

    "/{conversation_id}",

    response_model=ConversationSessionResponse

)

def update_conversation_session(

    conversation_id: int,

    session_data: ConversationSessionUpdate,

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    conversation = (

        db.query(ConversationSession)

        .filter(

            ConversationSession.id == conversation_id

        )

        .first()

    )


    if not conversation:

        raise HTTPException(

            status_code=404,

            detail="Conversation session not found"

        )


    allowed_statuses = [

        "AI_ACTIVE",

        "HUMAN_REQUIRED",

        "HUMAN_ACTIVE",

        "CLOSED"

    ]


    if session_data.status is not None:


        if session_data.status not in allowed_statuses:

            raise HTTPException(

                status_code=400,

                detail=(

                    "Invalid conversation status. "

                    "Allowed statuses: "

                    + ", ".join(allowed_statuses)

                )

            )


        conversation.status = session_data.status


    if session_data.current_intent is not None:

        conversation.current_intent = (

            session_data.current_intent

        )


    if session_data.booking_state is not None:

        conversation.booking_state = (

            session_data.booking_state

        )


    if session_data.assigned_to_user_id is not None:


        user = (

            db.query(User)

            .filter(

                User.id

                == session_data.assigned_to_user_id

            )

            .first()

        )


        if not user:

            raise HTTPException(

                status_code=404,

                detail="Assigned user not found"

            )


        if not user.is_active:

            raise HTTPException(

                status_code=400,

                detail="Assigned user is inactive"

            )


        if user.role not in ["ADMIN", "RECEPTIONIST"]:

            raise HTTPException(

                status_code=400,

                detail="Assigned user must be staff"

            )


        conversation.assigned_to_user_id = (

            session_data.assigned_to_user_id

        )


    conversation.updated_at = datetime.now(timezone.utc)


    db.commit()

    db.refresh(conversation)


    return conversation


# ============================================================
# N8N / AI HANDOVER
# ============================================================

@router.post("/by-whatsapp/{whatsapp_number}/request-human")
def request_human_receptionist(
    whatsapp_number: str,
    db: Session = Depends(get_db)
):
    """
    Called by the n8n AI Agent when the patient asks for a human
    receptionist or when the AI decides a human handover is needed.

    This endpoint intentionally does not use require_staff because
    n8n is not logged in as a dashboard staff user.
    """

    normalized_number = (
        whatsapp_number
        .strip()
        .replace(" ", "")
        .replace("-", "")
    )

    if not normalized_number.startswith("+"):
        normalized_number = "+" + normalized_number

    conversation = (
        db.query(ConversationSession)
        .filter(
            ConversationSession.whatsapp_number == normalized_number
        )
        .order_by(ConversationSession.updated_at.desc())
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation session not found"
        )

    # Do not disturb a receptionist who already has control.
    if conversation.status == "HUMAN_ACTIVE":
        return {
            "success": True,
            "conversation_id": conversation.id,
            "status": conversation.status,
            "handover_requested": False,
            "message": "Conversation is already under human control"
        }

    # A closed conversation should not silently be reopened by AI.
    if conversation.status == "CLOSED":
        raise HTTPException(
            status_code=400,
            detail="Closed conversation cannot request human handover"
        )

    now = datetime.now(timezone.utc)

    conversation.status = "HUMAN_REQUIRED"
    conversation.assigned_to_user_id = None
    conversation.updated_at = now

    db.commit()
    db.refresh(conversation)

    return {
        "success": True,
        "conversation_id": conversation.id,
        "patient_id": conversation.patient_id,
        "whatsapp_number": conversation.whatsapp_number,
        "status": conversation.status,
        "handover_requested": True,
        "message": "Human receptionist requested"
    }


@router.get("/{conversation_id}/whatsapp-history")

def get_whatsapp_history(

    conversation_id: int,

    db: Session = Depends(get_db),

    n8n_db: Session = Depends(get_n8n_db),

    current_user=Depends(require_staff)

):

    # --------------------------------------------------------

    # 1. Find conversation

    # --------------------------------------------------------


    conversation = (

        db.query(ConversationSession)

        .filter(

            ConversationSession.id == conversation_id

        )

        .first()

    )


    if not conversation:

        raise HTTPException(

            status_code=404,

            detail="Conversation session not found"

        )


    # --------------------------------------------------------

    # 2. Find patient

    # --------------------------------------------------------


    patient = (

        db.query(Patient)

        .filter(

            Patient.id == conversation.patient_id

        )

        .first()

    )


    if not patient:

        raise HTTPException(

            status_code=404,

            detail="Patient not found"

        )


    if not patient.whatsapp_number:

        raise HTTPException(

            status_code=400,

            detail="Patient does not have a WhatsApp number"

        )


    # --------------------------------------------------------

    # 3. Build n8n session ID

    # --------------------------------------------------------


    normalized_number = (

        patient.whatsapp_number

        .strip()

        .replace(" ", "")

        .replace("-", "")

    )


    if normalized_number.startswith("+"):

        normalized_number = normalized_number[1:]


    session_id = f"{normalized_number}_booking"


    # --------------------------------------------------------

    # 4. Read ALL real clinic messages

    #

    # These messages have proper timestamps.

    # This now includes:

    # - PATIENT messages saved by n8n

    # - RECEPTIONIST messages sent from dashboard

    # --------------------------------------------------------


    clinic_messages = (

        db.query(Message)

        .filter(

            Message.conversation_id == conversation.id

        )

        .order_by(

            Message.sent_at.asc(),

            Message.id.asc()

        )

        .all()

    )


    # --------------------------------------------------------

    # 5. Build a set of patient WhatsApp message IDs

    #

    # This helps us know which messages are already stored

    # properly in dental_clinic.

    # --------------------------------------------------------


    clinic_patient_texts = set()


    for clinic_message in clinic_messages:

        if clinic_message.sender_type == "PATIENT":

            if clinic_message.message_text:

                clinic_patient_texts.add(

                    clinic_message.message_text.strip()

                )


    # --------------------------------------------------------

    # 6. Read old n8n chat memory

    #

    # We still need this because historical Patient + AI

    # messages were never stored in dental_clinic.messages.

    # --------------------------------------------------------


    query = text("""

        SELECT

            id,

            session_id,

            message

        FROM whatsapp_chat_memory

        WHERE session_id = :session_id

        ORDER BY id ASC

    """)


    rows = (

        n8n_db.execute(

            query,

            {"session_id": session_id}

        )

        .mappings()

        .all()

    )


    # --------------------------------------------------------

    # 7. Build OLD n8n history

    # --------------------------------------------------------


    old_history = []


    for row in rows:

        message = row["message"]


        if not isinstance(message, dict):

            continue


        message_type = message.get("type")

        content = message.get("content")


        if not isinstance(content, str):

            continue


        content = content.strip()


        if not content:

            continue


        # ----------------------------------------------------

        # Patient message

        # ----------------------------------------------------


        if message_type == "human":


            # If this patient message has already been saved

            # into dental_clinic.messages, do not show the

            # n8n copy as well.

            if content in clinic_patient_texts:

                continue


            sender_type = "PATIENT"


        # ----------------------------------------------------

        # AI message

        # ----------------------------------------------------


        elif message_type == "ai":


            # Ignore internal AI tool calls

            if content.lower().startswith("calling "):

                continue


            sender_type = "AI"


        # ----------------------------------------------------

        # Ignore tool/system/internal memory rows

        # ----------------------------------------------------


        else:

            continue


        old_history.append({

            "id": f"n8n_{row['id']}",

            "sender_type": sender_type,

            "message_text": content,

            "sent_at": None,

            "source": "N8N_MEMORY"

        })


    # --------------------------------------------------------

    # 8. Build NEW chronological clinic history

    # --------------------------------------------------------


    live_history = []


    for clinic_message in clinic_messages:


        # Only expose actual conversation messages

        if clinic_message.sender_type not in [

            "PATIENT",

            "RECEPTIONIST",

            "AI"

        ]:

            continue


        live_history.append({

            "id": f"clinic_{clinic_message.id}",

            "sender_type": clinic_message.sender_type,

            "message_text": clinic_message.message_text,

            "sent_at": clinic_message.sent_at,

            "source": (

                "DASHBOARD"

                if clinic_message.sender_type == "RECEPTIONIST"

                else "CLINIC_DATABASE"

            )

        })


    # --------------------------------------------------------

    # 9. Combine history

    #

    # Historical n8n messages have no timestamps, so they

    # remain first.

    #

    # All messages stored in dental_clinic.messages are

    # properly ordered by sent_at.

    # --------------------------------------------------------


    history = old_history + live_history


    # --------------------------------------------------------

    # 10. Return conversation

    # --------------------------------------------------------


    return {

        "conversation_id": conversation.id,

        "patient_id": patient.id,

        "patient_name": patient.full_name,

        "whatsapp_number": patient.whatsapp_number,

        "session_id": session_id,

        "message_count": len(history),

        "messages": history

    }


@router.post("/{conversation_id}/reply")

def send_receptionist_reply(

    conversation_id: int,

    reply_data: ReceptionistReplyRequest,

    db: Session = Depends(get_db),

    current_user=Depends(require_staff)

):

    # --------------------------------------------------------

    # 1. Find conversation

    # --------------------------------------------------------


    conversation = (

        db.query(ConversationSession)

        .filter(

            ConversationSession.id == conversation_id

        )

        .first()

    )


    if not conversation:

        raise HTTPException(

            status_code=404,

            detail="Conversation session not found"

        )


    # --------------------------------------------------------

    # 2. Only allow sending during human takeover

    # --------------------------------------------------------


    if conversation.status != "HUMAN_ACTIVE":

        raise HTTPException(

            status_code=400,

            detail=(

                "Conversation must be in HUMAN_ACTIVE "

                "status before staff can reply"

            )

        )


    # --------------------------------------------------------

    # 3. Make sure conversation belongs to this staff member

    # --------------------------------------------------------


    if (

        conversation.assigned_to_user_id

        and conversation.assigned_to_user_id

        != current_user.id

    ):

        raise HTTPException(

            status_code=403,

            detail="This conversation is assigned to another staff member"

        )


    # --------------------------------------------------------

    # 4. Validate message

    # --------------------------------------------------------


    message_text = reply_data.message.strip()


    if not message_text:

        raise HTTPException(

            status_code=400,

            detail="Message cannot be empty"

        )


    # --------------------------------------------------------

    # 5. Find patient

    # --------------------------------------------------------


    patient = (

        db.query(Patient)

        .filter(

            Patient.id == conversation.patient_id

        )

        .first()

    )


    if not patient:

        raise HTTPException(

            status_code=404,

            detail="Patient not found"

        )


    if not patient.whatsapp_number:

        raise HTTPException(

            status_code=400,

            detail="Patient does not have a WhatsApp number"

        )


    # --------------------------------------------------------

    # 6. Prepare WhatsApp number

    #

    # +923180982224 -> 923180982224

    # --------------------------------------------------------


    whatsapp_number = (

        patient.whatsapp_number

        .strip()

        .replace(" ", "")

        .replace("-", "")

    )


    if whatsapp_number.startswith("+"):

        whatsapp_number = whatsapp_number[1:]


    # --------------------------------------------------------

    # 7. Read Meta configuration

    # --------------------------------------------------------


    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")

    phone_number_id = os.getenv(

        "WHATSAPP_PHONE_NUMBER_ID"

    )

    graph_version = os.getenv(

        "WHATSAPP_GRAPH_VERSION",

        "v25.0"

    )


    if not access_token:

        raise HTTPException(

            status_code=500,

            detail="WHATSAPP_ACCESS_TOKEN is not configured"

        )


    if not phone_number_id:

        raise HTTPException(

            status_code=500,

            detail="WHATSAPP_PHONE_NUMBER_ID is not configured"

        )


    url = (

        f"https://graph.facebook.com/"

        f"{graph_version}/"

        f"{phone_number_id}/messages"

    )


    # --------------------------------------------------------

    # 8. Meta WhatsApp payload

    # --------------------------------------------------------


    payload = {

        "messaging_product": "whatsapp",

        "recipient_type": "individual",

        "to": whatsapp_number,

        "type": "text",

        "text": {

            "preview_url": False,

            "body": message_text

        }

    }


    headers = {

        "Authorization": f"Bearer {access_token}",

        "Content-Type": "application/json"

    }


    # --------------------------------------------------------

    # 9. Send through Meta

    # --------------------------------------------------------


    try:

        with httpx.Client(timeout=20.0) as client:

            response = client.post(

                url,

                headers=headers,

                json=payload

            )


    except httpx.RequestError as exc:

        raise HTTPException(

            status_code=502,

            detail=(

                "Could not connect to WhatsApp API: "

                f"{str(exc)}"

            )

        )


    # --------------------------------------------------------

    # 10. Check Meta response

    # --------------------------------------------------------


    if response.status_code not in (200, 201):

        try:

            meta_error = response.json()

        except Exception:

            meta_error = response.text


        print(

            "WhatsApp API error:",

            response.status_code,

            meta_error

        )


        raise HTTPException(

            status_code=502,

            detail={

                "message": "WhatsApp rejected the message",

                "meta_response": meta_error

            }

        )


    meta_response = response.json()


    # --------------------------------------------------------

    # 11. Get WhatsApp message ID

    # --------------------------------------------------------


    whatsapp_message_id = None


    meta_messages = meta_response.get("messages", [])


    if meta_messages:

        whatsapp_message_id = (

            meta_messages[0].get("id")

        )


    # --------------------------------------------------------

    # 12. Save receptionist message in dental_clinic

    # --------------------------------------------------------


    now = datetime.now(timezone.utc)


    receptionist_message = Message(

        conversation_id=conversation.id,

        sender_type="RECEPTIONIST",

        message_text=message_text,

        whatsapp_message_id=whatsapp_message_id,

        sent_at=now

    )


    db.add(receptionist_message)


    conversation.last_message_at = now

    conversation.updated_at = now


    try:

        db.commit()

        db.refresh(receptionist_message)


    except Exception:

        db.rollback()


        # Important:

        # WhatsApp may already have received the message,

        # therefore do not try sending it again automatically.


        raise HTTPException(

            status_code=500,

            detail=(

                "WhatsApp message was sent, but the local "

                "message could not be saved"

            )

        )


    # --------------------------------------------------------

    # 13. Return result

    # --------------------------------------------------------


    return {

        "success": True,

        "message": "WhatsApp message sent successfully",

        "conversation_id": conversation.id,

        "patient_id": patient.id,

        "whatsapp_number": patient.whatsapp_number,

        "whatsapp_message_id": whatsapp_message_id,

        "sent_message": {

            "id": receptionist_message.id,

            "sender_type": receptionist_message.sender_type,

            "message_text": receptionist_message.message_text,

            "sent_at": receptionist_message.sent_at,

            "source": "DASHBOARD"

        }

    }
