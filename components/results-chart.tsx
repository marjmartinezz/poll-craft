'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { QuestionResult } from '@/lib/db'

export function ResultsChart({ results }: { results: QuestionResult[] }) {
  return (
    <div className="space-y-8">
      {results.map((q) => (
        <div key={q.questionId}>
          <h3 className="font-semibold mb-1">{q.questionText}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {q.totalVotes} {q.totalVotes === 1 ? 'response' : 'responses'}
          </p>
          <ResponsiveContainer width="100%" height={q.options.length * 52}>
            <BarChart
              data={q.options}
              layout="vertical"
              margin={{ left: 8, right: 32, top: 0, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="text" width={140} tick={{ fontSize: 13 }} />
              <Tooltip
                formatter={(value, _name, props) =>
                  [`${value}% (${props.payload.votes} votes)`, 'Votes']
                }
              />
              <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
