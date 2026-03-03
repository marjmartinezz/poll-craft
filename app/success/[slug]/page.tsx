import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CopyButton } from '@/components/copy-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const url = `${baseUrl}/p/${slug}`

  return (
    <div className="container mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-8">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2">
          Your {poll.type === 'POLL' ? 'Poll' : 'Survey'} is Live!
        </h1>
        <p className="text-muted-foreground">{poll.title}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Share this link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-muted font-mono"
            />
            <CopyButton url={url} />
          </div>
          <p className="text-sm text-muted-foreground">
            Closes on {poll.expiresAt.toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-4 justify-center">
        <Link href={`/p/${slug}`} className="text-primary underline text-sm">
          Preview voting page →
        </Link>
        <Link href="/" className="text-muted-foreground text-sm hover:underline">
          Create another
        </Link>
      </div>
    </div>
  )
}
