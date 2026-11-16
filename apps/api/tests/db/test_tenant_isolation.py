"""Tenant isolation - the M1a §13 acceptance tests T1-T6, T8, T9, T12.

Every assertion in this module runs as the runtime role (``unisync_app``).
Fixtures are created by ``unisync_owner`` through the ``seeded`` fixture.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg
import pytest

from tests.db.helpers import tenant_connection

pytestmark = pytest.mark.db

INSERT_USER_SQL = """
INSERT INTO users (id, institution_id, email, password_hash, full_name, role)
VALUES ($1, $2, $3, $4, $5, $6)
"""


# --- T1: read isolation -------------------------------------------------------
async def test_t1_cannot_read_other_institution(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    a, b = seeded["a"], seeded["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        user_ids = {row["id"] for row in await conn.fetch("SELECT id FROM users")}
        student_ids = {row["id"] for row in await conn.fetch("SELECT id FROM students")}
        department_ids = {row["id"] for row in await conn.fetch("SELECT id FROM departments")}

    assert user_ids == {a["admin_user"], a["faculty_user"], a["student_user"]}
    assert student_ids == {a["student"]}
    assert department_ids == {a["department"]}
    assert b["admin_user"] not in user_ids
    assert b["student"] not in student_ids


# --- T2: update isolation -----------------------------------------------------
async def test_t2_cannot_update_other_institution(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    a, b = seeded["a"], seeded["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        tag = await conn.execute(
            "UPDATE users SET full_name = 'compromised' WHERE id = $1", b["admin_user"]
        )

    assert tag == "UPDATE 0"


# --- T3: delete isolation -----------------------------------------------------
async def test_t3_cannot_delete_other_institution(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    a, b = seeded["a"], seeded["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        tag = await conn.execute("DELETE FROM users WHERE id = $1", b["admin_user"])

    assert tag == "DELETE 0"


# --- T4: cross-tenant insert --------------------------------------------------
async def test_t4_cannot_insert_row_for_other_institution(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    import uuid

    a, b = seeded["a"], seeded["b"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(
                INSERT_USER_SQL,
                uuid.uuid4(),
                b["institution"],
                "smuggled@unisync.test",
                "hash",
                "Smuggled User",
                "student",
            )


# --- T5: missing tenant context ----------------------------------------------
async def test_t5_missing_context_returns_no_rows_and_rejects_writes(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    import uuid

    async with tenant_connection(app_params) as conn:
        assert await conn.fetchval("SELECT count(*) FROM users") == 0
        assert await conn.fetchval("SELECT count(*) FROM students") == 0

        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(
                INSERT_USER_SQL,
                uuid.uuid4(),
                seeded["a"]["institution"],
                "contextless@unisync.test",
                "hash",
                "No Context",
                "student",
            )


# --- T6: malformed tenant context --------------------------------------------
async def test_t6_invalid_context_does_not_grant_access(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    import uuid

    async with tenant_connection(app_params, "not-a-uuid") as conn:
        # No error, no rows: the helper returns NULL for malformed input.
        assert await conn.fetchval("SELECT count(*) FROM users") == 0

        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute(
                INSERT_USER_SQL,
                uuid.uuid4(),
                seeded["a"]["institution"],
                "malformed@unisync.test",
                "hash",
                "Malformed",
                "student",
            )


# --- T8: the runtime role cannot bypass or alter RLS -------------------------
async def test_t8_runtime_role_cannot_bypass_rls(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    a = seeded["a"]

    async with tenant_connection(app_params, a["institution"]) as conn:
        await conn.execute("SET row_security = off")
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError) as raised:
            await conn.fetch("SELECT id FROM users")
        assert "row-level security" in str(raised.value)


async def test_t8_runtime_role_cannot_alter_rls_objects(
    seeded: dict[str, dict[str, UUID]], app_params: dict[str, Any]
) -> None:
    a = seeded["a"]

    statements = (
        "ALTER TABLE users DISABLE ROW LEVEL SECURITY",
        "DROP POLICY tenant_isolation ON users",
        "CREATE POLICY bypass ON users USING (true)",
        "ALTER TABLE users FORCE ROW LEVEL SECURITY",
    )

    for statement in statements:
        async with tenant_connection(app_params, a["institution"]) as conn:
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await conn.execute(statement)


# --- T9: composite FK rejects cross-tenant references -----------------------
async def test_t9_composite_fk_rejects_cross_tenant_reference(
    seeded: dict[str, dict[str, UUID]],
    app_params: dict[str, Any],
    owner: asyncpg.Connection,
) -> None:
    import uuid

    a, b = seeded["a"], seeded["b"]

    # Owner level: proves the FK, independently of RLS.
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError):
        await owner.execute(
            """
            INSERT INTO advisor_assignments
                (id, institution_id, advisor_id, student_id)
            VALUES ($1, $2, $3, $4)
            """,
            uuid.uuid4(),
            a["institution"],
            b["faculty"],
            a["student"],
        )

    # Runtime level: the same attempt is refused too.
    async with tenant_connection(app_params, a["institution"]) as conn:
        with pytest.raises(
            (
                asyncpg.exceptions.ForeignKeyViolationError,
                asyncpg.exceptions.InsufficientPrivilegeError,
            )
        ):
            await conn.execute(
                """
                INSERT INTO advisor_assignments
                    (id, institution_id, advisor_id, student_id)
                VALUES ($1, $2, $3, $4)
                """,
                uuid.uuid4(),
                a["institution"],
                b["faculty"],
                a["student"],
            )


# --- T12: tenant-scoped uniqueness ------------------------------------------
async def test_t12_conflicting_records_coexist_across_institutions(
    seeded: dict[str, dict[str, UUID]], owner: asyncpg.Connection
) -> None:
    assert seeded["a"]["admin_user"] != seeded["b"]["admin_user"]

    assert (
        await owner.fetchval("SELECT count(*) FROM users WHERE email = $1", "admin@unisync.test")
        == 2
    )
    assert (
        await owner.fetchval("SELECT count(*) FROM students WHERE roll_number = $1", "CS-001") == 2
    )
    assert await owner.fetchval("SELECT count(*) FROM departments WHERE code = $1", "CSE") == 2
