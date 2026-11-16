"""Test helpers for database-backed suites."""

from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator
from typing import Any

import asyncpg
from sqlalchemy.engine import make_url

# Sentinel distinguishing "no tenant context" from an explicit value.
UNSET: object = object()


def connection_params(url: str) -> dict[str, Any]:
    """Convert a SQLAlchemy URL into asyncpg.connect keyword arguments."""
    parsed = make_url(url)
    return {
        "host": parsed.host,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.database,
    }


@contextlib.asynccontextmanager
async def tenant_connection(
    params: dict[str, Any], institution_id: object = UNSET
) -> AsyncIterator[asyncpg.Connection]:
    """Open a connection whose transaction carries the given tenant context.

    Passing :data:`UNSET` deliberately leaves the GUC unset, which is how the
    "missing tenant context" behaviour is exercised.
    """
    connection = await asyncpg.connect(**params)
    try:
        async with connection.transaction():
            if institution_id is not UNSET:
                await connection.execute(
                    "SELECT set_config('app.institution_id', $1, true)",
                    str(institution_id),
                )
            yield connection
    finally:
        await connection.close()
