import { PollForm } from '@/components/poll-form'

export const metadata = { title: 'Create a Poll — PollCraft' }

export default function CreatePollPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a Poll</h1>
        <p className="text-muted-foreground mt-2">One question, multiple choice answers.</p>
      </div>
      <PollForm />
    </div>
  )
}
