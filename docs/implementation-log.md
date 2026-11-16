# Implementation Log

Authoritative specification: [`architecture-v2.md`](./architecture-v2.md) (v2, including the §13
review and its eleven acceptance tests).

This log records what was actually built, what was actually run, and what is still missing. A
statement here without a recorded command result below it should be treated as unverified.

---

## Phase 0 — Repository and engineering foundation

**Date:** 2026-11-15
**Status:** complete · acceptance criteria met (see §8)
**Deliverable:** a booting two-service skeleton with real quality gates — not a feature slice.

### 1. Repository inspection (before any modification)

| Check | Result |
|---|---|
| Working directory | `D:\Development\Unisync-ai` |
| Existing files | only `.commandcode/taste/taste.md` (tool config) |
| Git | **not initialised** — `git init` was run as part of this phase |
| Node | v24.15.0 |
| npm | 11.12.1 |
| pnpm | available (v10.25.0) |
| Python | 3.14.3 (default `py`), 3.11.9 also installed |
| Docker | **not installed** — no `docker` binary |
| PostgreSQL | **not installed** — no service, no `psql`, no install directory |
| Redis | **not installed** — no service |

The repository was empty. Nothing was overwritten, and no existing work was displaced.

### 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Python 3.11** for the API (`requires-python = ">=3.11,<3.13"`) | The machine's default is 3.14.3. `asyncpg` 0.30 and the psycopg binary wheels target ≤ 3.13; pinning the range prevents an accidental 3.14 install that fails to build. 3.11.9 is installed and verified. |
| D2 | **Modular monolith, two deployables** (`apps/api`, `apps/web`) | v2 ADR-5. No microservices. |
| D3 | **Compose covers PostgreSQL + Redis only**; api/web run on the host in development | Host execution keeps reload, debugger and pytest behaviour normal. Containerised api/worker images belong to the deployment phase (v2 §3.10). |
| D4 | **Alembic is configured but has no migrations** | The first migration is Phase 1's tenant-first migration. Creating a placeholder migration now would seed a misleading history. |
| D5 | **Constraint naming convention fixed now** (`app/db/base.py`) | Constraint names are baked into DDL. Renaming after the first migration means rewriting shipped migrations. |
| D6 | **Tailwind 3.4**, not v4 | v4's CSS-first config changes how shadcn/ui components are authored. Staying on 3.4 keeps the component path conventional; revisit deliberately, not implicitly. |
| D7 | **No shadcn/ui, Recharts or Framer Motion yet** | No UI component exists in Phase 0, so adding them would mean committing generated code and unused dependencies. They are added when the first real component needs them (Phase 4). |
| D8 | **`/healthz` only — no `/readyz`** | A readiness probe must check the database. Stubbing one to return 200 would be a lie; it arrives in Phase 1 with a real query. |
| D9 | **Secrets are separated by purpose in settings** (`JWT_SIGNING_KEY`, `AUDIT_HMAC_KEY`) | v2 §3.8/§13.5-E1.4. Enforced by `tests/test_config.py`. |
| D10 | **`ALLOW_EXTERNAL_LLM` defaults to false** and is asserted in tests | v2 §13.5-E5.3. Nothing in M1a calls a model. |
| D11 | **Ruff + mypy + pytest** rather than Black/isort/Flake8 | One tool for lint and format, faster, and the security rule set (`S`) is on by default. |
| D12 | **Architecture document vendored** to `docs/architecture-v2.md` | The repo must carry its own specification so a reviewer can check the build against §13 without external context. |

### 3. Deviations from the v2 roadmap

| # | Deviation | Why | Consequence |
|---|---|---|---|
| DV1 | Compose is authored but **not executed** | Docker is not installed and installing it is a system-level change that was not requested. | Phase 1 cannot be validated until a database exists. See §4. |
| DV2 | No `apps/web` test runner | There is no frontend logic to test in Phase 0; adding a runner with a placeholder test would be a mock success. | Web tests begin in Phase 4 with the first real interaction. `pnpm run test` therefore runs API tests only. |
| DV3 | `pnpm run verify` requires the venv to be **active** | The scripts call `python`, which resolves to 3.14 outside the venv. Using `.venv/Scripts/python.exe` would hard-code a Windows path into package.json. | Documented in README. Running `verify` without activation fails loudly on the Python steps — it does not silently pass. |
| DV4 | Postgres creates only a `postgres` superuser | The owner/app role split needs to be provisioned by SQL. Doing it in an init script now would be untested and would exist outside migration history. | Phase 1's first migration/bootstrap creates `unisync_owner` (BYPASSRLS) and `unisync_app` (RLS-subject). |

### 4. Blockers

**B1 — No database, so Phase 1 is blocked.**

Phase 1's central requirement is proving that a user from Institution A cannot read or modify
Institution B's records *including through raw database queries under the application role*. That
proof requires a live PostgreSQL 16 with the `pgvector` extension and two roles. None of this can
be simulated: an in-memory or WASM substitute would not exercise RLS, the GUC, or role separation,
and reporting it as passing would be false.

Options, all requiring a decision and a system change:

1. **Docker Desktop** — run `docker compose up db redis`. Closest to the documented design; largest install.
2. **Local PostgreSQL 16 + pgvector** — smaller footprint, needs the extension installed separately.
3. **Managed Postgres** (Neon/Supabase) with pgvector — no local install, but Phase 1 tests then run against a shared remote instance and need network access.

Until one is chosen, Phase 1 stays at zero lines of code rather than at "mostly working".

#### B1 — attempted resolution (2026-11-15)

The decision was made to install Docker Desktop. Prerequisites were checked first:

| Check | Result |
|---|---|
| `winget` on PATH | **no** — but present at `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe` (v1.29.380) |
| Session elevated | **no** — `IsInRole(Administrator)` = False |
| WSL2 installed | **no** — `wsl --status` → "Windows Subsystem for Linux is not installed" |
| Hypervisor present | yes (`Win32_ComputerSystem.HypervisorPresent` = True) |
| Hyper-V / Containers feature state | **unreadable** — `Get-WindowsOptionalFeature` requires elevation |

An install was attempted:

```
winget install --id Docker.DockerDesktop -e --source winget \
  --accept-package-agreements --accept-source-agreements
```

It ran for 600 s and was terminated by the command timeout. Post-check: no
`C:\Program Files\Docker\Docker\Docker Desktop.exe`, no `docker` on PATH, no Docker process
running, and `winget list --id Docker.DockerDesktop` still reports no installed package.

**Conclusion:** Docker Desktop cannot be installed from this session. It requires an elevated
shell (this session is not elevated) and a WSL2 or Hyper-V backend (neither is installed), and
there are no interactive elevation prompts available here. Retrying without elevation would fail
the same way.

**Handover — run in an elevated PowerShell:**

```powershell
$winget = "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe"
& $winget install --id Docker.DockerDesktop -e --source winget `
    --accept-package-agreements --accept-source-agreements

wsl --install          # Docker Desktop's default backend; reboot if prompted
```

Then start Docker Desktop, wait for the engine, and confirm:

```powershell
docker version
docker compose version
```

Once those two commands succeed, Phase 1 starts with `docker compose up -d db redis`.

Phase 1 remains **not started**. No application code was written to work around the missing
database.


### 5. Commands executed and results

| # | Command | Where | Result |
|---|---|---|---|
| 1 | `git init` | repo root | Initialised empty repository on `master` |
| 2 | `py -3.11 -m venv .venv` | `apps/api` | Python 3.11.9 |
| 3 | `python -m pip install -e ".[dev]"` | `apps/api` | Success — 47 packages installed |
| 4 | `pnpm install` | repo root | Success — 347 packages, 1m19s |
| 5 | `ruff check .` | `apps/api` | 1 error (I001 import order), fixed with `--fix`; then **All checks passed** |
| 6 | `ruff format --check .` | `apps/api` | **10 files already formatted** |
| 7 | `mypy app` | `apps/api` | **Success: no issues found in 6 source files** |
| 8 | `pytest -q` | `apps/api` | **4 passed**, 1 warning |
| 9 | `eslint .` | `apps/web` | clean, no findings |
| 10 | `tsc --noEmit` | `apps/web` | clean, no diagnostics |
| 11 | `next build` | `apps/web` | **Compiled successfully**; 4/4 static pages; `/` = 103 kB first load; exit 0 |
| 12 | `uvicorn app.main:app --port 8123` + `GET /healthz` | `apps/api` | `{"status":"ok","service":"unisync-api","version":"0.1.0","env":"local"}`; `/docs` → 200; process stopped |
| 13 | `pnpm run verify` | repo root (venv active) | **exit 0** — lint, both typechecks, 4 tests |

Resolved versions at the time of this log:

- API: FastAPI 0.163.1, Starlette 1.10.0, Pydantic 2.14.3, SQLAlchemy 2.0.57, Alembic 1.20.1,
  asyncpg 0.30.0, psycopg 3.3.9, uvicorn 0.54.0, ruff 0.17.5, mypy 1.20.2, pytest 8.4.2
- Web: Next 15.5.29, React 19, TypeScript 5.7, Tailwind 3.4.17, ESLint 9
- Node 24.15.0, pnpm 10.25.0

### 6. Files created

```
.editorconfig
.env.example
.gitignore
README.md
docker-compose.yml                      (authored, UNVERIFIED — see DV1)
package.json
pnpm-workspace.yaml
.github/workflows/ci.yml
docs/architecture-v2.md                 (vendored specification)
docs/implementation-log.md              (this file)
apps/api/.python-version
apps/api/alembic.ini
apps/api/pyproject.toml
apps/api/app/__init__.py
apps/api/app/core/__init__.py
apps/api/app/core/config.py
apps/api/app/db/__init__.py
apps/api/app/db/base.py
apps/api/app/main.py
apps/api/migrations/env.py
apps/api/migrations/script.py.mako
apps/api/migrations/versions/.gitkeep
apps/api/tests/__init__.py
apps/api/tests/test_config.py
apps/api/tests/test_health.py
apps/web/package.json
apps/web/tsconfig.json
apps/web/next.config.ts
apps/web/postcss.config.mjs
apps/web/tailwind.config.ts
apps/web/eslint.config.mjs
apps/web/app/globals.css
apps/web/app/layout.tsx
apps/web/app/page.tsx
```

No migrations were added. No database objects exist yet.

### 7. Known limitations

1. **No database infrastructure exists on this machine.** `docker-compose.yml` has never been run.
2. **No web test runner.** `pnpm run test` covers the API only.
3. **The landing page reports milestones statically.** It is not wired to any API; Phase 4 replaces
   it with real data or removes it.
4. **`/readyz`, routers, auth, sessions, RLS, the policy layer, the audit ledger and the risk engine
   do not exist.** Nothing in Phase 1–5 is stubbed in their place.
5. **One dependency warning:** Starlette 1.10 deprecates `httpx` in `TestClient` in favour of
   `httpx2`. Harmless today; revisit when `httpx2` lands in FastAPI's test extras.
6. **Nothing is committed.** The working tree is untracked; no commit was made because none was
   requested.

### 8. Phase 0 acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Repository inspected before modification | Met | §1 |
| Actual stack and dependencies confirmed | Met | §1, §5 |
| Project scaffold created | Met | §6 |
| Environment configuration | Met | `.env.example`, `app/core/config.py`, `test_config.py` |
| Docker local dev for PostgreSQL + Redis | **Authored, unverified** | `docker-compose.yml`, DV1 |
| Formatting, linting, type-check and test commands | Met | commands 5–13; `pnpm run verify` exit 0 |
| `docs/implementation-log.md` maintained | Met | this file |

**Phase 0 is complete.**

---

## Phase 1 — Tenant-first database

### 1.1 Infrastructure (complete, verified)

**Date:** 2026-11-16
**Scope of this increment:** PostgreSQL + Redis running, roles provisioned, pgvector available,
connectivity proven from the host for both roles. **No schema and no migration yet.**

Environment was re-verified before any change: Docker 29.9.3, Docker Compose v5.7.0, daemon up
(Linux containers, 16 vCPU, 8 GB). B1 from Phase 0 is resolved.

| Component | Result |
|---|---|
| `docker compose up -d db redis` | Network `unisync_default`, volumes `unisync_pgdata` + `unisync_redisdata` created; both containers started |
| PostgreSQL image | `pgvector/pgvector:pg16` → PostgreSQL **16.16** (Debian) |
| Health | `unisync-db` healthy, `unisync-redis` healthy |
| Redis | `PING` → `PONG` |
| pgvector | `vector` **0.8.7** installed at init time |
| `public` schema owner | `unisync_owner` |
| `unisync_owner` | `rolsuper=f`, **`rolbypassrls=t`**, login=t, createdb=f, createrole=f |
| `unisync_app` | `rolsuper=f`, **`rolbypassrls=f`**, login=t, createdb=f, createrole=f |
| Host TCP, asyncpg as app role | `current_user=unisync_app`, `is_superuser=off`, **`row_security=on`** |
| Host TCP, psycopg as owner role | `current_user=unisync_owner`, `bypassrls=True` |
| Alembic wiring | `alembic current` → connects via `PostgresqlImpl`, transactional DDL, **no revisions yet** |

Least-privilege behaviour was tested, not assumed:

```
owner: CREATE TABLE public.__bootstrap_check(id int);   -> CREATE TABLE
app:   SELECT count(*) FROM public.__bootstrap_check;   -> 0 rows  (default privileges work)
app:   CREATE TABLE public.__should_fail(id int);       -> ERROR: permission denied for schema public
owner: DROP TABLE public.__bootstrap_check;             -> DROP TABLE
```

**Files created / modified**

| File | Change |
|---|---|
| `docker/postgres/init/01-bootstrap.sh` | new — provisions `unisync_owner` (BYPASSRLS, not superuser) and `unisync_app` (NOBYPASSRLS), installs pgvector, transfers `public` schema ownership to the owner, sets `ALTER DEFAULT PRIVILEGES` so future owner-created tables are usable by the runtime role |
| `docker-compose.yml` | db service now passes the four role variables and mounts the init directory read-only; the stale "UNVERIFIED" header note was corrected |
| `README.md` | Phase 1 status and infrastructure section corrected |
| `.env` | created from `.env.example` (git-ignored — never committed) |

**Design notes**

- The owner role is **BYPASSRLS but not superuser**. `CREATE EXTENSION vector` therefore runs in
  the bootstrap script as the container superuser, once, instead of requiring a superuser migration.
  This keeps the migration role as unprivileged as the design allows.
- `ALTER DEFAULT PRIVILEGES ... FOR ROLE unisync_owner` is set at bootstrap rather than per
  migration. Per-migration `GRANT`s are the kind of thing one migration forgets.
- The runtime role gets `USAGE` but **not `CREATE`** on `public` — proven above by the permission
  denied error.
- Passwords live in `.env`, which is git-ignored. They are local placeholders and are documented as
  such in `.env.example`.

**Not done in this increment**

- No tables, no migration, no RLS policy, no GUC. `alembic current` correctly reports nothing.
- No seed data and therefore no two-institution isolation test yet — that is the next increment and
  cannot be faked before the tables exist.

**Checkpoint commit:** `5808f20a1133c1620698d405535cfde7727aed4a` —
`feat(infra): provision PostgreSQL and Redis with owner/app roles`.
This hash covers the Phase 1.1 work only; the line recording it is a separate
follow-up commit so that the recorded hash stays valid.

**Next increment:** the tenant-first migration — `institutions` + `institution_id` on every
tenant-scoped table, `SET LOCAL app.institution_id` plumbing, `CREATE POLICY` per table, then a
two-institution isolation test executed under the **runtime role**.

---

### 1.2 Tenant-first database foundation (complete, verified)

**Date:** 2026-11-16
Design: [`phase-1.2-design.md`](./phase-1.2-design.md)

#### Review corrections applied

| # | Finding | Resolution |
|---|---|---|
| R1 | Inventory arithmetic inconsistent; `assignments`/`submissions` missing | Recomputed from §4.1, §4.2, §13.5-E1.3: **48 tables = 47 tenant-scoped + `institutions`**. Exclusions named explicitly (`policy_rules` is a YAML file; `escalations` collapsed into `followup_tasks`). |
| R2 | `citext` not provisioned; availability unverified | Added to bootstrap; verified `citext 1.6` and `vector 0.8.7` installed **before** the migration ran. Migration now aborts if either is absent. |
| R3 | GUC threat model undocumented | Documented in design §6 and in `app/db/session.py`: a session can set its own custom GUC, so RLS is a backstop for query bugs, never a boundary against a confused application. |
| R4 | Runtime role privileges under-specified | Owns nothing, no `TRUNCATE`, no DDL on policies, cannot disable RLS — each asserted. |
| R5 | T8 must execute a query after `SET row_security = off` | Implemented; asserts the specific `row-level security` error. |
| R6 | T7 must cover commit **and** rollback | Split into T7a/T7b/T7c on a pool-size-one engine. |
| R7 | D8: avoid database-level `CREATE` | `app` schema created by the bootstrap superuser, owned by `unisync_owner`. No `CREATE ON DATABASE` grant. |
| R8 | D5: institution code in the login identifier | Recorded; no `SECURITY DEFINER` bypass will be created. Phase 2 concern. |

#### Migration

| Field | Value |
|---|---|
| Revision | `0001_tenancy` (head) |
| File | `apps/api/migrations/versions/0001_tenancy_foundation.py` |
| SHA-256 | `747d056e184aae321cf02f59889ddcfae65eff20b19c425abab03430f43c3d8d` |
| Tables | `institutions`, `departments`, `users`, `faculty`, `students`, `advisor_assignments` |
| Extensions used | `citext` (tenant-scoped keys), `vector` (provisioned now, unused until RAG) |

#### Commands executed and results

| # | Command | Result |
|---|---|---|
| 1 | `docker compose down -v && docker compose up -d db redis` | volumes recreated so the amended bootstrap ran; both healthy |
| 2 | `SELECT name, installed_version FROM pg_available_extensions` | `citext 1.6`, `vector 0.8.7` |
| 3 | `SELECT nspname, owner FROM pg_namespace WHERE nspname='app'` | `app` → `unisync_owner` |
| 4 | `alembic upgrade head` | applied `0001_tenancy`, exit 0 |
| 5 | `alembic downgrade base` | clean rollback, 1 table left (`alembic_version`) |
| 6 | `alembic upgrade head` | re-applied, exit 0 |
| 7 | `ruff check .` | All checks passed |
| 8 | `ruff format --check .` | 18 files already formatted |
| 9 | `mypy app` | Success: no issues found in 7 source files |
| 10 | `pytest -q` | **25 passed**, 1 warning |

#### Catalogue verification (queried, not assumed)

- **8 foreign keys**, 6 of them composite tenant FKs
  (`(user_id, institution_id)`, `(department_id, institution_id)`,
  `(advisor_id, institution_id)`, `(student_id, institution_id)`), all `ON DELETE RESTRICT`.
- **Unique constraints**: `uq_institutions_code`, `uq_departments_institution_code`,
  `uq_users_institution_email`, `uq_faculty_institution_employee_code`,
  `uq_students_institution_roll_number`, plus `uq_*_id_institution` on every parent so composite
  FKs have a valid target, plus the two partial uniques
  `uq_advisor_assignments_active_pair` and `uq_advisor_assignments_primary`.
- **Indexes**: advisor_assignments 6, departments 4, faculty 7, institutions 2, students 7, users 4.
- **Ownership**: every table owned by `unisync_owner`; `relrowsecurity = t` and
  `relforcerowsecurity = t` on all six; six `tenant_isolation` policies with both `USING` and
  `WITH CHECK`.
- **Privileges for `unisync_app`**: `SELECT/INSERT/UPDATE/DELETE = t`, `TRUNCATE = f` on every
  table. `alembic_version` revoked entirely from the runtime role (Alembic creates it, so the
  bootstrap default privileges had granted it DML).

#### Test matrix — all executed as `unisync_app`

| # | Test | Node | Result |
|---|---|---|---|
| T1 | Read isolation across three tables | `test_t1_cannot_read_other_institution` | pass |
| T2 | Update isolation (`UPDATE 0`) | `test_t2_cannot_update_other_institution` | pass |
| T3 | Delete isolation (`DELETE 0`) | `test_t3_cannot_delete_other_institution` | pass |
| T4 | Cross-tenant insert rejected (`42501`) | `test_t4_cannot_insert_row_for_other_institution` | pass |
| T5 | Missing GUC: 0 rows, writes rejected | `test_t5_missing_context_returns_no_rows_and_rejects_writes` | pass |
| T6 | Malformed GUC: 0 rows, writes rejected | `test_t6_invalid_context_does_not_grant_access` | pass |
| T7a | COMMIT clears context (pool size 1) | `test_t7a_commit_clears_context` | pass |
| T7b | ROLLBACK clears context | `test_t7b_rollback_clears_context` | pass |
| T7c | A→B→A switching does not leak | `test_t7c_switching_context_between_transactions_does_not_leak` | pass |
| T8 | `row_security=off` then query errors | `test_t8_runtime_role_cannot_bypass_rls` | pass |
| T8 | Cannot disable RLS / drop / create policy | `test_t8_runtime_role_cannot_alter_rls_objects` | pass |
| T9 | Composite FK rejects cross-tenant reference | `test_t9_composite_fk_rejects_cross_tenant_reference` | pass |
| T10 | Runtime role owns no table | `test_t10_runtime_role_owns_no_tables` | pass |
| T10 | Runtime role cannot read `alembic_version` | `test_t10_runtime_role_cannot_touch_alembic_version` | pass |
| T11 | No `TRUNCATE` privilege, direct truncate denied | `test_t11_runtime_role_cannot_truncate` | pass |
| T12 | Conflicting records coexist across tenants | `test_t12_conflicting_records_coexist_across_institutions` | pass |
| — | Owner credentials rejected at startup | `test_owner_credentials_are_rejected_at_startup` | pass |
| — | Runtime credentials pass the guard | `test_runtime_credentials_pass_the_startup_guard` | pass |
| — | URL guard rejects/accepts correctly | `test_url_guard_rejects_owner_url`, `test_url_guard_accepts_runtime_url` | pass |
| — | App refuses a session without a tenant | `test_missing_tenant_is_refused_by_the_application` | pass |

Total: **21 database tests + 4 pre-existing = 25 passed**.

#### Finding recorded during implementation

`SET LOCAL` on a **custom** GUC does not restore `NULL` when the transaction ends — PostgreSQL
restores the empty string `''` once the GUC has been defined in that session. The first run of
T7a/T7b asserted `IS NULL` and failed with `''`.

This is not a leak: `app.current_institution()` maps `''` to `NULL`, so the effective tenant is
`NULL` and zero rows are visible — which is why that branch exists in the function. The tests were
corrected to assert the *effective* tenant (`app.current_institution() IS NULL`) plus
`raw IN (NULL, '')` plus zero visible rows. Recorded here because the original design note said
"assert the setting is NULL", and that was wrong about PostgreSQL's behaviour.

#### Known limitations

1. **RLS is not a trust boundary.** `app.institution_id` is a custom GUC any session can set; the
   protection is against query bugs, not a compromised application. Tenant identity must come from
   authenticated identity in Phase 2.
2. **Login cannot read `users` yet.** With RLS on and no context, authentication has no path until
   Phase 2 adds the institution code to the login identifier (D5/R8).
3. **`students.current_term_id` does not exist yet** — deferred to migration 0002.
4. **Test data lives in the dev database** and is truncated per test; there is no separate test
   database (that would need `CREATEDB`, which neither role has by design).
5. **Migration 0001 has no data migrations** and no seed generator; seeding exists only as test
   fixtures.

#### Phase 1.2 acceptance

All eight required isolation test groups pass, executed against PostgreSQL under `unisync_app`.
**Phase 1.2 is complete.** Migration 0002 (academic core) is the next increment and has not been
started.

---

## Phase 1.3 — Academic core (DESIGN APPROVED, documentation checkpoint)

**Date:** 2026-11-16
Design document: [`phase-1.3-design.md`](./phase-1.3-design.md)

No migration, schema change or application code was produced. One design document was written.

Checkpoint verification at the start of this phase:

| Check | Result |
|---|---|
| Local head vs `origin/main` | `e17e404` on both — matches |
| Phase 1.2 and documentation commits on origin | `e17e404`, `336c391` — present |
| Alembic head | `0001_tenancy (head)`, single head |
| Migration SHA-256 | `747d056e…c791bc78` — matches the recorded value |
| Working tree | **not strictly clean**: `.commandcode/taste/` modified/untracked (taste learning system, not application work) |
| `alembic current` | not run — Docker daemon down at the time; head verified statically via `alembic heads` |

The design covers 11 tables (`terms`, `subjects`, `subject_prerequisites`, `subject_offerings`,
`enrollments`, `class_sessions`, `attendance_records`, `assessments`, `marks`, `assignments`,
`submissions`) plus `students.current_term_id`, deferred from 0001.

Four items were **approved on 2026-11-16** because they revise architecture-v2:

1. **E1.2's "generated column" is not implementable** — PostgreSQL generated columns cannot read
   another table. **Approved:** stored `subject_id`, pinned by the four-column composite FK
   `(offering_id, subject_id, term_id, institution_id)`.
2. **`submission_status`** — **approved** as `(missing, submitted, graded)`; lateness is `is_late`.
3. **Attempt/version model** — **approved:** one submission per assignment for MVP, with attempts
   recorded as a future extension.
4. **`terms.registration_closes_at`** — **approved**, completing the registration window.

The remaining recommendations (P4, P5, P6, P8, Q1, Q3, Q4) were accepted as written. The design is
**approved for a documentation checkpoint**; implementation has not started.

Not started: migration 0002, seed data, ORM models, API, tests.

---

## Phase 1.4 — Migration 0002 applied (implemented, not committed)

**Date:** 2026-11-16
Design: [`phase-1.3-design.md`](./phase-1.3-design.md) · Design checkpoint `1981314`

### Preflight (all conditions passed)

| Check | Result |
|---|---|
| HEAD vs `origin/main` | `1981314` on both |
| Live `alembic current` | `0001_tenancy` |
| Migration heads | `0001_tenancy` only |
| Migration 0001 SHA-256 | `747d056e…c791bc78` — matched |
| Staged changes | none |
| `.commandcode/taste/` | untouched, unstaged |

### Migration

| Field | Value |
|---|---|
| Revision | `0002_academic_core` (head) |
| Parent | `0001_tenancy` |
| File | `apps/api/migrations/versions/0002_academic_core.py` |
| SHA-256 | `67831ad7d3b51b3f39443c3a897fb436905d21d8de978429a55b353972c82d98` |
| 0001 SHA-256 after | `747d056e…c791bc78` — **unchanged** |

### Created

- **11 tables**: `terms`, `subjects`, `subject_prerequisites`, `subject_offerings`,
  `enrollments`, `class_sessions`, `attendance_records`, `assessments`, `assignments`, `marks`,
  `submissions`; plus `students.current_term_id` (composite FK to `terms`).
- **6 enums**: `prerequisite_kind`, `delivery_modality`, `enrollment_status`,
  `attendance_status`, `assessment_type`, `submission_status` (`missing,submitted,graded`).
- **31 new foreign keys** (39 total in the schema). Every one is composite and includes
  `institution_id`, so cross-tenant references fail even with RLS bypassed.
- **1 partial unique index**: `uq_terms_one_current` on `(institution_id) WHERE is_current`.
- **11 RLS policies** (17 total), each `ENABLE` + `FORCE` with `USING` and `WITH CHECK`.
- **3 business triggers** + **10 `updated_at` triggers**:
  - `trg_marks_within_max` — score ≤ assessment `max_score`
  - `trg_submissions_within_max` — score ≤ assignment `max_score`
  - `trg_assessments_weight_total` — `DEFERRABLE INITIALLY DEFERRED`, published weights ≤ 100
- **62 indexes** across the 11 new tables (query paths + FK-leading columns)
- **25 check constraints** schema-wide

### Integrity mechanisms

- **Tenant pinning** — composite FKs including `institution_id`.
- **Offering pinning** — `attendance_records`, `marks`, `submissions` carry a shared
  `offering_id` pinned by two composite FKs, so the session/enrolment and
  assessment/enrolment pairs must belong to the same offering. Proven by A7/A8, including
  control cases where matching offerings are accepted.
- **Enrolment pinning** — the four-column FK keeps `subject_id`/`term_id` equal to the
  offering's values.

### Deviations recorded

| # | Deviation | Reason |
|---|---|---|
| D1 | **11 FK-leading indexes added** beyond the design's §4.3 index list | §4.3 listed query paths, not FK paths. Test A22 requires an index whose leading column is each FK's first column; the gap was found by writing that test, before applying. |
| D2 | Design §8.3 said "24 foreign keys"; the actual count is **31 new (39 total)** | My arithmetic in the design was wrong. The catalogue is authoritative; recorded here. |
| D3 | `CHECK` added on `min_grade` and `final_grade` for the 0–100 range | Direct consequence of the approved Q1 grade scale; the design listed the column type but not the bound. |
| D4 | Phase 1.2 test `test_t10_runtime_role_owns_no_tables` hard-coded 6 tables and failed after 0002 | Updated to assert the exact 17-table set instead of a magic number. The failure was a stale assertion, not a regression. |
| D5 | A20 (downgrade/re-upgrade) executed through the Alembic CLI, not pytest | It manipulates schema state rather than application data. |

### Tests — 25 in `test_academic_core.py`, all passing

| # | Test | Result |
|---|---|---|
| A1 | cross-tenant prerequisite rejected (owner, RLS bypassed) | pass |
| A2 | offering cannot use another tenant's term | pass |
| A3 | enrolment cannot reference another tenant's offering | pass |
| A4 | tenant-scoped uniqueness (same code in two tenants, duplicate within one) | pass |
| A5 | duplicate enrolment, same offering | pass |
| A6 | double enrolment across sections of one subject | pass |
| A7 | attendance cannot mix offerings (both offerings tried) | pass |
| A7b | attendance with matching offerings accepted (control) | pass |
| A8 | marks cannot mix offerings (both offerings tried) | pass |
| A8b | marks with matching offering accepted (control) | pass |
| A9 | mark above `max_score` rejected | pass |
| A10 | published weights 60 + 50 rejected at COMMIT | pass |
| A10b | weights 60 + 40 accepted, total verified = 100.00 | pass |
| A11 | `max_score` 0 and −10 rejected | pass |
| A12 | `weight_percent` −1 and 101 rejected | pass |
| A13 | duplicate submission rejected | pass |
| A14 | submission score above assignment max rejected | pass |
| A15 | RLS read isolation across 7 tables | pass |
| A16 | RLS write isolation: `UPDATE 0`, `DELETE 0`, cross-tenant insert `42501` | pass |
| A17 | missing tenant GUC → 0 rows on all 8 sampled tables | pass |
| A18 | malformed tenant GUC → 0 rows | pass |
| A19 | runtime role: owns nothing, no TRUNCATE, no RLS DDL | pass |
| A21 | every FK has a unique target | pass |
| A22 | every FK has a leading-column index | pass |
| A22b | all 17 tenant tables RLS-enabled + forced; all 17 policies carry both predicates | pass |

Full suite: **50 passed** (4 API unit + 21 Phase 1.2 + 25 academic core).

### Quality gates

```
ruff check .              All checks passed
ruff format --check .     20 files already formatted
mypy app                  Success: no issues found in 7 source files
```

### Upgrade / downgrade / re-upgrade

| Step | Result |
|---|---|
| `alembic upgrade head` (first apply) | `0001_tenancy → 0002_academic_core`, exit 0 |
| `alembic downgrade 0001_tenancy` | clean; 7 relations left (6 Phase 1.2 tables + `alembic_version`) |
| 0001 objects after downgrade | `advisor_assignments`, `departments`, `faculty`, `institutions`, `students`, `users` — all intact |
| `alembic upgrade head` (re-apply) | exit 0, `0002_academic_core (head)` |

### Catalogue verification

| Check | Result |
|---|---|
| Tables | 17 tenant tables, **1 distinct owner**, RLS on 17/17, FORCE on 17/17 |
| Policies | 17, all with `current_institution` in both `qual` and `with_check` |
| Foreign keys | 39 total, **39 tenant-pinned** |
| Triggers | 13: 3 business + 10 `updated_at`; `trg_assessments_weight_total` is deferrable + init-deferred |
| Grants | `TRUNCATE` granted to `unisync_app` on **0** tables; `SELECT` on 17 |
| Enums | exact approved value sets |

### Limitations

1. **Downgrade is destructive** — it drops academic data. It exists to prove reversibility in a
   disposable environment, not as a production rollback strategy.
2. **Application-level invariants remain** (design §6): prerequisite cycles, session-within-term,
   `meets_on` local-date consistency, attendance only for active enrolments, capacity ceilings,
   frozen lateness, closed-term write rules. They are not enforced by the database and the
   application layer does not exist yet.
3. **No seed data, no ORM models, no API.** The tables are empty between test runs.
4. **The `enrollments` four-column FK** means `subject_id`/`term_id` are stored rather than
   generated — an approved deviation from the literal wording of §13.5-E1.2.

**Status: implemented, verified and committed as `b09e30cdcfa07893ef1fbd01af73259cd55db454`.**

---

## Phase 1.5 — Auth, authorization and service layer (DESIGN ONLY)

**Date:** 2026-11-16
Design document: [`phase-1.5-design.md`](./phase-1.5-design.md)

No application code, schema change, migration 0003, RLS change, Docker change or commit was made.
One design document was written and this log entry added.

### Reconnaissance (inspected, not assumed)

| Check | Result |
|---|---|
| Local HEAD vs `origin/main` | `b09e30c` on both |
| Live Alembic revision | `0002_academic_core` |
| `apps/api/app` contents | `main.py`, `core/config.py`, `db/base.py`, `db/session.py` only — **no auth, services, policies or routers** |
| `users` columns | 13 columns including `perm_version`, `failed_login_count`, `locked_until`; **no `last_step_up_at`** |
| Auth tables | `refresh_tokens`, `password_reset_tokens`, `audit_logs`, `record_access_log` **do not exist** |
| Working tree | `.commandcode/taste/` modified/untracked — the taste learning system, left untouched |

### Key design decisions proposed

1. **Tenant identity never comes from the request.** The institution code is a login-time selector;
   the value that reaches `app.institution_id` is read from the `users` row. JWT `inst` is a lookup
   hint whose failure mode is an empty result, never another tenant's data.
2. **Four independent authorization layers** — authentication, role, resource relationship, field
   redaction — with the 404-for-out-of-scope rule to prevent enumeration.
3. **Request-scoped unit of work** owns the transaction and sets the tenant GUC; services never
   commit.
4. **`AgentContext` is strictly less powerful than a user session**: frozen, tool allow-list, one
   pinned student, and `SYSTEM_SWEEP` unreachable from HTTP.
5. **Capacity is serialised** with `SELECT … FOR UPDATE` on the offering row; the race is described
   explicitly rather than hand-waved.

### Items requiring approval before implementation

| # | Item | Why it needs sign-off |
|---|---|---|
| P1 / ADR-18 | Additive login policy on `institutions` | Extends D4; the only non-forbidden way to resolve a tenant at login |
| P4 / ADR-21 | JWT `inst` as a lookup hint | Must be recorded as a hint, never authority |
| P5 / ADR-20 | `department_admins` table instead of a new role | Schema addition, migration 0003 |
| P3 / ADR-22 | 10-second idempotent refresh grace | Refines E2.1 |
| ADR-23 / Q8 | Pull the audit ledger forward from Phase 5 | Changes phase order; without it Phase 2 ships with no audit trail |

### Open questions

Q1 institution-code secrecy · Q2 grace duration · Q3 idle timeout · Q4 no email infrastructure ·
Q5 user-lookup mechanism · Q6 department-admin modelling · Q7 counselling staff (out of scope) ·
Q8 audit ledger timing · Q9 MFA · Q10 production reset delivery.

### Status

**Design complete, awaiting approval. Nothing implemented, nothing committed.**

### Revision — A2 adopted (2026-11-16)

Institution codes were confirmed **secret**, so A1 (an additive `SELECT` policy on `institutions`
keyed on a request-supplied code) is **rejected**. `docs/phase-1.5-design.md` was revised in place.

| Change | Detail |
|---|---|
| ADR-18 | **Rejected**, superseded by ADR-24 |
| ADR-24 | **Selected:** dedicated `unisync_auth` role (`NOBYPASSRLS`) + separate connection pool |
| ADR-25 | Institution codes stored **only** as keyed HMAC-SHA-256 digests; pepper outside PostgreSQL; unkeyed hashes rejected |
| ADR-26 | One auth-only RLS policy on `users`, granted `TO unisync_auth`, scoped by `app.auth_institution_id` |
| ADR-27 | Proposed: rename `institutions.code` → `slug` (non-secret) so no plaintext credential remains (Q11) |
| ADR-21 | Revised: the JWT claim is **signature-verified before use** and cross-checked against the row |

Also corrected in this revision: the §4.1 request diagram previously showed the actor row being read
**before** the tenant GUC was set, which would have returned zero rows under RLS. The ordering is now
GUC → read → cross-check.

Open questions added: Q11 (slug rename), Q12 (code dual-validity window, 24 h), Q13 (pepper rotation
cadence). Q1 and Q5 are now resolved.

The 10-point mandatory security review is answered in the design (§15), including the role/privilege
matrix for all three roles.

No code, schema, migration, RLS, Docker or commit change was made by this revision.

### Revision 2 — final security pass (2026-11-16)

Documentation only. `docs/phase-1.5-design.md` revised again.

| Change | Detail |
|---|---|
| **GUC reclassified** | `app.auth_institution_id` is documented as **accident protection, not a trust boundary**. Custom GUCs are settable by any session, so a compromised auth role can change it. New §4.3.1 covers four adversaries separately (bug, compromised process, leaked credentials, malicious operator) and states the residual risk plainly. |
| **ADR-28 proposed** | Move `password_hash`, `failed_login_count`, `locked_until` out of `users` into `auth_user_credentials`, granted only to `unisync_auth`. **This fixes a real exposure found during the review: `unisync_app` can today read every column of `users` within its tenant, including password hashes.** Needs approval. |
| **Q11 accepted** | `institutions.code` → `slug` (public, non-secret); the login code exists only as a digest. §3.1.4 documents why they are separate, who may read the slug, why the slug is rejected as a credential, and the exact rename migration. |
| **Q12 resolved** | Full institution-code lifecycle: generation (20 chars Crockford base32, ≈100 bits), entropy floor, normalization, one-time issuance, 24 h rotation overlap, retirement, emergency revocation, no reactivation ever, audit events, step-up authorization. |
| **Q13 resolved** | Versioned pepper map, `pepper_version` per digest, multi-version lookup, and the honest consequence: **existing digests cannot be re-keyed because the plaintext is never stored** — retiring a pepper requires reissuing every affected code. |
| **Tests split** | §11.6 now separates **Group A** (controls the design provides, ≈18 tests) from **Group B** (characterisation tests that pin what it does *not* protect, e.g. setting the auth GUC succeeds). |
| **Diagrams** | Added the auth-boundary flow showing the GUC limitation; existing pool and login diagrams annotated. |

Nothing was implemented. No migration, schema, role, RLS, Docker or environment change; nothing
committed.

### Revision 3 — consistency audit (2026-11-16)

Documentation only. Audited ADR-23, ADR-25, ADR-26 and ADR-28 against the actual repository and
migrations, then corrected `docs/phase-1.5-design.md`.

**ADR-23 resolved (was a genuine three-way conflict).** Auth cannot write the ledger, auth events
must be tamper-evident, and login must fail if the mandatory event is not persisted. Selected the
**app-pool writer** (Option A): auth pool verifies and commits; a single app-pool transaction inserts
the audit row and, on success, the refresh token; cookies are minted only after that commit. Audit
failure returns **503 `audit_unavailable`** for both successful and failed login attempts. The design
now states explicitly that the two transactions are **not** atomic with each other, and what is
guaranteed instead. Dedicated audit-writer role and outbox were evaluated and rejected/deferred.

**ADR-28 narrowed.** The auth role now gets `SELECT` on credential columns and `UPDATE` **only** on
`failed_login_count` and `locked_until` — **not** `password_hash`. Password writes move to a proposed
**ADR-29** write-only role (`UPDATE (password_hash, password_changed_at, credential_version)`, no
`SELECT`), authorised by a signed 5-minute change grant with `credential_version` optimistic
concurrency. A compromised auth process can therefore read hashes and reset lockout, but cannot
replace a password. The fallback (granting `UPDATE (password_hash)` to auth) is documented with its
consequence.

**Status reconciliation.** Single vocabulary applied (Approved / Approved with conditions / Proposed /
Rejected / Superseded). ADR-18 Rejected (supersession history preserved); ADR-24 and ADR-26
Approved with conditions; ADR-27 Approved; ADR-19/20/21/22/23/25/28/29 still Proposed. ADR-21 was
flagged "do not reopen" but never explicitly approved, so it stays Proposed — recorded rather than
inferred.

**Two contradictions found** (design §16):

1. **Statement 5** — "the app role cannot read password hashes" is false against the current schema:
   `users.password_hash` exists and `unisync_app` has `SELECT` on all of `users` within its tenant.
   True only after ADR-28. This elevates ADR-28 from hardening to closing an existing exposure.
2. **Statement 9** — "JWT claims never establish tenant context" is not literally true: the app-pool
   GUC is set from `token.inst` before the row is read. Three options documented; **Q14 raised** and
   left unresolved because O2 changes the auth pool's role from login-only to per-request.

No code, migration, schema, role, RLS, Docker or environment change; nothing committed.

### Revision 4 — Q14 resolved (2026-11-16)

Documentation only. O1 adopted; the tenant-context invariant is restated as **provenance vs
authority**.

**Resolution.** A verified `inst` claim may *select* a provisional tenant scope for one identity
lookup. It never *establishes* authoritative context: the `users` row is authoritative for membership
and the request aborts in-transaction if they disagree. ADR-21 is now **Approved**; Q14 is closed.

**Coherence checked against the real SQL, not the prose.** Under the current `users` policy the
lookup is already scoped by the same GUC, so `row.institution_id == token.inst` is **tautological
today**. The load-bearing controls are signature verification (nothing else can put a wrong `inst` in
a token) and RLS scoping (a wrong claim yields zero rows). The explicit comparison is retained as a
**regression guard** against a future policy change, and §4.3 now says so instead of implying it does
work it does not do. Revocation comes from `is_active` and `perm_version` in the same row read, not
from the signature.

**O2 was not adopted.** Per-request auth-pool validation would avoid passing a tenant value through a
claim, but it makes the auth pool a dependency of every request and closes no practical gap, since the
claim cannot be forged and the lookup is RLS-scoped.

**New §17 pre-production security gates** (G1–G10), notably:

- **G1 — ADR-28 is required remediation, not optional.** Until `password_hash` leaves `users`,
  `unisync_app` can read hashes for its tenant. Verified by catalogue inspection against migration
  0001; this predates A2 and must be fixed before authentication goes live.
- **G2 — the ADR-23 audit gate** must be implemented, or a login can succeed with no tamper-evident
  record.
- **G3 — audit forgery is an accepted residual**: `unisync_app` can insert arbitrary events; the
  database cannot distinguish auth events from academic ones.
- **G10 — `record_access_log` remains unimplemented**; the product must not claim read auditing.

**Status discipline preserved.** Nothing was promoted. ADR-19, 20, 22, 23, 25, 28 and 29 remain
**Proposed**; only ADR-21 changed status, because O1 was an explicit decision.

No code, migration, schema, role, RLS, Docker or environment change; nothing committed.

