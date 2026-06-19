# 🎯 SkillGraph

**Upload your resume. Pick your dream role. See exactly what skills you're missing and how to learn them.**

SkillGraph is a cloud-native platform that analyzes real job market data, compares it against your resume, and generates a personalized visual skill graph with an actionable learning roadmap — powered by Google Gemini AI.

### 🌐 Live Demo

| Component | URL |
|---|---|
| **Frontend** | [skillgraph-app-web-h6g7h8cmbud8gtfd.centralindia-01.azurewebsites.net](https://skillgraph-app-web-h6g7h8cmbud8gtfd.centralindia-01.azurewebsites.net) |
| **Backend API** | [skillgraph-api-cjc3dzazd5bvb5a7.centralindia-01.azurewebsites.net](https://skillgraph-api-cjc3dzazd5bvb5a7.centralindia-01.azurewebsites.net) |

---

## ✨ Features

### Core
| Feature | Description |
|---|---|
| **Resume Upload & Parsing** | Drag-and-drop PDF/DOCX/TXT. Extracts text in-memory — resume is **never stored**. |
| **AI Skill Extraction** | Google Gemini reads your resume and identifies your skills with proficiency levels. |
| **Job Market Analysis** | AI determines what skills your target role actually requires, based on real market data. |
| **Gap Analysis** | Compares your skills vs. role requirements. Shows readiness score (0–100%), matched & missing skills. |
| **Interactive Skill Graph** | Visual node graph (React Flow). Green = you have it, red = you need it. Click any skill for details. |
| **AI Learning Roadmap** | Phased learning plan with time estimates and free resource links for every missing skill. |
| **35+ Roles Supported** | Works for any job — Software Engineer, Data Scientist, Marketing Manager, UX Designer, and more. |
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
- **Next.js 16** (App Router, TypeScript, Standalone output)
- **Tailwind CSS v4** — styling
- **React Flow (@xyflow/react)** — interactive skill graph visualization
- **React 19** — UI framework

### Backend
- **Python 3.11+ / FastAPI** — REST API
- **Google Gemini** (`gemini-2.5-flash-lite`) — AI skill extraction & roadmap generation
- **Instructor** — structured LLM output with Pydantic validation
- **PyMuPDF** — PDF text extraction
- **python-docx** — DOCX text extraction
- **asyncpg** — async PostgreSQL driver
- **Gunicorn + Uvicorn** — production ASGI server

### Infrastructure (Azure)
- **Azure App Service (Linux, Python 3.11)** — FastAPI backend
- **Azure App Service (Linux, Node.js 22)** — Next.js frontend (standalone mode)
- **Azure Database for PostgreSQL (Flexible Server)** — sessions, caching, results
- **GitHub Actions** — CI/CD for both frontend and backend

---

## 📁 Project Structure

```
skillgraph/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes, CORS, lifespan
│   │   ├── config.py            # Settings from environment variables
│   │   ├── models.py            # Pydantic data models
│   │   ├── db.py                # PostgreSQL connection pool & queries
│   │   └── services/
│   │       ├── resume_parser.py # PDF/DOCX/TXT → plain text
│   │       ├── ai_service.py    # Google Gemini API calls
│   │       └── gap_analyzer.py  # Skill comparison logic
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages (landing + results)
│   │   ├── components/          # React components
│   │   │   ├── GapSummary.tsx   # Gap analysis visualization
│   │   │   ├── ResumeUpload.tsx # Drag-and-drop file upload
│   │   │   ├── Roadmap.tsx      # Learning roadmap display
│   │   │   ├── RoleSelector.tsx # Target role dropdown
│   │   │   └── SkillGraph.tsx   # Interactive node graph
│   │   └── lib/                 # API client, types, utilities
│   ├── next.config.ts           # Standalone output mode
│   └── package.json
│
├── .github/workflows/
│   ├── backend-deploy.yml       # CI/CD: Backend → Azure App Service
│   └── frontend-deploy.yml      # CI/CD: Frontend → Azure App Service
│
├── docker-compose.yml           # Local dev PostgreSQL (port 5433)
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **Docker** (for local PostgreSQL)
- **Google Gemini API Key** — [Get one free](https://aistudio.google.com/apikey)

### 1. Start the Database

```bash
# Start PostgreSQL in Docker (runs on port 5433 to avoid conflicts)
docker compose up -d
```

> **Note:** The database runs on port **5433** (not the default 5432) to avoid conflicts with any locally installed PostgreSQL service.

### 2. Setup & Run the Backend

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
```

Edit `backend/.env` and add your Gemini API key:

```env
# Required
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=postgresql://skillgraph:localdev@127.0.0.1:5433/skillgraph

# Optional
ALLOWED_ORIGINS=http://localhost:3000
GEMINI_MODEL=gemini-2.0-flash
```

Start the backend server:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify it's running: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok","version":"0.1.0"}`

### 3. Setup & Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

### 4. Use the App

Open [http://localhost:3000](http://localhost:3000), upload a resume, select a target role, and click **Analyze**!

---

## 🔌 API Reference

**Base URL:** `http://localhost:8000` (local) or your Azure App Service URL

### Health Check
```
GET /health
→ { "status": "ok", "version": "0.1.0" }
```

### Analyze Resume
```
POST /api/analyze
Content-Type: multipart/form-data
Headers: X-Session-ID (optional)

Fields:
  resume: <file>          (PDF, DOCX, or TXT)
  target_role: string     (e.g., "Software Engineer")

→ {
    "session_id": "uuid",
    "user_skills": [...],
    "user_summary": "...",
    "role_requirements": { "skills": [...] },
    "gap": {
      "matched_skills": [...],
      "missing_skills": [...],
      "readiness_score": 0.65
    },
    "roadmap": {
      "target_role": "...",
      "total_weeks": 12,
      "phases": [...]
    }
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
→ { "role": "Data Analyst", "skills": {...}, "cached": true }
```

### Session History
```
GET /api/session/{session_id}/history
→ { "session_id": "uuid", "analyses": [...] }
```

### Get Analysis by ID
```
GET /api/analysis/{analysis_id}
→ { full analysis result JSON }
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Required
GEMINI_API_KEY=your-google-gemini-api-key
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Optional
ALLOWED_ORIGINS=http://localhost:3000        # Comma-separated allowed origins
GEMINI_MODEL=gemini-2.0-flash               # Gemini model to use
```

### Frontend (build-time)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000    # Backend API URL (baked in at build time)
```

---

## ☁️ Azure Deployment

### Architecture

```
┌──────────────┐     HTTPS      ┌──────────────────┐     PostgreSQL    ┌─────────────────┐
│   Frontend   │ ──────────────→│   Backend API    │ ─────────────────→│  Azure Database  │
│  App Service │    REST API    │   App Service    │   (SSL required)  │  for PostgreSQL  │
│  (Node 22)   │                │  (Python 3.11)   │                   │ (Flexible Server)│
└──────────────┘                └──────────────────┘                   └─────────────────┘
       ↑                                ↑
       │                                │
   GitHub Actions                  GitHub Actions
  (frontend-deploy.yml)          (backend-deploy.yml)
```

### Prerequisites
1. **Azure Account** with an active subscription
2. **GitHub Repository** with the code pushed to `main`

### Step 1: Create Azure Database for PostgreSQL

1. In the Azure Portal, create an **Azure Database for PostgreSQL Flexible Server**.
2. Note down the **admin username** and **password**.
3. Under **Networking**, enable **"Allow public access from any Azure service within Azure"**.
4. Your connection string format:
   ```
   postgresql://<username>:<password>@<server-name>.postgres.database.azure.com:5432/postgres?sslmode=require
   ```
   > ⚠️ If your password contains special characters like `@`, URL-encode them (e.g., `@` → `%40`).

### Step 2: Deploy the Backend

1. Create an **Azure App Service** (Linux, Python 3.11).
2. Add these **Environment Variables** (Settings → Environment variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://...?sslmode=require` |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `ALLOWED_ORIGINS` | Your frontend Azure URL (no trailing slash) |
   | `GEMINI_MODEL` | `gemini-2.5-flash-lite` (or your preferred model) |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `1` |

3. Set the **Startup Command** (Configuration → General settings):
   ```
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

4. Add your **GitHub Actions secrets** (repo → Settings → Secrets → Actions):
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Download from Azure Portal → App Service → Overview → "Download publish profile"

5. Push to `main` to trigger automatic deployment.

### Step 3: Deploy the Frontend

1. Create another **Azure App Service** (Linux, Node.js 22).
2. Add these **Environment Variables**:

   | Name | Value |
   |---|---|
   | `WEBSITES_PORT` | `3000` |

3. Set the **Startup Command**:
   ```
   node server.js
   ```

4. Add your **GitHub Actions secrets**:
   - `AZURE_WEBAPP_FRONTEND_PUBLISH_PROFILE`: Download from frontend App Service → "Download publish profile"
   - `NEXT_PUBLIC_API_URL`: Your backend Azure URL (e.g., `https://skillgraph-api-xxx.azurewebsites.net`)

5. Push to `main` to trigger automatic deployment.

### CI/CD

Both frontend and backend automatically deploy via GitHub Actions when changes are pushed to the `main` branch:

- **Backend** deploys when files in `backend/` change
- **Frontend** deploys when files in `frontend/` change

---

## 🔒 Privacy

- **Resumes are never stored.** They are processed entirely in-memory and discarded after skill extraction.
- **No login required.** Anonymous sessions via UUID stored in your browser's localStorage.
- **Session data auto-expires** after 30 days of inactivity.

---

## 📄 License

MIT
