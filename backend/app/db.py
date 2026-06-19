"""
Database layer — PostgreSQL connection and queries using asyncpg.

Tables:
  - sessions: anonymous user sessions
  - analyses: saved analysis results
  - role_skills_cache: cached Gemini output for role skill requirements
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

# Global connection pool
_pool: asyncpg.Pool | None = None


# ---------------------------------------------------------------------------
# Connection Management
# ---------------------------------------------------------------------------

async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=2,
            max_size=10,
        )
        logger.info("Database connection pool created.")
    return _pool


async def close_pool() -> None:
    """Close the connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed.")


async def init_db() -> None:
    """
    Initialize the database — create tables if they don't exist.
    Called on application startup.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
                target_role TEXT NOT NULL,
                readiness_score REAL NOT NULL,
                result_json JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS role_skills_cache (
                role_name TEXT PRIMARY KEY,
                skills_json JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        logger.info("Database tables initialized.")


# ---------------------------------------------------------------------------
# Session Operations
# ---------------------------------------------------------------------------

async def create_session() -> str:
    """Create a new anonymous session. Returns the session ID."""
    pool = await get_pool()
    session_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (id) VALUES ($1)",
            uuid.UUID(session_id),
        )
    return session_id


async def touch_session(session_id: str) -> bool:
    """
    Update the last_active_at timestamp for a session.
    Returns True if the session exists, False otherwise.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE sessions SET last_active_at = NOW() WHERE id = $1",
            uuid.UUID(session_id),
        )
        return result == "UPDATE 1"


async def get_or_create_session(session_id: str | None) -> str:
    """Get an existing session or create a new one."""
    if session_id:
        try:
            exists = await touch_session(session_id)
            if exists:
                return session_id
        except Exception:
            pass
    return await create_session()


# ---------------------------------------------------------------------------
# Analysis Operations
# ---------------------------------------------------------------------------

async def save_analysis(
    session_id: str,
    target_role: str,
    readiness_score: float,
    result_json: dict,
) -> str:
    """Save an analysis result. Returns the analysis ID."""
    pool = await get_pool()
    analysis_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO analyses (id, session_id, target_role, readiness_score, result_json)
            VALUES ($1, $2, $3, $4, $5)
            """,
            uuid.UUID(analysis_id),
            uuid.UUID(session_id),
            target_role,
            readiness_score,
            json.dumps(result_json),
        )
    return analysis_id


async def get_session_history(session_id: str) -> list[dict]:
    """Get past analyses for a session."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, target_role, readiness_score, created_at
            FROM analyses
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT 20
            """,
            uuid.UUID(session_id),
        )
    return [
        {
            "id": str(row["id"]),
            "target_role": row["target_role"],
            "readiness_score": row["readiness_score"],
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]


async def get_analysis_by_id(analysis_id: str) -> dict | None:
    """Get a full analysis result by ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT result_json FROM analyses WHERE id = $1",
            uuid.UUID(analysis_id),
        )
    if row:
        return json.loads(row["result_json"])
    return None


# ---------------------------------------------------------------------------
# Role Skills Cache
# ---------------------------------------------------------------------------

async def get_cached_role_skills(role_name: str) -> dict | None:
    """Get cached skill requirements for a role (if available)."""
    pool = await get_pool()
    normalized = role_name.strip().lower()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT skills_json FROM role_skills_cache WHERE role_name = $1",
            normalized,
        )
    if row:
        return json.loads(row["skills_json"])
    return None


async def cache_role_skills(role_name: str, skills_json: dict) -> None:
    """Cache the skill requirements for a role."""
    pool = await get_pool()
    normalized = role_name.strip().lower()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO role_skills_cache (role_name, skills_json, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (role_name) DO UPDATE
            SET skills_json = $2, updated_at = NOW()
            """,
            normalized,
            json.dumps(skills_json),
        )
