"""academic core: terms, subjects, offerings, enrolment, attendance, evaluation, coursework

Implements the approved design in ``docs/phase-1.3-design.md`` (checkpoint
``1981314``). It preserves every Phase 1.2 guarantee and adds two structural
integrity mechanisms beyond plain foreign keys:

1. **Tenant pinning** — every cross-table reference is composite and includes
   ``institution_id``, so a cross-tenant reference has no valid row to point at
   even when RLS is bypassed.
2. **Offering pinning** — ``attendance_records``, ``marks`` and ``submissions``
   carry a shared ``offering_id`` and pin it with two composite foreign keys,
   one to each parent. Both parents must therefore agree with the row's own
   ``offering_id``, and hence with each other. No trigger, no application code.

Invariants that cannot be expressed as a constraint are listed at the end of
this module (``NOT_DB_ENFORCEABLE``).

Revision ID: 0002_academic_core
Revises: 0001_tenancy
Create Date: 2026-11-16
"""

from __future__ import annotations

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_academic_core"
down_revision: str | None = "0001_tenancy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES: tuple[str, ...] = (
    "terms",
    "subjects",
    "subject_prerequisites",
    "subject_offerings",
    "enrollments",
    "class_sessions",
    "attendance_records",
    "assessments",
    "assignments",
    "marks",
    "submissions",
)

# Invariants registered as application-level because PostgreSQL cannot express
# them as a FK or CHECK. Each is enforced by the service layer, and recorded
# here so the gap is visible rather than assumed away:
#
#   I1  subject_prerequisites contains no cycle (recursive closure)
#   I2  a class session falls inside its term's date range (cross-table)
#   I3  class_sessions.meets_on equals the local date of starts_at
#       (needs institutions.timezone)
#   I4  attendance only for enrolments active on the session date
#   I8  is_late / late_days are correct: computed at write time and frozen
#   I9  a closed term forbids further mark/enrolment writes
#   I10 an offering's capacity is not exceeded (aggregate)
#
# I5 (mark <= max_score), I6 (weight total <= 100) and I7 (submission score <=
# max_score) ARE enforced in the database, by the triggers created below.
NOT_DB_ENFORCEABLE: tuple[str, ...] = ("I1", "I2", "I3", "I4", "I8", "I9", "I10")


def _ident(name: str) -> str:
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        raise ValueError(f"unsafe SQL identifier: {name!r}")
    return name


def _app_role() -> str:
    from app.core.config import get_settings

    return _ident(get_settings().postgres_app_user)


def _tenant_fk(table: str) -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        ["institution_id"],
        ["institutions.id"],
        name=f"fk_{table}_institution_id_institutions",
        ondelete="RESTRICT",
    )


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


def _uuid(name: str, *, nullable: bool = False) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def upgrade() -> None:
    # --- enums ----------------------------------------------------------
    op.execute("CREATE TYPE prerequisite_kind AS ENUM ('prerequisite', 'co_requisite')")
    op.execute("CREATE TYPE delivery_modality AS ENUM ('in_person', 'online', 'hybrid')")
    op.execute("CREATE TYPE enrollment_status AS ENUM ('enrolled', 'dropped', 'completed')")
    op.execute("CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused')")
    op.execute("CREATE TYPE assessment_type AS ENUM ('quiz', 'midterm', 'final', 'project', 'lab')")
    # Approved Q7: lateness lives in is_late, never in the status enum.
    op.execute("CREATE TYPE submission_status AS ENUM ('missing', 'submitted', 'graded')")

    # --- terms ----------------------------------------------------------
    op.create_table(
        "terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        sa.Column("code", postgresql.CITEXT(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("registration_opens_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("registration_closes_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_timestamps(),
        _tenant_fk("terms"),
        sa.UniqueConstraint("institution_id", "code", name="uq_terms_institution_code"),
        sa.UniqueConstraint("id", "institution_id", name="uq_terms_id_institution"),
        sa.CheckConstraint("ends_on > starts_on", name="ck_terms_ends_after_starts"),
        sa.CheckConstraint(
            "registration_closes_at IS NULL OR registration_opens_at IS NULL "
            "OR registration_closes_at > registration_opens_at",
            name="ck_terms_registration_window",
        ),
    )
    op.create_index(
        "uq_terms_one_current",
        "terms",
        ["institution_id"],
        unique=True,
        postgresql_where=sa.text("is_current"),
    )
    op.create_index("ix_terms_institution_starts_on", "terms", ["institution_id", "starts_on"])

    # --- subjects -------------------------------------------------------
    op.create_table(
        "subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        sa.Column("code", postgresql.CITEXT(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        _uuid("department_id", nullable=False),
        sa.Column("credits", sa.Numeric(4, 1), nullable=False),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("learning_outcomes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        _tenant_fk("subjects"),
        sa.ForeignKeyConstraint(
            ["department_id", "institution_id"],
            ["departments.id", "departments.institution_id"],
            name="fk_subjects_department_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("institution_id", "code", name="uq_subjects_institution_code"),
        sa.UniqueConstraint("id", "institution_id", name="uq_subjects_id_institution"),
        sa.CheckConstraint("credits > 0", name="ck_subjects_credits_positive"),
        sa.CheckConstraint("credits <= 30", name="ck_subjects_credits_ceiling"),
    )
    op.create_index(
        "ix_subjects_institution_department", "subjects", ["institution_id", "department_id"]
    )

    # --- subject_prerequisites ------------------------------------------
    op.create_table(
        "subject_prerequisites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("subject_id", nullable=False),
        _uuid("prerequisite_subject_id", nullable=False),
        sa.Column("min_grade", sa.Numeric(5, 2), nullable=True),
        sa.Column(
            "kind",
            postgresql.ENUM(name="prerequisite_kind", create_type=False),
            nullable=False,
            server_default=sa.text("'prerequisite'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        _tenant_fk("subject_prerequisites"),
        sa.ForeignKeyConstraint(
            ["subject_id", "institution_id"],
            ["subjects.id", "subjects.institution_id"],
            name="fk_subject_prerequisites_subject_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["prerequisite_subject_id", "institution_id"],
            ["subjects.id", "subjects.institution_id"],
            name="fk_subject_prerequisites_prerequisite_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "subject_id", "prerequisite_subject_id", name="uq_subject_prerequisites_edge"
        ),
        sa.CheckConstraint(
            "subject_id <> prerequisite_subject_id", name="ck_subject_prerequisites_not_self"
        ),
        sa.CheckConstraint(
            "min_grade IS NULL OR (min_grade >= 0 AND min_grade <= 100)",
            name="ck_subject_prerequisites_min_grade_range",
        ),
    )
    op.create_index(
        "ix_subject_prerequisites_prerequisite",
        "subject_prerequisites",
        ["prerequisite_subject_id", "institution_id"],
    )

    # --- subject_offerings ----------------------------------------------
    op.create_table(
        "subject_offerings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("subject_id", nullable=False),
        _uuid("term_id", nullable=False),
        sa.Column("section_code", postgresql.CITEXT(), nullable=False),
        _uuid("faculty_id", nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("schedule_json", postgresql.JSONB(), nullable=True),
        sa.Column("room", sa.Text(), nullable=True),
        sa.Column(
            "modality",
            postgresql.ENUM(name="delivery_modality", create_type=False),
            nullable=False,
            server_default=sa.text("'in_person'"),
        ),
        *_timestamps(),
        _tenant_fk("subject_offerings"),
        sa.ForeignKeyConstraint(
            ["subject_id", "institution_id"],
            ["subjects.id", "subjects.institution_id"],
            name="fk_subject_offerings_subject_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["term_id", "institution_id"],
            ["terms.id", "terms.institution_id"],
            name="fk_subject_offerings_term_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["faculty_id", "institution_id"],
            ["faculty.id", "faculty.institution_id"],
            name="fk_subject_offerings_faculty_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "subject_id", "term_id", "section_code", name="uq_subject_offerings_section"
        ),
        sa.UniqueConstraint("id", "institution_id", name="uq_subject_offerings_id_institution"),
        sa.UniqueConstraint(
            "id",
            "subject_id",
            "term_id",
            "institution_id",
            name="uq_subject_offerings_id_subject_term_institution",
        ),
        sa.CheckConstraint(
            "capacity IS NULL OR capacity > 0", name="ck_subject_offerings_capacity_positive"
        ),
    )
    op.create_index("ix_subject_offerings_term", "subject_offerings", ["term_id", "institution_id"])
    op.create_index(
        "ix_subject_offerings_faculty", "subject_offerings", ["faculty_id", "institution_id"]
    )
    op.create_index(
        "ix_subject_offerings_subject", "subject_offerings", ["subject_id", "institution_id"]
    )

    # --- enrollments ----------------------------------------------------
    # subject_id and term_id are stored, not generated (PostgreSQL generated
    # columns cannot read another table). The four-column FK forces them to
    # equal the offering's values, so they cannot drift.
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("student_id", nullable=False),
        _uuid("offering_id", nullable=False),
        _uuid("subject_id", nullable=False),
        _uuid("term_id", nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="enrollment_status", create_type=False),
            nullable=False,
            server_default=sa.text("'enrolled'"),
        ),
        sa.Column("enrolled_on", sa.Date(), nullable=False, server_default=sa.text("current_date")),
        sa.Column("dropped_on", sa.Date(), nullable=True),
        sa.Column("is_audit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("final_grade", sa.Numeric(5, 2), nullable=True),
        *_timestamps(),
        _tenant_fk("enrollments"),
        sa.ForeignKeyConstraint(
            ["student_id", "institution_id"],
            ["students.id", "students.institution_id"],
            name="fk_enrollments_student_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["offering_id", "subject_id", "term_id", "institution_id"],
            [
                "subject_offerings.id",
                "subject_offerings.subject_id",
                "subject_offerings.term_id",
                "subject_offerings.institution_id",
            ],
            name="fk_enrollments_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("student_id", "offering_id", name="uq_enrollments_student_offering"),
        sa.UniqueConstraint(
            "student_id",
            "term_id",
            "subject_id",
            name="uq_enrollments_student_term_subject",
        ),
        sa.UniqueConstraint(
            "id", "offering_id", "institution_id", name="uq_enrollments_id_offering_institution"
        ),
        sa.CheckConstraint(
            "status <> 'dropped' OR dropped_on IS NOT NULL",
            name="ck_enrollments_dropped_has_date",
        ),
        sa.CheckConstraint(
            "status = 'dropped' OR dropped_on IS NULL",
            name="ck_enrollments_not_dropped_without_date",
        ),
        sa.CheckConstraint(
            "dropped_on IS NULL OR dropped_on >= enrolled_on",
            name="ck_enrollments_dropped_after_enrolled",
        ),
        sa.CheckConstraint(
            "final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 100)",
            name="ck_enrollments_final_grade_range",
        ),
    )
    op.create_index("ix_enrollments_student_term", "enrollments", ["student_id", "term_id"])
    op.create_index("ix_enrollments_offering", "enrollments", ["offering_id"])
    op.create_index("ix_enrollments_institution", "enrollments", ["institution_id"])

    # --- class_sessions -------------------------------------------------
    op.create_table(
        "class_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column("session_no", sa.Integer(), nullable=False),
        sa.Column("meets_on", sa.Date(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("is_cancelled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_optional", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        _tenant_fk("class_sessions"),
        sa.ForeignKeyConstraint(
            ["offering_id", "institution_id"],
            ["subject_offerings.id", "subject_offerings.institution_id"],
            name="fk_class_sessions_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "offering_id", "session_no", name="uq_class_sessions_offering_session_no"
        ),
        sa.UniqueConstraint(
            "id",
            "offering_id",
            "institution_id",
            name="uq_class_sessions_id_offering_institution",
        ),
        sa.CheckConstraint("session_no > 0", name="ck_class_sessions_session_no_positive"),
        sa.CheckConstraint("ends_at > starts_at", name="ck_class_sessions_ends_after_starts"),
    )
    op.create_index(
        "ix_class_sessions_offering_meets_on", "class_sessions", ["offering_id", "meets_on"]
    )

    # --- attendance_records ---------------------------------------------
    # offering_id is the pinning column: the two composite FKs force the
    # session and the enrolment to belong to the same offering.
    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("session_id", nullable=False),
        _uuid("enrollment_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="attendance_status", create_type=False),
            nullable=False,
        ),
        sa.Column("minutes_late", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        _uuid("recorded_by", nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        _tenant_fk("attendance_records"),
        sa.ForeignKeyConstraint(
            ["session_id", "offering_id", "institution_id"],
            [
                "class_sessions.id",
                "class_sessions.offering_id",
                "class_sessions.institution_id",
            ],
            name="fk_attendance_records_session_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id", "offering_id", "institution_id"],
            [
                "enrollments.id",
                "enrollments.offering_id",
                "enrollments.institution_id",
            ],
            name="fk_attendance_records_enrollment_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by", "institution_id"],
            ["users.id", "users.institution_id"],
            name="fk_attendance_records_recorded_by_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "enrollment_id", "session_id", name="uq_attendance_records_enrollment_session"
        ),
        sa.CheckConstraint(
            "minutes_late IS NULL OR minutes_late >= 0",
            name="ck_attendance_records_minutes_late_non_negative",
        ),
        sa.CheckConstraint(
            "status <> 'late' OR minutes_late IS NOT NULL",
            name="ck_attendance_records_late_has_minutes",
        ),
    )
    op.create_index("ix_attendance_records_institution", "attendance_records", ["institution_id"])
    op.create_index(
        "ix_attendance_records_absent",
        "attendance_records",
        ["session_id"],
        postgresql_where=sa.text("status = 'absent'"),
    )

    # --- assessments ----------------------------------------------------
    op.create_table(
        "assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(name="assessment_type", create_type=False),
            nullable=False,
        ),
        sa.Column("max_score", sa.Numeric(6, 2), nullable=False),
        sa.Column("weight_percent", sa.Numeric(5, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_timestamps(),
        _tenant_fk("assessments"),
        sa.ForeignKeyConstraint(
            ["offering_id", "institution_id"],
            ["subject_offerings.id", "subject_offerings.institution_id"],
            name="fk_assessments_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "id", "offering_id", "institution_id", name="uq_assessments_id_offering_institution"
        ),
        sa.CheckConstraint("max_score > 0", name="ck_assessments_max_score_positive"),
        sa.CheckConstraint(
            "weight_percent >= 0 AND weight_percent <= 100",
            name="ck_assessments_weight_percent_range",
        ),
    )
    op.create_index("ix_assessments_offering", "assessments", ["offering_id"])
    op.create_index(
        "ix_assessments_offering_published",
        "assessments",
        ["offering_id"],
        postgresql_where=sa.text("is_published"),
    )

    # --- assignments ----------------------------------------------------
    op.create_table(
        "assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("opens_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_score", sa.Numeric(6, 2), nullable=False),
        sa.Column("attachment_key", sa.Text(), nullable=True),
        *_timestamps(),
        _tenant_fk("assignments"),
        sa.ForeignKeyConstraint(
            ["offering_id", "institution_id"],
            ["subject_offerings.id", "subject_offerings.institution_id"],
            name="fk_assignments_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "id", "offering_id", "institution_id", name="uq_assignments_id_offering_institution"
        ),
        sa.CheckConstraint("max_score > 0", name="ck_assignments_max_score_positive"),
        sa.CheckConstraint(
            "opens_at IS NULL OR due_at > opens_at", name="ck_assignments_due_after_opens"
        ),
    )
    op.create_index("ix_assignments_offering", "assignments", ["offering_id"])
    op.create_index("ix_assignments_due_at", "assignments", ["due_at"])

    # --- marks ----------------------------------------------------------
    op.create_table(
        "marks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("assessment_id", nullable=False),
        _uuid("enrollment_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column("score", sa.Numeric(6, 2), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        _uuid("graded_by", nullable=True),
        sa.Column("remark", sa.Text(), nullable=True),
        *_timestamps(),
        _tenant_fk("marks"),
        sa.ForeignKeyConstraint(
            ["assessment_id", "offering_id", "institution_id"],
            [
                "assessments.id",
                "assessments.offering_id",
                "assessments.institution_id",
            ],
            name="fk_marks_assessment_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id", "offering_id", "institution_id"],
            ["enrollments.id", "enrollments.offering_id", "enrollments.institution_id"],
            name="fk_marks_enrollment_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["graded_by", "institution_id"],
            ["users.id", "users.institution_id"],
            name="fk_marks_graded_by_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "assessment_id", "enrollment_id", name="uq_marks_assessment_enrollment"
        ),
        sa.CheckConstraint("score IS NULL OR score >= 0", name="ck_marks_score_non_negative"),
        sa.CheckConstraint(
            "score IS NULL OR graded_at IS NOT NULL", name="ck_marks_graded_has_timestamp"
        ),
    )
    op.create_index("ix_marks_enrollment", "marks", ["enrollment_id"])
    op.create_index("ix_marks_assessment", "marks", ["assessment_id"])

    # --- submissions ----------------------------------------------------
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        _uuid("institution_id", nullable=False),
        _uuid("assignment_id", nullable=False),
        _uuid("enrollment_id", nullable=False),
        _uuid("offering_id", nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("file_key", sa.Text(), nullable=True),
        sa.Column("text_body", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="submission_status", create_type=False),
            nullable=False,
            server_default=sa.text("'missing'"),
        ),
        sa.Column("is_late", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("late_days", sa.Numeric(5, 2), nullable=True),
        sa.Column("score", sa.Numeric(6, 2), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        *_timestamps(),
        _tenant_fk("submissions"),
        sa.ForeignKeyConstraint(
            ["assignment_id", "offering_id", "institution_id"],
            [
                "assignments.id",
                "assignments.offering_id",
                "assignments.institution_id",
            ],
            name="fk_submissions_assignment_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id", "offering_id", "institution_id"],
            ["enrollments.id", "enrollments.offering_id", "enrollments.institution_id"],
            name="fk_submissions_enrollment_offering_tenant",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "assignment_id", "enrollment_id", name="uq_submissions_assignment_enrollment"
        ),
        sa.CheckConstraint(
            "late_days IS NULL OR late_days >= 0", name="ck_submissions_late_days_non_negative"
        ),
        sa.CheckConstraint(
            "status <> 'submitted' OR submitted_at IS NOT NULL",
            name="ck_submissions_submitted_has_timestamp",
        ),
        sa.CheckConstraint("score IS NULL OR score >= 0", name="ck_submissions_score_non_negative"),
    )
    op.create_index("ix_submissions_assignment", "submissions", ["assignment_id"])
    op.create_index("ix_submissions_enrollment", "submissions", ["enrollment_id"])
    op.create_index("ix_submissions_assignment_late", "submissions", ["assignment_id", "is_late"])

    # --- foreign-key support indexes ------------------------------------
    # PostgreSQL does not index FK columns, and a constraint lookup is issued
    # as "find child rows matching these columns", so each FK needs an index
    # whose LEADING column is the FK's first column. The query-path indexes
    # above do not satisfy that in every case.
    op.create_index("ix_subjects_department", "subjects", ["department_id", "institution_id"])
    op.create_index(
        "ix_subject_prerequisites_institution",
        "subject_prerequisites",
        ["institution_id"],
    )
    op.create_index("ix_subject_offerings_institution", "subject_offerings", ["institution_id"])
    op.create_index("ix_class_sessions_institution", "class_sessions", ["institution_id"])
    op.create_index(
        "ix_attendance_records_session",
        "attendance_records",
        ["session_id", "offering_id", "institution_id"],
    )
    op.create_index(
        "ix_attendance_records_recorded_by",
        "attendance_records",
        ["recorded_by", "institution_id"],
    )
    op.create_index("ix_assessments_institution", "assessments", ["institution_id"])
    op.create_index("ix_assignments_institution", "assignments", ["institution_id"])
    op.create_index("ix_marks_institution", "marks", ["institution_id"])
    op.create_index("ix_marks_graded_by", "marks", ["graded_by", "institution_id"])
    op.create_index("ix_submissions_institution", "submissions", ["institution_id"])

    # --- students.current_term_id (deferred from 0001) ------------------
    op.add_column("students", sa.Column("current_term_id", postgresql.UUID(as_uuid=True)))
    op.create_foreign_key(
        "fk_students_current_term_tenant",
        "students",
        "terms",
        ["current_term_id", "institution_id"],
        ["id", "institution_id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_students_current_term_id", "students", ["current_term_id"])

    # --- triggers -------------------------------------------------------
    # I5: a mark cannot exceed its assessment's maximum.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.enforce_mark_within_max() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            max_allowed numeric(6,2);
        BEGIN
            IF NEW.score IS NULL THEN
                RETURN NEW;
            END IF;
            SELECT a.max_score INTO max_allowed
              FROM assessments a
             WHERE a.id = NEW.assessment_id;
            IF max_allowed IS NOT NULL AND NEW.score > max_allowed THEN
                RAISE EXCEPTION 'mark % exceeds max_score % for assessment %',
                    NEW.score, max_allowed, NEW.assessment_id
                    USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_marks_within_max
        BEFORE INSERT OR UPDATE ON marks
        FOR EACH ROW EXECUTE FUNCTION public.enforce_mark_within_max()
        """
    )

    # I7: a submission score cannot exceed its assignment's maximum.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.enforce_submission_within_max() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            max_allowed numeric(6,2);
        BEGIN
            IF NEW.score IS NULL THEN
                RETURN NEW;
            END IF;
            SELECT a.max_score INTO max_allowed
              FROM assignments a
             WHERE a.id = NEW.assignment_id;
            IF max_allowed IS NOT NULL AND NEW.score > max_allowed THEN
                RAISE EXCEPTION 'score % exceeds max_score % for assignment %',
                    NEW.score, max_allowed, NEW.assignment_id
                    USING ERRCODE = '23514';
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_submissions_within_max
        BEFORE INSERT OR UPDATE ON submissions
        FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_within_max()
        """
    )

    # I6: published assessment weights for an offering must not exceed 100.
    # Deferred to COMMIT so a multi-row import is validated once, at the end,
    # rather than tripping on intermediate states.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.enforce_assessment_weight_total() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            targets uuid[];
            target uuid;
            total numeric(6,2);
        BEGIN
            IF TG_OP = 'INSERT' THEN
                targets := ARRAY[NEW.offering_id];
            ELSIF TG_OP = 'DELETE' THEN
                targets := ARRAY[OLD.offering_id];
            ELSE
                targets := ARRAY[NEW.offering_id, OLD.offering_id];
            END IF;

            FOREACH target IN ARRAY targets LOOP
                CONTINUE WHEN target IS NULL;
                SELECT COALESCE(SUM(weight_percent), 0) INTO total
                  FROM assessments
                 WHERE offering_id = target AND is_published;
                IF total > 100 THEN
                    RAISE EXCEPTION
                        'published assessment weights for offering % total %, exceeds 100',
                        target, total
                        USING ERRCODE = '23514';
                END IF;
            END LOOP;
            RETURN NULL;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE CONSTRAINT TRIGGER trg_assessments_weight_total
        AFTER INSERT OR UPDATE OR DELETE ON assessments
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION public.enforce_assessment_weight_total()
        """
    )

    # Trigger functions are not called by the runtime role; keep the surface
    # closed. Triggers themselves do not check EXECUTE privilege.
    for function in (
        "public.enforce_mark_within_max()",
        "public.enforce_submission_within_max()",
        "public.enforce_assessment_weight_total()",
    ):
        op.execute(f"REVOKE ALL ON FUNCTION {function} FROM PUBLIC")

    # --- updated_at triggers --------------------------------------------
    for table in ("terms", "subjects", "subject_offerings", "enrollments", "assessments"):
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


def downgrade() -> None:
    # Reverse dependency order. RLS policies and triggers are dropped with
    # their tables.
    op.drop_index("ix_students_current_term_id", table_name="students")
    op.drop_constraint("fk_students_current_term_tenant", "students", type_="foreignkey")
    op.drop_column("students", "current_term_id")

    for table in reversed(TENANT_TABLES):
        op.drop_table(table)

    for function in (
        "public.enforce_assessment_weight_total()",
        "public.enforce_submission_within_max()",
        "public.enforce_mark_within_max()",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {function}")

    for enum in (
        "submission_status",
        "assessment_type",
        "attendance_status",
        "enrollment_status",
        "delivery_modality",
        "prerequisite_kind",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum}")
