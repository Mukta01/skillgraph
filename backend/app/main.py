"""
SkillGraph API — FastAPI application with all routes.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import (
    cache_role_skills,
    close_pool,
    get_cached_role_skills,
    get_or_create_session,
    get_session_history,
    get_analysis_by_id,
    init_db,
    save_analysis,
)
from app.models import (
    AnalysisResponse,
    HealthResponse,
    RoleInfo,
    RoleSkillRequirements,
)
from app.services.ai_service import (
    extract_role_skills,
    extract_skills_from_resume,
    generate_roadmap,
    validate_additional_skills_with_ai,
)
from app.services.gap_analyzer import analyze_gap
from app.services.resume_parser import parse_resume

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Popular roles for the dropdown (can be extended)
# ---------------------------------------------------------------------------
POPULAR_ROLES: list[RoleInfo] = [
    # Technology
    RoleInfo(name="Software Engineer", category="Technology"),
    RoleInfo(name="Frontend Developer", category="Technology"),
    RoleInfo(name="Backend Developer", category="Technology"),
    RoleInfo(name="Full Stack Developer", category="Technology"),
    RoleInfo(name="Data Scientist", category="Technology"),
    RoleInfo(name="Data Analyst", category="Technology"),
    RoleInfo(name="Data Engineer", category="Technology"),
    RoleInfo(name="Machine Learning Engineer", category="Technology"),
    RoleInfo(name="DevOps Engineer", category="Technology"),
    RoleInfo(name="Cloud Engineer", category="Technology"),
    RoleInfo(name="Cybersecurity Analyst", category="Technology"),
    RoleInfo(name="Mobile App Developer", category="Technology"),
    RoleInfo(name="QA Engineer", category="Technology"),
    RoleInfo(name="AI Engineer", category="Technology"),
    # Design
    RoleInfo(name="UX Designer", category="Design"),
    RoleInfo(name="UI Designer", category="Design"),
    RoleInfo(name="Product Designer", category="Design"),
    RoleInfo(name="Graphic Designer", category="Design"),
    # Business & Management
    RoleInfo(name="Product Manager", category="Business"),
    RoleInfo(name="Project Manager", category="Business"),
    RoleInfo(name="Business Analyst", category="Business"),
    RoleInfo(name="Management Consultant", category="Business"),
    RoleInfo(name="Operations Manager", category="Business"),
    # Marketing
    RoleInfo(name="Digital Marketing Manager", category="Marketing"),
    RoleInfo(name="Content Strategist", category="Marketing"),
    RoleInfo(name="SEO Specialist", category="Marketing"),
    RoleInfo(name="Social Media Manager", category="Marketing"),
    # Finance
    RoleInfo(name="Financial Analyst", category="Finance"),
    RoleInfo(name="Investment Banker", category="Finance"),
    RoleInfo(name="Accountant", category="Finance"),
    # Healthcare
    RoleInfo(name="Registered Nurse", category="Healthcare"),
    RoleInfo(name="Healthcare Administrator", category="Healthcare"),
    # Other
    RoleInfo(name="Technical Writer", category="Other"),
    RoleInfo(name="Human Resources Manager", category="Other"),
    RoleInfo(name="Supply Chain Manager", category="Other"),
]


# ---------------------------------------------------------------------------
# App Lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings.validate()
    await init_db()
    logger.info("SkillGraph API started.")
    yield
    await close_pool()
    logger.info("SkillGraph API shut down.")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SkillGraph API",
    version="0.1.0",
    description="Analyze your resume, find skill gaps, get a learning roadmap.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Azure probes."""
    return HealthResponse()


@app.get("/api/roles", response_model=list[RoleInfo])
async def list_roles():
    """Return the list of popular roles for the dropdown."""
    return POPULAR_ROLES


@app.post("/api/analyze")
async def analyze(
    resume: UploadFile = File(..., description="Resume file (PDF, DOCX, TXT, or Image)"),
    target_role: str = Form(..., description="Target job role"),
    additional_skills: str | None = Form(None, description="Optional comma-separated extra skills"),
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
):
    """
    Main analysis endpoint.

    1. Parse resume (in-memory, never stored)
    2. Extract user skills via Gemini
    3. Get/generate role skill requirements
    4. Run gap analysis
    5. Generate learning roadmap
    6. Save results to database
    7. Return everything
    """
    # Validate file type
    filename = resume.filename or "unknown"
    valid_extensions = (".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".webp")
    if not filename.lower().endswith(valid_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a PDF, DOCX, TXT, or Image file.",
        )

    if additional_skills:
        logger.info("Validating additional skills...")
        invalid_skills = await validate_additional_skills_with_ai(additional_skills)
        if invalid_skills:
            raise HTTPException(
                status_code=400,
                detail=f"The following inputs are not recognized as valid professional skills: {', '.join(invalid_skills)}",
            )

    try:
        # Read file bytes into memory (never stored to disk)
        file_bytes = await resume.read()

        is_image = filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))

        if is_image:
            logger.info(f"Image file detected: {filename}. Skipping local text parsing.")
            mime_type = resume.content_type
            if not mime_type or mime_type == "application/octet-stream":
                if filename.lower().endswith(".png"): mime_type = "image/png"
                elif filename.lower().endswith(".webp"): mime_type = "image/webp"
                else: mime_type = "image/jpeg"
                
            logger.info("Extracting skills from resume image via Gemini...")
            resume_analysis = await extract_skills_from_resume(
                file_bytes=file_bytes,
                mime_type=mime_type,
                additional_skills=additional_skills
            )
        else:
            # 1. Parse resume to plain text
            logger.info(f"Parsing resume: {filename}")
            resume_text = parse_resume(file_bytes, filename)

            # 2. Extract skills from resume text via Gemini
            logger.info("Extracting skills from resume text...")
            resume_analysis = await extract_skills_from_resume(
                resume_text=resume_text,
                additional_skills=additional_skills
            )

        # Explicitly discard the file bytes
        del file_bytes

        # 3. Get role skill requirements (check cache first)
        logger.info(f"Getting role requirements for: {target_role}")
        cached = await get_cached_role_skills(target_role)
        if cached:
            role_requirements = RoleSkillRequirements(**cached)
            logger.info("Using cached role skills.")
        else:
            role_requirements = await extract_role_skills(target_role)
            # Cache for future requests
            await cache_role_skills(target_role, role_requirements.model_dump())
            logger.info("Generated and cached new role skills.")

        # 4. Gap analysis
        logger.info("Running gap analysis...")
        gap_result = analyze_gap(resume_analysis.skills, role_requirements.skills)

        # 5. Generate roadmap (only if there are missing skills)
        if gap_result.missing_skills:
            logger.info("Generating learning roadmap...")
            roadmap = await generate_roadmap(gap_result.missing_skills, target_role)
        else:
            from app.models import LearningRoadmap
            roadmap = LearningRoadmap(
                target_role=target_role,
                total_weeks=0,
                phases=[],
            )

        # 6. Create/get session and save results
        session_id = await get_or_create_session(x_session_id)

        response = AnalysisResponse(
            session_id=session_id,
            user_skills=resume_analysis.skills,
            user_summary=resume_analysis.summary,
            role_requirements=role_requirements,
            gap=gap_result,
            roadmap=roadmap,
        )

        await save_analysis(
            session_id=session_id,
            target_role=target_role,
            readiness_score=gap_result.readiness_score,
            result_json=response.model_dump(),
        )

        logger.info(
            f"Analysis complete. Readiness: {gap_result.readiness_score:.0%}, "
            f"Matched: {len(gap_result.matched_skills)}, "
            f"Missing: {len(gap_result.missing_skills)}"
        )

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/roles/{role_name}/skills")
async def get_role_skills(role_name: str):
    """Get skill requirements for a specific role (cached if available)."""
    cached = await get_cached_role_skills(role_name)
    if cached:
        return {"role": role_name, "skills": cached, "cached": True}

    # Generate fresh via Gemini
    role_requirements = await extract_role_skills(role_name)
    await cache_role_skills(role_name, role_requirements.model_dump())
    return {
        "role": role_name,
        "skills": role_requirements.model_dump(),
        "cached": False,
    }


@app.get("/api/session/{session_id}/history")
async def session_history(session_id: str):
    """Get past analyses for a session."""
    history = await get_session_history(session_id)
    return {"session_id": session_id, "analyses": history}


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a full analysis result by ID."""
    result = await get_analysis_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result
