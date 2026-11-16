# Phase 1.2 — Tenant-First Database Foundation (design)

Status: **approved with corrections** (review 2026-11-16) · Implements migration `0001`.
Authoritative specification: [`architecture-v2.md`](./architecture-v2.md) §13, especially §13.5-E1.

---

## 1. Review corrections applied

| # | Finding | Resolution |
|---|---|---|
| R1 | Inventory arithmetic was inconsistent (45 vs 46) and two v2 tables were missing | Recounted from §4.1, §4.2 and §13.5-E1.3. **48 tables total: 47 tenant-scoped + `institutions` (root).** `assignments` and `submissions` were missing from the first inventory and are now included. |
| R2 | No `citext` provisioning; availability unverified | `citext` added to bootstrap alongside `vector`; the migration refuses to run if either extension or the `app` schema is missing. |
| R3 | GUC threat model undocumented | Documented in §6: a DB session can set its own custom GUC, so RLS is a **backstop**, not the primary control. Tenant identity must come from authenticated server-side identity, never from request input. |
| R4 | Runtime role privileges under-specified | Explicitly: the app role owns no table, holds no `TRUNCATE`, cannot create/alter/drop policies, cannot disable RLS. All four are asserted in tests. |
| R5 | T8 must actually execute a query after `SET row_security = off` | T8 now runs `SELECT` and asserts the specific error. |
| R6 | T7 must cover commit **and** rollback cleanup | T7 runs both, on a pool-size-one connection. |
| R7 | D8: avoid database-level `CREATE` | The `app` schema is created **by the bootstrap superuser**, owned by `unisync_owner`. The owner never receives `CREATE ON DATABASE`. |
| R8 | D5: institution code in the login identifier | Phase 2 will authenticate with `(institution_code, email, password)`. **No `SECURITY DEFINER` login bypass will be created.** |

---

## 2. Table inventory — 48 tables

`institutions` is the tenant **root** and carries no `institution_id`. The other 47 are
tenant-scoped and carry `institution_id NOT NULL` plus the same RLS policy shape.

| # | Group | Tables | Count | Lands in |
|---|---|---|---|---|
| 1 | Tenancy foundation | `departments`, `users`, `faculty`, `students`, `advisor_assignments` | 5 | **0001 (this increment)** |
| 2 | Academic core | `terms`, `subjects`, `subject_prerequisites`, `subject_offerings`, `enrollments`, `class_sessions`, `attendance_records`, `assessments`, `marks`, `assignments`, `submissions` | 11 | 0002 |
| 3 | Academic derived | `student_academic_profiles` | 1 | 0002 |
| 4 | Identity/session | `refresh_tokens`, `password_reset_tokens` | 2 | 0002 / Phase 2 |
| 5 | Risk & intervention | `risk_config`, `routing_rules`, `risk_indicators`, `risk_cases`, `risk_case_events`, `interventions`, `followup_tasks`, `notifications` | 8 | Phase 4 |
| 6 | Governance | `agent_runs`, `agent_tool_calls`, `proposed_actions`, `approval_requests`, `action_executions` | 5 | Phase 3 |
| 7 | Audit | `audit_logs`, `audit_chain_checkpoints`, `record_access_log` | 3 | Phase 5 |
| 8 | Retrieval / graph / planning | `knowledge_documents`, `knowledge_chunks`, `knowledge_ingest_jobs`, `entity_links`, `chat_sessions`, `chat_messages`, `program_requirements`, `degree_plans`, `plan_versions`, `identity_links` | 10 | post-M1a |
| 9 | Operational | `import_jobs`, `failed_tasks` | 2 | post-M1a |
| | **Tenant-scoped subtotal** | | **47** | |
| 10 | Tenant root | `institutions` | 1 | **0001** |
| | **Total** | | **48** | |

### Explicit exclusions

- `policy_rules` — deliberately **not** a table. It is a versioned YAML file
  (`governance/policy_rules.yaml`), so a policy change is a reviewable diff rather than a
  database update. Recorded in v2 §4.2.
- `escalations` — **not** a table. v2 §13.5-E1.3 collapses it into `followup_tasks` with
  `kind = 'escalation'`.
- `subject_prerequisites` is listed with the academic core but is unscoped catalogue data in
  the strict sense; it is still tenant-scoped because catalogues differ per institution.
- `student_academic_profiles` is a **cache**, never a source of truth (v2 §4.4).

---

## 3. Migration 0001 — schema plan

### 3.1 Preconditions (fail loudly)

The migration aborts with an explicit message if the bootstrap did not run:

- `pg_extension` contains `citext` and `vector`
- schema `app` exists and is owned by the owner role

### 3.2 Types and helpers

```sql
CREATE TYPE user_role      AS ENUM ('admin','faculty','student');
CREATE TYPE student_status AS ENUM ('active','graduated','withdrawn');

CREATE FUNCTION app.current_institution() RETURNS uuid
  LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE raw text := current_setting('app.institution_id', true);
BEGIN
  IF raw IS NULL OR raw = '' THEN RETURN NULL; END IF;
  RETURN raw::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;

CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
```

### 3.3 Tables

```
institutions          id pk · code citext UNIQUE · name · timezone · locale · timestamps
departments           id pk · institution_id · code · name · timestamps
                      UQ (institution_id, code) · UQ (id, institution_id)
users                 id pk · institution_id · email · password_hash · full_name
                      role user_role · is_active · perm_version · failed_login_count
                      locked_until · last_login_at · timestamps
                      UQ (institution_id, email) · UQ (id, institution_id)
faculty               id pk · institution_id · user_id · employee_code · department_id
                      designation · office_hours · timestamps
                      UQ (institution_id, employee_code) · UQ (id, institution_id)
students              id pk · institution_id · user_id · roll_number · department_id
                      program · admission_year · status student_status · timestamps
                      UQ (institution_id, roll_number) · UQ (id, institution_id)
advisor_assignments   id pk · institution_id · advisor_id · student_id · assigned_at
                      ended_at · ended_reason · is_primary
                      UQ (advisor_id, student_id) WHERE ended_at IS NULL
                      UQ (student_id) WHERE ended_at IS NULL AND is_primary
                      CHECK (ended_at IS NULL OR ended_at >= assigned_at)
```

`students.current_term_id` is **deferred to 0002** (D6) — `terms` does not exist yet.

### 3.4 Foreign keys — all composite, all tenant-consistent

| Child | Columns | References |
|---|---|---|
| `departments` | `institution_id` | `institutions(id)` |
| `users` | `institution_id` | `institutions(id)` |
| `faculty` | `(user_id, institution_id)` | `users(id, institution_id)` |
| `faculty` | `(department_id, institution_id)` | `departments(id, institution_id)` |
| `students` | `(user_id, institution_id)` | `users(id, institution_id)` |
| `students` | `(department_id, institution_id)` | `departments(id, institution_id)` |
| `advisor_assignments` | `(advisor_id, institution_id)` | `faculty(id, institution_id)` |
| `advisor_assignments` | `(student_id, institution_id)` | `students(id, institution_id)` |

All `ON DELETE RESTRICT`. A cross-institution reference is rejected by the FK itself, before
RLS is consulted — this is what makes tenant isolation survive an RLS misconfiguration.

### 3.5 Indexes

Every FK is indexed. Every tenant table gets `ix_<table>_institution_id`. Plus:
`(institution_id, department_id)` on `faculty`/`students`, `(advisor_id, institution_id)` and
`(student_id, institution_id)` on `advisor_assignments`.

### 3.6 Row-level security

For each of the six tables:

```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <t> FOR ALL
  USING      (institution_id = app.current_institution())
  WITH CHECK (institution_id = app.current_institution());
```

`institutions` uses `USING / WITH CHECK (id = app.current_institution())` (D4).

### 3.7 Ownership and grants

| Object | Owner | `unisync_app` rights |
|---|---|---|
| All tables, sequences, functions | `unisync_owner` | `SELECT, INSERT, UPDATE, DELETE` via `ALTER DEFAULT PRIVILEGES` |
| `app.current_institution()` | `unisync_owner` | `EXECUTE` (revoked from `PUBLIC`, granted explicitly) |
| Schema `app` | `unisync_owner` | `USAGE` only |
| Schema `public` | `unisync_owner` | `USAGE` only — **no `CREATE`** |
| **`TRUNCATE`** | — | **never granted** (`FOR ALL` policies do not cover `TRUNCATE`) |
| Policies / RLS toggles | `unisync_owner` | **no privilege** — DDL is owner-only |

---

## 4. Tenant context — transaction design

```python
@asynccontextmanager
async def tenant_session(factory, institution_id: UUID) -> AsyncIterator[AsyncSession]:
    if not isinstance(institution_id, UUID):
        raise MissingTenantContext(...)          # layer 1: refuse in the application
    async with factory() as session:
        async with session.begin():              # explicit transaction
            await session.execute(
                text("SELECT set_config('app.institution_id', :v, true)"),
                {"v": str(institution_id)},
            )                                    # `true` = SET LOCAL
            yield session
```

| Property | Mechanism |
|---|---|
| Transaction-local | `set_config(..., is_local => true)`. Never `SET`, never `set_config(..., false)` |
| Injection-safe | Parameterised; the value is never interpolated into SQL text |
| Pool-safe | `LOCAL` reverts at `COMMIT` **and** `ROLLBACK`; asserted on a pool-size-one connection |
| Fail-closed | `None`/non-UUID raises in the app; if bypassed, RLS yields zero rows |
| Owner creds unusable | startup guard rejects a runtime connection that is superuser or `BYPASSRLS`, or whose username equals the owner role |

---

## 5. Test matrix (revised)

All assertions execute as `unisync_app`. Fixtures are created by `unisync_owner`.

| # | Test | Assertion |
|---|---|---|
| T1 | Read isolation | A-context `SELECT` on `users`, `students`, `departments` returns only A rows |
| T2 | Update isolation | A-context `UPDATE ... WHERE id = <B row>` → `rowcount = 0` |
| T3 | Delete isolation | A-context `DELETE ... WHERE id = <B row>` → `rowcount = 0` |
| T4 | Cross-tenant insert | A-context insert with `institution_id = B` → SQLSTATE `42501`, row absent |
| T5 | Missing GUC | unset: `SELECT` → 0 rows, no error; `INSERT` → `42501` |
| T6 | Invalid GUC | `'not-a-uuid'` → `SELECT` 0 rows, no error; `INSERT` → `42501` |
| T7a | Commit cleanup | pool size 1: tx1 A commits; next checkout has `current_setting(..., true) IS NULL` |
| T7b | Rollback cleanup | pool size 1: tx2 B rolls back; next checkout is clean; no data from either tx leaks |
| T7c | Switching | same pooled connection: A-tx, B-tx, A-tx → each sees exactly its own rows |
| T8 | Cannot bypass RLS | `SET row_security = off` then `SELECT` → error `query would be affected by row-level security policy`; `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`, `DROP POLICY`, `CREATE POLICY` → `42501` |
| T9 | Composite-FK backstop | A-context insert referencing B's `faculty` id → FK violation (`23503`) |
| T10 | App role owns nothing | `pg_tables.tableowner = unisync_owner` for all 6 tables |
| T11 | App role cannot `TRUNCATE` | `has_table_privilege(...,'TRUNCATE') = false`; direct `TRUNCATE` → `42501` |
| T12 | Tenant-scoped uniqueness | both institutions can hold `admin@unisync.test`, `CS-001`, `CSE` |

---

## 6. Threat model — custom GUC is not a trust boundary

`app.institution_id` is a **custom GUC**. Any session can set it:

```sql
SET app.institution_id = '<any uuid>';
```

Therefore RLS is **not** a defence against the application being tricked into using the wrong
tenant. It is a defence against *query bugs* — a missing `WHERE`, a forgotten join, a raw SQL
path — and against accidental cross-tenant reads.

Consequences, all mandatory:

1. Tenant identity is derived server-side from the authenticated session (Phase 2: the JWT's
   institution claim, cross-checked against the `users` row), never from a request body, query
   parameter, header, or path segment.
2. A request may never name an institution and have it trusted.
3. Object-level authorization remains the primary control; RLS is the backstop.
4. `SET LOCAL` is used so the value cannot outlive its transaction on a pooled connection.
5. The runtime role cannot change policies, disable RLS, or truncate — verified in T8/T10/T11.

---

## 7. Deliberately out of scope

No academic delivery tables, no governance tables, no audit ledger, no seed generator,
no API endpoints, no authentication. Migration 0002 is the next increment.
