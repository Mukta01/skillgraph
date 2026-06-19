# SkillGraph — Architecture Documentation

## System Overview

SkillGraph is a three-tier cloud-native application deployed on Microsoft Azure. It accepts a user's resume and a target job role, then uses Google Gemini AI to perform skill extraction, gap analysis, and personalized learning roadmap generation.

```mermaid
graph TB
    User["👤 User (Browser)<br/>Upload Resume + Select Role"] -->|"HTTPS"| FE

    subgraph "Frontend — Azure App Service (Node.js 22)"
        FE["Next.js 16"] --> Landing["Landing Page<br/>(ResumeUpload + RoleSelector)"]
        Landing -->|"POST /api/analyze"| Results["Results Page<br/>(SkillGraph + GapSummary + Roadmap)"]
    end

    FE -->|"REST API (HTTPS)"| BE

    subgraph "Backend — Azure App Service (Python 3.11)"
        BE["FastAPI"] --> Parser["📄 Resume Parser<br/>(PDF / DOCX / TXT)"]
        Parser --> AI["🤖 AI Service<br/>(Google Gemini)"]
        AI --> Gap["🎯 Gap Analyzer<br/>(Pure Python)"]
    end

    BE -->|"asyncpg (SSL)"| DB

    subgraph "Database — Azure PostgreSQL"
        DB[("🗄️ PostgreSQL Flexible Server")] --> T1["sessions"]
        DB --> T2["analyses"]
        DB --> T3["role_skills_cache"]
    end

    AI <-->|"Gemini API"| Gemini["🤖 Google Gemini"]

    style User fill:#1e293b,stroke:#475569,color:#fff
    style FE fill:#4f46e5,stroke:#6366f1,color:#fff
    style BE fill:#059669,stroke:#10b981,color:#fff
    style DB fill:#d97706,stroke:#f59e0b,color:#fff
    style Gemini fill:#7c3aed,stroke:#8b5cf6,color:#fff
    style Parser fill:#065f46,stroke:#10b981,color:#fff
    style AI fill:#065f46,stroke:#10b981,color:#fff
    style Gap fill:#065f46,stroke:#10b981,color:#fff
    style Landing fill:#312e81,stroke:#6366f1,color:#fff
    style Results fill:#312e81,stroke:#6366f1,color:#fff
    style T1 fill:#92400e,stroke:#f59e0b,color:#fff
    style T2 fill:#92400e,stroke:#f59e0b,color:#fff
    style T3 fill:#92400e,stroke:#f59e0b,color:#fff
```

---

## Data Flow

### Full Analysis Pipeline

```mermaid
flowchart TD
    A["1. User uploads resume + selects role"] --> B["2. Frontend sends POST /api/analyze"]
    B --> C["3. resume_parser.py<br/>PDF → PyMuPDF | DOCX → python-docx | TXT → decode<br/>File bytes discarded after extraction"]
    C --> D["4. ai_service.py → extract_skills_from_resume()<br/>Gemini extracts skills + proficiency levels + summary"]
    D --> E{"5. Check role_skills_cache<br/>in PostgreSQL"}
    E -->|"CACHE HIT"| G
    E -->|"CACHE MISS"| F["6. ai_service.py → extract_role_skills()<br/>Gemini generates role requirements<br/>Result cached in PostgreSQL"]
    F --> G["7. gap_analyzer.py → analyze_gap()<br/>Normalize + match skills (exact + partial)<br/>Calculate readiness_score"]
    G --> H{"Missing skills?"}
    H -->|"Yes"| I["8. ai_service.py → generate_roadmap()<br/>Gemini creates phased learning plan"]
    H -->|"No"| J["Empty roadmap (score = 100%)"]
    I --> K["9. db.py → save_analysis()<br/>Save result JSON to PostgreSQL"]
    J --> K
    K --> L["10. Frontend receives AnalysisResponse<br/>Store in sessionStorage → redirect to /results<br/>Render: SkillGraph + GapSummary + Roadmap"]

    style A fill:#1e293b,stroke:#475569,color:#fff
    style B fill:#4f46e5,stroke:#6366f1,color:#fff
    style C fill:#059669,stroke:#10b981,color:#fff
    style D fill:#7c3aed,stroke:#8b5cf6,color:#fff
    style E fill:#d97706,stroke:#f59e0b,color:#fff
    style F fill:#7c3aed,stroke:#8b5cf6,color:#fff
    style G fill:#059669,stroke:#10b981,color:#fff
    style H fill:#d97706,stroke:#f59e0b,color:#fff
    style I fill:#7c3aed,stroke:#8b5cf6,color:#fff
    style J fill:#059669,stroke:#10b981,color:#fff
    style K fill:#d97706,stroke:#f59e0b,color:#fff
    style L fill:#4f46e5,stroke:#6366f1,color:#fff
```

### Gemini API Calls Per Analysis

| Call | Function | Cacheable? | Temperature |
|---|---|---|---|
| 1 | `extract_skills_from_resume()` | No (unique per resume) | 0.2 |
| 2 | `extract_role_skills()` | Yes (cached in PostgreSQL) | 0.3 |
| 3 | `generate_roadmap()` | No (depends on gap result) | 0.4 |

---

## Backend Architecture

### Module Breakdown

| Module | Responsibility |
|---|---|
| `main.py` | FastAPI app, route definitions, CORS middleware, lifespan events |
| `config.py` | Environment variable loading via `python-dotenv`, validation |
| `models.py` | All Pydantic schemas (request/response models, AI output schemas) |
| `db.py` | asyncpg connection pool, table creation, all SQL queries |
| `services/resume_parser.py` | PDF/DOCX/TXT → plain text extraction (in-memory only) |
| `services/ai_service.py` | Google Gemini API calls with retry logic and model fallback |
| `services/gap_analyzer.py` | Skill matching algorithm (pure Python, no AI) |

### AI Service Resilience

The `ai_service.py` module includes a robust retry and fallback mechanism:

```mermaid
flowchart TD
    A["Primary Model<br/>(from GEMINI_MODEL env var)"] -->|"fails 3x"| B["gemini-2.5-flash-lite"]
    B -->|"fails 3x"| C["gemini-2.5-flash"]
    C -->|"fails 3x"| D["gemini-3.5-flash"]
    D -->|"fails 3x"| E["gemini-flash-lite-latest"]
    E -->|"all failed"| F["❌ Raise exception → 500 error"]

    A -->|"success"| G["✅ Return response"]
    B -->|"success"| G
    C -->|"success"| G
    D -->|"success"| G
    E -->|"success"| G

    style A fill:#059669,stroke:#10b981,color:#fff
    style B fill:#4f46e5,stroke:#6366f1,color:#fff
    style C fill:#4f46e5,stroke:#6366f1,color:#fff
    style D fill:#4f46e5,stroke:#6366f1,color:#fff
    style E fill:#4f46e5,stroke:#6366f1,color:#fff
    style F fill:#dc2626,stroke:#ef4444,color:#fff
    style G fill:#16a34a,stroke:#22c55e,color:#fff
```

- **Transient errors** (503, 429 rate limit): retried with exponential backoff
- **Hard errors** (invalid key, model not found): immediately moves to next model
- **All models exhausted**: returns 500 to the user

### Gap Analyzer Algorithm

```python
For each required skill in the role:
  1. Normalize the skill name (lowercase, strip punctuation/spaces)
  2. Look up in user's skill set (exact match)
  3. If no exact match → try partial matching (substring containment)
  4. If match found → add to matched_skills
  5. If no match → add to missing_skills

readiness_score = len(matched) / len(total_required)
```

---

## Frontend Architecture

### Page Structure

| Route | Component | Purpose |
|---|---|---|
| `/` | `page.tsx` (LandingPage) | Resume upload form + role selector |
| `/results` | `results/page.tsx` | Analysis results dashboard |

### Component Breakdown

| Component | Purpose |
|---|---|
| `ResumeUpload.tsx` | Drag-and-drop file upload with validation (PDF/DOCX/TXT) |
| `RoleSelector.tsx` | Searchable dropdown populated from `GET /api/roles` |
| `SkillGraph.tsx` | Interactive React Flow node graph (green = matched, red = missing) |
| `GapSummary.tsx` | Readiness score visualization, matched vs. missing counts |
| `Roadmap.tsx` | Phased learning plan with time estimates and resource links |

### State Management

- **No global state library** — uses React `useState` + `sessionStorage`
- Analysis result is stored in `sessionStorage` after API response
- Results page reads from `sessionStorage` on mount
- Anonymous session ID is persisted in `localStorage`

### API Client (`lib/api.ts`)

```
API_BASE = NEXT_PUBLIC_API_URL || "http://localhost:8000"
```

- `NEXT_PUBLIC_API_URL` is baked in at build time (Next.js requirement)
- Session ID is sent via `X-Session-ID` header on subsequent requests

---

## Database Schema

### Tables

```sql
-- Anonymous user sessions
CREATE TABLE sessions (
    id              UUID PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved analysis results
CREATE TABLE analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
    target_role     TEXT NOT NULL,
    readiness_score REAL NOT NULL,
    result_json     JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached role skill requirements (avoids repeat Gemini calls)
CREATE TABLE role_skills_cache (
    role_name   TEXT PRIMARY KEY,       -- normalized (lowercase, trimmed)
    skills_json JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table Auto-Creation

Tables are created automatically on application startup via the `init_db()` function called in FastAPI's lifespan context manager. No manual migration is needed.

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### Backend (`backend-deploy.yml`)

```mermaid
flowchart LR
    A["Push to main<br/>(backend/** changed)"] --> B["Checkout code"]
    B --> C["Setup Python 3.11"]
    C --> D["Zip backend/ directory"]
    D --> E["Deploy ZIP to<br/>Azure App Service"]
    E --> F["Azure runs pip install<br/>(SCM_DO_BUILD)"]
    F --> G["✅ uvicorn starts<br/>on port 8000"]

    style A fill:#1f2937,stroke:#4b5563,color:#9ca3af
    style E fill:#4f46e5,stroke:#6366f1,color:#fff
    style G fill:#059669,stroke:#10b981,color:#fff
```

#### Frontend (`frontend-deploy.yml`)

```mermaid
flowchart LR
    A["Push to main<br/>(frontend/** changed)"] --> B["Checkout code"]
    B --> C["Setup Node.js 22"]
    C --> D["npm ci + npm run build<br/>(NEXT_PUBLIC_API_URL baked in)"]
    D --> E["Copy static assets<br/>into standalone output"]
    E --> F["Zip standalone build"]
    F --> G["Deploy ZIP to<br/>Azure App Service"]
    G --> H["✅ node server.js<br/>starts on port 3000"]

    style A fill:#1f2937,stroke:#4b5563,color:#9ca3af
    style G fill:#4f46e5,stroke:#6366f1,color:#fff
    style H fill:#059669,stroke:#10b981,color:#fff
```

### Required GitHub Secrets

| Secret | Used By | Description |
|---|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Backend workflow | Backend App Service publish profile XML |
| `AZURE_WEBAPP_FRONTEND_PUBLISH_PROFILE` | Frontend workflow | Frontend App Service publish profile XML |
| `NEXT_PUBLIC_API_URL` | Frontend workflow | Backend API URL (baked into JS at build time) |

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| Resume privacy | File bytes processed in-memory only; explicitly deleted after text extraction |
| CORS | `ALLOWED_ORIGINS` restricts API access to the frontend domain only |
| SQL Injection | All queries use parameterized statements via asyncpg |
| API Key exposure | `GEMINI_API_KEY` stored in Azure App Settings (encrypted at rest) |
| Database connection | SSL enforced via `?sslmode=require` in connection string |
| Authentication | Anonymous sessions via UUID — no PII collected |
