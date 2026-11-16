"""Runtime role privileges — T10 and T11, plus the credential guards."""

from __future__ import annotations

import uuid
from typing import Any

import asyncpg
import pytest
from app.core.config import Settings
from app.db.session import (
    InsecureRuntimeRole,
    assert_runtime_role,
    assert_url_uses_runtime_role,
    create_engine,
)
from sqlalchemy.engine import make_url

from tests.db.helpers import tenant_connection

pytestmark = pytest.mark.db


# --- T10: ownership and migration metadata ----------------------------------
async def test_t10_runtime_role_owns_no_tables(
    app_params: dict[str, Any], settings: Settings
) -> None:
    async with tenant_connection(app_params, uuid.uuid4()) as conn:
        rows = await conn.fetch(
            """
            SELECT c.relname AS table_name, pg_get_userbyid(c.relowner) AS owner
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relname <> 'alembic_version'
            ORDER BY c.relname
            """
        )

    assert len(rows) == 6, f"expected 6 tenant tables, found {[r['table_name'] for r in rows]}"
    assert all(row["owner"] == settings.postgres_owner_user for row in rows)


async def test_t10_runtime_role_cannot_touch_alembic_version(
    app_params: dict[str, Any],
) -> None:
    async with tenant_connection(app_params, uuid.uuid4()) as conn:
        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.fetch("SELECT version_num FROM alembic_version")


# --- T11: TRUNCATE is never available ---------------------------------------
async def test_t11_runtime_role_cannot_truncate(
    app_params: dict[str, Any], seeded: dict[str, dict[str, uuid.UUID]]
) -> None:
    async with tenant_connection(app_params, seeded["a"]["institution"]) as conn:
        granted = await conn.fetchval(
            "SELECT has_table_privilege(current_user, 'public.users', 'TRUNCATE')"
        )
        assert granted is False

        with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
            await conn.execute("TRUNCATE TABLE users")


# --- credential guards ------------------------------------------------------
def _owner_async_url(settings: Settings) -> str:
    return (
        make_url(settings.migration_database_url)
        .set(drivername="postgresql+asyncpg")
        .render_as_string(hide_password=False)
    )


async def test_owner_credentials_are_rejected_at_startup(settings: Settings) -> None:
    engine = create_engine(_owner_async_url(settings))
    try:
        with pytest.raises(InsecureRuntimeRole):
            await assert_runtime_role(engine, forbidden_role=settings.postgres_owner_user)
    finally:
        await engine.dispose()


async def test_runtime_credentials_pass_the_startup_guard(settings: Settings) -> None:
    engine = create_engine(settings.database_url)
    try:
        await assert_runtime_role(engine, forbidden_role=settings.postgres_owner_user)
    finally:
        await engine.dispose()


def test_url_guard_rejects_owner_url(settings: Settings) -> None:
    with pytest.raises(InsecureRuntimeRole):
        assert_url_uses_runtime_role(
            settings.migration_database_url, owner_role=settings.postgres_owner_user
        )


def test_url_guard_accepts_runtime_url(settings: Settings) -> None:
    assert_url_uses_runtime_role(settings.database_url, owner_role=settings.postgres_owner_user)
