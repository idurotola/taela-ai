# TaelaAI — Frontend

The UI for TaelaAI: Next.js 16, TypeScript, and Tailwind CSS. Talks to the [Backend](../Backend) API for auth, the job catalog, application tracker, network contacts, CV/ATS scoring, market insights, and analytics.

## Quick start

The [Backend](../Backend) must be running first (see its README).

```bash
cp .env.local.example .env.local   # points NEXT_PUBLIC_API_URL at the backend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
Frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx              # Landing page
│   ├── signin/, signup/      # Auth pages (call the backend, store a JWT)
│   └── dashboard/
│       └── page.tsx          # Main app shell (client) — auth-guarded
├── components/
│   ├── layout/                # Sidebar, Topbar, BottomNav
│   ├── ui/                    # Card, StatCard, Button, Tag, SectionHeader
│   └── features/                # One view per nav item, each fetching its own data
│       ├── DashboardView.tsx    # GET /api/dashboard/summary
│       ├── CVBuilderView.tsx    # GET/PUT /api/cv, POST /api/cv/analyze
│       ├── JobSearchView.tsx    # GET /api/jobs, POST /api/jobs/:id/apply
│       ├── TrackerView.tsx      # GET /api/applications, PATCH .../:id
│       ├── AnalyticsView.tsx    # GET /api/analytics/summary, /api/insights
│       └── NetworkView.tsx      # GET /api/contacts, POST .../:id/connect
├── lib/
│   ├── api.ts                # Fetch client + JWT storage (see below)
│   └── utils.ts               # Helpers, colour maps
└── types/
    └── index.ts               # Shared TypeScript interfaces (mirrors the backend DTOs)
```

## Talking to the backend

`lib/api.ts` exports a typed `api` object (e.g. `api.jobs()`, `api.applyToJob(id)`) that wraps `fetch`, points at `NEXT_PUBLIC_API_URL`, and attaches the JWT from `localStorage` (`getToken`/`setToken`/`clearToken`) as `Authorization: Bearer <token>`. `signin`/`signup` store the token on success; the dashboard shell checks for a token on mount and redirects to `/signin` if it's missing or rejected.

## Brand Tokens (CSS Variables)

| Token | Hex | Usage |
|---|---|---|
| `--yellow` | `#F5C535` | Primary CTA, Solar Yellow |
| `--pink` | `#E83567` | Alerts, Vibrant Pink |
| `--teal` | `#2EAA8A` | Success, Jade Teal |
| `--blue` | `#2878B5` | Info, Steel Blue |
| `--offblack` | `#1A1A1A` | Body text |

Font: **Nunito** (weights 300–800) via Google Fonts
