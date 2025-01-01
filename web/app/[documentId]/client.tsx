'use client';

import { Chat } from "@/components/chat";
import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/utils";

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Document {
  id: string;
  title: string;
  url: string;
  status: ProcessingStatus;
  createdAt: string;
}

export function DocumentPageContent({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    async function fetchDocumentDetails() {
      try {
        const response = await fetch(`${getApiUrl()}/documents/${documentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch document');
        }
        const data = await response.json();
        setDocument(data);
        
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Error fetching document:', error);
      }
    }

    fetchDocumentDetails();
    const interval = setInterval(() => {
      if (isPolling) {
        fetchDocumentDetails();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documentId, isPolling]);

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 sm:p-20">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">{document.title}</h1>
        <a 
          href={document.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          View Original Document
        </a>
        {(document.status === 'pending' || document.status === 'processing') && (
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-md">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Processing document chunks...</span>
          </div>
        )}
      </div>
      <div className="w-full max-w-2xl">
        <Chat documentId={documentId} />
      </div>
    </div>
  );
} 