import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { method: string } }
) {
  try {
    const { method } = params
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

    // Get the error details from the backend if available
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      
      return new Response(
        JSON.stringify({
          error: errorData.detail || `Backend error: ${response.status}`,
          status: response.status,
          method: method
        }), 
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
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
    
    // Provide more structured error response
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        path: `/chat/${params.method}`
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 