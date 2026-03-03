'use client'

import { useActionState, useState } from 'react'
import { createPoll } from '@/actions/create-poll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function PollForm() {
  const [state, action, isPending] = useActionState(createPoll, null)
  const [options, setOptions] = useState(['', ''])

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => (i === index ? value : o)))
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Your question</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. What's the best pizza topping?"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-3">
        <Label>Answer options</Label>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name="option"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              aria-label="Remove option"
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addOption}
          disabled={options.length >= 6}
          className="w-full"
        >
          + Add option
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
                <RadioGroupItem value={value} id={`duration-${value}`} />
                <Label htmlFor={`duration-${value}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creating...' : 'Create Poll'}
      </Button>
    </form>
  )
}
