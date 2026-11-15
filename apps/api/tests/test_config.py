"""Configuration invariants that M1a depends on."""

from __future__ import annotations

from app.core.config import Settings


def test_secrets_are_separated_by_purpose() -> None:
    """v2 §3.8: one key per purpose — a leak of one must not compromise another."""
    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.jwt_signing_key != settings.audit_hmac_key


def test_external_llm_is_disabled_by_default(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    """M1a makes no model calls; the default must be closed."""
    monkeypatch.delenv("ALLOW_EXTERNAL_LLM", raising=False)

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.allow_external_llm is False


def test_production_flag() -> None:
    assert Settings(_env_file=None, env="production").is_production is True  # type: ignore[call-arg]
    assert Settings(_env_file=None, env="local").is_production is False  # type: ignore[call-arg]
