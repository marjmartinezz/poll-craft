'use client'

import { useActionState } from 'react'
import { submitVote } from '@/actions/vote'
import { ResultsChart } from './results-chart'
import { Button } from '@/components/ui/button'
import type { QuestionResult } from '@/lib/db'

type Props = {
  poll: { slug: string; title: string; type: string }
  questions: Array<{ id: string; text: string; options: Array<{ id: string; text: string }> }>
  initialResults?: QuestionResult[]
  alreadyVoted?: boolean
  expired?: boolean
}

export function VoteForm({ poll, questions, initialResults, alreadyVoted, expired }: Props) {
  const [state, action, isPending] = useActionState(submitVote, null)
  const showResults = alreadyVoted || expired || (state !== null && state.success)

  if (showResults) {
    const results = (state !== null && state.success) ? state.results : (initialResults ?? [])
    return (
      <div className="space-y-6">
        {alreadyVoted && !state && (
          <p className="text-muted-foreground">You&apos;ve already voted on this poll.</p>
        )}
        {expired && (
          <p className="text-muted-foreground">This poll is closed.</p>
        )}
        {state !== null && state.success && (
          <p className="text-primary font-medium">Vote recorded! Here are the results:</p>
        )}
        <ResultsChart results={results} />
      </div>
    )
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="pollSlug" value={poll.slug} />

      {questions.map((q) => (
        <div key={q.id} className="space-y-3">
          <p className="font-medium">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((o) => (
              <label
                key={o.id}
                className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <input
                  type="radio"
                  name={`answer[${q.id}]`}
                  value={o.id}
                  required
                  className="accent-primary"
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {state !== null && !state.success && state.error === 'already_voted' && (
        <p className="text-destructive text-sm">You&apos;ve already voted on this poll.</p>
      )}
      {state !== null && !state.success && state.error === 'expired' && (
        <p className="text-destructive text-sm">This poll has closed.</p>
      )}
      {state !== null && !state.success && state.error === 'invalid' && (
        <p className="text-destructive text-sm">Please answer all questions before submitting.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Submitting...' : 'Submit Vote'}
      </Button>
    </form>
  )
}
