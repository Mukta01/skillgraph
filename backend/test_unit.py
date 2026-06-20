"""
Unit tests for SkillGraph backend components that don't require external APIs.
Tests: gap_analyzer, resume_parser, models
"""

import sys
import io


def test_gap_analyzer():
    """Test the gap analysis logic."""
    from app.services.gap_analyzer import analyze_gap, _normalize
    from app.models import ExtractedSkill

    print("--- Test: Gap Analyzer ---")

    # Test normalization
    assert _normalize("React.js") == "reactjs", f"Got: {_normalize('React.js')}"
    assert _normalize("Machine Learning") == "machinelearning"
    assert _normalize("CI/CD") == "ci/cd"
    print("  [PASS] Normalization")

    # Test gap analysis with known skills
    user_skills = [
        ExtractedSkill(name="Python", category="technical", level="advanced"),
        ExtractedSkill(name="Docker", category="tool", level="intermediate"),
        ExtractedSkill(name="Git", category="tool", level="intermediate"),
        ExtractedSkill(name="FastAPI", category="technical", level="beginner"),
    ]
    role_skills = [
        ExtractedSkill(name="python", category="technical", level="advanced"),
        ExtractedSkill(name="Docker", category="tool", level="advanced"),
        ExtractedSkill(name="AWS", category="technical", level="intermediate"),
        ExtractedSkill(name="Kubernetes", category="technical", level="intermediate"),
        ExtractedSkill(name="Terraform", category="tool", level="intermediate"),
        ExtractedSkill(name="CI/CD", category="technical", level="intermediate"),
        ExtractedSkill(name="Git", category="tool", level="intermediate"),
        ExtractedSkill(name="Linux", category="technical", level="intermediate"),
    ]

    result = analyze_gap(user_skills, role_skills)

    print(f"  Matched: {len(result.matched_skills)}")
    for m in result.matched_skills:
        print(f"    [MATCH] {m.name}: user={m.user_level}, required={m.required_level}")

    print(f"  Missing: {len(result.missing_skills)}")
    for m in result.missing_skills:
        print(f"    [MISS]  {m.name} ({m.category}, {m.level})")

    print(f"  Readiness Score: {result.readiness_score * 100:.1f}%")

    assert len(result.matched_skills) == 3, f"Expected 3 matched, got {len(result.matched_skills)}"
    assert len(result.missing_skills) == 5, f"Expected 5 missing, got {len(result.missing_skills)}"
    assert 0 < result.readiness_score < 1, f"Score {result.readiness_score} should be between 0 and 1"
    print("  [PASS] Gap analysis logic\n")

    # Test with no matching skills
    result2 = analyze_gap([], role_skills)
    assert result2.readiness_score == 0.0, "Score should be 0 with no user skills"
    assert len(result2.missing_skills) == 8, "All 8 should be missing"
    print("  [PASS] No-match edge case\n")

    # Test with all matching skills
    result3 = analyze_gap(role_skills, role_skills)
    assert result3.readiness_score == 1.0, "Score should be 1.0 with perfect match"
    assert len(result3.missing_skills) == 0, "None should be missing"
    print("  [PASS] Perfect match edge case\n")

    # Test partial matching (e.g., "React" matches "ReactJS")
    user_react = [ExtractedSkill(name="React", category="technical", level="advanced")]
    role_react = [ExtractedSkill(name="React.js", category="technical", level="advanced")]
    result4 = analyze_gap(user_react, role_react)
    assert len(result4.matched_skills) == 1, "React should match React.js"
    print("  [PASS] Partial match (React -> React.js)\n")


def test_resume_parser():
    """Test resume parser with a plain text file."""
    from app.services.resume_parser import parse_resume

    print("--- Test: Resume Parser ---")

    # Test TXT parsing
    txt_content = b"John Doe\nPython Developer\nSkills: Python, FastAPI, Docker"
    result = parse_resume(txt_content, "resume.txt")
    assert "John Doe" in result
    assert "Python" in result
    print("  [PASS] TXT parsing\n")

    # Test unsupported format
    try:
        parse_resume(b"data", "resume.jpg")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Unsupported" in str(e)
        print("  [PASS] Unsupported format rejection\n")

    # Test case-insensitive extension
    result2 = parse_resume(b"Hello World", "Resume.TXT")
    assert "Hello World" in result2
    print("  [PASS] Case-insensitive extension\n")


def test_models():
    """Test Pydantic model validation."""
    from app.models import (
        ExtractedSkill,
        ResumeAnalysis,
        GapResult,
        SkillMatch,
        RoleSkillRequirements,
        LearningRoadmap,
        RoadmapPhase,
        RoadmapSkillDetail,
        RoadmapResource,
        AnalysisResponse,
        HealthResponse,
    )

    print("--- Test: Pydantic Models ---")

    # Test ExtractedSkill
    skill = ExtractedSkill(name="Python", category="technical", level="advanced")
    assert skill.name == "Python"
    d = skill.model_dump()
    assert d["name"] == "Python"
    print("  [PASS] ExtractedSkill creation & serialization\n")

    # Test ResumeAnalysis
    ra = ResumeAnalysis(
        skills=[skill],
        summary="Experienced Python developer"
    )
    assert len(ra.skills) == 1
    print("  [PASS] ResumeAnalysis\n")

    # Test GapResult
    gap = GapResult(
        matched_skills=[SkillMatch(name="Python", user_level="advanced", required_level="advanced")],
        missing_skills=[ExtractedSkill(name="AWS", category="technical", level="intermediate")],
        readiness_score=0.5,
    )
    assert gap.readiness_score == 0.5
    assert len(gap.matched_skills) == 1
    print("  [PASS] GapResult\n")

    # Test LearningRoadmap
    roadmap = LearningRoadmap(
        target_role="Cloud Engineer",
        total_weeks=12,
        phases=[
            RoadmapPhase(
                phase_number=1,
                title="Fundamentals",
                duration_weeks=4,
                skills=[
                    RoadmapSkillDetail(
                        name="AWS",
                        estimated_hours=40,
                        description="Learn AWS basics",
                        resources=[
                            RoadmapResource(
                                title="AWS Docs",
                                url="https://aws.amazon.com/docs",
                                type="documentation",
                            )
                        ],
                    )
                ],
            )
        ],
    )
    assert roadmap.total_weeks == 12
    assert len(roadmap.phases) == 1
    assert len(roadmap.phases[0].skills) == 1
    print("  [PASS] LearningRoadmap (nested)\n")

    # Test HealthResponse defaults
    hr = HealthResponse()
    assert hr.status == "ok"
    assert hr.version == "0.1.0"
    print("  [PASS] HealthResponse defaults\n")

    # Test RoleSkillRequirements
    rsr = RoleSkillRequirements(
        role_title="Cloud Engineer",
        role_category="Technology",
        seniority="Mid",
        skills=[skill],
    )
    assert rsr.role_title == "Cloud Engineer"
    dump = rsr.model_dump()
    reloaded = RoleSkillRequirements(**dump)
    assert reloaded.role_title == rsr.role_title
    print("  [PASS] RoleSkillRequirements roundtrip\n")


def test_config():
    """Test config validation."""
    from app.config import Settings

    print("--- Test: Config ---")

    # Test that empty API key raises
    s = Settings.__new__(Settings)
    s.GEMINI_API_KEY = ""
    s.GEMINI_MODEL = "gemini-3.5-flash"
    s.DATABASE_URL = "postgresql://x:x@localhost/x"
    s.ALLOWED_ORIGINS = ["http://localhost:3000"]
    try:
        s.validate()
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "GEMINI_API_KEY" in str(e)
        print("  [PASS] Missing API key validation\n")

    # Test that valid settings don't raise
    from app.config import settings
    try:
        settings.validate()
        print("  [PASS] Current settings are valid\n")
    except ValueError:
        print("  [WARN] Current .env has no GEMINI_API_KEY (expected if not configured)\n")


if __name__ == "__main__":
    # Force UTF-8 output
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    passed = 0
    failed = 0
    tests = [test_gap_analyzer, test_resume_parser, test_models, test_config]

    print("=" * 60)
    print("  SkillGraph Backend - Unit Tests")
    print("=" * 60 + "\n")

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"  [FAIL] {test_fn.__name__}: {e}\n")

    print("=" * 60)
    print(f"  Results: {passed} passed, {failed} failed, {len(tests)} total")
    print("=" * 60)
    sys.exit(1 if failed > 0 else 0)
