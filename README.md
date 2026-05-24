# TaelaAI — Demo MVP

AI-powered HR platform for job seekers. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it auto-redirects to the dashboard.

---

## Project Structure

```
taela-ai/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Redirects → /dashboard
│   ├── globals.css          # Brand tokens + animations
│   └── dashboard/
│       └── page.tsx         # Main app shell (client)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   └── Topbar.tsx       # Top header bar
│   ├── ui/
│   │   ├── Card.tsx         # Base card with accent top
│   │   ├── StatCard.tsx     # KPI metric card
│   │   ├── Button.tsx       # Multi-variant button
│   │   ├── Tag.tsx          # Coloured label pill
│   │   └── SectionHeader.tsx
│   └── features/
│       ├── DashboardView.tsx   # Home overview
│       ├── CVBuilderView.tsx   # ATS CV builder (Feature 01)
│       ├── JobSearchView.tsx   # Multi-platform jobs (Feature 02)
│       ├── TrackerView.tsx     # Kanban tracker (Feature 05)
│       ├── AnalyticsView.tsx   # Insights & charts (Feature 03)
│       └── NetworkView.tsx     # Referrals & contacts (Feature 04)
├── lib/
│   ├── mock-data.ts         # All demo data
│   └── utils.ts             # Helpers, colour maps
└── types/
    └── index.ts             # TypeScript interfaces
```

## Brand Tokens (CSS Variables)

| Token | Hex | Usage |
|---|---|---|
| `--yellow` | `#F5C535` | Primary CTA, Solar Yellow |
| `--pink` | `#E83567` | Alerts, Vibrant Pink |
| `--teal` | `#2EAA8A` | Success, Jade Teal |
| `--blue` | `#2878B5` | Info, Steel Blue |
| `--offblack` | `#1A1A1A` | Body text |

Font: **Nunito** (weights 300–800) via Google Fonts

## Next Steps to Productionise

1. **Auth** — Add Clerk or NextAuth for user accounts
2. **Database** — Supabase (Postgres) for applications, CV versions, contacts
3. **CV AI** — Wire up Anthropic API for real ATS scoring & tailoring
4. **Job Aggregation** — LinkedIn/Indeed API integrations or scraping layer
5. **Auto-Apply** — Playwright automation service
6. **Analytics** — PostHog or Amplitude for product analytics
