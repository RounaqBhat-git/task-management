-- One-time setup script for Option B (existing local Postgres install).
-- Run this as a superuser (e.g. postgres) BEFORE starting the backend
-- for the first time. It creates a low-privilege user `tet` + dev database `tet`
-- + test database `tet_test`. Re-running the script is safe (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tet') THEN
    CREATE ROLE tet LOGIN PASSWORD 'tet';
  END IF;
END
$$;

-- Create databases (cannot run inside DO block).
-- If either already exists, CREATE will error; if so just ignore that one error
-- and re-run the remainder (permissions grants).
CREATE DATABASE tet OWNER tet;
CREATE DATABASE tet_test OWNER tet;

-- Make sure the tet role owns and has full privilege on both DBs.
GRANT ALL PRIVILEGES ON DATABASE tet TO tet;
GRANT ALL PRIVILEGES ON DATABASE tet_test TO tet;
