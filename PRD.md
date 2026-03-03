# PollCraft — Product Requirements Document

**Version:** 1.1
**Date:** March 3, 2026
**Status:** Draft — revised after architecture research

---

## 1. Executive Summary

PollCraft is a lightweight, no-auth web application that lets anyone create and share **polls** (single-question votes) or **surveys** (multi-question forms) in seconds. Users arrive at the homepage, choose a format, fill in their questions and options, pick a duration, and receive a shareable link — no account required.

The core value proposition is frictionless simplicity: respondents click a link, answer, and instantly see the aggregated results. Creators get a shareable URL they can post anywhere. The system handles duplicate-vote prevention via IP address and automatically closes voting when the chosen duration expires.

**MVP Goal:** Ship a fully functional poll and survey builder where anyone can create, share, and vote on polls/surveys — with live result visualization — deployed on Vercel backed by Supabase PostgreSQL.

---

## 2. Mission

> **Empower anyone to gather opinions instantly, without signing up.**

### Core Principles

1. **Zero friction** — No accounts, no passwords. Create in under 60 seconds.
2. **Honest results** — IP-based deduplication ensures one meaningful vote per person.
3. **Immediate feedback** — Respondents see live results the moment they submit.
4. **Time-boxed by default** — Every poll/survey has a lifespan; nothing lives forever unintentionally.
5. **Mobile-first** — Works perfectly on any device, any screen size.

---

## 3. Target Users

### Primary Persona: The Quick Asker
- **Who:** Anyone needing a fast opinion — team leads, event organizers, educators, content creators
- **Tech comfort:** Moderate — comfortable sharing links, using web apps
- **Needs:** Create a question fast, share it with a group, see what people think
- **Pain points:** Survey tools require sign-up; social media polls are locked to platforms

### Secondary Persona: The Respondent
- **Who:** Anyone who receives a PollCraft link
- **Tech comfort:** Low to moderate — just needs to click and vote
- **Needs:** Simple, clear interface; instant confirmation their vote counted
- **Pain points:** Forms that are too long, unclear, or require login before voting

---

## 4. MVP Scope

### Core Functionality
- ✅ Create a **Poll** (single question, multiple choice, pick one answer)
- ✅ Create a **Survey** (multiple questions, each multiple choice, pick one answer per question)
- ✅ Set duration: **1 day, 1 week, or 1 month**
- ✅ Shareable public link for respondents (e.g., `/p/[slug]`)
- ✅ Vote on a poll/survey via public link
- ✅ View live results immediately after submitting
- ✅ Results page with bar chart visualization per question
- ✅ Cookie + IP duplicate vote prevention (one response per browser/IP)
- ✅ Automatic vote closure when duration expires (expired state shown)
- ✅ Responsive, mobile-first UI

### Technical
- ✅ Next.js App Router (React Server Components + Server Actions)
- ✅ Prisma ORM with Supabase PostgreSQL
- ✅ Tailwind CSS + shadcn/ui component library
- ✅ Deployed on Vercel

### Out of Scope (MVP)
- ❌ User authentication / accounts
- ❌ Creator management dashboard (edit, delete, analytics)
- ❌ Question types beyond multiple choice (text, rating scale, etc.)
- ❌ Multi-select answers (checkbox-style)
- ❌ Conditional/branching logic in surveys
- ❌ Email notifications or result exports
- ❌ Embedding polls in other sites (iframe/widget)
- ❌ Custom branding or theming per poll
- ❌ Anonymous respondent tracking beyond IP
- ❌ Admin panel

---

## 5. User Stories

### Creator Stories

**US-01: Create a Poll**
> As a creator, I want to create a single-question poll with multiple answer options and a duration, so that I can quickly gather opinions from my audience.

*Example: "What's the best pizza topping? [Pepperoni / Mushrooms / Pineapple] — closes in 1 week"*

**US-02: Create a Survey**
> As a creator, I want to add multiple questions to a survey, each with their own answer options, so that I can collect structured feedback on several topics at once.

*Example: "Post-event feedback survey with 4 questions about venue, speakers, content, and food."*

**US-03: Set a Duration**
> As a creator, I want to choose how long my poll/survey stays open (1 day, 1 week, 1 month), so that responses are collected within a relevant timeframe.

**US-04: Receive a Shareable Link**
> As a creator, I want to receive a unique shareable link immediately after creating my poll/survey, so that I can distribute it without any extra steps.

### Respondent Stories

**US-05: Vote on a Poll**
> As a respondent, I want to open a link and immediately see the question and answer choices, so that I can vote in under 10 seconds.

**US-06: Complete a Survey**
> As a respondent, I want to answer all questions in a survey in one flow, so that I can submit my feedback efficiently.

**US-07: See Results After Voting**
> As a respondent, I want to see the current vote counts/percentages right after I submit, so that I know how my answer compares to others.

**US-08: See Expired State**
> As a respondent, I want to see a clear message when a poll/survey has closed, so that I understand why I can't vote and can still view the final results.

### Technical Stories

**US-09: Prevent Duplicate Votes**
> As the system, I need to record the voter's IP address with each response and reject duplicate submissions, so that results reflect genuine unique opinions.

---

## 6. Core Architecture & Patterns

### Architecture Overview

```
Browser (Next.js App Router)
  ├── Server Components (data fetching, rendering)
  ├── Client Components (interactive forms, charts)  ["use client"]
  └── Server Actions (all mutations incl. vote submission)  ["use server"]
        │
        ├── headers() → reads x-forwarded-for for real client IP (Vercel-trusted)
        ├── cookies() → reads/sets voted_<slug> cookie for dedup
        └── returns results directly (no second round-trip needed)
              │
              ▼
        Prisma ORM
              │
              ▼
        Supabase PostgreSQL (hosted)
```

### Directory Structure

```
pollcraft/
├── app/
│   ├── page.tsx                  # Homepage — choose Poll or Survey
│   ├── create/
│   │   ├── poll/page.tsx         # Poll creation form
│   │   └── survey/page.tsx       # Survey creation form
│   ├── p/[slug]/
│   │   └── page.tsx              # Public voting page — force-dynamic
│   └── results/[slug]/
│       └── page.tsx              # Results-only page (post-vote / expired)
├── actions/
│   ├── create-poll.ts            # "use server" — create poll/survey, return slug
│   └── vote.ts                   # "use server" — submit vote, read IP + cookie, return results
├── components/
│   ├── ui/                       # shadcn/ui auto-generated (never edit manually)
│   ├── poll-form.tsx             # Poll creation client component
│   ├── survey-form.tsx           # Survey creation client component
│   ├── vote-form.tsx             # Voting interface — useActionState + useOptimistic
│   └── results-chart.tsx         # Bar chart results (Recharts)
├── lib/
│   ├── prisma.ts                 # Prisma client singleton (globalThis pattern)
│   └── utils.ts                  # cn(), nanoid slug gen, results computation
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── .env.local
```

### Key Design Patterns

- **Server Actions for everything** — `headers()` and `cookies()` are available inside Server Actions, so no API routes are needed. Vote submission reads IP and sets dedup cookie directly in the action.
- **IP extraction** — use `headers()` inside the Server Action; on Vercel, `x-forwarded-for` contains a single trusted client IP (no comma parsing needed). Fallback to `x-real-ip`.
- **Results returned from the action** — the `submitVote` Server Action returns computed results directly; no second network round-trip or `revalidatePath` needed for the results display.
- **`useActionState` + `useOptimistic`** — client voting form uses `useActionState` to capture returned results and `useOptimistic` for instant pre-server feedback.
- **`export const dynamic = 'force-dynamic'`** on `app/p/[slug]/page.tsx` — prevents Next.js from caching vote counts.
- **`await params`** — Next.js 15 route params are a Promise; always `await params` in page components.
- **URL slugs** via `nanoid(10)` — 10 chars, retry on unique constraint violation.

---

## 7. Features

### 7.1 Homepage
- Two prominent CTA cards: **"Create a Poll"** and **"Create a Survey"**
- Brief one-line description of each type
- Clean, minimal design

### 7.2 Poll Creation
- Input: Poll title/question (required)
- Dynamic answer options (minimum 2, up to 6; add/remove buttons)
- Duration selector: radio group — 1 Day / 1 Week / 1 Month
- Submit → generates slug → redirects to success page with shareable link + copy button

### 7.3 Survey Creation
- Input: Survey title (required)
- Add multiple questions dynamically (minimum 1)
  - Each question: question text + answer options (min 2, up to 6)
  - Add/remove questions; reorder not required for MVP
- Duration selector: same as poll
- Submit → same success flow

### 7.4 Voting Page (`/p/[slug]`)
- Rendered with `export const dynamic = 'force-dynamic'` — never cached
- On load, check in order:
  1. **Cookie** (`voted_<slug>`) present → skip form, show results directly
  2. **Expired** (`expiresAt < now`) → show "This poll is closed" + final results
  3. **Active** → render voting form
- Voting form:
  - Poll: single question, radio group of options → Submit
  - Survey: single-page form, one radio group per question → Submit all
- On submit (`submitVote` Server Action):
  - Reads `x-forwarded-for` header for IP
  - Checks `@@unique([pollId, ipAddress])` DB constraint — rejects if duplicate
  - Sets `voted_<slug>=1` cookie (HttpOnly, 1-year Max-Age)
  - Returns computed results directly — client swaps form for results chart
- If **already voted** (cookie miss but IP match in DB): shows "You've already voted" + results

### 7.5 Results Display
- Shown inline on voting page after submission (or always for expired/already-voted)
- Per question: horizontal bar chart showing option label + vote count + percentage
- Total response count displayed
- Uses shadcn/ui Progress component or a lightweight chart (Recharts)

### 7.6 Slug & Sharing
- Slugs: 10-character nanoid (e.g., `V1StGXR8_Z`) — `64^10 ≈ 1 quadrillion` combinations
- On slug collision (unique constraint violation), retry up to 3 times with a new slug
- Success screen after creation: full URL displayed, copy-to-clipboard button
- No QR code in MVP

### 7.7 Expiration Logic
- `expiresAt` stored in DB at creation time
- On page load: compare `now` vs `expiresAt` — if past, show closed state
- No background cron needed for MVP — lazy expiration on page load

---

## 8. Technology Stack

### Core

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui | latest |
| ORM | Prisma | 5.x |
| Database | Supabase PostgreSQL | latest |
| Deployment | Vercel | — |

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^5.0.0",
    "nanoid": "^5.0.0",
    "recharts": "^2.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0"
  }
}
```

### shadcn/ui Components Used
- `Button`, `Card`, `Input`, `Label`, `RadioGroup`, `Progress`, `Badge`, `Separator`

---

## 9. Data Model

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pgBouncer pooled URL (runtime)
  directUrl = env("DIRECT_URL")     // Direct URL (migrations only)
}

model Poll {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  type        PollType   // POLL | SURVEY
  expiresAt   DateTime
  createdAt   DateTime   @default(now())
  questions   Question[]
  responses   Response[]
}

model Question {
  id       String   @id @default(cuid())
  pollId   String
  poll     Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  text     String
  order    Int
  options  Option[]
  answers  Answer[]
}

model Option {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  text       String
  order      Int
  answers    Answer[]
}

model Response {
  id        String   @id @default(cuid())
  pollId    String
  poll      Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  ipAddress String
  createdAt DateTime @default(now())
  answers   Answer[]

  @@unique([pollId, ipAddress])
}

model Answer {
  id         String   @id @default(cuid())
  responseId String
  response   Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  optionId   String
  option     Option   @relation(fields: [optionId], references: [id])
}

enum PollType {
  POLL
  SURVEY
}
```

---

## 10. Security & Configuration

### Environment Variables

```env
# .env.local
# Supabase pooled URL (pgBouncer, port 6543) — used by the app at runtime
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20"

# Supabase direct URL (port 5432) — used by Prisma CLI for migrations only
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

**Critical:** `?pgbouncer=true` on `DATABASE_URL` is mandatory — without it Prisma uses prepared statements which pgBouncer's transaction mode does not support, causing runtime errors. Never add `?pgbouncer=true` to `DIRECT_URL`.

### Security Scope

**In Scope:**
- ✅ Cookie-based duplicate vote prevention (primary — per browser, `HttpOnly`, 1-year TTL)
- ✅ IP-based duplicate vote prevention (secondary — DB `@@unique([pollId, ipAddress])` constraint)
- ✅ Input validation on all form fields (max lengths, required fields)
- ✅ Parameterized queries via Prisma (SQL injection prevention)
- ✅ Slug unpredictability (nanoid(10) — not sequential IDs)
- ✅ Rate limiting via Vercel Edge (basic — no custom implementation needed for MVP)
- ✅ CSRF protection — built into Next.js Server Actions automatically

**Out of Scope:**
- ❌ Authentication / session management
- ❌ Content moderation
- ❌ Advanced rate limiting

### Deployment Notes
- `DATABASE_URL` must use the **pgBouncer pooled URL** (port 6543) with `?pgbouncer=true&connection_limit=1&pool_timeout=20`
- `DIRECT_URL` uses the **direct URL** (port 5432) — no pgBouncer params
- Run migrations with `prisma migrate dev --create-only` (generates SQL without requiring a shadow DB) then `prisma migrate deploy`
- Do not call `prisma.$disconnect()` in Server Actions or route handlers — Vercel manages cleanup
- Set `NODE_ENV=production` on Vercel (automatic)

---

## 11. Server Actions Reference

All mutations use **Next.js Server Actions** (`"use server"`). No API routes are needed — `headers()` and `cookies()` are accessible inside Server Actions, including for IP extraction on Vercel.

### `submitVote` — `actions/vote.ts`

Submit a response to a poll or survey.

**Input (via `useActionState` / FormData):**
```ts
{
  pollSlug: string
  answers: Array<{ questionId: string; optionId: string }>
}
```

**Return (success):**
```ts
{
  success: true,
  results: Array<{
    questionId: string
    questionText: string
    options: Array<{ optionId: string; text: string; votes: number; percentage: number }>
    totalVotes: number
  }>
}
```

**Return (already voted):**
```ts
{ success: false, error: "already_voted" }
```

**Return (expired):**
```ts
{ success: false, error: "expired" }
```

**Side effects:**
- Writes a `Response` + `Answer` records to the DB
- Sets `voted_<slug>=1` cookie (`HttpOnly`, `SameSite=Lax`, `Max-Age=31536000`)
- Reads `x-forwarded-for` header for IP (via `headers()`)

### `createPoll` / `createSurvey` — `actions/create-poll.ts`

Create a poll or survey and return the shareable slug.

**Return (success):**
```ts
{ success: true, slug: string }
```

**Return (error):**
```ts
{ success: false, error: string }
```

---

## 12. Success Criteria

### MVP Definition of Done

- ✅ Anyone can create a poll with 1 question and 2–6 options
- ✅ Anyone can create a survey with 2+ questions, each with 2–6 options
- ✅ Duration selection (1 day / 1 week / 1 month) works correctly
- ✅ Shareable link is generated and copyable
- ✅ Respondent can vote and immediately sees results
- ✅ Second vote from same browser (cookie) or same IP is rejected with clear message
- ✅ Expired polls show closed state but results remain visible
- ✅ Results displayed as bar charts with percentages
- ✅ App is live on Vercel and loads in < 2s on mobile

### Quality Indicators
- No TypeScript errors (`tsc --noEmit` passes)
- Prisma schema validates (`prisma validate` passes)
- All form inputs are validated with user-friendly error messages
- Works on iOS Safari and Chrome mobile

### User Experience Goals
- Poll creation: under 60 seconds from landing to shareable link
- Voting: under 10 seconds from link open to submitted
- Results are readable at a glance without explanations

---

## 13. Implementation Phases

### Phase 1: Foundation (Day 1)
**Goal:** Project scaffolding, database, and data model working end-to-end.

- ✅ Initialize Next.js 15 project with TypeScript + Tailwind
- ✅ Install and configure shadcn/ui
- ✅ Set up Prisma with Supabase PostgreSQL
- ✅ Define and migrate the full schema
- ✅ Create Prisma client singleton
- ✅ Build homepage (two CTAs: Poll / Survey)
- ✅ Deploy skeleton to Vercel with env vars

**Validation:** `prisma studio` shows correct tables; Vercel deployment builds successfully.

### Phase 2: Creation Flow (Day 2)
**Goal:** Creators can build and submit polls and surveys.

- ✅ Poll creation form (title, dynamic options, duration)
- ✅ Survey creation form (title, dynamic questions/options, duration)
- ✅ Server Actions to persist poll/survey to DB
- ✅ Slug generation with nanoid
- ✅ Success page with shareable link + copy button
- ✅ Form validation (required fields, min options)

**Validation:** Create a poll and survey; verify records in Supabase dashboard.

### Phase 3: Voting & Results (Day 3)
**Goal:** Respondents can vote and see live results.

- ✅ Dynamic voting page (`/p/[slug]`) with `force-dynamic`
- ✅ `submitVote` Server Action with cookie + IP deduplication
- ✅ Results returned directly from Server Action (no second round-trip)
- ✅ Results bar chart component (Recharts or Progress bars)
- ✅ `useActionState` + `useOptimistic` on vote form client component
- ✅ Already-voted state (cookie check on page load + IP check in action)
- ✅ Expired state (lazy expiration check on page load)

**Validation:** Vote on a poll; verify cookie is set; verify second vote is rejected; verify results display correctly.

### Phase 4: Polish & Deploy (Day 4)
**Goal:** Production-ready, fully responsive, deployed.

- ✅ Mobile responsiveness audit and fixes
- ✅ Error handling (invalid slug → 404, network errors → toast)
- ✅ Loading states on form submissions
- ✅ SEO meta tags (title, description) on voting/results pages
- ✅ Final Vercel deployment with production Supabase URL
- ✅ End-to-end test: create → share → vote → results

**Validation:** Full user journey works on mobile; Vercel deployment is stable.

---

## 14. Future Considerations

### Post-MVP Enhancements
- **Creator accounts** — Login to manage, edit, and delete your polls; view response analytics
- **More question types** — Rating scales, text responses, multi-select checkboxes
- **Survey logic** — Skip/conditional branching based on answers
- **Real-time results** — WebSocket or SSE for live vote count updates without reload
- **Result exports** — Download responses as CSV
- **QR code generation** — For in-person sharing
- **Custom slugs** — Creator chooses a memorable URL (e.g., `/p/team-lunch`)
- **Embed widget** — Iframe-embeddable poll for websites and blogs
- **Scheduled publishing** — Create now, open later

### Integration Opportunities
- Slack bot for posting polls directly in channels
- Webhook notifications when polls receive responses
- Zapier/Make integration for routing results to spreadsheets

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| IP deduplication bypassed (VPN, shared IP, corporate NAT) | High | Low | Cookie dedup is the primary layer and handles shared-IP scenarios; IP constraint is a secondary hard guard. Accept VPN bypass as known limitation. |
| Supabase connection exhaustion on Vercel serverless | Medium | High | `?pgbouncer=true&connection_limit=1&pool_timeout=20` on `DATABASE_URL`; singleton Prisma client via `globalThis` |
| Spam poll creation (abuse) | Medium | Medium | Add basic honeypot field; rate limit creation endpoint via Vercel Edge Config |
| Large surveys slow to load | Low | Medium | Paginate questions if count > 10; use React Suspense for streaming |
| Slug collisions | Very Low | High | nanoid(10) = `64^10 ≈ 1 quadrillion` combinations; catch unique constraint error and retry up to 3 times |

---

## 16. Appendix

### Key Dependencies

| Package | Purpose | Link |
|---------|---------|------|
| `next` | Framework | https://nextjs.org |
| `prisma` | ORM | https://www.prisma.io |
| `@supabase/supabase-js` | DB client (optional, Prisma sufficient) | https://supabase.com |
| `nanoid` | Slug generation | https://github.com/ai/nanoid |
| `recharts` | Charts for results | https://recharts.org |
| `shadcn/ui` | Component library | https://ui.shadcn.com |

### Related Documents
- Workshop README: `README.md`
- Implementation Plan: `PLAN.md` (to be created)
