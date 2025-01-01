import { Chat } from "@/components/chat";
import crypto from 'crypto';
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";

export default async function Home() {
  const randomUUID = crypto.randomUUID();
  let firstChunk = "No documents found";
  
  try {
    const firstDocument = await db.select().from(documents).limit(1);
    if (firstDocument.length > 0) {
      firstChunk = firstDocument[0].chunks || firstChunk;
    }
  } catch (error) {
    console.error("Error fetching document:", error);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] debug">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">Document Retrieval System: {randomUUID}</h1>
        <h1 className="text-xl font-bold">First Chunk: {firstChunk}</h1>
      </div>
      <div className="w-full max-w-2xl">
        <Chat />
      </div>
    </div>
  );
}
