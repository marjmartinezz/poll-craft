import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold tracking-tight mb-4">PollCraft</h1>
        <p className="text-xl text-muted-foreground">
          Create and share polls or surveys in seconds. No sign-up required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">Create a Poll</CardTitle>
            <CardDescription>One question. Instant answers.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Ask a single question with multiple choice answers. Share the link and watch results roll in.
            </p>
            <Button asChild className="w-full">
              <Link href="/create/poll">Create Poll →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">Create a Survey</CardTitle>
            <CardDescription>Multiple questions. Deep insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Build a multi-question form with multiple choice answers. Perfect for gathering structured feedback.
            </p>
            <Button asChild className="w-full">
              <Link href="/create/survey">Create Survey →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
