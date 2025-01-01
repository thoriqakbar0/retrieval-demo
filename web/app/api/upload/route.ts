import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, chunks } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

interface ProcessedChunk {
  text: string;
  embedding: number[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer and then to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Send to backend for processing
    const formDataForBackend = new FormData();
    formDataForBackend.append('file', new Blob([buffer]), file.name);

    const response = await fetch('http://localhost:8000/process', {
      method: 'POST',
      body: formDataForBackend,
    });

    if (!response.ok) {
      throw new Error('Failed to process document');
    }

    const { chunks: processedChunks, file_url } = await response.json();

    // Create document
    const documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      url: file.name,
      file_url: file_url,
      title: file.name,
    });

    // Create chunks with embeddings
    const chunkInserts = processedChunks.map((chunk: ProcessedChunk, index: number) => ({
      documentId,
      text: chunk.text,
      embedding: chunk.embedding,
      order: index,
    }));

    await db.insert(chunks).values(chunkInserts);

    return NextResponse.json({ documentId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
} 