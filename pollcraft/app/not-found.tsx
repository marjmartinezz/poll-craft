import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Poll not found or the link is invalid.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-primary underline underline-offset-4"
      >
        ← Create a new poll
      </Link>
    </div>
  )
}
