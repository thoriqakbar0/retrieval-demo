import { getApiUrl } from '@/lib/utils'
import { NextResponse } from 'next/server'

interface Props {
  params: Promise<{ documentId: string }>;
}

export async function GET(
  request: Request, 
  { params }: Props
) {
  try {
    const { documentId } = await params;
    
    // Fetch status from backend
    const response = await fetch(`${getApiUrl()}/status/${documentId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || 'Failed to fetch status' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document status' },
      { status: 500 }
    )
  }
} 