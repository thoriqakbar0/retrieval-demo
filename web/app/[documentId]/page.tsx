import { Suspense } from "react";
import { DocumentPageContent } from "./client";

interface Props {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { documentId } = await params;
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <DocumentPageContent documentId={documentId} />
    </Suspense>
  );
} 