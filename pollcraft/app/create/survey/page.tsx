import { SurveyForm } from '@/components/survey-form'

export const metadata = { title: 'Create a Survey — PollCraft' }

export default function CreateSurveyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a Survey</h1>
        <p className="text-muted-foreground mt-2">Multiple questions, multiple choice answers.</p>
      </div>
      <SurveyForm />
    </div>
  )
}
