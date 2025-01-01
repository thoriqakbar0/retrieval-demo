import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { method: string } }
) {
  try {
    // Await params before accessing its properties
    const { method } = await params
    const body = await request.json()

    // Validate method
    const validMethods = ['embedding', 'rerank', 'colpali', 'colbert'] as const
    if (!validMethods.includes(method as typeof validMethods[number])) {
      return new Response(JSON.stringify({ error: 'Invalid method' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/chat/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 