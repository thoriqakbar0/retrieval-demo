import { Elysia, t } from 'elysia'
import { db } from '@/lib/db'
import { documents } from '@/lib/schema'
import { v4 as uuidv4 } from 'uuid'

const app = new Elysia({ prefix: '/api' })
    .get('/', () => 'hello Next')
    .post('/upload', async ({ body }) => {
      const { content } = body
      
      // Generate unique URL
      const documentId = uuidv4()
      const documentUrl = `https://retrieval.rethoriq.com/${documentId}`

      // Split content into 500 character chunks
      const chunkSize = 500
      const chunks = []
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize))
      }

      // Insert document into database
      const [document] = await db.insert(documents).values({
        id: uuidv4(),
        url: documentUrl,
        originalContent: content,
        chunks: chunks || [],
        embeddings: null,
        createdAt: new Date()
      }).returning()

      return { 
        url: document.url,
        id: document.id
      }
    }, {
        body: t.Object({
            content: t.String()
        })
    })

export const GET = app.handle 
export const POST = app.handle 
