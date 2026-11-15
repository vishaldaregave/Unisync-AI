"""FastAPI application factory.

Phase 0 scope: process liveness only. Readiness (a real database probe),
authentication, routers and the tenant-scoped session all arrive with the
phase that implements them — this module deliberately does not stub them.

See docs/implementation-log.md.
"""

from __future__ import annotations

from fastapi import FastAPI

from app import __version__
from app.core.config import Settings, get_settings

SERVICE_NAME = "unisync-api"


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the ASGI application."""
    resolved = settings or get_settings()

    app = FastAPI(
        title=resolved.app_name,
        version=__version__,
        docs_url=None if resolved.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if resolved.is_production else "/openapi.json",
    )

    @app.get("/healthz", tags=["health"], summary="Liveness probe")
    async def healthz() -> dict[str, str]:
        return {
            "status": "ok",
            "service": SERVICE_NAME,
            "version": __version__,
            "env": resolved.env,
        }

    return app


app = create_app()
