# Technical Design Note
## Task & Engagement Management Tool

---

## 1. Architecture

```
Frontend (Next.js 16, App Router, Port 3000)
    │
    │  HTTP / JWT Bearer
    ▼
Backend API (Express 4 + TypeScript, Port 4000)
    │
    │  Sequelize 6 ORM
    ▼
Database (PostgreSQL 18 — dev and test DBs)
```

**Frontend** — Next.js 16 App Router (React Server Components for layout, client components for interactive pages). Axios handles API calls with a request interceptor that injects the JWT and a response interceptor that clears the session on 401. No external state manager — `localStorage` holds the token and user object; React `useState`/`useEffect` manage page-level state. Interactive pages feature client-side pagination (`Pagination.tsx`, `PAGE_SIZE = 10`), animated skeleton loaders during fetch, a sticky glassmorphic navigation header (`Navbar.tsx`), micro-animations (`animations.css`), dark mode support, and an interactive login page with quick demo autofill.

**Backend** — Three-layer architecture: Routes → Controllers → Services. Each layer has a single responsibility. Sequelize models are defined once in `src/models/` and imported everywhere via the barrel `models/index.ts`, which also registers all associations.

**Database** — Two PostgreSQL databases: `tet` (development/production) and `tet_test` (integration tests). Sequelize's `force: true` sync wipes and recreates the test DB before every test run for a clean slate.

**Authentication** — Stateless JWT (HS256). Token contains `{ sub, role, name }`. Verified on every protected request by the `authenticate` middleware.

---

## 2. Database Schema / ERD

```
users
  id            PK
  name          VARCHAR(100)
  email         VARCHAR(255)  UNIQUE
  passwordHash  VARCHAR(255)
  role          ENUM(admin, manager, team_member)
  isActive      BOOLEAN

clients
  id            PK
  name          VARCHAR(150)
  contactEmail  VARCHAR(255)
  isActive      BOOLEAN

service_types
  id              PK
  name            VARCHAR(150)  UNIQUE
  recurrenceType  ENUM(one_time, monthly, quarterly, annually)
  isActive        BOOLEAN

task_templates
  id             PK
  serviceTypeId  FK → service_types.id  CASCADE DELETE
  title          VARCHAR(200)
  orderIndex     INTEGER
  INDEX(serviceTypeId, orderIndex)

engagements
  id               PK
  clientId         FK → clients.id
  serviceTypeId    FK → service_types.id
  createdByUserId  FK → users.id          ← manager scoping
  title            VARCHAR(255)
  status           ENUM(active, completed, cancelled)
  periodKey        VARCHAR(20)            ← "2026-09" / "2026-Q3" / "2026" / "one_time"
  startDate        DATE
  dueDate          DATE
  UNIQUE(clientId, serviceTypeId, periodKey)  ← duplicate prevention
  INDEX(createdByUserId), INDEX(status), INDEX(dueDate)

tasks
  id                PK
  engagementId      FK → engagements.id  CASCADE DELETE
  taskTemplateId    FK → task_templates.id  SET NULL
  assignedToUserId  FK → users.id          SET NULL
  title             VARCHAR(200)
  status            ENUM(not_started, in_progress, waiting_for_client,
                         ready_for_review, changes_requested, completed)
  dueDate           DATE
  INDEX(engagementId), INDEX(assignedToUserId), INDEX(status), INDEX(dueDate)

task_history
  id               PK
  taskId           FK → tasks.id  CASCADE DELETE
  changedByUserId  FK → users.id
  fromStatus       ENUM (same values as tasks.status)
  toStatus         ENUM (same values as tasks.status)
  comment          TEXT
  createdAt        TIMESTAMP  (no updatedAt — rows are immutable)
  INDEX(taskId), INDEX(changedByUserId)
```

**Key constraints:**
- `UNIQUE(clientId, serviceTypeId, periodKey)` on `engagements` is the single source of truth for duplicate prevention. It fires at the database level regardless of how the row is inserted.
- `CASCADE DELETE` on tasks ensures no orphaned tasks exist if an engagement is deleted.
- `SET NULL` on `assignedToUserId` and `taskTemplateId` preserves tasks when a user or template is removed.

---

## 3. Backend Design

**Layer responsibilities:**

| Layer | File pattern | Responsibility |
|---|---|---|
| Route | `routes/*.ts` | Mount path, apply auth/role middleware |
| Controller | `controllers/*.ts` | Parse request, Zod validate, call service, format response |
| Service | `services/*.ts` | Business logic, DB queries, transactions |
| Model | `models/*.ts` | Sequelize schema, associations |
| Util | `utils/*.ts` | Stateless helpers (JWT, errors, period keys, workflow) |

**Validation** happens in the controller via `safeParse()` — invalid requests never reach the service layer.

**Business logic** lives exclusively in services. Controllers do not query the database directly.

**Error handling** — all errors bubble up to the global `errorHandler` middleware registered last in `app.ts`. It maps `AppError` subclasses to their HTTP status codes, catches Sequelize `UniqueConstraintError` as 409, and returns a consistent `{ error, message }` shape. Stack traces are never sent to clients.

**Transactions** — engagement creation and task status updates run inside `sequelize.transaction()`. If any step fails, the entire operation rolls back atomically.

---

## 4. Authentication & Authorization

**Authentication flow:**
1. `POST /api/v1/auth/login` — bcrypt verifies the password (cost 12). On success, signs a JWT containing `{ sub: userId, role, name }` with a configurable expiry (default 8h).
2. Every subsequent request passes the token in `Authorization: Bearer <token>`.
3. The `authenticate` middleware verifies the signature and attaches `req.user`.

**Authorization** is enforced at two levels:

*Route level* — `requireRole('admin', 'manager')` middleware rejects requests from roles not in the list before they reach the controller.

*Service level* — fine-grained checks that route middleware cannot express:
- Managers can only read/write engagements where `createdByUserId = req.user.sub`.
- Team members can only update tasks where `assignedToUserId = req.user.sub`.
- No one can approve their own work (`completed` transition blocked when `assignedToUserId === requestingUserId`).

These checks are co-located with the business logic in services, not scattered across middleware.

---

## 5. Recurring Task Generation

**How it works:**

When a manager creates an engagement, they supply a `periodDate`. The service derives a `periodKey` string from the service type's `recurrenceType`:

| recurrenceType | Example periodKey |
|---|---|
| `monthly` | `2026-09` |
| `quarterly` | `2026-Q3` |
| `annually` | `2026` |
| `one_time` | `one_time` (static) |

The entire create operation — Engagement row + all Task rows from templates — runs in a single database transaction.

**Rollover** (`POST /api/v1/engagements/:id/rollover`):
1. Load the source engagement and its service type.
2. Call `nextPeriodKey()` to advance by one period.
3. Preserve the original due-date offset (dueDate − startDate) and apply it to the new start date.
4. Run the same transactional create with the new `periodKey`.

**Duplicate prevention:**
The `UNIQUE(clientId, serviceTypeId, periodKey)` constraint fires at the database level. The service catches `SequelizeUniqueConstraintError` and converts it to a `ConflictError` (409). This means:
- Calling create twice with the same period → 409 on the second call.
- Calling rollover twice → 409 on the second call.
- Even if two concurrent requests race, only one will succeed — the database constraint is the final guard.

**Partial failure:** The transaction either fully commits (engagement + all tasks created) or fully rolls back. There is no state where an engagement exists without its tasks.

---

## 6. Workflow Rules

The valid state machine:

```
not_started ──> in_progress ──> ready_for_review ──> completed
                     │                  │
                     ▼                  ▼
            waiting_for_client  changes_requested
                     │                  │
                     └──> in_progress <──┘
```

**Enforcement** — `validateTransition()` in `utils/taskWorkflow.ts` is called inside the `updateTaskStatus` service function before the database update. It throws `ConflictError` for invalid moves and `ForbiddenError` for role violations. The rules in order:

1. Is the target status reachable from the current status? (state-machine check)
2. Is the target a manager-only status (`completed`, `changes_requested`)? Team members are blocked.
3. Is the task assigned to the requesting user? Team members can only move their own tasks.
4. Is the requesting user the assignee trying to approve their own work? Blocked regardless of role.

All four checks happen before the `UPDATE` query. The status update and the `task_history` insert run in the same transaction — either both succeed or both roll back.

---

## 7. Tests

**20 tests across 3 files** (`npm test` in `backend/`):

| File | Coverage |
|---|---|
| `auth.test.ts` (7) | Valid login returns JWT, wrong password → 401, unknown user → 401, missing field → 422, valid token for `/me`, no token → 401, tampered token → 401 |
| `taskWorkflow.test.ts` (7) | TM starts own task + history written, TM blocked on other's task → 403, TM self-approval blocked → 403, invalid transition rejected → 409, manager approves with comment, manager requests changes, manager blocked on other manager's engagement → 403 |
| `engagement.test.ts` (6) | Create engagement + tasks auto-generated, duplicate period → 409, TM cannot create → 403, manager scoping enforced, rollover creates next period, second rollover → 409 |

Tests use Supertest to make real HTTP requests against the Express app connected to `tet_test`. Each run starts with `syncDb({ force: true })` for a clean schema. Tests seed their own minimal data via helpers — no shared global fixtures.

---

## 8. Scalability & Production Considerations

**Database indexes** — the current indexes cover common query patterns (status, dueDate, assignedToUserId, engagementId). Under high task volume, composite indexes would become important: `(assignedToUserId, status)` for team-member task lists, `(engagementId, status)` for engagement detail pages, and a partial index `WHERE status != 'completed'` for dashboard open-task queries to skip the large completed set entirely.

**Pagination** — client-side pagination with page size 10 (`Pagination.tsx`) is implemented on `/tasks` and `/engagements` with total item counts, page ranges, and windowed ellipsis controls. At massive database scale, server-side cursor-based SQL pagination (using `id > lastSeenId` with `LIMIT`) can be added to the REST API endpoints.

**Dashboard queries** — the dashboard fires 5 parallel queries today. At scale, a materialized view (or Redis cache with a short TTL) would serve the summary counts without scanning millions of rows on every page load. Background jobs (e.g. a cron via `node-cron` or a queue like BullMQ) could refresh counts every minute.

**Background jobs** — recurring engagement rollover is currently triggered manually via the API. At scale this would move to a scheduled job that runs at the start of each period, queries all active recurring engagements whose next period hasn't been created yet, and generates them in batch.

**Logging/monitoring** — Morgan is used for request logging in development. In production this would be replaced with structured JSON logging (Winston or Pino), shipped to a log aggregator (Datadog, CloudWatch). APM tracing (OpenTelemetry) would be added to track slow queries and identify bottlenecks in the service layer.

---

## 9. Trade-offs

**Sequelize over raw SQL / a query builder** — Sequelize's association system and `sync()` made rapid schema iteration straightforward for this size of project. The trade-off is that complex queries (e.g. multi-join dashboard aggregations) are more verbose than raw SQL and can produce N+1 queries if eager loading isn't used carefully. At scale, moving performance-critical queries to raw SQL via `sequelize.query()` is the escape hatch.

**JWT stateless auth over sessions** — JWTs require no server-side storage and scale horizontally without a shared session store. The trade-off is that tokens cannot be individually revoked before expiry. For a professional services tool this is acceptable — the 8-hour expiry limits exposure, and a token blacklist (Redis) could be added if immediate revocation is required.

**`syncDb` in development over migrations** — using Sequelize's `sync({ force: false })` in development means the schema is always up-to-date without running migration files manually. The trade-off is that this approach is not safe in production (schema changes can fail silently or corrupt data). The `src/index.ts` startup only runs sync when `NODE_ENV !== 'production'`; production would use a proper migration tool (Sequelize CLI or Umzug) applied as part of the deployment pipeline.
