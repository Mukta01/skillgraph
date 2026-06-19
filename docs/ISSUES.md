# SkillGraph — Issues Encountered & Resolutions

A complete log of all issues encountered during the development and deployment of SkillGraph, along with their root causes and solutions.

---

## Issue #1: PostgreSQL Port Conflict (Local Development)

**Symptom:**  
Backend crashed on startup with `asyncpg.exceptions.InvalidPasswordError: password authentication failed for user "skillgraph"`.

**Root Cause:**  
A native Windows PostgreSQL service was already running on port `5432`. When the FastAPI app tried to connect to `localhost:5432`, it connected to the Windows PostgreSQL server instead of the Docker container. The Docker container was also bound to port `5432`, but the native service intercepted the IPv4 connection.

**Resolution:**  
- Changed the Docker container port mapping from `5432:5432` to `5433:5432` in `docker-compose.yml`
- Updated `DATABASE_URL` in `backend/.env` to use `127.0.0.1:5433` (explicit IPv4)
- Restarted Docker container with `docker compose down; docker compose up -d`

**Files Modified:**  
- `docker-compose.yml` — port mapping
- `backend/.env` — database URL

**Lesson Learned:**  
Always use a non-standard port for Docker database containers on development machines that may have native database services installed. Using `127.0.0.1` instead of `localhost` ensures IPv4 is used explicitly.

---

## Issue #2: Missing `gunicorn` in Backend Dependencies

**Symptom:**  
Backend deployed to Azure App Service returned `503 Service Unavailable`. The Log stream showed Azure's Oryx build system attempting to use `gunicorn` as the default WSGI/ASGI server, but it wasn't installed.

**Root Cause:**  
Azure App Service (Linux, Python) defaults to using `gunicorn` to serve Python web apps. Since `gunicorn` was not listed in `requirements.txt`, the startup script failed.

**Resolution:**  
Added `gunicorn>=21.2.0` to `backend/requirements.txt`.

**Files Modified:**  
- `backend/requirements.txt`

**Lesson Learned:**  
Always include `gunicorn` in Python requirements for Azure App Service deployments, even if using `uvicorn` as the ASGI server.

---

## Issue #3: Azure Not Installing Python Dependencies

**Symptom:**  
Backend deployed but crashed with `uvicorn: not found`. The Log stream showed:
```
WARNING: Could not find virtual environment directory /home/site/wwwroot/antenv
WARNING: Could not find package directory /home/site/wwwroot/__oryx_packages__
/opt/startup/startup.sh: 23: uvicorn: not found
```

**Root Cause:**  
When deploying via ZIP from GitHub Actions, Azure App Service does not automatically run `pip install` unless explicitly told to do so. The ZIP file contained the source code, but no virtual environment or installed packages.

**Resolution:**  
Added the environment variable `SCM_DO_BUILD_DURING_DEPLOYMENT=1` to the Azure App Service Application Settings. This tells Azure's Oryx build system to detect `requirements.txt` and run `pip install` during the deployment phase.

**Configuration Change:**  
- Azure Portal → App Service → Environment variables → Add `SCM_DO_BUILD_DURING_DEPLOYMENT=1`

**Lesson Learned:**  
For ZIP-based deployments to Azure App Service, you must set `SCM_DO_BUILD_DURING_DEPLOYMENT=1` to trigger the build pipeline. Without it, Azure just extracts the ZIP and tries to run the code without installing dependencies.

---

## Issue #4: Special Characters in Database Password

**Symptom:**  
Backend crashed on startup while trying to connect to Azure PostgreSQL. The connection would time out or fail with an authentication error.

**Root Cause:**  
The database password contained an `@` character (e.g., `Anany@26`). In a PostgreSQL connection string URL, `@` is a reserved character that separates the credentials from the hostname:
```
postgresql://user:password@hostname:5432/dbname
                          ^
                This @ is the delimiter
```
Having another `@` in the password (`Anany@26`) caused the URL parser to interpret `26@skillgraph-db-server...` as the hostname, which obviously failed.

**Resolution:**  
URL-encoded the `@` character as `%40` in the `DATABASE_URL`:
```
# Before (broken):
postgresql://postgres:Anany@26@skillgraph-db-server.postgres.database.azure.com:5432/postgres

# After (fixed):
postgresql://postgres:Anany%4026@skillgraph-db-server.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Configuration Change:**  
- Updated `DATABASE_URL` in Azure Portal environment variables

**Lesson Learned:**  
Always URL-encode special characters in database passwords when used in connection string URLs. Common characters to encode: `@` → `%40`, `#` → `%23`, `:` → `%3A`, `/` → `%2F`.

---

## Issue #5: Missing SSL Mode for Azure PostgreSQL

**Symptom:**  
Backend failed to connect to Azure PostgreSQL even with correct credentials.

**Root Cause:**  
Azure Database for PostgreSQL Flexible Server requires SSL connections by default. The connection string did not include the `?sslmode=require` parameter, so the asyncpg driver attempted an unencrypted connection which was rejected.

**Resolution:**  
Appended `?sslmode=require` to the `DATABASE_URL`:
```
postgresql://user:pass@server.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Configuration Change:**  
- Updated `DATABASE_URL` in Azure Portal environment variables

**Lesson Learned:**  
Azure PostgreSQL always requires SSL. Always append `?sslmode=require` to connection strings.

---

## Issue #6: Next.js `MODULE_NOT_FOUND` on Azure

**Symptom:**  
Frontend deployed to Azure App Service but crashed with:
```
code: 'MODULE_NOT_FOUND',
requireStack: ['/node_modules/.bin/next']
```
PM2 kept crash-looping, restarting the app every few seconds.

**Root Cause:**  
The GitHub Actions workflow was zipping the entire `node_modules` directory and deploying it to Azure. When the ZIP was extracted on the Linux Azure container, the **symlinks** inside `node_modules/.bin/` (which are how Node.js binary scripts work) were broken. Linux symlinks don't survive a Windows-style ZIP extraction properly in this context.

**Resolution:**  
Switched to Next.js **standalone output mode**, which eliminates the need for `node_modules` entirely:

1. Added `output: "standalone"` to `next.config.ts`
2. Updated the GitHub Actions workflow to:
   - Build the standalone output
   - Copy static assets into the standalone directory
   - ZIP only the standalone build (no `node_modules`)
3. Changed the Azure startup command from `pm2 start npm --no-daemon -- start` to `node server.js`

**Files Modified:**  
- `frontend/next.config.ts` — added `output: "standalone"`
- `.github/workflows/frontend-deploy.yml` — updated build and zip steps

**Configuration Change:**  
- Azure Portal → Frontend App Service → Configuration → Startup Command: `node server.js`

**Lesson Learned:**  
Never deploy `node_modules` via ZIP to Azure App Service. Use Next.js standalone mode for production deployments — it bundles everything into a single `server.js` file with only the required dependencies.

---

## Issue #7: Frontend 504 Gateway Timeout

**Symptom:**  
Frontend returned `504 Gateway Timeout` after deploying. The container started but Azure's reverse proxy couldn't connect to it.

**Root Cause:**  
Azure App Service's internal reverse proxy defaults to forwarding traffic to port `8080`. However, Next.js starts on port `3000`. Since there was nothing listening on `8080`, Azure timed out waiting for a response.

**Resolution:**  
Added `WEBSITES_PORT=3000` environment variable to the frontend App Service, telling Azure's reverse proxy to forward traffic to port 3000 where Next.js is listening.

**Configuration Change:**  
- Azure Portal → Frontend App Service → Environment variables → Add `WEBSITES_PORT=3000`

**Lesson Learned:**  
Always set `WEBSITES_PORT` on Azure App Service when your application doesn't listen on the default port (8080).

---

## Issue #8: Analyze Button Returned Nothing

**Symptom:**  
The frontend loaded correctly, the role dropdown populated, but clicking "Analyze My Skills" did nothing — no loading spinner, no error, no result.

**Root Cause:**  
The `NEXT_PUBLIC_API_URL` environment variable was not set as a GitHub Actions secret when the frontend was first built. Since `NEXT_PUBLIC_*` variables in Next.js are baked into the JavaScript bundle at **build time** (not runtime), the deployed frontend was still using the default fallback value of `http://localhost:8000`. The browser silently failed when trying to POST to localhost.

**Resolution:**  
1. Confirmed `NEXT_PUBLIC_API_URL` was added as a GitHub Repository Secret
2. Re-ran the GitHub Actions "Deploy Next.js Frontend" workflow to rebuild the bundle with the correct API URL baked in

**Lesson Learned:**  
`NEXT_PUBLIC_*` variables in Next.js are **build-time only**. Changing them in Azure App Service environment variables has zero effect — the frontend must be rebuilt via GitHub Actions. If the secret wasn't set before the first deployment, you must re-run the workflow after adding it.

---

## Summary

| # | Issue | Category | Severity |
|---|---|---|---|
| 1 | PostgreSQL port conflict | Local Dev | Medium |
| 2 | Missing gunicorn | Backend Deploy | High |
| 3 | Azure not installing dependencies | Backend Deploy | Critical |
| 4 | Special characters in DB password | Backend Deploy | High |
| 5 | Missing SSL mode | Backend Deploy | High |
| 6 | Next.js MODULE_NOT_FOUND | Frontend Deploy | Critical |
| 7 | Frontend 504 timeout | Frontend Deploy | High |
| 8 | Analyze button not working | Frontend Config | Critical |
