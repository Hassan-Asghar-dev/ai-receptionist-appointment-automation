<div align="center">

# 🦷 AI Receptionist & Appointment Automation System

### A full-stack AI-powered dental clinic automation platform

WhatsApp messaging • Intelligent appointment workflows • Clinic management • Seamless AI-to-human handover

<p>
  <img src="https://img.shields.io/badge/React-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite"/>
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n"/>
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp"/>
</p>



</div>

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [AI-to-Human Handover](#-ai-to-human-handover)
- [Project Structure](#-project-structure)
- [Core Modules](#-core-modules)
- [Running the Project](#-running-the-project)
- [Security](#-security)
- [Planned Repository Additions](#-planned-repository-additions)
- [Author](#-author)

---

## ✨ Key Features

| | |
|---|---|
| 🤖 | AI-powered patient assistance through WhatsApp |
| 📅 | Automated appointment booking with structured booking state |
| 🕒 | Real-time dentist and appointment availability checking |
| 🏥 | Dynamic management of patients, dentists, services, schedules, and working hours |
| 💬 | Persistent patient, AI, and receptionist conversation history |
| 🔁 | AI-to-human receptionist handover when human assistance is requested |
| 🙋 | Receptionist takeover and return-to-AI conversation control |
| 📲 | Direct WhatsApp replies from the receptionist dashboard |
| ✅ | Appointment management: confirmation, cancellation, rescheduling, completion, no-show |
| 🔐 | Staff authentication |
| ⚙️ | Database-driven clinic configuration instead of hardcoded AI responses |

---

## 🛠 Tech Stack

<table>
<tr>
<td valign="top" width="25%">

**Frontend**
- React
- Vite
- JavaScript

</td>
<td valign="top" width="25%">

**Backend**
- FastAPI
- Python
- SQLAlchemy
- REST APIs

</td>
<td valign="top" width="25%">

**Database**
- PostgreSQL

</td>
<td valign="top" width="25%">

**AI & Automation**
- n8n
- Google Gemini
- Persistent PostgreSQL chat memory

**Messaging**
- Meta WhatsApp Cloud API

</td>
</tr>
</table>

---

## 🏗 System Architecture

```text
Patient WhatsApp
       |
       v
      n8n
       |
       +------ Conversation Control
       |
       +------ Gemini AI Agent
                    |
                    v
               FastAPI APIs
                    |
          +---------+---------+
          |                   |
          v                   v
   Clinic PostgreSQL     n8n Chat Memory
          |
          v
   React Dashboard
          |
          v
 Receptionist / Admin
```

> The clinic database is the **source of truth** for operational data — dentists, services, schedules, patients, appointments, and conversation state. The AI retrieves live information through backend APIs instead of relying on hardcoded clinic data.

---

## 🔄 AI-to-Human Handover

The conversation layer supports multiple control states:

```text
AI_ACTIVE
    |
    | Patient requests human assistance
    v
HUMAN_REQUIRED
    |
    | Receptionist takes over
    v
HUMAN_ACTIVE
    |
    | Receptionist returns control
    v
AI_ACTIVE
```

> ⚠️ While a receptionist has control, the automation **prevents the AI from responding** while continuing to save incoming patient messages.

---

## 📁 Project Structure

```text
dental-clinic-system/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
└── README.md
```

---

## 🧩 Core Modules

- 🧑‍⚕️ Patient Management
- 🦷 Dentist Management
- 💉 Services & Treatment Management
- 🗓 Working Days & Working Hours
- 📌 Appointment Management
- 🕓 Appointment Availability
- 💬 WhatsApp Booking State
- 🗨 Conversation Management
- 🤝 AI/Human Conversation Control
- 🔐 Authentication

---

## 🚀 Running the Project

### Backend

Create and activate a Python virtual environment, then install the dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file with the required database, authentication, and WhatsApp configuration.

Start FastAPI:

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security

Sensitive configuration such as database credentials, API keys, access tokens, and `.env` files are excluded from version control.

---

## 🗺 Planned Repository Additions

- [ ] Sanitized n8n workflow export
- [ ] Environment configuration example
- [ ] Application screenshots

---

## 👤 Author

<div align="left">

**Muhammad Hassan Asghar**

[![GitHub](https://img.shields.io/badge/GitHub-Hassan--Asghar--dev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Hassan-Asghar-dev)

</div>
