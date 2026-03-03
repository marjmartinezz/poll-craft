# Feature: PollCraft MVP — Poll & Survey Builder

The following plan should be complete, but validate codebase patterns and task sanity before implementing. This is a greenfield project — there is no existing app code. Read PRD.md and CLAUDE.md before starting.

Pay special attention to: Next.js 15 async params, Server Action patterns, Prisma singleton, Supabase connection string format, and cookie/IP dedup logic.

---

## Feature Description

Build PollCraft from scratch — a no-auth web app where anyone can create polls (single-question) or surveys (multi-question), share via a unique link, and respondents vote and immediately see live results. Duplicate votes are prevented via cookie (primary) + IP unique constraint (secondary). Polls/surveys auto-expire after a creator-chosen duration (1 day / 1 week / 1 month).

## User Story

As anyone with a question,
I want to create a poll or survey in under 60 seconds and share a link,
So that I can quickly gather opinions without requiring respondents to sign up.

## Problem Statement

Existing polling tools require sign-up, are locked to specific platforms (Twitter/Instagram), or are overkill for simple opinion gathering. There is no frictionless, standalone, shareable poll/survey tool.

## Solution Statement

A minimal Next.js 15 app with no auth. Creator fills a form → gets a shareable link. Respondent opens link → votes → sees results instantly. Cookie + IP deduplication prevents casual abuse. Fixed durations keep the data fresh.

## Feature Metadata

**Feature Type**: New Capability (greenfield)
**Estimated Complexity**: Medium
**Primary Systems Affected**: All (new project)
**Dependencies**: Next.js 15, Prisma 5, Supabase PostgreSQL, nanoid, Recharts, shadcn/ui, Tailwind CSS 3

---

## CONTEXT REFERENCES

### Key Documents — READ BEFORE IMPLEMENTING

- `PRD.md` — Full product requirements, data model, architecture decisions, security scope
- `CLAUDE.md` — Code conventions, naming, patterns, validation commands
- `.claude/style-guide.md` — Color tokens, Tailwind semantic class rules

### New Files to Create

```
pollcraft/                          ← project root (create-next-app output)
├── prisma/
│   └── schema.prisma               ← Full data model (Poll, Question, Option, Response, Answer)
├── lib/
│   ├── prisma.ts                   ← Prisma client singleton (globalThis pattern)
│   └── utils.ts                    ← cn(), nanoid slug gen, computeResults()
├── actions/
│   ├── create-poll.ts              ← "use server" — createPoll + createSurvey
│   └── vote.ts                     ← "use server" — submitVote (IP + cookie + results)
├── components/
│   ├── poll-form.tsx               ← "use client" — poll creation form
│   ├── survey-form.tsx             ← "use client" — survey creation form
│   ├── vote-form.tsx               ← "use client" — voting UI (useActionState + useOptimistic)
│   └── results-chart.tsx           ← "use client" — Recharts bar chart
└── app/
    ├── layout.tsx                  ← Root layout
    ├── page.tsx                    ← Homepage (Poll vs Survey CTAs)
    ├── create/
    │   ├── poll/page.tsx           ← Poll creation page (Server Component wrapper)
    │   └── survey/page.tsx         ← Survey creation page (Server Component wrapper)
    ├── p/[slug]/
    │   └── page.tsx                ← Voting page (force-dynamic, await params)
    └── success/[slug]/
        └── page.tsx                ← Post-creation success page with shareable link
```

### Relevant Documentation — READ BEFORE IMPLEMENTING

- Next.js 15 App Router: https://nextjs.org/docs/app
  - Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
  - `useActionState`: https://react.dev/reference/react/useActionState
  - `useOptimistic`: https://react.dev/reference/react/useOptimistic
  - Dynamic rendering: https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering
- Prisma + Supabase: https://www.prisma.io/docs/guides/database/supabase
  - Connection pooling: requires `?pgbouncer=true&connection_limit=1&pool_timeout=20` on DATABASE_URL
  - directUrl required for migrations
- shadcn/ui: https://ui.shadcn.com/docs/components/

### Patterns to Follow

**Next.js 15 — params is a Promise:**
```ts
// Every dynamic page must await params
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

**Force dynamic on voting page:**
```ts
export const dynamic = 'force-dynamic'
```

**Prisma singleton (lib/prisma.ts):**
```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Server Action structure:**
```ts
'use server'
import { headers, cookies } from 'next/headers'

export async function submitVote(prevState: unknown, formData: FormData) {
  const headersList = await headers()
  const cookieStore = await cookies()
  const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown'
  // ...
  return { success: true, results: [...] }
}
```

**useActionState on client:**
```tsx
'use client'
import { useActionState } from 'react'
import { submitVote } from '@/actions/vote'

export function VoteForm({ ... }) {
  const [state, action, isPending] = useActionState(submitVote, null)
  // state.results → switch to results view
}
```

**Slug generation with retry:**
```ts
import { nanoid } from 'nanoid'

async function generateUniqueSlug(): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(10)
    const existing = await prisma.poll.findUnique({ where: { slug } })
    if (!existing) return slug
  }
  throw new Error('Failed to generate unique slug after 3 attempts')
}
```

**Cookie dedup (set after vote):**
```ts
cookieStore.set(`voted_${slug}`, '1', {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
})
```

**Results computation (COUNT query):**
```ts
const answers = await prisma.answer.groupBy({
  by: ['optionId'],
  where: { response: { pollId: poll.id } },
  _count: { optionId: true },
})
```

**cn() utility:**
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

**Tailwind color rules (from style-guide):**
- Never hardcode `text-gray-500` — use `text-muted-foreground`
- Never hardcode `bg-white` — use `bg-background`
- Never hardcode `border-gray-200` — use `border-border`
- Conditional classes always via `cn()`

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
Scaffold the project, configure Prisma with Supabase, run migrations, deploy skeleton to Vercel.

### Phase 2: Creation Flow
Build poll and survey creation forms with Server Actions, slug generation, and success page.

### Phase 3: Voting & Results
Build the voting page with cookie/IP dedup, Server Action vote submission, and results chart.

### Phase 4: Polish
Error handling, loading states, 404 pages, SEO meta tags, mobile audit, final deploy.

---

## STEP-BY-STEP TASKS

> Execute in order. Each task is atomic. Validate after each task before proceeding.

---

### TASK 1 — SCAFFOLD Next.js 15 project

```bash
npx create-next-app@latest pollcraft \
  --typescript \
  --tailwind \
  --app \
  --src-dir=no \
  --import-alias="@/*" \
  --no-turbopack
cd pollcraft
```

- **REMOVE**: Delete `app/page.tsx` default content (keep file)
- **REMOVE**: Delete placeholder content from `app/globals.css` (keep Tailwind directives)
- **VALIDATE**: `npm run dev` — app starts on localhost:3000

---

### TASK 2 — INSTALL dependencies

```bash
npm install nanoid recharts
npm install prisma @prisma/client --save-dev
npm install @prisma/client --save
```

- **GOTCHA**: `nanoid` v5+ is ESM-only. Ensure `package.json` does NOT have `"type": "commonjs"`. Next.js handles ESM fine.
- **VALIDATE**: `npm run build` — no missing dependency errors

---

### TASK 3 — INSTALL shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

Then add required components:
```bash
npx shadcn@latest add button card input label radio-group progress badge separator toast
```

- **GOTCHA**: Never manually edit files in `components/ui/`. Always use `npx shadcn add`.
- **VALIDATE**: `components/ui/button.tsx` exists

---

### TASK 4 — CONFIGURE Prisma + Supabase

```bash
npx prisma init
```

- **CREATE** `prisma/schema.prisma` with full schema (see below)
- **CREATE** `.env.local` with both Supabase URLs

**`prisma/schema.prisma`:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Poll {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  type        PollType
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

**`.env.local`:**
```env
# Supabase pooled URL — runtime queries (port 6543, pgBouncer)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20"

# Supabase direct URL — migrations only (port 5432, no pgBouncer)
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

- **GOTCHA**: `?pgbouncer=true` MUST be on `DATABASE_URL`. Without it, Prisma uses prepared statements which pgBouncer transaction mode rejects with "prepared statement already exists" error.
- **GOTCHA**: Do NOT add `?pgbouncer=true` to `DIRECT_URL`. Migrations require session-level features.
- **VALIDATE**: `npx prisma validate` — schema is valid

---

---

## ⏸️ PAUSE — USER ACTION REQUIRED BEFORE CONTINUING

**Stop here. Do not proceed to Task 5 until the user confirms their `.env.local` is filled in.**

The agent has created `.env.local` with placeholder values. The user must:

1. Go to [https://supabase.com](https://supabase.com) and create a new project (or use an existing one)
2. In the Supabase dashboard → **Settings → Database → Connection string**:
   - Copy the **Transaction pooler** URL (port 6543) → paste as `DATABASE_URL`, appending `?pgbouncer=true&connection_limit=1&pool_timeout=20`
   - Copy the **Session pooler** or **Direct connection** URL (port 5432) → paste as `DIRECT_URL`
3. Save `.env.local`
4. Also set `NEXT_PUBLIC_BASE_URL=http://localhost:3000` in `.env.local`
5. Confirm to the agent: **"The .env is ready, continue"**

Once the user confirms, proceed to Task 5.

---

### TASK 5 — RUN database migration

```bash
npx prisma migrate dev --create-only --name init
# Review generated SQL in prisma/migrations/
npx prisma migrate deploy
npx prisma generate
```

- **GOTCHA**: `--create-only` skips shadow database creation (which Supabase doesn't support on free tier)
- **VALIDATE**: `npx prisma studio` — all 5 tables visible (Poll, Question, Option, Response, Answer)

---

### TASK 6 — CREATE `lib/prisma.ts` (singleton)

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- **PATTERN**: globalThis persists across hot reloads in dev, preventing connection pool exhaustion
- **GOTCHA**: Never call `prisma.$disconnect()` in route handlers or Server Actions
- **VALIDATE**: `npx tsc --noEmit` — no errors

---

### TASK 7 — CREATE `lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateUniqueSlug(): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(10)
    const existing = await prisma.poll.findUnique({ where: { slug } })
    if (!existing) return slug
  }
  throw new Error('Failed to generate unique slug after 3 attempts')
}

export function computeExpiresAt(duration: '1d' | '1w' | '1m'): Date {
  const now = new Date()
  if (duration === '1d') return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (duration === '1w') return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 1 month
}

export type QuestionResult = {
  questionId: string
  questionText: string
  options: { optionId: string; text: string; votes: number; percentage: number }[]
  totalVotes: number
}

export async function computeResults(pollId: string): Promise<QuestionResult[]> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!poll) return []

  const answerCounts = await prisma.answer.groupBy({
    by: ['optionId'],
    where: { response: { pollId } },
    _count: { optionId: true },
  })

  const countMap = new Map(answerCounts.map((a) => [a.optionId, a._count.optionId]))

  return poll.questions.map((q) => {
    const totalVotes = q.options.reduce((sum, o) => sum + (countMap.get(o.id) ?? 0), 0)
    return {
      questionId: q.id,
      questionText: q.text,
      totalVotes,
      options: q.options.map((o) => {
        const votes = countMap.get(o.id) ?? 0
        return {
          optionId: o.id,
          text: o.text,
          votes,
          percentage: totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100),
        }
      }),
    }
  })
}
```

- **VALIDATE**: `npx tsc --noEmit` — no errors

---

### TASK 8 — CREATE `actions/create-poll.ts`

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { generateUniqueSlug, computeExpiresAt } from '@/lib/utils'
import { PollType } from '@prisma/client'
import { redirect } from 'next/navigation'

type OptionInput = { text: string }
type QuestionInput = { text: string; options: OptionInput[] }

export async function createPoll(prevState: unknown, formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const duration = formData.get('duration') as '1d' | '1w' | '1m'
  const optionTexts = formData.getAll('option') as string[]

  if (!title) return { error: 'Poll question is required' }
  if (optionTexts.filter(Boolean).length < 2) return { error: 'At least 2 options are required' }

  const slug = await generateUniqueSlug()
  const expiresAt = computeExpiresAt(duration ?? '1w')

  await prisma.poll.create({
    data: {
      slug,
      title,
      type: PollType.POLL,
      expiresAt,
      questions: {
        create: {
          text: title,
          order: 0,
          options: {
            create: optionTexts
              .filter(Boolean)
              .map((text, i) => ({ text, order: i })),
          },
        },
      },
    },
  })

  redirect(`/success/${slug}`)
}

export async function createSurvey(prevState: unknown, formData: FormData) {
  const title = (formData.get('title') as string)?.trim()
  const duration = formData.get('duration') as '1d' | '1w' | '1m'

  if (!title) return { error: 'Survey title is required' }

  // Parse questions from formData: question[0][text], question[0][option][0], etc.
  const questions: QuestionInput[] = []
  let qi = 0
  while (formData.has(`question[${qi}][text]`)) {
    const qText = (formData.get(`question[${qi}][text]`) as string)?.trim()
    const options: OptionInput[] = []
    let oi = 0
    while (formData.has(`question[${qi}][option][${oi}]`)) {
      const oText = (formData.get(`question[${qi}][option][${oi}]`) as string)?.trim()
      if (oText) options.push({ text: oText })
      oi++
    }
    if (qText && options.length >= 2) questions.push({ text: qText, options })
    qi++
  }

  if (questions.length < 1) return { error: 'At least 1 question with 2 options is required' }

  const slug = await generateUniqueSlug()
  const expiresAt = computeExpiresAt(duration ?? '1w')

  await prisma.poll.create({
    data: {
      slug,
      title,
      type: PollType.SURVEY,
      expiresAt,
      questions: {
        create: questions.map((q, qi) => ({
          text: q.text,
          order: qi,
          options: { create: q.options.map((o, oi) => ({ text: o.text, order: oi })) },
        })),
      },
    },
  })

  redirect(`/success/${slug}`)
}
```

- **GOTCHA**: `redirect()` throws internally in Next.js — do not wrap it in try/catch
- **VALIDATE**: `npx tsc --noEmit` — no errors

---

### TASK 9 — CREATE `actions/vote.ts`

```ts
'use server'

import { headers, cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { computeResults, QuestionResult } from '@/lib/utils'

type VoteState =
  | null
  | { success: true; results: QuestionResult[] }
  | { success: false; error: 'already_voted' | 'expired' | 'not_found' | 'invalid' }

export async function submitVote(prevState: VoteState, formData: FormData): Promise<VoteState> {
  const pollSlug = formData.get('pollSlug') as string
  const headersList = await headers()
  const cookieStore = await cookies()

  // Cookie check — primary dedup
  const cookieKey = `voted_${pollSlug}`
  if (cookieStore.get(cookieKey)) {
    const poll = await prisma.poll.findUnique({ where: { slug: pollSlug } })
    if (!poll) return { success: false, error: 'not_found' }
    return { success: false, error: 'already_voted' }
  }

  const poll = await prisma.poll.findUnique({
    where: { slug: pollSlug },
    include: { questions: { include: { options: true } } },
  })
  if (!poll) return { success: false, error: 'not_found' }

  // Expiration check
  if (new Date() > poll.expiresAt) return { success: false, error: 'expired' }

  // Build answers from formData: answer[questionId] = optionId
  const answers: { questionId: string; optionId: string }[] = []
  for (const q of poll.questions) {
    const optionId = formData.get(`answer[${q.id}]`) as string
    if (!optionId) return { success: false, error: 'invalid' }
    answers.push({ questionId: q.id, optionId })
  }

  // IP extraction
  const ip =
    headersList.get('x-vercel-forwarded-for') ??
    headersList.get('x-forwarded-for') ??
    headersList.get('x-real-ip') ??
    'unknown'

  try {
    await prisma.response.create({
      data: {
        pollId: poll.id,
        ipAddress: ip,
        answers: {
          create: answers.map(({ questionId, optionId }) => ({ questionId, optionId })),
        },
      },
    })
  } catch (e: unknown) {
    // Unique constraint violation = already voted (IP)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { success: false, error: 'already_voted' }
    }
    throw e
  }

  // Set voted cookie
  cookieStore.set(cookieKey, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const results = await computeResults(poll.id)
  return { success: true, results }
}
```

- **GOTCHA**: Catch the Prisma unique constraint error by checking `e.message.includes('Unique constraint')` — this handles the race condition where two requests slip through the cookie check simultaneously
- **GOTCHA**: `await headers()` and `await cookies()` — both are async in Next.js 15
- **VALIDATE**: `npx tsc --noEmit` — no errors

---

### TASK 10 — CREATE `app/layout.tsx`

Standard root layout with Toaster for notifications. Import `globals.css`. Set font to `Inter` via `next/font`.

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PollCraft — Create polls & surveys instantly',
  description: 'Create and share polls or surveys in seconds. No sign-up required.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- **VALIDATE**: `npm run dev` — no layout errors

---

### TASK 11 — CREATE `app/page.tsx` (Homepage)

Server Component. Two `<Card>` components side by side linking to `/create/poll` and `/create/survey`.

- **Poll card**: "Create a Poll" — "One question. Instant answers." → `href="/create/poll"`
- **Survey card**: "Create a Survey" — "Multiple questions. Deep insights." → `href="/create/survey"`
- Use `bg-background`, `text-foreground`, `border-border` — no hardcoded colors
- Centered layout, max-width container, responsive (stack on mobile, side-by-side on md+)
- **VALIDATE**: Homepage renders at localhost:3000 with both cards visible

---

### TASK 12 — CREATE `components/poll-form.tsx` (Client Component)

`"use client"` — interactive form for poll creation.

**Fields:**
- `name="title"` — text input, poll question (required, max 200 chars)
- Dynamic options list: minimum 2, maximum 6
  - Each option: `name="option"` text input
  - "Add option" button (disabled if 6 options)
  - "×" remove button on each option (disabled if only 2 remain)
- Duration: `name="duration"` RadioGroup with values `1d`, `1w`, `1m` (default: `1w`)
- Submit button — disabled + loading spinner when `isPending`

**State:**
- `options: string[]` — useState, initialized with `['', '']`
- `useActionState(createPoll, null)` for form state and pending

**Error display:** Show `state.error` in red below the form if present.

- **IMPORTS**: `useActionState` from `'react'`, `createPoll` from `'@/actions/create-poll'`
- **VALIDATE**: Poll form renders, options can be added/removed, form is submittable

---

### TASK 13 — CREATE `components/survey-form.tsx` (Client Component)

`"use client"` — similar to poll-form but supports multiple questions.

**Fields:**
- `name="title"` — survey title input
- Dynamic questions list (minimum 1, maximum 10):
  - Each question: `name="question[{i}][text]"` input
  - Each question has its own options list: `name="question[{i}][option][{j}]"` (min 2, max 6)
  - "Add question" button at bottom
  - "Remove question" button on each question card (disabled if only 1)
- Duration: same RadioGroup as poll form
- Submit button with loading state

- **IMPORTS**: `useActionState` from `'react'`, `createSurvey` from `'@/actions/create-poll'`
- **VALIDATE**: Survey form renders, questions/options can be added/removed

---

### TASK 14 — CREATE `app/create/poll/page.tsx` and `app/create/survey/page.tsx`

Both are Server Components that simply render the respective client form.

```tsx
// app/create/poll/page.tsx
import { PollForm } from '@/components/poll-form'

export const metadata = { title: 'Create a Poll — PollCraft' }

export default function CreatePollPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Create a Poll</h1>
      <PollForm />
    </div>
  )
}
```

Mirror for `survey/page.tsx` with `SurveyForm`.

- **VALIDATE**: Navigate to `/create/poll` and `/create/survey` — both render the forms

---

### TASK 15 — CREATE `app/success/[slug]/page.tsx`

Server Component. Fetches the poll by slug to confirm it exists, displays the shareable link with a copy button.

```tsx
export default async function SuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) notFound()

  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/p/${slug}`

  return (
    <div className="container mx-auto max-w-lg px-4 py-12 text-center">
      <h1>Your {poll.type === 'POLL' ? 'Poll' : 'Survey'} is Live!</h1>
      <p className="text-muted-foreground">Share this link:</p>
      <div className="flex gap-2 mt-4">
        <input readOnly value={url} className="flex-1 border-border" />
        <CopyButton url={url} />  {/* small "use client" component */}
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        Closes {poll.expiresAt.toLocaleDateString()}
      </p>
    </div>
  )
}
```

Create `components/copy-button.tsx` as a small `"use client"` component using `navigator.clipboard.writeText`.

Add `NEXT_PUBLIC_BASE_URL` to `.env.local`: `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

- **GOTCHA**: Use `await params` — Next.js 15 requirement
- **VALIDATE**: Create a poll end-to-end → success page shows correct URL

---

### TASK 16 — CREATE `components/results-chart.tsx` (Client Component)

`"use client"` — Recharts bar chart displaying results per question.

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { QuestionResult } from '@/lib/utils'

export function ResultsChart({ results }: { results: QuestionResult[] }) {
  return (
    <div className="space-y-8">
      {results.map((q) => (
        <div key={q.questionId}>
          <h3 className="font-semibold mb-2">{q.questionText}</h3>
          <p className="text-sm text-muted-foreground mb-4">{q.totalVotes} responses</p>
          <ResponsiveContainer width="100%" height={q.options.length * 48}>
            <BarChart data={q.options} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="text" width={120} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
```

- **PATTERN**: Use `hsl(var(--primary))` for chart fill — never hardcode hex colors
- **VALIDATE**: `npx tsc --noEmit` — Recharts types resolve

---

### TASK 17 — CREATE `components/vote-form.tsx` (Client Component)

`"use client"` — core voting UI with `useActionState` + `useOptimistic`.

```tsx
'use client'
import { useActionState, useOptimistic, startTransition } from 'react'
import { submitVote } from '@/actions/vote'
import { ResultsChart } from './results-chart'
import type { QuestionResult } from '@/lib/utils'

type Props = {
  poll: { slug: string; title: string; type: string }
  questions: Array<{ id: string; text: string; options: Array<{ id: string; text: string }> }>
  initialResults?: QuestionResult[] // present if already voted or expired
  alreadyVoted?: boolean
  expired?: boolean
}

export function VoteForm({ poll, questions, initialResults, alreadyVoted, expired }: Props) {
  const [state, action, isPending] = useActionState(submitVote, null)
  const showResults = alreadyVoted || expired || state?.success

  // Show results if already voted / expired / submitted
  if (showResults) {
    const results = state?.success ? state.results : initialResults ?? []
    return (
      <div>
        {alreadyVoted && <p className="text-muted-foreground mb-4">You've already voted.</p>}
        {expired && <p className="text-muted-foreground mb-4">This poll is closed.</p>}
        {state?.success && <p className="text-primary mb-4 font-medium">Vote recorded!</p>}
        <ResultsChart results={results} />
      </div>
    )
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="pollSlug" value={poll.slug} />
      {questions.map((q) => (
        <div key={q.id}>
          <p className="font-medium mb-3">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((o) => (
              <label key={o.id} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name={`answer[${q.id}]`} value={o.id} required />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      {state?.error === 'already_voted' && (
        <p className="text-destructive text-sm">You've already voted on this poll.</p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit Vote'}
      </button>
    </form>
  )
}
```

- **GOTCHA**: `useActionState` requires `'react'` import, not `'react-dom'`
- **VALIDATE**: Vote form renders, radio buttons selectable, submit works end-to-end

---

### TASK 18 — CREATE `app/p/[slug]/page.tsx` (Voting Page)

Server Component. Fetch poll data, check cookie, check expiry, pass state to `VoteForm`.

```tsx
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { computeResults } from '@/lib/utils'
import { VoteForm } from '@/components/vote-form'

export const dynamic = 'force-dynamic'

export default async function VotingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!poll) notFound()

  const alreadyVoted = !!cookieStore.get(`voted_${slug}`)
  const expired = new Date() > poll.expiresAt

  // Pre-compute results if needed for display
  const initialResults = alreadyVoted || expired ? await computeResults(poll.id) : undefined

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">{poll.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {expired ? 'Closed' : `Closes ${poll.expiresAt.toLocaleDateString()}`}
      </p>
      <VoteForm
        poll={{ slug: poll.slug, title: poll.title, type: poll.type }}
        questions={poll.questions}
        initialResults={initialResults}
        alreadyVoted={alreadyVoted}
        expired={expired}
      />
    </div>
  )
}
```

- **GOTCHA**: `await params` and `await cookies()` — both async in Next.js 15
- **GOTCHA**: `export const dynamic = 'force-dynamic'` prevents caching vote counts
- **VALIDATE**: Navigate to `/p/[slug]` — voting form renders; submit vote; results appear; second visit shows results directly

---

### TASK 19 — CREATE `app/not-found.tsx`

Simple 404 page for invalid slugs.

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Poll not found or the link is invalid.</p>
      <Link href="/" className="text-primary underline">Create a new poll</Link>
    </div>
  )
}
```

- **VALIDATE**: Navigate to `/p/invalid-slug` — 404 page renders

---

### TASK 20 — DEPLOY to Vercel

```bash
git init && git add . && git commit -m "feat: initial PollCraft MVP"
```

1. Push to GitHub
2. Connect repo to Vercel
3. Add env vars in Vercel dashboard:
   - `DATABASE_URL` — Supabase pooled URL with all params
   - `DIRECT_URL` — Supabase direct URL
   - `NEXT_PUBLIC_BASE_URL` — your Vercel deployment URL (e.g., `https://pollcraft.vercel.app`)
4. Deploy

- **VALIDATE**: Production build succeeds; homepage loads on Vercel URL

---

### TASK 21 — UPDATE `CLAUDE.md` to match final architecture

The CLAUDE.md directory structure and architecture section were generated before the final architecture decisions. Update:
- Remove `app/api/vote/route.ts` reference → replace with `actions/vote.ts`
- Remove `lib/ip.ts` reference → IP is read inside the Server Action via `headers()`
- Update architecture diagram to match PRD v1.1

- **VALIDATE**: CLAUDE.md accurately reflects the built codebase

---

## TESTING STRATEGY

### Manual End-to-End (Primary for MVP)

Since there is no test framework configured, validate manually with the following flows:

### Flow 1: Create Poll
1. Go to `/` → click "Create a Poll"
2. Enter question, 3 options, select "1 week"
3. Submit → redirected to `/success/[slug]`
4. Copy the shareable link

### Flow 2: Vote on Poll
1. Open the shareable link in a browser
2. Select an option, submit
3. Results chart appears immediately
4. Refresh the page → results still shown (cookie present)
5. Open in incognito → vote form shows (no cookie)
6. Submit same vote in incognito → "already voted" (IP constraint)

### Flow 3: Create Survey
1. Go to `/create/survey`
2. Add title, 3 questions each with 3 options
3. Submit → success page with link

### Flow 4: Vote on Survey
1. Open survey link
2. Answer all questions, submit
3. Results per question shown
4. Repeat vote → rejected

### Flow 5: Expiration
1. Create a poll (manually set `expiresAt` to past via Prisma Studio)
2. Open the poll link → "This poll is closed" + results shown

### Edge Cases to Test
- Submit poll form with only 1 option → validation error shown
- Submit survey with no questions → validation error shown
- Navigate to `/p/nonexistent` → 404 page
- Vote with all questions answered in a multi-question survey
- Add/remove options in poll form (min 2, max 6 enforced)

---

## VALIDATION COMMANDS

### Level 1: Type Check & Lint
```bash
npx tsc --noEmit
npm run lint
```

### Level 2: Schema
```bash
npx prisma validate
npx prisma generate
```

### Level 3: Build
```bash
npm run build
```
> Zero errors required. All pages must build successfully.

### Level 4: Manual Flows
Run through all 5 flows + edge cases listed in Testing Strategy above.

### Level 5: Vercel Deploy Check
- Production build succeeds in Vercel dashboard
- All 5 manual flows work on the production URL
- No console errors in browser DevTools

---

## ⏸️ PAUSE — USER ACTION REQUIRED BEFORE BROWSER VALIDATION

**Stop here. Do not run the agent-browser skill until the user confirms the app is running.**

The user must:

1. Run `npm run dev` locally (or confirm the Vercel deployment URL is live)
2. Confirm the base URL to test against (e.g., `http://localhost:3000` or `https://pollcraft.vercel.app`)
3. Confirm to the agent: **"App is running at [URL], run the browser validation"**

Once the user confirms the URL, proceed to Level 6.

---

### Level 6: Browser Automation (agent-browser skill)

After deploying, use the **agent-browser** skill to automate and screenshot all critical user journeys:

```
Run /agent-browser to:
1. Navigate to the homepage — screenshot both CTA cards
2. Create a poll end-to-end — fill form, submit, screenshot success page with link
3. Open the poll voting link — screenshot vote form
4. Select an option and submit — screenshot results chart
5. Reload the page — screenshot that results are shown (not the vote form)
6. Navigate to /p/invalid-slug — screenshot 404 page
```

This validates visual correctness and real browser behavior beyond what TypeScript checks can catch.

---

## ACCEPTANCE CRITERIA

- [ ] Homepage renders with Poll and Survey CTAs
- [ ] Poll creation form: question + dynamic options (2-6) + duration → success page with link
- [ ] Survey creation form: title + dynamic questions/options + duration → success page with link
- [ ] Voting page loads poll/survey data and renders vote form
- [ ] Vote submission records response and returns results in one round-trip
- [ ] Results chart displays per-question vote counts and percentages
- [ ] Cookie is set after voting; revisiting page shows results, not form
- [ ] Second vote from same IP (different browser) is rejected with DB unique constraint
- [ ] Expired polls show "closed" state with final results
- [ ] Invalid slug returns 404 page
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] App is live on Vercel

---

## COMPLETION CHECKLIST

- [ ] All 21 tasks completed in order
- [ ] Each task validated before moving to next
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Production build passes (`npm run build`)
- [ ] All 5 manual flows verified end-to-end
- [ ] All edge cases tested
- [ ] Deployed and live on Vercel
- [ ] CLAUDE.md updated to reflect final architecture

---

## NOTES

### Architecture Decisions
- **No API routes** — `headers()` and `cookies()` work inside Server Actions in Next.js 15, so no `/api/vote` route is needed. This simplifies the codebase.
- **Results returned from action** — `submitVote` returns computed results directly, avoiding a second network round-trip or `revalidatePath` complexity.
- **Cookie primary, IP secondary** — Cookie handles the common case (same person, household NAT). IP unique constraint is the hard DB-level guard for race conditions and cross-browser abuse.
- **Lazy expiration** — `expiresAt` compared on every page load. No cron job needed for MVP.
- **COUNT queries** — `prisma.answer.groupBy` on every results load. Fast enough at MVP scale; denormalized vote counts are not worth the consistency complexity.

### Known Limitations
- IP dedup can be bypassed by VPN — accepted as known limitation for MVP
- No creator management — polls are create-and-forget
- No real-time updates — results update only on page load or vote submit

### Confidence Score
**9/10** — All architecture decisions are research-backed, patterns are well-defined, gotchas are documented. The main risk is Supabase connection string configuration (easy to misconfigure); the task notes are explicit about this.
