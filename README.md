# TaelaAI

AI-powered HR platform for job seekers. A monorepo with two independently deployable pieces:

- **[Frontend](./Frontend)** — Next.js 16, TypeScript, Tailwind CSS
- **[Backend](./Backend)** — Go, Gin, GORM, PostgreSQL

## Quick start

Run the backend first (it owns auth, data, and business logic), then the frontend against it.

```bash
# 1. Postgres, via Docker Compose (local dev only — see docker-compose.yml)
docker compose up -d

# 2. Backend, in a second terminal
cd Backend
cp .env.example .env
go run ./cmd/api          # listens on :8080

# 3. Frontend, in a third terminal
cd Frontend
cp .env.local.example .env.local
npm install
npm run dev                # listens on :3000
```

If port 5432 is already taken locally, set `POSTGRES_PORT` (e.g. in a root `.env`) before `docker compose up -d`, and update `DATABASE_URL` in `Backend/.env` to match.

Open [http://localhost:3000](http://localhost:3000). Sign up for an account — it creates a real user, JWT, and CV record in Postgres.

## Repository structure

```
taela-ai/
├── Frontend/            # Next.js app — see Frontend/README.md
├── Backend/             # Go API — see Backend/README.md
└── docker-compose.yml   # Local-dev-only Postgres (production uses a managed Railway database, see .railway/railway.ts)
```

## Deploying

### Railway

`.railway/railway.ts` declares the whole project as code: the `backend` service (Docker build from `Backend/Dockerfile`), the `frontend` service (Nixpacks build), and a managed Postgres database — the backend's `DATABASE_URL` is a reference to that database resource, not something set by hand.

From the repo root, with the Railway CLI and the `railway` npm package (see `.railway/README.md`):

```bash
railway config plan     # preview what would change — safe, no-op
railway config apply    # apply it
```

Set `JWT_SECRET`, `ADMIN_TOKEN`, and `ALLOWED_ORIGINS` on the backend service, and `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` (the frontend's public origin, used for canonical URLs and the sitemap on public job pages) on the frontend service, in the Railway dashboard.

In production (`APP_ENV=production`, or any Railway deploy) the backend **refuses to start** unless `JWT_SECRET` and `ADMIN_TOKEN` are set to random values of at least 32 characters — generate them with `openssl rand -base64 48`. Also set `TRUSTED_PROXIES` to the platform proxy's IP ranges so the auth rate limiter sees real client IPs rather than a spoofable `X-Forwarded-For`. Deploy the backend first, grab its public domain, then set that as the frontend's `NEXT_PUBLIC_API_URL` before its first build — Next.js inlines it at build time, so it must be set before, not just at runtime. Once the frontend has a domain too, update the backend's `ALLOWED_ORIGINS` to match it and redeploy.

## Brand Tokens (CSS Variables)

| Token | Hex | Usage |
|---|---|---|
| `--yellow` | `#F5C535` | Primary CTA, Solar Yellow |
| `--pink` | `#E83567` | Alerts, Vibrant Pink |
| `--teal` | `#2EAA8A` | Success, Jade Teal |
| `--blue` | `#2878B5` | Info, Steel Blue |
| `--offblack` | `#1A1A1A` | Body text |

## Jobs and applying

Every job has a public page at `/jobs/{slug}` (no login needed). There are two kinds:

- **Direct** — posted by a recruiter on Taela. Candidates apply on Taela; the page carries `JobPosting` structured data and is in the sitemap.
- **External** — ingested from the MyJobMag feed. Taela can't submit these, so the candidate downloads their CV and continues to the source site; the job sits in their tracker as **Prepared** until they confirm they've applied. External pages are `noindex` and left out of the sitemap.

## CVs, uploads and guest applications

- **Upload:** candidates upload a PDF or DOCX (5 MB max, checked by content). The original is kept in file storage, and if an AI provider is configured the text is read into editable sections that the candidate reviews before saving. Nothing is overwritten without their say-so.
- **Storage:** set `STORAGE_PROVIDER=r2` with the `R2_*` variables (Cloudflare R2 or any S3-compatible bucket). Without it, production disables uploads rather than writing to a disk that deploys wipe. `STORAGE_PROVIDER=local` is for development only.
- **AI:** `AI_PROVIDER` is `anthropic`, `gemini` or `bedrock` (see `Backend/.env.example`). Each user gets 5 automatic reads per day. CV text is sent to the chosen provider, so say so in your privacy policy.
- **Applications** freeze a copy of the CV and file at the moment of applying, so later edits don't change what a recruiter already received.
- **Guests** can apply from a public job page with just a CV. The application is held until they confirm their email, then delivered, and a free account is created for them.
- **Recruiters** must be verified before posting: employers confirm an email on their company's domain; independent recruiters are approved by an admin (`GET /api/admin/recruiters/pending`, `POST /api/admin/recruiters/:userId/verify`, with the `X-Admin-Token` header). Existing recruiters were grandfathered in as verified.

## Next steps to productionise further

1. **CV AI** — Wire up a real LLM (e.g. the Claude API) for genuine ATS scoring & tailoring, in place of the current keyword-heuristic in `Backend/internal/handlers/cv.go`
2. **Job Aggregation** — LinkedIn/Indeed API integrations or a scraping layer, in place of the seeded job catalog
3. **Auto-Apply** — Playwright automation service
4. **Analytics** — PostHog or Amplitude for product analytics, alongside the in-app analytics already served by the backend
