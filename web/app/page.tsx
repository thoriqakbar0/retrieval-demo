import { Chat } from "@/components/chat";
import { documents, getTotalDocuments } from "@/lib/schema";
import { db } from "@/lib/db";

export default async function Home() {
  const randomUUID = "db connection fails"
  let firstChunk = "No documents found";
  let totalDocuments = 0;
  
  try {
    const firstDocument = await db.select().from(documents).limit(1);
    if (firstDocument.length > 0) {
      firstChunk = firstDocument[0].chunks || firstChunk;
    }
  } catch (error) {
    console.error("Error fetching document:", error);
  }

  try {
    totalDocuments = await getTotalDocuments();
  } catch (error) {
    console.error("Error fetching total documents:", error);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] debug">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">Document Retrieval System: {randomUUID}</h1>
        <h1 className="text-xl font-bold">First Chunk: {firstChunk}</h1>
        <h1 className="text-xl font-bold">Total Documents: {totalDocuments}</h1>
      </div>
      <div className="w-full max-w-2xl">
        <Chat />
      </div>
    </div>
  );
}
