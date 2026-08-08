# TaelaAI — Backend

The API for TaelaAI: Go + [Gin](https://gin-gonic.com/) + [GORM](https://gorm.io/) on PostgreSQL. Handles accounts, the job catalog (synced from an external feed), the application tracker, network contacts, CV/ATS scoring, market insights, and dashboard/analytics aggregation for the [Frontend](../Frontend).

## Stack

- Go 1.25, [Gin](https://github.com/gin-gonic/gin) router
- [GORM](https://gorm.io/) + `gorm.io/driver/postgres` (pgx under the hood)
- JWT auth (`golang-jwt/jwt/v5`) + bcrypt password hashing
- UUID primary keys, auto-migrated on boot

## Quick start

Requires a Postgres database. Easiest local option is Docker:

```bash
docker run -d --name taela-ai-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=taela_ai -p 5432:5432 postgres:16-alpine
```

Then:

```bash
cp .env.example .env    # adjust DATABASE_URL / JWT_SECRET if needed
go run ./cmd/api
```

The server auto-migrates the schema, seeds the contacts/insights catalog, and runs an initial job-feed sync on first boot (see [Job feed sync](#job-feed-sync) below), then listens on `:8080` (or `$PORT`).

Health check: `GET /healthz`

## Project structure

```
Backend/
├── cmd/api/main.go          # entrypoint: config, db connect, migrate, seed, serve
├── internal/
│   ├── config/               # env var loading
│   ├── db/                   # gorm connection + AutoMigrate
│   ├── models/                # GORM models (User, Job, Application, Contact, Connection, CV, ...)
│   ├── dto/                   # API request/response shapes, decoupled from storage
│   ├── auth/                  # bcrypt hashing, JWT issue/parse, auth middleware
│   ├── handlers/              # one file per resource group
│   ├── router/                 # route table + CORS
│   ├── seed/                   # idempotent seed data (contacts, insights)
│   └── jobsync/                 # job feed fetch/parse/upsert + ticker (see below)
└── .env.example
```

## API overview

All routes are under `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create an account, returns `{ token, user }` |
| POST | `/api/auth/signin` | – | Returns `{ token, user }` |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/jobs` | ✓ | Active job catalog, with `applied` flag per user |
| POST | `/api/jobs/:id/apply` | ✓ | Create a tracker application from a job listing |
| GET | `/api/applications` | ✓ | The current user's tracker (Kanban) |
| POST | `/api/applications` | ✓ | Add a manual application |
| PATCH | `/api/applications/:id` | ✓ | Move stage / set next step |
| DELETE | `/api/applications/:id` | ✓ | Remove an application |
| GET | `/api/contacts` | ✓ | Suggested contacts, with `connected` flag per user |
| POST | `/api/contacts/:id/connect` | ✓ | Request an introduction |
| GET | `/api/cv` | ✓ | Get (or lazily create) the user's CV |
| PUT | `/api/cv` | ✓ | Update CV fields |
| POST | `/api/cv/experiences` | ✓ | Add a work experience entry |
| DELETE | `/api/cv/experiences/:expID` | ✓ | Remove a work experience entry |
| POST | `/api/cv/analyze` | ✓ | Recompute ATS score + checklist ("AI Tailor") |
| GET | `/api/meta/keywords` | – | ATS keyword list used for scoring |
| GET | `/api/insights` | – | Market insight cards |
| GET | `/api/dashboard/summary` | ✓ | Stats, best matches, recent activity, pipeline |
| GET | `/api/analytics/summary` | ✓ | Response/interview rate, platform + weekly stats, funnel |
| POST | `/api/admin/jobs/sync` | admin token | Force an immediate job-feed sync (see below) |

## Job feed sync

The job catalog isn't hand-entered — it's synced from [MyJobMag's public RSS feed](https://www.myjobmag.com/jobsxml.xml) by `internal/jobsync`, rather than fetched live on every `/api/jobs` request:

- **On boot**, and then **every `JOB_SYNC_INTERVAL_MINUTES`** (default 30), the server fetches the feed and upserts each item into the `jobs` table, keyed on the feed's `guid` — re-running the sync updates existing rows instead of duplicating them.
- The feed has no structured `company`/`location`/`salary` fields, only a title like *"Job Opportunities at Dangote Group"* and a free-text description — `company`/`location` are extracted from the title with a best-effort regex (`internal/jobsync/sync.go`), and `matchScore` is a freshness-based placeholder (90 decaying to a floor of 50 over ~2 weeks) until real CV-to-job matching exists.
- Jobs that disappear from a fetch (filled/expired) are marked `inactive` rather than deleted immediately, and only removed after being inactive for 30 days (`jobsync.StaleAfter`). `/api/jobs` only ever returns active jobs.
- `POST /api/admin/jobs/sync` (requires an `X-Admin-Token: <ADMIN_TOKEN>` header) forces a sync on demand, on top of the automatic ticker — handy right after a deploy or for debugging.

## Notes on the data model

- `Job`, `Contact`, and `MarketInsight` are a shared, global catalog. `Contact`/`MarketInsight` are seeded once from `internal/seed`; `Job` is populated by `internal/jobsync` instead.
- `Application`, `Connection`, `CV`, and `Activity` are per-user.
- The tracker only stores an application's *current* stage, not its full history, so the analytics conversion funnel approximates "reached stage X" as "current stage is X or later" (excluding rejected applications). Good enough for a funnel chart; not an audit log.
- `Activity` rows are written by the handlers themselves (apply, move stage, connect, CV analyze) and power the dashboard's "Recent Updates" feed — there's no separate event bus.

## Deploying

`Dockerfile` builds a static binary into a minimal Alpine image, listening on `$PORT` (default `8080`). Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_TOKEN`, and `ALLOWED_ORIGINS` (comma-separated, should include your deployed frontend's origin) as environment variables on the host.
