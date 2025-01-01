import { Suspense } from "react";
import { DocumentClient } from "./client";
import { getApiUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ documentId: string }>;
}

async function getDocument(id: string) {
  const res = await fetch(`${getApiUrl()}/documents/${id}`, {
    next: { revalidate: 0 }
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch document');
  }
  
  return res.json();
}

export default async function DocumentPage({ params }: Props) {
  const { documentId } = await params;
  const document = await getDocument(documentId);
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <DocumentClient 
        id={documentId} 
        title={document.title} 
        url={document.url}
      />
    </Suspense>
  );
} 