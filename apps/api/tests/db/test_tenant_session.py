"""Tenant context lifecycle — T7a, T7b, T7c.

Uses a pool of exactly one connection so that "the next checkout" provably
reuses the same physical connection. If ``SET LOCAL`` leaked, these tests
would see the previous tenant's data.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import UUID

import pytest
import pytest_asyncio
from app.core.config import Settings
from app.db.session import MissingTenantContext, make_session_factory, tenant_session
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

pytestmark = pytest.mark.db


@pytest_asyncio.fixture
async def engine(settings: Settings) -> AsyncIterator[AsyncEngine]:
    from sqlalchemy.ext.asyncio import create_async_engine

    created = create_async_engine(settings.database_url, pool_size=1, max_overflow=0)
    try:
        yield created
    finally:
        await created.dispose()


@pytest_asyncio.fixture
async def factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return make_session_factory(engine)


async def _user_ids(session: AsyncSession) -> set[UUID]:
    result = await session.execute(text("SELECT id FROM users"))
    return {row[0] for row in result}


async def _assert_tenant_context_cleared(engine: AsyncEngine, *, phase: str) -> None:
    """Assert the connection carries no usable tenant in the next transaction.

    PostgreSQL resets a custom GUC to the empty string (not NULL) once the
    transaction that set it ends. ``app.current_institution()`` maps both NULL
    and '' to NULL, so the effective tenant is the thing that matters.
    """
    async with engine.connect() as connection:
        raw = await connection.scalar(text("SELECT current_setting('app.institution_id', true)"))
        effective = await connection.scalar(text("SELECT app.current_institution()"))
        visible = await connection.scalar(text("SELECT count(*) FROM users"))

    assert raw in (None, ""), f"tenant context leaked after {phase}: {raw!r}"
    assert effective is None, f"effective tenant leaked after {phase}: {effective!r}"
    assert visible == 0, f"{visible} rows visible after {phase}"


async def test_t7a_commit_clears_context(
    engine: AsyncEngine,
    factory: async_sessionmaker[AsyncSession],
    seeded: dict[str, dict[str, UUID]],
) -> None:
    a = seeded["a"]

    async with tenant_session(factory, a["institution"]) as session:
        assert len(await _user_ids(session)) == 3

    await _assert_tenant_context_cleared(engine, phase="COMMIT")


async def test_t7b_rollback_clears_context(
    engine: AsyncEngine,
    factory: async_sessionmaker[AsyncSession],
    seeded: dict[str, dict[str, UUID]],
) -> None:
    b = seeded["b"]

    with pytest.raises(RuntimeError, match="boom"):
        async with tenant_session(factory, b["institution"]) as session:
            assert len(await _user_ids(session)) == 3
            raise RuntimeError("boom")

    await _assert_tenant_context_cleared(engine, phase="ROLLBACK")


async def test_t7c_switching_context_between_transactions_does_not_leak(
    factory: async_sessionmaker[AsyncSession],
    seeded: dict[str, dict[str, UUID]],
) -> None:
    a, b = seeded["a"], seeded["b"]

    async with tenant_session(factory, a["institution"]) as session:
        first = await _user_ids(session)

    async with tenant_session(factory, b["institution"]) as session:
        second = await _user_ids(session)

    async with tenant_session(factory, a["institution"]) as session:
        third = await _user_ids(session)

    assert first == {a["admin_user"], a["faculty_user"], a["student_user"]}
    assert second == {b["admin_user"], b["faculty_user"], b["student_user"]}
    assert first.isdisjoint(second)
    assert first == third


async def test_missing_tenant_is_refused_by_the_application(
    factory: async_sessionmaker[AsyncSession],
) -> None:
    with pytest.raises(MissingTenantContext):
        async with tenant_session(factory, None):  # type: ignore[arg-type]
            pass
