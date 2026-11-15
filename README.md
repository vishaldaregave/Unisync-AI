# UniSync AI

Intelligent Academic Coordination & Personalized Student Support.

**Current scope: M1a — the governance spine, with no LLM calls.**
Architecture source of truth: `docs/architecture-v2.md` (the v2 document, including the
§13 review and its eleven acceptance tests).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Repository and engineering foundation | implemented |
| 1 | Tenant-first database (GUC + RLS) | not started |
| 2 | Authentication and authorization | not started |
| 3 | Policy and execution boundary | not started |
| 4 | Deterministic risk queue and approval flow | not started |
| 5 | Audit ledger and verification | not started |

A phase is only marked implemented once its acceptance tests have actually been run.
See `docs/implementation-log.md` for decisions, assumptions and deviations.

## Prerequisites

- Node.js >= 20 and pnpm
- Python 3.11 (not 3.12+, and not 3.14 — see the implementation log)
- Docker Desktop **or** a local PostgreSQL 16 with the `pgvector` extension, plus Redis

## Setup

```bash
cp .env.example .env

# API
cd apps/api
python -m venv .venv
.venv/Scripts/activate        # Windows; use .venv/bin/activate on macOS/Linux
python -m pip install --upgrade pip
pip install -e ".[dev]"

# Web
cd ../..
pnpm install
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm run dev:web` | Next.js dev server on :3000 |
| `pnpm run build:web` | Production build |
| `pnpm run lint:api` | Ruff lint |
| `pnpm run format:api` | Ruff format |
| `pnpm run typecheck:api` | mypy |
| `pnpm run test:api` | pytest |
| `pnpm run verify` | lint + typecheck + test |

API development server (from `apps/api`, with the venv active):

```bash
uvicorn app.main:app --reload --port 8000
```

## Infrastructure

`docker-compose.yml` provisions PostgreSQL 16 with pgvector and Redis. It is authored but
has **not been executed on this machine** — Docker is not installed. Nothing in Phase 1
can be validated until a database is available.

## Repository layout

```
apps/api        FastAPI service (Fabric, Graph, Cortex, Arbiter)
apps/web        Next.js application
docs/           architecture and implementation log
```
