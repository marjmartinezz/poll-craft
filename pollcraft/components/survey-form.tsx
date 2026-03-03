'use client'

import { useActionState, useState } from 'react'
import { createSurvey } from '@/actions/create-poll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Question = { text: string; options: string[] }

const emptyQuestion = (): Question => ({ text: '', options: ['', ''] })

export function SurveyForm() {
  const [state, action, isPending] = useActionState(createSurvey, null)
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])

  const addQuestion = () => {
    if (questions.length < 10) setQuestions([...questions, emptyQuestion()])
  }

  const removeQuestion = (qi: number) => {
    if (questions.length > 1) setQuestions(questions.filter((_, i) => i !== qi))
  }

  const updateQuestion = (qi: number, text: string) => {
    setQuestions(questions.map((q, i) => (i === qi ? { ...q, text } : q)))
  }

  const addOption = (qi: number) => {
    if (questions[qi].options.length < 6) {
      setQuestions(questions.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, ''] } : q
      ))
    }
  }

  const removeOption = (qi: number, oi: number) => {
    if (questions[qi].options.length > 2) {
      setQuestions(questions.map((q, i) =>
        i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
      ))
    }
  }

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(questions.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
    ))
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Survey title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Post-event feedback"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-4">
        <Label>Questions</Label>
        {questions.map((q, qi) => (
          <Card key={qi}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Question {qi + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(qi)}
                  disabled={questions.length <= 1}
                >
                  Remove
                </Button>
              </div>
              <Input
                name={`question[${qi}][text]`}
                value={q.text}
                onChange={(e) => updateQuestion(qi, e.target.value)}
                placeholder="Enter your question"
                maxLength={200}
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex gap-2">
                  <Input
                    name={`question[${qi}][option][${oi}]`}
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    maxLength={100}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(qi, oi)}
                    disabled={q.options.length <= 2}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addOption(qi)}
                disabled={q.options.length >= 6}
              >
                + Add option
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          disabled={questions.length >= 10}
          className="w-full"
        >
          + Add question
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Duration</Label>
        <RadioGroup name="duration" defaultValue="1w">
          <div className="flex gap-6">
            {[
              { value: '1d', label: '1 Day' },
              { value: '1w', label: '1 Week' },
              { value: '1m', label: '1 Month' },
            ].map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`s-duration-${value}`} />
                <Label htmlFor={`s-duration-${value}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creating...' : 'Create Survey'}
      </Button>
    </form>
  )
}
