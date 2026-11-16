"""Academic core (migration 0002) - acceptance tests A1-A19, A21, A22.

A20 (downgrade / re-upgrade) is executed through the Alembic CLI and recorded
in the implementation log, because it manipulates schema state rather than
application data.

Fixtures are created by ``unisync_owner``. Isolation assertions that must prove
the *database* refuses a write run as the owner (RLS bypassed) so the composite
foreign keys are tested independently of RLS; assertions about RLS itself run
as the runtime role (``unisync_app``).
"""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

import asyncpg
import pytest

from tests.db.helpers import tenant_connection

pytestmark = pytest.mark.db

TABLES = (
    "terms",
    "subjects",
    "subject_prerequisites",
    "subject_offerings",
    "enrollments",
    "class_sessions",
    "attendance_records",
    "assessments",
    "assignments",
    "marks",
    "submissions",
)


async def _new_offering(
    conn: asyncpg.Connection, ids: dict[str, uuid.UUID], section: str
) -> uuid.UUID:
    offering = uuid.uuid4()
    await conn.execute(
        """
        INSERT INTO subject_offerings
            (id, institution_id, subject_id, term_id, section_code)
        VALUES ($1, $2, $3, $4, $5)
        """,
        offering,
        ids["institution"],
        ids["subject"],
        ids["term"],
        section,
    )
    return offering


async def _new_assessment(
    conn: asyncpg.Connection,
    ids: dict[str, uuid.UUID],
    *,
    weight: Decimal | int = 10,
    published: bool = True,
    max_score: Decimal | int = 100,
) -> uuid.UUID:
    assessment = uuid.uuid4()
    await conn.execute(
        """
        INSERT INTO assessments
            (id, institution_id, offering_id, title, type, max_score,
             weight_percent, is_published)
        VALUES ($1, $2, $3, $4, 'quiz', $5, $6, $7)
        """,
        assessment,
        ids["institution"],
        ids["offering"],
        f"Assessment {assessment}",
        Decimal(max_score),
        Decimal(weight),
        published,
    )
    return assessment


# --- A1-A3: cross-tenant references fail even with RLS bypassed --------------
async def test_a1_cross_tenant_prerequisite_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a, b = academic["a"], academic["b"]
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
        await owner.execute(
            """
            INSERT INTO subject_prerequisites
                (id, institution_id, subject_id, prerequisite_subject_id)
            VALUES ($1, $2, $3, $4)
            """,
            uuid.uuid4(),
            a["institution"],
            a["subject"],
            b["subject"],
        )


async def test_a2_offering_cannot_use_other_tenant_term(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a, b = academic["a"], academic["b"]
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
        await owner.execute(
            """
            INSERT INTO subject_offerings
                (id, institution_id, subject_id, term_id, section_code)
            VALUES ($1, $2, $3, $4, '99')
            """,
            uuid.uuid4(),
            b["institution"],
            b["subject"],
            a["term"],
        )


async def test_a3_enrollment_cannot_reference_other_tenant_offering(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a, b = academic["a"], academic["b"]
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
        await owner.execute(
            """
            INSERT INTO enrollments
                (id, institution_id, student_id, offering_id, subject_id, term_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            uuid.uuid4(),
            a["institution"],
            a["student"],
            b["offering"],
            b["subject"],
            b["term"],
        )


# --- A4: tenant-scoped uniqueness -------------------------------------------
async def test_a4_tenant_scoped_uniqueness(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a, b = academic["a"], academic["b"]

    async def add(institution: uuid.UUID, department: uuid.UUID) -> None:
        await owner.execute(
            """
            INSERT INTO subjects (id, institution_id, code, name, department_id, credits)
            VALUES ($1, $2, 'PHY101', 'Physics', $3, 3.0)
            """,
            uuid.uuid4(),
            institution,
            department,
        )

    await add(a["institution"], a["department"])
    await add(b["institution"], b["department"])  # same code, other tenant: allowed

    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await add(a["institution"], a["department"])  # duplicate inside one tenant


# --- A5-A6: enrolment duplication -------------------------------------------
async def test_a5_duplicate_enrollment_same_offering_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await owner.execute(
            """
            INSERT INTO enrollments
                (id, institution_id, student_id, offering_id, subject_id, term_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            uuid.uuid4(),
            a["institution"],
            a["student"],
            a["offering"],
            a["subject"],
            a["term"],
        )


async def test_a6_double_enrollment_across_sections_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    # offering2 is a second section of the same subject in the same term.
    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await owner.execute(
            """
            INSERT INTO enrollments
                (id, institution_id, student_id, offering_id, subject_id, term_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            uuid.uuid4(),
            a["institution"],
            a["student"],
            a["offering2"],
            a["subject"],
            a["term"],
        )


# --- A7: attendance cannot mix offerings ------------------------------------
async def test_a7_attendance_cannot_mix_offerings(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]

    # session belongs to offering1, enrollment belongs to offering3.
    # Whichever offering_id is supplied, one of the two composite FKs fails.
    for offering_id in (a["offering"], a["offering3"]):
        with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
            await owner.execute(
                """
                INSERT INTO attendance_records
                    (id, institution_id, session_id, enrollment_id, offering_id, status)
                VALUES ($1, $2, $3, $4, $5, 'present')
                """,
                uuid.uuid4(),
                a["institution"],
                a["session"],
                a["enrollment2"],
                offering_id,
            )


async def test_a7_attendance_matching_offering_is_accepted(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    """Control case: the same shape with matching offerings must succeed."""
    a = academic["a"]
    await owner.execute(
        """
        INSERT INTO attendance_records
            (id, institution_id, session_id, enrollment_id, offering_id, status)
        VALUES ($1, $2, $3, $4, $5, 'present')
        """,
        uuid.uuid4(),
        a["institution"],
        a["session"],
        a["enrollment"],
        a["offering"],
    )


# --- A8: marks cannot mix offerings -----------------------------------------
async def test_a8_marks_cannot_mix_offerings(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]

    # assessment belongs to offering1, enrollment belongs to offering3.
    for offering_id in (a["offering"], a["offering3"]):
        with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
            await owner.execute(
                """
                INSERT INTO marks
                    (id, institution_id, assessment_id, enrollment_id, offering_id,
                     score, graded_at)
                VALUES ($1, $2, $3, $4, $5, 80.00, now())
                """,
                uuid.uuid4(),
                a["institution"],
                a["assessment"],
                a["enrollment2"],
                offering_id,
            )


async def test_a8_marks_matching_offering_is_accepted(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    await owner.execute(
        """
        INSERT INTO marks
            (id, institution_id, assessment_id, enrollment_id, offering_id,
             score, graded_at)
        VALUES ($1, $2, $3, $4, $5, 80.00, now())
        """,
        uuid.uuid4(),
        a["institution"],
        a["assessment"],
        a["enrollment"],
        a["offering"],
    )


# --- A9: mark above maximum -------------------------------------------------
async def test_a9_mark_above_max_score_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        await owner.execute(
            """
            INSERT INTO marks
                (id, institution_id, assessment_id, enrollment_id, offering_id,
                 score, graded_at)
            VALUES ($1, $2, $3, $4, $5, 120.00, now())
            """,
            uuid.uuid4(),
            a["institution"],
            a["assessment"],  # max_score = 100
            a["enrollment"],
            a["offering"],
        )


# --- A10: assessment weight aggregate ---------------------------------------
async def test_a10_weight_aggregate_above_100_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        async with owner.transaction():
            await _new_assessment(owner, a, weight=60, published=True)
            await _new_assessment(owner, a, weight=50, published=True)


async def test_a10b_weight_aggregate_at_100_accepted(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    async with owner.transaction():
        await _new_assessment(owner, a, weight=60, published=True)
        await _new_assessment(owner, a, weight=40, published=True)

    total = await owner.fetchval(
        "SELECT sum(weight_percent) FROM assessments WHERE offering_id = $1 AND is_published",
        a["offering"],
    )
    assert Decimal(total) == Decimal("100.00")


# --- A11-A12: invalid assessment values -------------------------------------
async def test_a11_invalid_max_score_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    for bad in (0, -10):
        with pytest.raises(asyncpg.exceptions.CheckViolationError):
            await _new_assessment(owner, a, max_score=bad)


async def test_a12_invalid_weight_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    for bad in (-1, 101):
        with pytest.raises(asyncpg.exceptions.CheckViolationError):
            await _new_assessment(owner, a, weight=bad, published=False)


# --- A13-A14: submissions ---------------------------------------------------
async def test_a13_duplicate_submission_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    insert = """
        INSERT INTO submissions
            (id, institution_id, assignment_id, enrollment_id, offering_id, status)
        VALUES ($1, $2, $3, $4, $5, 'missing')
    """
    await owner.execute(
        insert, uuid.uuid4(), a["institution"], a["assignment"], a["enrollment"], a["offering"]
    )

    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        await owner.execute(
            insert,
            uuid.uuid4(),
            a["institution"],
            a["assignment"],
            a["enrollment"],
            a["offering"],
        )


async def test_a14_submission_score_above_max_rejected(
    academic: dict[str, dict[str, uuid.UUID]], owner: asyncpg.Connection
) -> None:
    a = academic["a"]
    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        await owner.execute(
            """
            INSERT INTO submissions
                (id, institution_id, assignment_id, enrollment_id, offering_id,
                 status, score)
            VALUES ($1, $2, $3, $4, $5, 'graded', 60.00)
            """,
            uuid.uuid4(),
            a["institution"],
            a["assignment"],  # max_score = 50
            a["enrollment"],
            a["offering"],
        )


# --- A15: RLS read isolation ------------------------------------------------
async def test_a15_rls_read_isolation(
    academic: dict[str, dict[str, uuid.UUID]], app_params: dict[str, Any]
) -> None:
    a, b = academic["a"], academic["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        assert await conn.fetchval("SELECT count(*) FROM terms") == 1
        assert await conn.fetchval("SELECT count(*) FROM subjects") == 2
        assert await conn.fetchval("SELECT count(*) FROM subject_offerings") == 3
        assert await conn.fetchval("SELECT count(*) FROM enrollments") == 2
        assert await conn.fetchval("SELECT count(*) FROM class_sessions") == 1

        for table, other_id in (
            ("terms", b["term"]),
            ("subjects", b["subject"]),
            ("subject_offerings", b["offering"]),
            ("enrollments", b["enrollment"]),
            ("class_sessions", b["session"]),
            ("assessments", b["assessment"]),
            ("assignments", b["assignment"]),
        ):
            visible = await conn.fetchval(
                f"SELECT count(*) FROM {table} WHERE id = $1",  # noqa: S608 - fixed literals
                other_id,
            )
            assert visible == 0, f"{table} leaked a row from another institution"


# --- A16: RLS write isolation -----------------------------------------------
async def test_a16_rls_write_isolation(
    academic: dict[str, dict[str, uuid.UUID]], app_params: dict[str, Any]
) -> None:
    a, b = academic["a"], academic["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        assert (
            await conn.execute("UPDATE terms SET name = 'hijacked' WHERE id = $1", b["term"])
            == "UPDATE 0"
        )

    async with tenant_connection(app_params, a["institution"]) as conn:
        assert await conn.execute("DELETE FROM subjects WHERE id = $1", b["subject"]) == "DELETE 0"

    async with tenant_connection(app_params, a["institution"]) as conn:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(
                """
                INSERT INTO terms (id, institution_id, code, name, starts_on, ends_on)
                VALUES ($1, $2, 'X-1', 'Smuggled', DATE '2027-01-01', DATE '2027-05-01')
                """,
                uuid.uuid4(),
                b["institution"],
            )


# --- A17-A18: missing and malformed tenant context --------------------------
async def test_a17_missing_tenant_context_sees_nothing(
    academic: dict[str, dict[str, uuid.UUID]], app_params: dict[str, Any]
) -> None:
    async with tenant_connection(app_params) as conn:
        assert await conn.fetchval("SELECT count(*) FROM terms") == 0
        assert await conn.fetchval("SELECT count(*) FROM subjects") == 0
        assert await conn.fetchval("SELECT count(*) FROM enrollments") == 0
        assert await conn.fetchval("SELECT count(*) FROM class_sessions") == 0
        assert await conn.fetchval("SELECT count(*) FROM attendance_records") == 0
        assert await conn.fetchval("SELECT count(*) FROM assessments") == 0
        assert await conn.fetchval("SELECT count(*) FROM marks") == 0
        assert await conn.fetchval("SELECT count(*) FROM submissions") == 0


async def test_a18_malformed_tenant_context_sees_nothing(
    academic: dict[str, dict[str, uuid.UUID]], app_params: dict[str, Any]
) -> None:
    async with tenant_connection(app_params, "not-a-uuid") as conn:
        assert await conn.fetchval("SELECT count(*) FROM terms") == 0
        assert await conn.fetchval("SELECT count(*) FROM enrollments") == 0
        assert await conn.fetchval("SELECT count(*) FROM marks") == 0


# --- A19: runtime privileges preserved --------------------------------------
async def test_a19_runtime_role_privileges(
    academic: dict[str, dict[str, uuid.UUID]],
    app_params: dict[str, Any],
    settings: Any,
) -> None:
    a = academic["a"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        owners = await conn.fetch(
            """
            SELECT c.relname AS table_name, pg_get_userbyid(c.relowner) AS owner
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
              AND c.relname <> 'alembic_version'
            """
        )
        assert len(owners) == 17, f"expected 17 tenant tables, got {len(owners)}"
        assert all(row["owner"] == settings.postgres_owner_user for row in owners)

        assert (
            await conn.fetchval(
                "SELECT has_table_privilege(current_user, 'public.terms', 'TRUNCATE')"
            )
            is False
        )

        assert (
            await conn.fetchval(
                "SELECT has_table_privilege(current_user, 'public.attendance_records', 'TRUNCATE')"
            )
            is False
        )

    for statement in (
        "TRUNCATE TABLE terms",
        "ALTER TABLE terms DISABLE ROW LEVEL SECURITY",
        "DROP POLICY tenant_isolation ON terms",
        "CREATE POLICY bypass ON terms USING (true)",
    ):
        async with tenant_connection(app_params, a["institution"]) as conn:
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await conn.execute(statement)


# --- A21-A22: catalogue integrity -------------------------------------------
async def _foreign_keys(owner: asyncpg.Connection) -> list[asyncpg.Record]:
    return await owner.fetch(
        """
        SELECT c.conname,
               c.conrelid::regclass::text AS child,
               c.confrelid::regclass::text AS parent,
               ARRAY(
                   SELECT a.attname
                   FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                   JOIN pg_attribute a
                     ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                   ORDER BY k.ord
               ) AS child_cols,
               ARRAY(
                   SELECT a.attname
                   FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
                   JOIN pg_attribute a
                     ON a.attrelid = c.confrelid AND a.attnum = k.attnum
                   ORDER BY k.ord
               ) AS parent_cols
        FROM pg_constraint c
        WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
        ORDER BY 2, 1
        """
    )


async def _indexes(owner: asyncpg.Connection) -> list[asyncpg.Record]:
    return await owner.fetch(
        """
        SELECT i.indrelid::regclass::text AS tbl,
               i.indisunique,
               i.indpred IS NULL AS is_full,
               ARRAY(
                   SELECT a.attname
                   FROM unnest(string_to_array(i.indkey::text, ' ')::int2[])
                        WITH ORDINALITY AS k(attnum, ord)
                   JOIN pg_attribute a
                     ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                   ORDER BY k.ord
               ) AS cols
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        """
    )


async def test_a21_every_fk_has_a_unique_target(owner: asyncpg.Connection) -> None:
    fks = await _foreign_keys(owner)
    indexes = await _indexes(owner)

    unique_targets: dict[str, list[set[str]]] = {}
    for index in indexes:
        if index["indisunique"]:
            unique_targets.setdefault(index["tbl"], []).append(set(index["cols"]))

    assert len(fks) >= 31, f"expected at least 31 foreign keys, found {len(fks)}"
    for fk in fks:
        assert set(fk["parent_cols"]) in unique_targets.get(fk["parent"], []), (
            f"{fk['conname']} on {fk['child']} has no unique target on {fk['parent']}"
        )


async def test_a22_every_fk_has_a_supporting_index(owner: asyncpg.Connection) -> None:
    fks = await _foreign_keys(owner)
    indexes = await _indexes(owner)

    by_table: dict[str, list[list[str]]] = {}
    for index in indexes:
        if index["is_full"]:
            by_table.setdefault(index["tbl"], []).append(list(index["cols"]))

    missing = []
    for fk in fks:
        leading = fk["child_cols"][0]
        if not any(cols and cols[0] == leading for cols in by_table.get(fk["child"], [])):
            missing.append(f"{fk['child']}.{leading} ({fk['conname']})")

    assert not missing, "foreign keys without a leading-column index: " + ", ".join(missing)


async def test_a22b_every_tenant_table_has_rls_enabled_and_forced(
    owner: asyncpg.Connection,
) -> None:
    rows = await owner.fetch(
        """
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname <> 'alembic_version'
        ORDER BY 1
        """
    )
    assert len(rows) == 17
    for row in rows:
        assert row["relrowsecurity"], f"{row['relname']} has RLS disabled"
        assert row["relforcerowsecurity"], f"{row['relname']} does not FORCE RLS"

    policies = await owner.fetch(
        """
        SELECT tablename, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        """
    )
    assert len(policies) == 17
    for policy in policies:
        assert "current_institution" in (policy["qual"] or "")
        assert "current_institution" in (policy["with_check"] or "")
