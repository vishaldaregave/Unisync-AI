#!/bin/bash
# UniSync AI — PostgreSQL bootstrap.
#
# Runs once, on first initialisation of the data volume. It provisions:
#
#   * extensions  — pgvector and citext. CREATE EXTENSION needs superuser, and
#                   the owner role is deliberately not superuser.
#   * roles       — owner (owns everything, runs migrations, BYPASSRLS; never
#                   given to the API) and app (runtime, RLS-subject).
#   * schema app  — home of app.current_institution(). Created here by the
#                   superuser so the owner never needs database-level CREATE.
#   * default privileges — so tables the owner creates later are usable by the
#                   runtime role without a per-migration GRANT that someone
#                   will eventually forget.
#
# Deliberately NOT granted: CREATE on the database, CREATE on schema public,
# TRUNCATE anywhere.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v owner_user="$POSTGRES_OWNER_USER" \
     -v owner_password="$POSTGRES_OWNER_PASSWORD" \
     -v app_user="$POSTGRES_APP_USER" \
     -v app_password="$POSTGRES_APP_PASSWORD" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'owner_user') AS create_owner \gset
\if :create_owner
CREATE ROLE :"owner_user" LOGIN PASSWORD :'owner_password'
    NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
\endif

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') AS create_app \gset
\if :create_app
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password'
    NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
\endif

GRANT CONNECT ON DATABASE :"DBNAME" TO :"owner_user", :"app_user";

ALTER SCHEMA public OWNER TO :"owner_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"owner_user";
-- USAGE only: the runtime role must never be able to create or alter objects.
GRANT USAGE ON SCHEMA public TO :"app_user";

-- Helper schema. Owned by the owner, created by the superuser, so that the
-- owner needs no database-level CREATE.
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION :"owner_user";
GRANT USAGE ON SCHEMA app TO :"owner_user", :"app_user";
REVOKE CREATE ON SCHEMA app FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
EOSQL
