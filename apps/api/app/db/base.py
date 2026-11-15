"""Declarative base and constraint naming conventions.

The naming convention is part of Phase 0 because constraint names end up in
migration scripts. Renaming them later means rewriting DDL that has already
shipped, so it is fixed before the first migration exists (v2 §3.5).
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
