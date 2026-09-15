# Task & Engagement Management Tool

A small full-stack application for managing client engagements and their tasks across a professional services team. Built for a role-based workflow: **Admin** manages users/clients/service definitions, **Managers** create engagements and review submissions, and **Team Members** work on assigned tasks and submit them for review.

- **Backend:** Node.js + Express + TypeScript + Sequelize + PostgreSQL + JWT auth + Jest tests
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Client-Side Pagination + Glassmorphic UI & Micro-animations
- **Database:** PostgreSQL 18 (local install or Docker)

---

## Prerequisites

- **Node.js** >= 20 LTS + npm >= 10
- **PostgreSQL 18** already installed locally (Option B, used in this project). If you prefer a zero-config container instead, see *Alternative: Docker (Option A)* below.

---

## Quick Start (local dev — Option B: local Postgres install)

### 0. Confirm Postgres is running on port 5432

The installer registers Postgres as a Windows service and starts it automatically. To verify:
```powershell
Get-Service -Name postgresql* | Select-Object Name, Status, StartType
```
If Status is not `Running`, start it via Services (`services.msc`) or the pgAdmin launcher.

### 1. Create the dev + test databases (ONE TIME ONLY)

We use a dedicated low-privilege login `tet` (password `tet`) and two databases: `tet` (development) and `tet_test` (integration tests). These match the URLs already in `backend/.env`, so no env edits are required.

Run the included setup script as the `postgres` superuser (enter your Postgres superuser password):

```powershell
# From the project root (substitute your postgres superuser password)
$env:PGPASSWORD = "your_postgres_password"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -f tet-db-setup.sql
Remove-Item Env:\PGPASSWORD
```

**Notes:**
- The superuser created by the PostgreSQL 18 installer is always named `postgres`. Use `-U postgres`.
- Adjust the path if you installed to a different drive. To locate `psql.exe`:
  ```powershell
  Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe | Select-Object -First 1 FullName
  ```
- Expected output: `DO`, `CREATE DATABASE`, `CREATE DATABASE`, `GRANT`, `GRANT` — no hard errors.
  Re-running is safe; "ERROR: database already exists" is harmless.

### 2. Optional quick connectivity test

Confirm both databases are reachable as the app user:

```powershell
$env:PGPASSWORD = "tet"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U tet -h localhost -p 5432 -d tet -c "SELECT version();"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U tet -h localhost -p 5432 -d tet_test -c "SELECT current_database();"
$env:PGPASSWORD = ""
```

Both should output a single result row.

### 3. Backend install + seed + run

```bash
cd backend
npm install       # install dependencies
npm run seed      # wipes + re-populates demo data (users, clients, services, engagements, 46 tasks)
npm run dev       # starts on http://localhost:4000
```

Health check: http://localhost:4000/health → `{ "status": "ok" }`

### 4. Frontend install + run

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:3000
```

> `frontend/.env.local` already contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` so no edits are needed.

Visit http://localhost:3000 — you'll be redirected to the login page automatically.

### 5. Run backend tests

```bash
cd backend
npm test
```

Tests run against the `tet_test` database. Tables are force-recreated on every run for a clean slate. All 20 tests should pass.

---

## Alternative: Start Postgres via Docker (Option A)

If you want to run Postgres in a container instead of your local install:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with:
- Username: `tet` / Password: `tet`
- Dev database: `tet`
- Test database: `tet_test` (created automatically on first boot)

Wait ~10 seconds for first-boot initialisation, then proceed to Step 3. `DATABASE_URL` is identical for both options — no backend reconfiguration required.

---

## Demo Credentials

| Role        | Email                   | Password      |
|-------------|-------------------------|---------------|
| Admin       | `admin@example.com`     | `admin1234`   |
| Manager     | `manager1@example.com`  | `manager1234` |
| Manager     | `manager2@example.com`  | `manager1234` |
| Team Member | `tm_alice@example.com`  | `team1234`    |
| Team Member | `tm_bob@example.com`    | `team1234`    |
| Team Member | `tm_carol@example.com`  | `team1234`    |
| Team Member | `tm_dave@example.com`   | `team1234`    |

All sample data is fabricated. The login page includes interactive ⚡ Quick Demo Sign-in buttons to autofill these credentials instantly.

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── index.ts           # entry point, server listen + schema sync
│   │   ├── app.ts             # Express app + middleware wiring
│   │   ├── config/            # env-validated config
│   │   ├── db/
│   │   │   ├── sequelize.ts   # Sequelize instance + syncDb helper
│   │   │   └── seed.ts        # demo data loader
│   │   ├── middleware/        # authenticate, requireRole, errorHandler
│   │   ├── routes/            # per-domain routers (auth, engagements, tasks, …)
│   │   ├── controllers/       # HTTP layer: Zod validate → call service → format response
│   │   ├── services/          # business logic, transactions, workflow enforcement
│   │   ├── models/            # Sequelize model definitions + associations
│   │   ├── utils/             # JWT helpers, AppError hierarchy, periodKey, taskWorkflow
│   │   └── __tests__/         # Jest + Supertest integration tests (20 tests)
│   ├── .env                   # local env (not committed in real projects)
│   ├── .env.example
│   ├── tsconfig.json
│   └── jest.config.ts
├── frontend/
│   ├── app/                   # Next.js App Router pages & layouts
│   │   ├── login/             # login page with ambient glow & ⚡ quick autofill
│   │   ├── dashboard/         # dashboard with interactive metric cards & skeletons
│   │   ├── engagements/       # list + pagination + create + detail with task table
│   │   └── tasks/             # list (filterable + paginated) + detail with transitions
│   ├── components/            # AuthGuard, Navbar (centered nav), Pagination, StatusBadge
│   ├── styles/                # animations.css (keyframes & micro-animations)
│   └── lib/                   # api.ts (Axios), auth.ts, types.ts
├── docker/
│   └── init-multiple-dbs.sh   # Postgres first-boot helper (dev + test DBs)
├── docker-compose.yml
├── tet-db-setup.sql            # one-time DB + user creation script (Option B)
├── TECHNICAL_DESIGN_NOTE.md   # architecture, schema, design decisions
└── .gitignore
```

---

## API Overview

All routes are under `/api/v1`. Auth via `Authorization: Bearer <token>`.

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/login` | public |
| GET | `/auth/me` | authenticated |
| GET | `/dashboard` | all (role-scoped) |
| GET/POST | `/engagements` | all / manager+admin |
| GET/PATCH | `/engagements/:id` | scoped |
| POST | `/engagements/:id/rollover` | manager+admin |
| GET | `/tasks` | all (role-scoped) |
| GET | `/tasks/:id` | scoped |
| PATCH | `/tasks/:id/status` | all (workflow-enforced) |
| PATCH | `/tasks/:id/assign` | manager+admin |
| GET | `/users` | admin |
| GET | `/users/team-members` | manager+admin |
| POST/PATCH | `/users` | admin |
| GET/POST/PATCH | `/clients` | all / admin |
| GET/POST/PATCH | `/service-types` | all / admin |
| POST/DELETE | `/service-types/:id/task-templates` | admin |

