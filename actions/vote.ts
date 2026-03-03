'use server'

import { headers, cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { computeResults, type QuestionResult } from '@/lib/db'

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

  // Build answers from formData
  const answers: { questionId: string; optionId: string }[] = []
  for (const q of poll.questions) {
    const optionId = formData.get(`answer[${q.id}]`) as string
    if (!optionId) return { success: false, error: 'invalid' }
    answers.push({ questionId: q.id, optionId })
  }

  // IP extraction (Vercel sets x-forwarded-for to a single trusted IP)
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
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { success: false, error: 'already_voted' }
    }
    throw e
  }

  // Set voted cookie (1 year)
  cookieStore.set(cookieKey, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const results = await computeResults(poll.id)
  return { success: true, results }
}
