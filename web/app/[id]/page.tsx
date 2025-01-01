import { db } from "@/lib/db"
import { documents } from "@/lib/schema"
import { eq } from "drizzle-orm"

export default async function DocumentPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, params.id),
  })

  if (!document) {
    return <div>Document not found</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Document: {document.id}</h1>
      <div className="space-y-4">
        {document.chunks.map((chunk, index) => (
          <div key={index} className="p-4 border rounded">
            <p className="text-sm">{chunk}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
