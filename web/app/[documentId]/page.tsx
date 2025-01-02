import { getApiUrl } from '@/lib/utils'
import { Client } from './client'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface DocumentResponse {
  id: string
  title: string
  url: string
  status?: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getDocument(id: string, retries = 3): Promise<DocumentResponse> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const [res] = await Promise.all([
        fetch(`${getApiUrl()}/documents/${id}`, {
          next: { revalidate: 0 }
        }),
        // Add consistent delay to prevent flash
        sleep(attempt === 0 ? 500 : 1000) // Longer delay for retries
      ])

      if (!res.ok) {
        if (res.status === 404) {
          if (attempt === retries - 1) {
            notFound()
          }
          // If not last attempt, continue to retry
          await sleep(1000)
          continue
        }
        throw new Error(`Failed to fetch document: ${res.statusText}`)
      }

      const data = await res.json()
      
      // Type guard to validate response data
      if (!isValidDocument(data)) {
        throw new Error('Invalid document data received')
      }

      return data
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Error fetching document:', error)
        throw error
      }
      await sleep(1000)
    }
  }
  throw new Error('Failed to fetch document after multiple attempts')
}

// Type guard function
function isValidDocument(data: any): data is DocumentResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.url === 'string'
  )
}

export async function generateMetadata({ 
  params 
}: { 
  params: { documentId: string } 
}): Promise<Metadata> {
  try {
    const document = await getDocument(params.documentId, 1)
    return {
      title: document.title || `Document ${params.documentId}`,
    }
  } catch (error) {
    return {
      title: 'Loading Document...',
    }
  }
}

export default async function DocumentPage({ 
  params: { documentId } 
}: { 
  params: { documentId: string } 
}) {
  const document = await getDocument(documentId, 3)

  return (
    <div className="flex-1 flex flex-col">
      <Client document={document} />
    </div>
  )
} 