"""tenancy foundation: institutions, identity and row-level security

Implements v2 §13.5-E1.1 / E1.2 for the six tables M1a needs first.

Design rules enforced here:
  * every tenant-scoped table carries ``institution_id NOT NULL``;
  * every parent exposes ``UNIQUE (id, institution_id)`` so children can use
    composite foreign keys — a cross-tenant reference is rejected by the FK
    itself, before RLS is consulted;
  * every tenant-scoped table has ENABLE + FORCE row level security and a
    single ``tenant_isolation`` policy with both USING and WITH CHECK;
  * the runtime role receives no DDL, no TRUNCATE and no policy control.

Revision ID: 0001_tenancy
Revises: none
Create Date: 2026-11-16
"""

from __future__ import annotations

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_tenancy"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = ("departments", "users", "faculty", "students", "advisor_assignments")
ALL_TABLES = ("institutions", *TENANT_TABLES)
# Tables that carry updated_at and therefore get the touch trigger.
TOUCHED_TABLES = ("institutions", "departments", "users", "faculty", "students")


def _ident(name: str) -> str:
    """Guard role names interpolated into GRANT statements."""
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        raise ValueError(f"unsafe SQL identifier: {name!r}")
    return name


def _app_role() -> str:
    from app.core.config import get_settings

    return _ident(get_settings().postgres_app_user)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]


def _preconditions() -> None:
    """Abort with an actionable message when provisioning did not run."""
    bind = op.get_bind()

    missing_ext = (
        bind.execute(
            sa.text(
                """
            SELECT e
            FROM unnest(ARRAY['citext', 'vector']) AS e
            WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = e)
            """
            )
        )
        .scalars()
        .all()
    )
    if missing_ext:
        raise RuntimeError(
            "missing extensions: "
            + ", ".join(missing_ext)
            + " — run docker/postgres/init/01-bootstrap.sh (recreate the volume)"
        )

    schema_owner = bind.execute(
        sa.text(
            """
            SELECT pg_get_userbyid(nspowner)
            FROM pg_namespace
            WHERE nspname = 'app'
            """
        )
    ).scalar()
    if schema_owner is None:
        raise RuntimeError("schema 'app' is missing — run docker/postgres/init/01-bootstrap.sh")
    if schema_owner != _ident_owner():
        raise RuntimeError(f"schema 'app' is owned by {schema_owner!r}, expected the owner role")


def _ident_owner() -> str:
    from app.core.config import get_settings

    return _ident(get_settings().postgres_owner_user)


def upgrade() -> None:
    _preconditions()

    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student')")
    op.execute("CREATE TYPE student_status AS ENUM ('active', 'graduated', 'withdrawn')")

    # --- helpers --------------------------------------------------------
    # Returns NULL for missing or malformed context, so an unset or garbage
    # GUC yields zero rows instead of an error that could leak behaviour.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app.current_institution() RETURNS uuid
        LANGUAGE plpgsql STABLE PARALLEL SAFE
        AS $$
        DECLARE
            raw text := current_setting('app.institution_id', true);
        BEGIN
            IF raw IS NULL OR raw = '' THEN
                RETURN NULL;
            END IF;
            RETURN raw::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN NULL;
        END;
        $$
        """
    )
    op.execute("REVOKE ALL ON FUNCTION app.current_institution() FROM PUBLIC")
    op.execute(f"GRANT EXECUTE ON FUNCTION app.current_institution() TO {_app_role()}")

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.updated_at := now();
            RETURN NEW;
        END;
        $$
        """
    )

    # --- institutions (tenant root) -------------------------------------
    op.create_table(
        "institutions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", postgresql.CITEXT(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False, server_default=sa.text("'UTC'")),
        sa.Column("locale", sa.Text(), nullable=False, server_default=sa.text("'en'")),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_institutions_code"),
    )

    # --- departments ----------------------------------------------------
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", postgresql.CITEXT(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_departments_institution_id_institutions",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("institution_id", "code", name="uq_departments_institution_code"),
        sa.UniqueConstraint("id", "institution_id", name="uq_departments_id_institution"),
    )

    # --- users ----------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(name="user_role", create_type=False),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("perm_version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_users_institution_id_institutions",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("institution_id", "email", name="uq_users_institution_email"),
        sa.UniqueConstraint("id", "institution_id", name="uq_users_id_institution"),
    )

    # --- faculty --------------------------------------------------------
    op.create_table(
        "faculty",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_code", postgresql.CITEXT(), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("designation", sa.Text(), nullable=True),
        sa.Column("office_hours", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id", "institution_id"],
            ["users.id", "users.institution_id"],
            name="fk_faculty_user_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "institution_id"],
            ["departments.id", "departments.institution_id"],
            name="fk_faculty_department_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "institution_id", "employee_code", name="uq_faculty_institution_employee_code"
        ),
        sa.UniqueConstraint("id", "institution_id", name="uq_faculty_id_institution"),
    )

    # --- students -------------------------------------------------------
    # current_term_id is deferred to migration 0002 (terms does not exist yet).
    op.create_table(
        "students",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("roll_number", postgresql.CITEXT(), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("program", sa.Text(), nullable=False),
        sa.Column("admission_year", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="student_status", create_type=False),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id", "institution_id"],
            ["users.id", "users.institution_id"],
            name="fk_students_user_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["department_id", "institution_id"],
            ["departments.id", "departments.institution_id"],
            name="fk_students_department_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "institution_id", "roll_number", name="uq_students_institution_roll_number"
        ),
        sa.UniqueConstraint("id", "institution_id", name="uq_students_id_institution"),
    )

    # --- advisor_assignments --------------------------------------------
    op.create_table(
        "advisor_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("advisor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_reason", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(
            ["advisor_id", "institution_id"],
            ["faculty.id", "faculty.institution_id"],
            name="fk_advisor_assignments_advisor_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["student_id", "institution_id"],
            ["students.id", "students.institution_id"],
            name="fk_advisor_assignments_student_tenant",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "ended_at IS NULL OR ended_at >= assigned_at",
            name="ck_advisor_assignments_ended_after_assigned",
        ),
    )

    # --- indexes (every FK indexed) -------------------------------------
    op.create_index("ix_departments_institution_id", "departments", ["institution_id"])
    op.create_index("ix_users_institution_id", "users", ["institution_id"])
    op.create_index("ix_faculty_institution_id", "faculty", ["institution_id"])
    op.create_index("ix_faculty_user_id", "faculty", ["user_id"])
    op.create_index("ix_faculty_department_id", "faculty", ["department_id"])
    op.create_index(
        "ix_faculty_institution_department", "faculty", ["institution_id", "department_id"]
    )
    op.create_index("ix_students_institution_id", "students", ["institution_id"])
    op.create_index("ix_students_user_id", "students", ["user_id"])
    op.create_index("ix_students_department_id", "students", ["department_id"])
    op.create_index(
        "ix_students_institution_department", "students", ["institution_id", "department_id"]
    )
    op.create_index(
        "ix_advisor_assignments_institution_id", "advisor_assignments", ["institution_id"]
    )
    op.create_index("ix_advisor_assignments_advisor_id", "advisor_assignments", ["advisor_id"])
    op.create_index("ix_advisor_assignments_student_id", "advisor_assignments", ["student_id"])
    # v2 §13.5-E1.2: v1's three-column unique over a nullable column was inert.
    op.create_index(
        "uq_advisor_assignments_active_pair",
        "advisor_assignments",
        ["advisor_id", "student_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.create_index(
        "uq_advisor_assignments_primary",
        "advisor_assignments",
        ["student_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL AND is_primary"),
    )

    # --- updated_at triggers --------------------------------------------
    for table in TOUCHED_TABLES:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_set_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
            """
        )

    # --- row level security ---------------------------------------------
    for table in TENANT_TABLES:
        predicate = "institution_id = app.current_institution()"
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
                FOR ALL
                USING ({predicate})
                WITH CHECK ({predicate})
            """
        )

    op.execute("ALTER TABLE institutions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE institutions FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON institutions
            FOR ALL
            USING (id = app.current_institution())
            WITH CHECK (id = app.current_institution())
        """
    )

    # alembic_version is created by Alembic, so the bootstrap default
    # privileges gave the runtime role DML on it. Migration state is not
    # application data; the runtime role must not be able to touch it.
    # Future migrations inherit this, so it is revoked once, here.
    op.execute(f"REVOKE ALL ON TABLE public.alembic_version FROM {_app_role()}")


def downgrade() -> None:
    for table in reversed(ALL_TABLES):
        op.drop_table(table)
    op.execute("DROP FUNCTION IF EXISTS public.set_updated_at()")
    op.execute("DROP FUNCTION IF EXISTS app.current_institution()")
    op.execute("DROP TYPE IF EXISTS student_status")
    op.execute("DROP TYPE IF EXISTS user_role")
