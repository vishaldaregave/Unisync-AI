"""Typed application configuration.

Settings are read from the environment (and an optional ``.env``). Every
secret has a distinct environment variable per v2 §3.8 — one key is never
reused for a different purpose.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the API process."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ----------------------------------------------------
    env: str = "local"
    app_name: str = "UniSync AI"
    app_base_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"

    # --- Database -------------------------------------------------------
    # Runtime role: subject to RLS. Never the owner role.
    database_url: str = (
        "postgresql+asyncpg://unisync_app:local-app-placeholder@localhost:5432/unisync"
    )
    # Owner role: migrations only.
    migration_database_url: str = (
        "postgresql+psycopg://unisync_owner:local-owner-placeholder@localhost:5432/unisync"
    )

    # --- Redis ----------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # --- Sessions (v2 §13.5-E2) -----------------------------------------
    jwt_signing_key: str = "local-jwt-signing-placeholder-change-me"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "unisync"
    jwt_audience: str = "unisync-web"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    # --- Audit ledger (v2 §13.5-E1.4) -----------------------------------
    # Deliberately separate from the JWT key: a leak of one must not
    # compromise the other.
    audit_hmac_key: str = "local-audit-hmac-placeholder-change-me"

    # --- LLM (M1a makes no model calls) ---------------------------------
    allow_external_llm: bool = Field(default=False)

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()
