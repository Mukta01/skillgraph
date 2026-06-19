"""
Gap analyzer — compares user skills against role requirements.
Pure Python logic, no AI calls.
"""

from __future__ import annotations

from app.models import ExtractedSkill, GapResult, SkillMatch


def analyze_gap(
    user_skills: list[ExtractedSkill],
    role_skills: list[ExtractedSkill],
) -> GapResult:
    """
    Compare user skills against role requirements and produce a gap analysis.

    Matching is case-insensitive and ignores minor variations
    (e.g. "React.js" matches "React.Js").

    Args:
        user_skills: Skills extracted from the user's resume.
        role_skills: Skills required for the target role.

    Returns:
        GapResult with matched skills, missing skills, and a readiness score.
    """
    # Build a lookup of normalized user skill names → skill objects
    user_lookup: dict[str, ExtractedSkill] = {
        _normalize(s.name): s for s in user_skills
    }

    matched: list[SkillMatch] = []
    missing: list[ExtractedSkill] = []

    for role_skill in role_skills:
        normalized = _normalize(role_skill.name)

        # Check for direct match
        user_skill = user_lookup.get(normalized)

        if user_skill is None:
            # Try partial matching — check if one name contains the other
            user_skill = _find_partial_match(normalized, user_lookup)

        if user_skill is not None:
            matched.append(
                SkillMatch(
                    name=role_skill.name,
                    user_level=user_skill.level,
                    required_level=role_skill.level,
                )
            )
        else:
            missing.append(role_skill)

    # Readiness score: ratio of matched skills to total required skills
    total = len(role_skills)
    score = len(matched) / total if total > 0 else 0.0

    return GapResult(
        matched_skills=matched,
        missing_skills=missing,
        readiness_score=round(score, 2),
    )


def _normalize(name: str) -> str:
    """Normalize a skill name for comparison."""
    return (
        name.lower()
        .strip()
        .replace(".", "")
        .replace("-", "")
        .replace("_", "")
        .replace(" ", "")
    )


def _find_partial_match(
    target: str, user_lookup: dict[str, ExtractedSkill]
) -> ExtractedSkill | None:
    """
    Try to find a partial match where one skill name contains the other.
    E.g., "javascript" matches "js", "reactjs" matches "react".
    """
    for user_name, user_skill in user_lookup.items():
        if target in user_name or user_name in target:
            return user_skill
    return None
