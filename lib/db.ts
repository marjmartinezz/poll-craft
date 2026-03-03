import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'

export async function generateUniqueSlug(): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(10)
    const existing = await prisma.poll.findUnique({ where: { slug } })
    if (!existing) return slug
  }
  throw new Error('Failed to generate unique slug after 3 attempts')
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
