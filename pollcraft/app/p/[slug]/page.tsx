import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { computeResults } from '@/lib/db'
import { VoteForm } from '@/components/vote-form'
import Link from 'next/link'

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
  const initialResults = alreadyVoted || expired ? await computeResults(poll.id) : undefined

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {poll.type === 'POLL' ? 'Poll' : 'Survey'}
          </span>
          {expired ? (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Closed</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Closes {poll.expiresAt.toLocaleDateString()}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{poll.title}</h1>
      </div>

      <VoteForm
        poll={{ slug: poll.slug, title: poll.title, type: poll.type }}
        questions={poll.questions}
        initialResults={initialResults}
        alreadyVoted={alreadyVoted}
        expired={expired}
      />

      <div className="mt-12 pt-6 border-t border-border text-center">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Create your own poll →
        </Link>
      </div>
    </div>
  )
}
