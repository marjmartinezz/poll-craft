'use server'

import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/db'
import { computeExpiresAt } from '@/lib/utils'
import { PollType } from '@/lib/generated/prisma/client'
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
