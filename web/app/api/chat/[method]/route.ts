import { NextRequest } from 'next/server'
import { getApiUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

const BACKEND_URL = getApiUrl()

export async function POST(
  request: NextRequest,
  { params }: { params: { method: string } }
) {
  const method = params.method
  
  try {
    const { message, documentId } = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/chat/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, documentId }),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || 'Failed to fetch from backend' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
} 