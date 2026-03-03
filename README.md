# PollCraft

A lightweight, no-auth web application for creating and sharing polls and surveys. Anyone can create a poll or multi-question survey in seconds, share it via a unique link, and see live results with bar chart visualizations — no account required.

## Features

- **Polls** — single-question multiple-choice votes
- **Surveys** — multi-question forms, each with their own answer options
- **Duration control** — 1 day, 1 week, or 1 month; voting closes automatically
- **Shareable links** — unique 10-character slug (e.g. `/p/V1StGXR8_Z`)
- **Live results** — bar chart shown immediately after voting
- **Duplicate prevention** — cookie (primary) + IP address (secondary) deduplication
- **No accounts** — create and vote without signing up

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma 7 |
| Database | Supabase PostgreSQL |
| Charts | Recharts |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env` and fill in your Supabase connection strings:

   ```bash
   cp .env .env.local
   ```

   ```env
   DATABASE_URL="postgresql://postgres:PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```

   > **Note:** If your Supabase password contains special characters (e.g. `/`), URL-encode them — `/` becomes `%2F`.

3. **Push the database schema**

   ```bash
   npx prisma db push
   ```

4. **Generate the Prisma client**

   ```bash
   npx prisma generate
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
pollcraft/
├── app/
│   ├── page.tsx                  # Homepage — Poll vs Survey CTA
│   ├── create/
│   │   ├── poll/page.tsx         # Poll creation form
│   │   └── survey/page.tsx       # Survey creation form
│   ├── p/[slug]/
│   │   └── page.tsx              # Public voting page
│   └── success/[slug]/
│       └── page.tsx              # Post-creation success + shareable link
├── actions/
│   ├── create-poll.ts            # createPoll + createSurvey server actions
│   └── vote.ts                   # submitVote server action
├── components/
│   ├── ui/                       # shadcn/ui components (do not edit manually)
│   ├── poll-form.tsx             # Poll creation client component
│   ├── survey-form.tsx           # Survey creation client component
│   ├── vote-form.tsx             # Voting UI using useActionState
│   ├── results-chart.tsx         # Recharts bar chart
│   └── copy-button.tsx           # Copy-to-clipboard button
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── db.ts                     # Server-only DB helpers (generateUniqueSlug, computeResults)
│   └── utils.ts                  # Client-safe utilities (cn, computeExpiresAt)
└── prisma/
    └── schema.prisma             # Data model
```

## Data Model

Five models: `Poll`, `Question`, `Option`, `Response`, `Answer`

- `Poll.type` is either `POLL` (single question) or `SURVEY` (multiple questions)
- `Poll.slug` is a unique 10-char nanoid used in URLs
- `Response` has a `@@unique([pollId, ipAddress])` constraint — one vote per IP per poll

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npx tsc --noEmit      # Type check

npx prisma db push    # Push schema changes to DB (dev)
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma studio     # Open Prisma Studio (DB browser)
```

## Architecture Notes

- All mutations use **Server Actions** — no API routes needed
- `headers()` and `cookies()` are called inside server actions for IP extraction and cookie dedup
- `lib/db.ts` is server-only (imports Prisma); `lib/utils.ts` is client-safe (no Node.js built-ins)
- `@prisma/adapter-pg` is required for Prisma 7 direct database connections
- Expiration is **lazy** — checked on every page load, no cron jobs
