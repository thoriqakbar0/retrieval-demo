import { Chat } from "@/components/chat";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function DocumentPage({
  params,
}: {
  params: { documentId: string };
}) {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, params.documentId));

  if (!document) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 sm:p-20">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">{document.title}</h1>
      </div>
      <div className="w-full max-w-2xl">
        <Chat documentId={params.documentId} />
      </div>
    </div>
  );
} 