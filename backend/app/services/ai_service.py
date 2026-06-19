"""
AI service — all Google Gemini interactions in one place.

Three core functions:
  1. extract_skills_from_resume(text)  → ResumeAnalysis
  2. extract_role_skills(role)         → RoleSkillRequirements
  3. generate_roadmap(missing, role)   → LearningRoadmap
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from google import genai
from google.genai import errors
from google.genai import types as genai_types

from app.config import settings
from app.models import (
    ExtractedSkill,
    LearningRoadmap,
    ResumeAnalysis,
    RoadmapPhase,
    RoadmapResource,
    RoadmapSkillDetail,
    RoleSkillRequirements,
)

logger = logging.getLogger(__name__)

# Directory containing prompt templates
PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


def _get_client() -> genai.Client:
    """Create a Gemini client."""
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts/ directory."""
    path = PROMPTS_DIR / filename
    return path.read_text(encoding="utf-8")


def _generate_content_with_retry(
    client: genai.Client,
    contents: str,
    config: genai_types.GenerateContentConfig,
) -> any:
    """
    Generate content using the primary model with automatic retries for transient errors.
    If the primary model is persistently unavailable or rate-limited, attempts fallback models.
    """
    primary_model = settings.GEMINI_MODEL
    # A list of models to try in order if the primary one fails persistently
    fallback_models = [
        primary_model,
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
    ]
    
    # Remove duplicates while preserving order
    models_to_try = []
    for m in fallback_models:
        if m and m not in models_to_try:
            models_to_try.append(m)

    last_exception = None
    for model_name in models_to_try:
        max_retries = 3
        backoff = 2.0
        
        logger.info(f"Attempting content generation using model: {model_name}")
        for attempt in range(max_retries):
            try:
                return client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
            except (errors.ServerError, errors.ClientError) as e:
                last_exception = e
                is_transient = False
                
                # Check for 503 or transient 429
                if isinstance(e, errors.ServerError) and e.code == 503:
                    is_transient = True
                elif isinstance(e, errors.ClientError) and e.code == 429:
                    err_msg = str(e).lower()
                    if "limit: 0" not in err_msg:
                        is_transient = True
                
                if is_transient and attempt < max_retries - 1:
                    sleep_time = backoff ** attempt
                    logger.warning(
                        f"Model '{model_name}' returned transient error {e.code} ({e.message}). "
                        f"Retrying in {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})..."
                    )
                    time.sleep(sleep_time)
                    continue
                
                # If not transient, or we exhausted retries for this model, break the retry loop
                logger.warning(f"Model '{model_name}' failed: {e}")
                break
                
    # If all models failed, raise the last encountered exception
    if last_exception:
        raise last_exception
    raise RuntimeError("All generation models failed.")


async def extract_skills_from_resume(
    resume_text: str | None = None,
    file_bytes: bytes | None = None,
    mime_type: str | None = None,
) -> ResumeAnalysis:
    """
    Extract skills from a resume using Gemini.

    Args:
        resume_text: Plain text content of the resume (if parsed locally).
        file_bytes: Raw bytes of the image file (if image upload).
        mime_type: MIME type of the image.

    Returns:
        ResumeAnalysis with a list of skills and a professional summary.
    """
    system_prompt = _load_prompt("extract_resume_skills.txt")
    client = _get_client()

    if file_bytes and mime_type:
        contents = [
            genai_types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            "Here is the resume image to analyze."
        ]
    else:
        contents = f"Here is the resume to analyze:\n\n{resume_text}"

    response = _generate_content_with_retry(
        client=client,
        contents=contents,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=ResumeAnalysis,
            temperature=0.2,
        ),
    )

    data = json.loads(response.text)
    return ResumeAnalysis(**data)


async def extract_role_skills(target_role: str) -> RoleSkillRequirements:
    """
    Generate the skills required for a target role using Gemini.

    Args:
        target_role: The job role to analyze (e.g., "Data Analyst").

    Returns:
        RoleSkillRequirements with categorized skills.
    """
    system_prompt = _load_prompt("extract_role_skills.txt")

    client = _get_client()
    response = _generate_content_with_retry(
        client=client,
        contents=f"Generate the skill requirements for this role: {target_role}",
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=RoleSkillRequirements,
            temperature=0.3,
        ),
    )

    data = json.loads(response.text)
    return RoleSkillRequirements(**data)


async def generate_roadmap(
    missing_skills: list[ExtractedSkill],
    target_role: str,
) -> LearningRoadmap:
    """
    Generate a phased learning roadmap for the missing skills using Gemini.

    Args:
        missing_skills: Skills the user needs to learn.
        target_role: The target job role.

    Returns:
        LearningRoadmap with phases, time estimates, and resources.
    """
    system_prompt = _load_prompt("generate_roadmap.txt")

    skills_list = "\n".join(
        f"- {s.name} ({s.category}, {s.level})" for s in missing_skills
    )

    user_message = (
        f"Target Role: {target_role}\n\n"
        f"Missing Skills:\n{skills_list}\n\n"
        "Generate a learning roadmap for these skills."
    )

    client = _get_client()
    response = _generate_content_with_retry(
        client=client,
        contents=user_message,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=LearningRoadmap,
            temperature=0.4,
        ),
    )

    data = json.loads(response.text)
    return LearningRoadmap(**data)
