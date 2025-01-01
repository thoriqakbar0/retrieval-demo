import { Chat } from "@/components/chat";
import crypto from 'crypto';
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";

export default async function Home() {
  const firstDocument = await db.select().from(documents).limit(1);
  const randomUUID = crypto.randomUUID();
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] debug">
      <h1 className="text-xl font-bold">Document Retrieval System: {randomUUID}</h1>
      <h1 className="text-xl font-bold">Document Retrieval System: {firstDocument[0].chunks}</h1>
      <Chat />
    </div>
  );
}
