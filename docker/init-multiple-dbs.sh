#!/bin/bash
set -e
set -u

# Postgres first-boot helper: creates additional databases listed in
# POSTGRES_MULTIPLE_DATABASES (comma-separated). Runs as the postgres
# entrypoint user inside the official postgres image.

if [ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  exit 0
fi

IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"

for db in "${DBS[@]}"; do
  db_trimmed="$(echo "$db" | tr -d '[:space:]')"
  if [ -z "$db_trimmed" ]; then
    continue
  fi
  echo "[init-multiple-dbs] creating database '$db_trimmed' if missing..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
    SELECT 'CREATE DATABASE "$db_trimmed"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db_trimmed')\gexec
    GRANT ALL PRIVILEGES ON DATABASE "$db_trimmed" TO "$POSTGRES_USER";
EOSQL
done
