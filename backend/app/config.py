"""
SkillGraph configuration — loads settings from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://skillgraph:localdev@localhost:5432/skillgraph"
    )
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")

    def validate(self) -> None:
        """Validate that required settings are present."""
        if not self.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY environment variable is required. "
                "Get one free at https://aistudio.google.com/apikey"
            )


settings = Settings()
