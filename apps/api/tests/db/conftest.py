"""Fixtures for the tenant isolation suite.

Migrations must already be applied (``alembic upgrade head``). The suite runs
against the configured database, truncating tenant tables before each test and
seeding two deliberately conflicting institutions.

Fixtures are created by the **owner** role; every isolation assertion runs as
the **runtime** role.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

import asyncpg
import pytest
import pytest_asyncio
from app.core.config import Settings

from tests.db.helpers import connection_params

# Identical identifiers in both institutions on purpose: tenant-scoped
# uniqueness must allow them, and isolation must keep them apart.
SHARED_EMAIL_LOCAL = "admin@unisync.test"
SHARED_FACULTY_EMAIL = "faculty@unisync.test"
SHARED_STUDENT_EMAIL = "student@unisync.test"
SHARED_DEPARTMENT_CODE = "CSE"
SHARED_EMPLOYEE_CODE = "CS-F01"
SHARED_ROLL_NUMBER = "CS-001"


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings()


@pytest.fixture(scope="session")
def app_params(settings: Settings) -> dict[str, Any]:
    return connection_params(settings.database_url)


@pytest.fixture(scope="session")
def owner_params(settings: Settings) -> dict[str, Any]:
    return connection_params(settings.migration_database_url)


@pytest_asyncio.fixture
async def owner(owner_params: dict[str, Any]) -> AsyncIterator[asyncpg.Connection]:
    connection = await asyncpg.connect(**owner_params)
    try:
        yield connection
    finally:
        await connection.close()


@pytest_asyncio.fixture(autouse=True)
async def clean_database(owner: asyncpg.Connection) -> AsyncIterator[None]:
    """Truncate the tenant tables before every test."""
    await owner.execute("TRUNCATE TABLE institutions CASCADE")
    yield


async def _seed_institution(conn: asyncpg.Connection, code: str, name: str) -> dict[str, uuid.UUID]:
    ids = {
        "institution": uuid.uuid4(),
        "department": uuid.uuid4(),
        "admin_user": uuid.uuid4(),
        "faculty_user": uuid.uuid4(),
        "faculty": uuid.uuid4(),
        "student_user": uuid.uuid4(),
        "student": uuid.uuid4(),
    }

    await conn.execute(
        "INSERT INTO institutions (id, code, name) VALUES ($1, $2, $3)",
        ids["institution"],
        code,
        name,
    )
    await conn.execute(
        """
        INSERT INTO departments (id, institution_id, code, name)
        VALUES ($1, $2, $3, $4)
        """,
        ids["department"],
        ids["institution"],
        SHARED_DEPARTMENT_CODE,
        f"{name} Computer Science",
    )
    for key, email, role in (
        ("admin_user", SHARED_EMAIL_LOCAL, "admin"),
        ("faculty_user", SHARED_FACULTY_EMAIL, "faculty"),
        ("student_user", SHARED_STUDENT_EMAIL, "student"),
    ):
        await conn.execute(
            """
            INSERT INTO users
                (id, institution_id, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            ids[key],
            ids["institution"],
            email,
            "argon2id-placeholder-not-a-real-hash",
            f"{name} {role}",
            role,
        )

    await conn.execute(
        """
        INSERT INTO faculty
            (id, institution_id, user_id, employee_code, department_id, designation)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        ids["faculty"],
        ids["institution"],
        ids["faculty_user"],
        SHARED_EMPLOYEE_CODE,
        ids["department"],
        "Lecturer",
    )
    await conn.execute(
        """
        INSERT INTO students
            (id, institution_id, user_id, roll_number, department_id, program,
             admission_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        ids["student"],
        ids["institution"],
        ids["student_user"],
        SHARED_ROLL_NUMBER,
        ids["department"],
        "B.Tech Computer Science",
        2023,
    )
    return ids


@pytest_asyncio.fixture
async def seeded(
    owner: asyncpg.Connection, clean_database: None
) -> dict[str, dict[str, uuid.UUID]]:
    return {
        "a": await _seed_institution(owner, "alpha", "Alpha University"),
        "b": await _seed_institution(owner, "beta", "Beta University"),
    }
