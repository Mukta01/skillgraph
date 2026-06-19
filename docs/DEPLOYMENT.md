# SkillGraph — Deployment Guide

## Azure Infrastructure

### Required Azure Resources

| Resource | SKU / Tier | Region | Purpose |
|---|---|---|---|
| Azure App Service (Backend) | B1 (Linux, Python 3.11) | Central India | FastAPI REST API |
| Azure App Service (Frontend) | B1 (Linux, Node.js 22) | Central India | Next.js standalone app |
| Azure Database for PostgreSQL | Flexible Server (Burstable B1ms) | Central India | Data persistence |

---

## Backend Deployment

### Azure App Service Configuration

**Runtime:** Python 3.11  
**Startup Command:**
```
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Environment Variables

| Name | Value | Required |
|---|---|---|
| `DATABASE_URL` | `postgresql://<user>:<pass>@<server>.postgres.database.azure.com:5432/postgres?sslmode=require` | ✅ |
| `GEMINI_API_KEY` | Your Google Gemini API key | ✅ |
| `ALLOWED_ORIGINS` | Frontend Azure URL (no trailing slash) | ✅ |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | ❌ |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `1` | ✅ |

> **Important:** If your database password contains special characters like `@`, you must URL-encode them. For example, `@` becomes `%40`. So a password of `Pass@123` becomes `Pass%40123` in the connection string.

> **Important:** The `?sslmode=require` suffix is mandatory for Azure PostgreSQL connections.

---

## Frontend Deployment

### Azure App Service Configuration

**Runtime:** Node.js 22  
**Startup Command:**
```
node server.js
```

### Environment Variables

| Name | Value | Required |
|---|---|---|
| `WEBSITES_PORT` | `3000` | ✅ |

### Build-time Configuration

The `NEXT_PUBLIC_API_URL` variable is **not** set on the Azure App Service. It is baked into the JavaScript bundle at build time via the GitHub Actions workflow. It must be configured as a **GitHub Repository Secret**.

---

## PostgreSQL Setup

### Creating the Database

1. In Azure Portal → Create **Azure Database for PostgreSQL Flexible Server**
2. Choose **Burstable B1ms** tier (cheapest)
3. Set admin username and password
4. Under **Networking**: Enable **"Allow public access from any Azure service within Azure to this server"**

### Connection String Format

```
postgresql://<admin_username>:<password>@<server_name>.postgres.database.azure.com:5432/postgres?sslmode=require
```

### Table Creation

Tables are created automatically when the backend starts. No manual SQL execution is needed. The `init_db()` function in `db.py` runs `CREATE TABLE IF NOT EXISTS` for all three tables on every application startup.

---

## GitHub Actions CI/CD

### Setup Steps

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | How to Get It |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure Portal → Backend App Service → Overview → **Download publish profile** → paste entire XML |
| `AZURE_WEBAPP_FRONTEND_PUBLISH_PROFILE` | Azure Portal → Frontend App Service → Overview → **Download publish profile** → paste entire XML |
| `NEXT_PUBLIC_API_URL` | Your backend URL: `https://skillgraph-api-cjc3dzazd5bvb5a7.centralindia-01.azurewebsites.net` |

### Deployment Triggers

| Workflow | Triggers On | File |
|---|---|---|
| Backend Deploy | Push to `main` with changes in `backend/**` | `.github/workflows/backend-deploy.yml` |
| Frontend Deploy | Push to `main` with changes in `frontend/**` | `.github/workflows/frontend-deploy.yml` |

### Manual Re-deployment

If you need to re-deploy without code changes:
```bash
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

Or go to GitHub → Actions tab → select the workflow → **Re-run all jobs**.

---

## Monitoring

### Health Check

```bash
curl https://skillgraph-api-cjc3dzazd5bvb5a7.centralindia-01.azurewebsites.net/health
# → {"status":"ok","version":"0.1.0"}
```

### Log Streams

- **Backend logs:** Azure Portal → Backend App Service → **Log stream**
- **Frontend logs:** Azure Portal → Frontend App Service → **Log stream**

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request (unsupported file format, missing fields) |
| 404 | Analysis not found |
| 429 | Gemini API rate limit exceeded |
| 500 | Internal server error (check Log stream for details) |
| 503 | Application crashed on startup (check environment variables) |

---

## Gemini API Quotas (Free Tier)

| Limit | Value |
|---|---|
| Requests Per Minute | ~15–30 RPM |
| Tokens Per Minute | ~250,000–1,000,000 TPM |
| Requests Per Day | ~1,000–1,500 RPD |

Each full analysis uses 2–3 Gemini API calls (role skills are cached after first request). This means the free tier supports approximately **330–500 full analyses per day**.

Quota resets at **midnight Pacific Time (00:00 PT)**.
