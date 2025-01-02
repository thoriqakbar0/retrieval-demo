import { getApiUrl } from '@/lib/utils'
import { Client } from './client'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

async function getDocument(id: string) {
  try {
    const res = await fetch(`${getApiUrl()}/documents/${id}`, {
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      if (res.status === 404) {
        notFound()
      }
      throw new Error(`Failed to fetch document: ${res.statusText}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching document:', error)
    throw error
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: { documentId: string } 
}): Promise<Metadata> {
  const document = await getDocument(params.documentId)
  
  return {
    title: document.title || `Document ${params.documentId}`,
  }
}

export default async function DocumentPage({ 
  params: { documentId } 
}: { 
  params: { documentId: string } 
}) {
  try {
    const document = await getDocument(documentId)

    return (
      <div className="flex-1 flex flex-col">
        <Client document={document} />
      </div>
    )
  } catch (error) {
    throw error
  }
} 