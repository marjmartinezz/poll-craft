# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**PollCraft** is a no-auth web application for creating and sharing polls and surveys. A **poll** is a single-question vote; a **survey** is a multi-question form. Anyone can create either without an account, set a duration (1 day / 1 week / 1 month), and share via a unique link. Respondents vote and immediately see live results. Duplicate votes are prevented by IP address. Built with Next.js 15 App Router, Prisma, Supabase PostgreSQL, and deployed on Vercel.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | Full-stack React framework — Server Components, Server Actions, API routes |
| TypeScript 5 | Type safety across the entire codebase |
| Tailwind CSS 3 | Utility-first styling |
| shadcn/ui | Pre-built accessible component library (built on Radix UI) |
| Prisma 5 | ORM for database access and migrations |
| Supabase PostgreSQL | Hosted PostgreSQL database |
| nanoid | Short random slug generation |
| Recharts | Bar chart visualization for poll results |
| Vercel | Deployment platform |

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check (run before committing)
npx tsc --noEmit

# Lint
npm run lint

# Database: push schema changes (dev only)
npx prisma db push

# Database: run migrations (production)
npx prisma migrate dev --name <migration-name>

# Database: open Prisma Studio
npx prisma studio

# Database: generate Prisma client after schema changes
npx prisma generate
```

---

## Project Structure

```
pollcraft/
├── app/
│   ├── page.tsx                  # Homepage — Poll vs Survey CTA
│   ├── not-found.tsx             # Global 404 page
│   ├── create/
│   │   ├── poll/page.tsx         # Poll creation form
│   │   └── survey/page.tsx       # Survey creation form
│   ├── p/[slug]/
│   │   └── page.tsx              # Public voting page — force-dynamic, await params
│   └── success/[slug]/
│       └── page.tsx              # Post-creation success page with shareable link
├── actions/
│   ├── create-poll.ts            # "use server" — createPoll + createSurvey
│   └── vote.ts                   # "use server" — submitVote (reads IP + cookie via headers()/cookies())
├── components/
│   ├── ui/                       # shadcn/ui auto-generated (never edit manually)
│   ├── poll-form.tsx             # Poll creation client component
│   ├── survey-form.tsx           # Survey creation client component
│   ├── vote-form.tsx             # Voting UI — useActionState
│   ├── results-chart.tsx         # Bar chart results (Recharts)
│   └── copy-button.tsx           # Client copy-to-clipboard button
├── lib/
│   ├── prisma.ts                 # Prisma client singleton (globalThis pattern)
│   ├── utils.ts                  # cn(), generateUniqueSlug(), computeExpiresAt(), computeResults()
│   └── generated/prisma/         # Auto-generated Prisma client (never edit manually)
├── prisma/
│   ├── schema.prisma             # Source of truth for data model
│   └── migrations/               # Never edit migration files manually
├── prisma.config.ts              # Prisma 6 config (DATABASE_URL, migration path)
├── .env.local                    # Local env vars (not committed)
└── CLAUDE.md                     # This file
```

---

## Architecture

**Pattern:** Next.js App Router with Server Components for data fetching and Server Actions for all mutations (including vote submission).

```
Browser
  ├── Server Components  → fetch data from Prisma, render HTML
  ├── Client Components  → interactive forms, charts ("use client")
  └── Server Actions ("use server") → all mutations
        ├── headers() → real client IP (x-forwarded-for, Vercel-trusted)
        ├── cookies() → voted_<slug> cookie for dedup
        └── returns results directly (no second round-trip)
              │
              ▼
        Prisma ORM (lib/generated/prisma)
              │
              ▼
        Supabase PostgreSQL
```

- **Data fetching**: Always in Server Components using the Prisma singleton from `lib/prisma.ts`
- **Mutations**: Server Actions only — `headers()` and `cookies()` work inside Server Actions in Next.js, no API routes needed
- **Expiration**: Lazy — checked on page load by comparing `expiresAt` to `Date.now()`. No cron jobs.
- **Results**: Computed on the server by counting `Answer` records grouped by `optionId`

---

## Data Model

Five models: `Poll`, `Question`, `Option`, `Response`, `Answer`

- `Poll` has a `type` enum: `POLL` (single question) or `SURVEY` (multiple questions)
- `Poll.slug` is the unique 8-char nanoid used in URLs
- `Poll.expiresAt` determines when voting closes
- `Response` has a `@@unique([pollId, ipAddress])` constraint — one response per IP per poll
- `Answer` links a `Response` to the chosen `Option` for each `Question`

See `prisma/schema.prisma` for the full schema.

---

## Code Patterns

### Naming Conventions
- Files: `kebab-case.tsx` for components and pages
- Components: `PascalCase` for the exported React component
- Functions/variables: `camelCase`
- Database models/enums: `PascalCase` (Prisma convention)
- Environment variables: `SCREAMING_SNAKE_CASE`

### File Organization
- One component per file; filename matches the component name in kebab-case
- Page files are `page.tsx`; layout files are `layout.tsx` (Next.js convention)
- Shared logic goes in `lib/`; never duplicate Prisma client instantiation
- shadcn/ui components live in `components/ui/` — add via `npx shadcn add <component>`, never edit manually

### Server vs Client Components
- Default to Server Components (no `"use client"` directive)
- Only add `"use client"` when the component needs: `useState`, `useEffect`, event handlers, or browser APIs
- Forms that need interactivity (dynamic fields, real-time validation) are Client Components

### Server Actions
- Define with `"use server"` directive at the top of the function or file
- Use for poll/survey creation form submissions
- Return typed results: `{ success: true, slug: string } | { error: string }`

### Error Handling
- API routes return structured JSON errors: `{ error: string, message: string }`
- Use HTTP status codes: 409 for duplicate vote, 410 for expired, 404 for not found
- Form validation errors are returned from Server Actions and displayed inline
- Never throw unhandled errors in API routes — always return a JSON response

### Styling
- Use Tailwind utility classes directly in JSX
- Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional class merging
- Follow shadcn/ui patterns for component variants

---

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Data model — source of truth for all DB changes |
| `lib/prisma.ts` | Prisma client singleton — import from here everywhere |
| `actions/vote.ts` | `submitVote` Server Action — IP extraction, cookie dedup, returns results |
| `actions/create-poll.ts` | `createPoll` / `createSurvey` Server Actions |
| `app/p/[slug]/page.tsx` | Main public-facing page — voting and results |
| `.env.local` | `DATABASE_URL` and `DIRECT_URL` for Supabase |

---

## Environment Variables

```env
# .env.local (never commit this file)
DATABASE_URL="postgresql://..."    # Supabase pooled connection (for app queries)
DIRECT_URL="postgresql://..."      # Supabase direct connection (for migrations only)
```

In `prisma/schema.prisma`, configure both:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## Validation Checklist

Run these before committing:

```bash
npx tsc --noEmit        # No TypeScript errors
npm run lint            # No ESLint errors
npx prisma validate     # Schema is valid
npm run build           # Production build succeeds
```

---

## On-Demand Context

| Topic | File |
|-------|------|
| Full product requirements | `PRD.md` |
| Workshop context & commands | `README.md` |
| Color tokens & styling rules | `.claude/style-guide.md` |

---

## Notes

- **Supabase connection pooling**: Always use the pooled `DATABASE_URL` for app queries on Vercel serverless. Use `DIRECT_URL` only for `prisma migrate`.
- **IP deduplication**: The `@@unique([pollId, ipAddress])` on `Response` enforces one vote per IP at the DB level — rely on this constraint, don't only check in application code.
- **nanoid slugs**: Generate with `nanoid(10)` via `generateUniqueSlug()` in `lib/utils.ts`. Retries up to 3 times on unique constraint violation.
- **shadcn/ui**: Always add new components via `npx shadcn add <name>`. Never manually edit files in `components/ui/`.
- **No auth**: There is no authentication in this app. Do not add auth middleware or session logic unless explicitly asked.
- **Expiration is lazy**: Do not add cron jobs or background workers. Check `expiresAt` on every page load.
