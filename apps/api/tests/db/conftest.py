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


# --- academic core fixtures (migration 0002) --------------------------------
async def _seed_academic_core(
    conn: asyncpg.Connection, inst: dict[str, uuid.UUID]
) -> dict[str, uuid.UUID]:
    """Create one term, subject, offering, enrolment, session, assessment and
    assignment for an institution."""
    ids = {
        "term": uuid.uuid4(),
        "subject": uuid.uuid4(),
        "offering": uuid.uuid4(),
        "enrollment": uuid.uuid4(),
        "session": uuid.uuid4(),
        "assessment": uuid.uuid4(),
        "assignment": uuid.uuid4(),
    }
    institution_id = inst["institution"]

    await conn.execute(
        """
        INSERT INTO terms (id, institution_id, code, name, starts_on, ends_on)
        VALUES ($1, $2, '2026-FA', 'Fall 2026', DATE '2026-09-01', DATE '2026-12-20')
        """,
        ids["term"],
        institution_id,
    )
    await conn.execute(
        """
        INSERT INTO subjects (id, institution_id, code, name, department_id, credits)
        VALUES ($1, $2, 'CS101', 'Intro to Computer Science', $3, 4.0)
        """,
        ids["subject"],
        institution_id,
        inst["department"],
    )
    await conn.execute(
        """
        INSERT INTO subject_offerings
            (id, institution_id, subject_id, term_id, section_code, faculty_id)
        VALUES ($1, $2, $3, $4, '01', $5)
        """,
        ids["offering"],
        institution_id,
        ids["subject"],
        ids["term"],
        inst["faculty"],
    )
    await conn.execute(
        """
        INSERT INTO enrollments
            (id, institution_id, student_id, offering_id, subject_id, term_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        ids["enrollment"],
        institution_id,
        inst["student"],
        ids["offering"],
        ids["subject"],
        ids["term"],
    )
    await conn.execute(
        """
        INSERT INTO class_sessions
            (id, institution_id, offering_id, session_no, meets_on, starts_at, ends_at)
        VALUES ($1, $2, $3, 1, DATE '2026-09-08',
                TIMESTAMPTZ '2026-09-08 09:00:00+00', TIMESTAMPTZ '2026-09-08 10:00:00+00')
        """,
        ids["session"],
        institution_id,
        ids["offering"],
    )
    # Unpublished so it never contributes to the weight aggregate.
    await conn.execute(
        """
        INSERT INTO assessments
            (id, institution_id, offering_id, title, type, max_score,
             weight_percent, is_published)
        VALUES ($1, $2, $3, 'Midterm', 'midterm', 100.00, 30.00, false)
        """,
        ids["assessment"],
        institution_id,
        ids["offering"],
    )
    await conn.execute(
        """
        INSERT INTO assignments
            (id, institution_id, offering_id, title, due_at, max_score)
        VALUES ($1, $2, $3, 'Lab 1', TIMESTAMPTZ '2026-10-01 23:59:00+00', 50.00)
        """,
        ids["assignment"],
        institution_id,
        ids["offering"],
    )
    return ids


async def _extend_alpha(conn: asyncpg.Connection, ids: dict[str, uuid.UUID]) -> None:
    """Alpha gets a second student, a second section of CS101, and a CS102
    offering — enough to exercise cross-offering and double-enrolment rules."""
    ids["student2_user"] = uuid.uuid4()
    ids["student2"] = uuid.uuid4()
    ids["subject2"] = uuid.uuid4()
    ids["offering2"] = uuid.uuid4()
    ids["offering3"] = uuid.uuid4()
    ids["enrollment2"] = uuid.uuid4()

    await conn.execute(
        """
        INSERT INTO users (id, institution_id, email, password_hash, full_name, role)
        VALUES ($1, $2, 'student2@unisync.test', 'hash', 'Alpha Student Two', 'student')
        """,
        ids["student2_user"],
        ids["institution"],
    )
    await conn.execute(
        """
        INSERT INTO students
            (id, institution_id, user_id, roll_number, department_id, program, admission_year)
        VALUES ($1, $2, $3, 'CS-002', $4, 'B.Tech Computer Science', 2023)
        """,
        ids["student2"],
        ids["institution"],
        ids["student2_user"],
        ids["department"],
    )
    await conn.execute(
        """
        INSERT INTO subjects (id, institution_id, code, name, department_id, credits)
        VALUES ($1, $2, 'CS102', 'Data Structures', $3, 3.0)
        """,
        ids["subject2"],
        ids["institution"],
        ids["department"],
    )
    # Second section of the SAME subject in the SAME term.
    await conn.execute(
        """
        INSERT INTO subject_offerings (id, institution_id, subject_id, term_id, section_code)
        VALUES ($1, $2, $3, $4, '02')
        """,
        ids["offering2"],
        ids["institution"],
        ids["subject"],
        ids["term"],
    )
    # A different subject, with the second student enrolled in it.
    await conn.execute(
        """
        INSERT INTO subject_offerings (id, institution_id, subject_id, term_id, section_code)
        VALUES ($1, $2, $3, $4, '01')
        """,
        ids["offering3"],
        ids["institution"],
        ids["subject2"],
        ids["term"],
    )
    await conn.execute(
        """
        INSERT INTO enrollments
            (id, institution_id, student_id, offering_id, subject_id, term_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        ids["enrollment2"],
        ids["institution"],
        ids["student2"],
        ids["offering3"],
        ids["subject2"],
        ids["term"],
    )


@pytest_asyncio.fixture
async def academic(
    owner: asyncpg.Connection, seeded: dict[str, dict[str, uuid.UUID]]
) -> dict[str, dict[str, uuid.UUID]]:
    alpha = {**seeded["a"], **await _seed_academic_core(owner, seeded["a"])}
    await _extend_alpha(owner, alpha)  # mutates `alpha` with the extra ids
    beta = {**seeded["b"], **await _seed_academic_core(owner, seeded["b"])}
    return {"a": alpha, "b": beta}
