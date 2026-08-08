# TaelaAI

AI-powered HR platform for job seekers. A monorepo with two independently deployable pieces:

- **[Frontend](./Frontend)** — Next.js 16, TypeScript, Tailwind CSS
- **[Backend](./Backend)** — Go, Gin, GORM, PostgreSQL

## Quick start

Run the backend first (it owns auth, data, and business logic), then the frontend against it.

```bash
# 1. Backend — needs a Postgres database, see Backend/README.md
cd Backend
cp .env.example .env
go run ./cmd/api          # listens on :8080

# 2. Frontend, in a second terminal
cd Frontend
cp .env.local.example .env.local
npm install
npm run dev                # listens on :3000
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account — it creates a real user, JWT, and CV record in Postgres.

## Repository structure

```
taela-ai/
├── Frontend/     # Next.js app — see Frontend/README.md
├── Backend/      # Go API — see Backend/README.md
└── render.yaml   # Deploys both as separate Render services + a managed Postgres
```

## Deploying

`render.yaml` at the repo root defines three resources: a managed Postgres database, the `taela-ai-backend` web service (Docker, built from `Backend/Dockerfile`), and the `taela-ai` frontend web service (Node, built from `Frontend/`). The frontend's `NEXT_PUBLIC_API_URL` and the backend's `ALLOWED_ORIGINS` are wired to each other's expected Render hostnames — double-check those two values if your service names end up different (e.g. because a name was already taken).

## Brand Tokens (CSS Variables)

| Token | Hex | Usage |
|---|---|---|
| `--yellow` | `#F5C535` | Primary CTA, Solar Yellow |
| `--pink` | `#E83567` | Alerts, Vibrant Pink |
| `--teal` | `#2EAA8A` | Success, Jade Teal |
| `--blue` | `#2878B5` | Info, Steel Blue |
| `--offblack` | `#1A1A1A` | Body text |

## Next steps to productionise further

1. **CV AI** — Wire up a real LLM (e.g. the Claude API) for genuine ATS scoring & tailoring, in place of the current keyword-heuristic in `Backend/internal/handlers/cv.go`
2. **Job Aggregation** — LinkedIn/Indeed API integrations or a scraping layer, in place of the seeded job catalog
3. **Auto-Apply** — Playwright automation service
4. **Analytics** — PostHog or Amplitude for product analytics, alongside the in-app analytics already served by the backend
