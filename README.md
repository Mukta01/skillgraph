# 🎯 SkillGraph

**Upload your resume. Pick your dream role. See exactly what skills you're missing and how to learn them.**

SkillGraph is a cloud-native platform that analyzes real job market data, compares it against your resume, and generates a personalized visual skill graph with an actionable learning roadmap.

---

## ✨ Features

### Core
| Feature | Description |
|---|---|
| **Resume Upload & Parsing** | Drag-and-drop PDF/DOCX. Extracts text in-memory — resume is **never stored**. |
| **AI Skill Extraction** | Google Gemini reads your resume and identifies your skills with proficiency levels. |
| **Job Market Analysis** | AI determines what skills your target role actually requires, based on real market data. |
| **Gap Analysis** | Compares your skills vs. role requirements. Shows readiness score (0–100%), matched & missing skills. |
| **Interactive Skill Graph** | Visual node graph (React Flow). Green = you have it, red = you need it. Click any skill for details. |
| **AI Learning Roadmap** | Phased learning plan with time estimates and free resource links for every missing skill. |
| **Role-Agnostic** | Works for any job — Software Engineer, Marketing Manager, Data Analyst, UX Designer, and more. |
| **Smart Caching** | Role skill requirements are cached in PostgreSQL. Repeat queries are instant. |

### UX
| Feature | Description |
|---|---|
| **Anonymous Sessions** | No signup required. Session stored locally in your browser. |
| **Responsive Design** | Works on mobile, tablet, and desktop. |
| **Loading Feedback** | Skeleton loaders and progress indicators during AI processing. |
| **Export Results** | Download your gap analysis and roadmap as PDF or JSON. |

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS** — styling
- **React Flow** — interactive skill graph visualization
- **Recharts** — charts for gap analysis
- **Framer Motion** — animations

### Backend
- **Python 3.11+ / FastAPI** — REST API
- **Google Gemini** (free tier, `gemini-2.0-flash`) — AI skill extraction & roadmap generation
- **Instructor** — structured LLM output with Pydantic validation
- **PyMuPDF** — PDF text extraction
- **python-docx** — DOCX text extraction
- **asyncpg** — async PostgreSQL driver

### Infrastructure (Azure)
- **Azure App Service** — FastAPI backend
- **Azure Static Web Apps** — Next.js frontend
- **Azure Database for PostgreSQL** — sessions, caching, results

---

## 📁 Project Structure

```
skillgraph/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes, CORS
│   │   ├── config.py            # Settings from environment variables
│   │   ├── models.py            # Pydantic data models
│   │   ├── db.py                # PostgreSQL connection & queries
│   │   └── services/
│   │       ├── resume_parser.py # PDF/DOCX → plain text
│   │       ├── ai_service.py    # Google Gemini API calls
│   │       └── gap_analyzer.py  # Skill comparison logic
│   ├── prompts/                 # LLM system prompts
│   ├── data/                    # Seed skill taxonomy
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages (landing + results)
│   │   ├── components/          # React components
│   │   ├── lib/                 # API client, types, utilities
│   │   └── styles/              # Global CSS
│   ├── package.json
│   └── next.config.js
│
├── docker-compose.yml           # Local dev (PostgreSQL)
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL** (local or Azure) — *optional for initial development*
- **Google Gemini API Key** — [Get one free](https://aistudio.google.com/apikey)

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux
# Edit .env and add your GEMINI_API_KEY

# Run the backend
uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

### 3. Open in Browser

Navigate to `http://localhost:3000`

---

## 🔌 API Reference

**Base URL:** `http://localhost:8000`

### Health Check
```
GET /health
→ { "status": "ok" }
```

### Analyze Resume
```
POST /api/analyze
Content-Type: multipart/form-data

Fields:
  resume: <file>          (PDF or DOCX)
  target_role: string     (e.g., "Software Engineer")

→ {
    "user_skills": [...],
    "gap": {
      "matched_skills": [...],
      "missing_skills": [...],
      "readiness_score": 0.65
    },
    "roadmap": [
      {
        "title": "Phase 1: Fundamentals",
        "duration_weeks": 2,
        "skills": [...]
      }
    ]
  }
```

### List Roles
```
GET /api/roles
→ [{ "name": "Software Engineer", "category": "Technology" }, ...]
```

### Get Role Skills (Cached)
```
GET /api/roles/{role_name}/skills
→ { "role": "Data Analyst", "skills": [...], "cached": true }
```

### Session Management
```
POST /api/session
→ { "session_id": "uuid" }

GET /api/session/{id}/history
→ [{ "target_role": "...", "readiness_score": 0.72, "created_at": "..." }]
```

---

## ⚙️ Environment Variables

```env
# Required
GEMINI_API_KEY=your-google-gemini-api-key
DATABASE_URL=postgresql://user:pass@localhost:5432/skillgraph

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Optional
GEMINI_MODEL=gemini-2.0-flash
SESSION_EXPIRY_DAYS=30
```

---

## ☁️ Azure Deployment

The app is designed for Azure. You'll need to provision:

| Service | Purpose | Config |
|---|---|---|
| **Azure App Service** (Linux, Python 3.11) | Backend API | Set env vars in App Settings |
| **Azure Static Web Apps** | Frontend | Connect to GitHub repo |
| **Azure Database for PostgreSQL** (Flexible Server) | Data persistence | Connection string → `DATABASE_URL` |

### Backend Deployment
1. Create an Azure App Service (Linux, Python 3.11).
2. Set the environment variables in **Configuration → Application Settings**.
3. Deploy via GitHub Actions, Azure CLI, or VS Code extension.
4. Startup command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Frontend Deployment
1. Create an Azure Static Web App.
2. Connect to your GitHub repository.
3. Set the build preset to **Next.js**.
4. Update `NEXT_PUBLIC_API_URL` to point to your Azure App Service URL.

---

## 🔒 Privacy

- **Resumes are never stored.** They are processed entirely in-memory and discarded after skill extraction.
- **No login required.** Anonymous sessions via UUID stored in your browser's localStorage.
- **Session data auto-expires** after 30 days of inactivity.

---

## 📄 License

MIT
