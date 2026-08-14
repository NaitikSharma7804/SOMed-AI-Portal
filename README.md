# 🏥 MediVigil AI - Official Pharmacovigilance & ADR Reporting Portal

MediVigil AI is an enterprise-grade, multi-tier Adverse Drug Reaction (ADR) reporting and regulatory compliance platform aligned with national pharmacovigilance standards (such as PvPI and NCC-PvPI AYUSH). The system establishes a secure, closed-loop reporting pipeline bridging patients, clinical specialists, pharmacists, district health officers, state PvPI bodies, and national regulatory command centers.

---

## 🏗️ System Architecture & Multi-Tier Workflow

MediVigil AI enforces a strict regulatory review pipeline to ensure case safety and data authenticity:
1. **Case Ingestion:** Submissions are captured via manual entry, structured prescription text parsing, or real-time browser voice dictation.
2. **Domain Routing:** Reports are automatically categorized by medical modality (`AYURVEDA`, `ALLOPATHY`, `BDS_DENTAL`, `SIDDHA`, `UNANI`, `HOMEOPATHY`) and queued for specialized medical examiners.
3. **Pharmacist Authenticity Audit:** Pharmacists verify batch numbers, manufacturing sources, and commercial integrity.
4. **District Health Review:** Local district health officers perform regional preliminary verification before state-level clearance.
5. **State & National Command Center:** State officers approve records for national registry indexing, signal detection, and public safety drug recall management.

---

## 🛠️ Tech Stack & Dependencies

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+, Web Speech API for voice dictation)
* **Backend:** Node.js, Express.js
* **Database & ORM:** MySQL, Prisma ORM
* **Security & Auth:** JSON Web Tokens (JWT), bcrypt, CORS, Helmet
* **AI & Machine Learning:** OpenRouter API (Gemma / LLM-based structured data extraction & clinical chat assistant)

---

## 📂 Project Directory Structure

```text
medivigil-ai/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema & enums
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js             # Prisma database client instance
│   │   ├── middleware/
│   │   │   └── authMiddleware.js # JWT verification & role restrictions
│   │   ├── routes/
│   │   │   ├── adrRoutes.js      # Core ADR reporting, search & AI extraction
│   │   │   ├── adminRoutes.js    # Hospital & institutional metrics
│   │   │   ├── authRoutes.js     # User registration & login
│   │   │   ├── districtRoutes.js # District health office review workflow
│   │   │   ├── nationalRoutes.js # National command center & drug bans
│   │   │   ├── pharmacistRoutes.js# Batch authenticity verification
│   │   │   └── stateRoutes.js    # State PvPI analytics & escalation
│   │   └── server.js             # Express application entry point
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── dashboard.html            # Unified role-based operational dashboard
│   ├── index.html                # Authentication & entry portal
│   └── style.css                 # Global responsive styling
│
└── README.md
