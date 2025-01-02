'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Document page error:', error)
  }, [error])

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold">Unable to load document</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error.message || 'Something went wrong while loading the document.'}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => router.push('/')}>
            Return Home
          </Button>
          <Button variant="outline" onClick={() => reset()}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
} 