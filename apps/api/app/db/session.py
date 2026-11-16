"""Tenant-scoped database access.

Design (v2 §13.5-E1.1, §13.5-E2):

* The tenant is bound per **transaction** with ``set_config(..., is_local => true)``,
  never with a session-level ``SET``, so a pooled connection cannot carry a
  tenant into the next request.
* The application refuses to open a tenant session without a tenant. If that
  guard is bypassed, row level security still returns zero rows.
* The runtime connection is verified at startup: it must not be a superuser,
  must not hold ``BYPASSRLS``, and must not be the owner role.

Threat model: ``app.institution_id`` is a custom GUC that any session can set.
RLS therefore protects against *query* mistakes, not against a confused
application. The tenant value must always originate from authenticated
server-side identity, never from request input.
"""

from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


class MissingTenantContext(RuntimeError):
    """A tenant-scoped operation was attempted without a tenant."""


class InsecureRuntimeRole(RuntimeError):
    """The runtime connection holds privileges the application must not have."""


def create_engine(database_url: str) -> AsyncEngine:
    """Create the runtime engine (asyncpg, RLS-subject role)."""
    return create_async_engine(database_url, pool_pre_ping=True)


def make_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


def assert_url_uses_runtime_role(database_url: str, *, owner_role: str) -> None:
    """Reject a runtime URL that authenticates as the owner role.

    Cheap configuration guard: it runs without a database connection, so a
    misconfigured deployment fails before serving a single request.
    """
    username = make_url(database_url).username
    if username == owner_role:
        raise InsecureRuntimeRole(
            f"DATABASE_URL authenticates as {owner_role!r}, which is the migration "
            "owner role. The API must connect with the runtime role."
        )


@contextlib.asynccontextmanager
async def tenant_session(
    factory: async_sessionmaker[AsyncSession],
    institution_id: UUID,
) -> AsyncIterator[AsyncSession]:
    """Open a session whose transaction is scoped to one institution."""
    if not isinstance(institution_id, UUID):
        raise MissingTenantContext(
            f"tenant_session() requires a UUID institution_id; got {type(institution_id).__name__}"
        )

    async with factory() as session:
        # An explicit transaction: SET LOCAL is only meaningful inside one,
        # and it is discarded on both COMMIT and ROLLBACK.
        async with session.begin():
            # Parameterised: the value is never interpolated into SQL text.
            # `true` makes this transaction-local.
            await session.execute(
                text("SELECT set_config('app.institution_id', :value, true)"),
                {"value": str(institution_id)},
            )
            yield session


async def assert_runtime_role(engine: AsyncEngine, *, forbidden_role: str) -> None:
    """Fail fast if the pool authenticates as a privileged role."""
    async with engine.connect() as connection:
        row = (
            await connection.execute(
                text(
                    """
                    SELECT current_user AS role_name, r.rolsuper, r.rolbypassrls
                    FROM pg_roles r
                    WHERE r.rolname = current_user
                    """
                )
            )
        ).one()

    if row.role_name == forbidden_role or row.rolsuper or row.rolbypassrls:
        raise InsecureRuntimeRole(
            f"runtime connection authenticated as {row.role_name!r} "
            f"(superuser={row.rolsuper}, bypassrls={row.rolbypassrls}). "
            "The application must not use the owner or any privileged role."
        )
