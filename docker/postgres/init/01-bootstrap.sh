#!/bin/bash
# UniSync AI — PostgreSQL bootstrap.
#
# Runs once, on first initialisation of the data volume. It provisions the two
# roles the architecture requires (v2 §13.5-E1.1):
#
#   owner — owns the schema, runs migrations, BYPASSRLS. Never given to the API.
#   app   — runtime role: subject to RLS, and unable to bypass it.
#
# It also installs pgvector, because CREATE EXTENSION requires superuser and the
# owner role is deliberately *not* superuser.
#
# Default privileges are set here so that tables created later by the owner are
# automatically usable by the runtime role — without this every future migration
# would have to remember a GRANT, and one forgotten GRANT is a broken deployment.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v owner_user="$POSTGRES_OWNER_USER" \
     -v owner_password="$POSTGRES_OWNER_PASSWORD" \
     -v app_user="$POSTGRES_APP_USER" \
     -v app_password="$POSTGRES_APP_PASSWORD" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS vector;

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

ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_user" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
EOSQL
