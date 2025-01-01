import pymupdf
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request

from fastapi.middleware.cors import CORSMiddleware
import openai
import os
from markdown_it import MarkdownIt
from dotenv import load_dotenv
import boto3
from datetime import datetime
import uuid
from enum import Enum
import re
import nltk
from nltk.tokenize import sent_tokenize
import psycopg2
from psycopg2.extras import DictCursor
from typing import List, Dict, Any
import numpy as np
from pydantic import BaseModel
import voyageai

load_dotenv()

app = FastAPI()

import ssl

@app.on_event("startup")
async def startup_event():
    """Download required NLTK resources on startup"""
    try:
        # Create unverified SSL context for NLTK downloads
        ssl._create_default_https_context = ssl._create_unverified_context
        
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt')
        nltk.download('punkt_tab')

# Database connection
DATABASE_URL = os.getenv('POSTGRES_URL')
if not DATABASE_URL:
    raise ValueError("Database URL not found in environment variables")

def get_db():
    return psycopg2.connect(DATABASE_URL)

# Initialize S3 client for Digital Ocean Spaces
s3 = boto3.client('s3',
    endpoint_url='https://sgp1.digitaloceanspaces.com',
    aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
    aws_secret_access_key=os.getenv('S3_SECRET_KEY')
)

SPACE_NAME = 'thor'
SPACE_FOLDER = 'documents'

# In-memory store for processing status and chunks
processing_status = {}
document_chunks = {}

class ProcessingStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# Add this after other environment variables
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY")
if not VOYAGE_API_KEY:
    raise ValueError("Voyage API key not found in environment variables")

# Initialize Voyage client
voyage_client = voyageai.Client()  # This will use VOYAGE_API_KEY from environment

def get_embedding(text: str) -> list[float]:
    """Get embedding for text using OpenAI's API."""
    try:
        response = openai.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting embedding: {str(e)}")
        raise

def split_into_chunks(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Split text into chunks with proper sentence boundaries and overlap.
    
    Args:
        text: The text to split
        chunk_size: Target size of each chunk in characters
        overlap: Number of characters to overlap between chunks
    """
    # First, split into sentences
    sentences = sent_tokenize(text)
    
    chunks = []
    current_chunk = []
    current_size = 0
    last_sentence = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        sentence_size = len(sentence)
        
        # If this sentence alone is longer than chunk_size, split it by punctuation or spaces
        if sentence_size > chunk_size:
            # Try to split by punctuation first
            subparts = re.split(r'[,;:]', sentence)
            if len(subparts) == 1:  # No punctuation found, split by space
                subparts = sentence.split()
            
            current_subpart = []
            current_subsize = 0
            
            for part in subparts:
                part = part.strip()
                part_size = len(part)
                
                if current_subsize + part_size > chunk_size:
                    if current_subpart:
                        chunks.append(' '.join(current_subpart))
                    current_subpart = [part]
                    current_subsize = part_size
                else:
                    current_subpart.append(part)
                    current_subsize += part_size + 1  # +1 for space
            
            if current_subpart:
                chunks.append(' '.join(current_subpart))
            continue
        
        # If adding this sentence exceeds chunk_size, start a new chunk
        if current_size + sentence_size > chunk_size and current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append(chunk_text)
            
            # Start new chunk with overlap from the last sentence
            if last_sentence and len(last_sentence) < overlap:
                current_chunk = [last_sentence, sentence]
                current_size = len(last_sentence) + sentence_size + 1
            else:
                current_chunk = [sentence]
                current_size = sentence_size
        else:
            current_chunk.append(sentence)
            current_size += sentence_size + 1  # +1 for space
            
        last_sentence = sentence
    
    # Add the last chunk if there is one
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    # Ensure minimum chunk size and merge small chunks if necessary
    final_chunks = []
    current_chunk = []
    current_size = 0
    min_chunk_size = chunk_size // 2
    
    for chunk in chunks:
        if current_size + len(chunk) < chunk_size:
            current_chunk.append(chunk)
            current_size += len(chunk)
        else:
            if current_chunk:
                final_chunks.append(' '.join(current_chunk))
            current_chunk = [chunk]
            current_size = len(chunk)
    
    if current_chunk:
        if current_size < min_chunk_size and final_chunks:
            # Merge small last chunk with the previous one
            final_chunks[-1] = final_chunks[-1] + ' ' + ' '.join(current_chunk)
        else:
            final_chunks.append(' '.join(current_chunk))
    
    return final_chunks

def process_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF."""
    doc = pymupdf.open(stream=file_content, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text

def process_markdown(content: str) -> str:
    """Process markdown content to plain text."""
    md = MarkdownIt()
    return md.render(content)

def upload_to_spaces(file_content: bytes, filename: str) -> str:
    """Upload file to Digital Ocean Spaces and return the URL."""
    # Generate a unique filename to avoid collisions
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    file_extension = os.path.splitext(filename)[1]
    new_filename = f"{timestamp}_{unique_id}{file_extension}"
    
    # If using a folder structure
    key = f"{SPACE_FOLDER}/{new_filename}" if SPACE_FOLDER else new_filename
    
    try:
        s3.put_object(
            Bucket=SPACE_NAME,
            Key=key,
            Body=file_content,
            ACL='public-read'
        )
        
        return f"https://{SPACE_NAME}.sgp1.digitaloceanspaces.com/{key}"
    except Exception as e:
        print(f"Error uploading to Spaces: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

async def process_document_background(document_id: str, content: bytes, filename: str):
    """Process document in background, create chunks and embeddings."""
    try:
        processing_status[document_id] = ProcessingStatus.PROCESSING
        
        # Process content based on file type
        if filename.lower().endswith('.pdf'):
            text = process_pdf(content)
        else:  # Markdown or text
            text = process_markdown(content.decode('utf-8'))
        
        # Split into chunks
        chunks = split_into_chunks(text)
        
        # Get embeddings for each chunk and store in database
        with get_db() as conn:
            with conn.cursor() as cur:
                for i, chunk in enumerate(chunks):
                    embedding = get_embedding(chunk)
                    cur.execute("""
                        INSERT INTO chunks (id, document_id, text, embedding, "order", created_at)
                        VALUES (%s, %s, %s, %s, %s, NOW())
                    """, (str(uuid.uuid4()), document_id, chunk, embedding, i))
                    conn.commit()  # Commit after each chunk so it's immediately available
        
        processing_status[document_id] = ProcessingStatus.COMPLETED
        
    except Exception as e:
        print(f"Processing failed for document {document_id}: {str(e)}")
        processing_status[document_id] = ProcessingStatus.FAILED

@app.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    try:
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Read file content
        content = await file.read()
        
        # Upload to Digital Ocean Spaces
        file_url = upload_to_spaces(content, file.filename)
        
        # Create document in database
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO documents (id, url, title, created_at)
                    VALUES (%s, %s, %s, NOW())
                """, (document_id, file_url, file.filename))
            conn.commit()
        
        # Set initial status
        processing_status[document_id] = ProcessingStatus.PENDING
        
        # Start background processing
        background_tasks.add_task(
            process_document_background,
            document_id,
            content,
            file.filename
        )
        
        return {
            "document_id": document_id,
            "url": file_url,
            "status": ProcessingStatus.PENDING.value
        }
        
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{document_id}")
async def get_status(document_id: str):
    # Get status from memory
    status = processing_status.get(document_id, ProcessingStatus.FAILED)
    
    # Get chunks if any exist
    with get_db() as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("""
                SELECT text, embedding, "order"
                FROM chunks 
                WHERE document_id = %s
                ORDER BY "order" ASC
            """, (document_id,))
            chunks = cur.fetchall()
            
            return {
                "status": status.value,
                "chunks": chunks if chunks else None,
                "chunks_processed": len(chunks)
            }

@app.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get document details by ID."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("""
                SELECT id, url, title, created_at
                FROM documents 
                WHERE id = %s
            """, (document_id,))
            doc = cur.fetchone()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Convert to dict and add status
            doc_dict = dict(doc)
            doc_dict['status'] = processing_status.get(document_id, ProcessingStatus.FAILED).value
            return doc_dict

def get_chat_response(message: str, context_chunks: List[Dict[str, Any]]) -> str:
    """Get chat response from OpenAI using context chunks."""
    # Prepare context from chunks
    context = "\n\n".join([chunk["text"] for chunk in context_chunks])
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Answer questions based on the provided context. If you cannot find the answer in the context, say so."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"}
            ],
            temperature=0.7,
            max_tokens=500
        )
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get chat response")

# Add request model
class ChatRequest(BaseModel):
    message: str
    documentId: str | None = None

@app.post("/chat/embedding")
async def chat_embedding(request: ChatRequest):
    """Endpoint for embedding-based retrieval with OpenAI chat."""
    message = request.message
    document_id = request.documentId
    
    if not message or not document_id:
        raise HTTPException(status_code=400, detail="Message and document_id are required")
        
    try:
        # First verify document exists
        with get_db() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("""
                    SELECT id FROM documents 
                    WHERE id = %s
                """, (document_id,))
                doc = cur.fetchone()
                
                if not doc:
                    raise HTTPException(status_code=404, detail="Document not found")
        
        # Get query embedding
        query_embedding = get_embedding(message)
        
        # Get chunks from database
        with get_db() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("""
                    SELECT id, text, embedding
                    FROM chunks 
                    WHERE document_id = %s
                    ORDER BY created_at ASC
                """, (document_id,))
                chunks = cur.fetchall()
                
        if not chunks:
            return {
                "response": "No chunks found for this document. The document might still be processing.",
                "chunks": []
            }
            
        # Calculate cosine similarity
        chunk_scores = []
        for chunk in chunks:
            # Convert string representation of embedding to list of floats if needed
            chunk_embedding = chunk["embedding"]
            if isinstance(chunk_embedding, str):
                # Remove brackets and split by commas
                chunk_embedding = [float(x) for x in chunk_embedding.strip('[]').split(',')]
            
            # Calculate cosine similarity
            dot_product = np.dot(query_embedding, chunk_embedding)
            query_norm = np.linalg.norm(query_embedding)
            chunk_norm = np.linalg.norm(chunk_embedding)
            
            if query_norm == 0 or chunk_norm == 0:
                score = 0
            else:
                score = dot_product / (query_norm * chunk_norm)
            
            chunk_scores.append((score, chunk))
            
        # Sort by score and get top 3
        chunk_scores.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [{
            "text": chunk["text"], 
            "score": round(float(score), 2),  # Round to 2 decimal places
            "chunk": chunk["id"]  # Add chunk ID
        } for score, chunk in chunk_scores[:3]]
        
        # Get chat response using context
        chat_response = get_chat_response(message, top_chunks)
        
        return {
            "response": chat_response,
            "chunks": top_chunks
        }
            
    except Exception as e:
        print(f"Embedding chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/rerank")
async def chat_rerank(request: ChatRequest):
    """Endpoint for reranking retrieval using Voyage AI."""
    message = request.message
    document_id = request.documentId
    
    if not message or not document_id:
        raise HTTPException(status_code=400, detail="Message and document_id are required")
        
    try:
        # First verify document exists and get chunks
        with get_db() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                # Get document
                cur.execute("""
                    SELECT id FROM documents 
                    WHERE id = %s
                """, (document_id,))
                doc = cur.fetchone()
                
                if not doc:
                    raise HTTPException(status_code=404, detail="Document not found")
                
                # Get all chunks
                cur.execute("""
                    SELECT id, text
                    FROM chunks 
                    WHERE document_id = %s
                    ORDER BY created_at ASC
                """, (document_id,))
                chunks = cur.fetchall()

        if not chunks:
            return {
                "response": "No chunks found for this document. The document might still be processing.",
                "chunks": []
            }

        # Extract texts and keep track of chunk IDs
        chunk_texts = [chunk["text"] for chunk in chunks]
        chunk_ids = [chunk["id"] for chunk in chunks]

        # Rerank all chunks using Voyage AI
        reranking = voyage_client.rerank(
            query=message,
            documents=chunk_texts,
            model="rerank-2",
            top_k=3  # Get top 3 most relevant chunks
        )

        # Format reranked chunks
        top_chunks = [
            {
                "text": result.document,
                "score": round(float(result.relevance_score), 4),
                "chunk": chunk_ids[i]
            }
            for i, result in enumerate(reranking.results)
        ]

        # Get chat response using reranked context
        chat_response = get_chat_response(message, top_chunks)
        
        return {
            "response": chat_response,
            "chunks": top_chunks
        }
            
    except Exception as e:
        print(f"Rerank chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/colpali")
async def chat_colpali(request: ChatRequest):
    """Endpoint for Colpali retrieval."""
    message = request.message
    document_id = request.documentId
    
    if not message or not document_id:
        raise HTTPException(status_code=400, detail="Message and document_id are required")
    
    try:
        # First verify document exists
        with get_db() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("""
                    SELECT id FROM documents 
                    WHERE id = %s
                """, (document_id,))
                doc = cur.fetchone()
                
                if not doc:
                    raise HTTPException(status_code=404, detail="Document not found")

        # For now, use embedding-based retrieval
        return await chat_embedding(request)
        
    except Exception as e:
        print(f"Colpali chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/colbert")
async def chat_colbert(request: ChatRequest):
    """Endpoint for ColBERT retrieval."""
    message = request.message
    document_id = request.documentId
    
    if not message or not document_id:
        raise HTTPException(status_code=400, detail="Message and document_id are required")
    
    try:
        # First verify document exists
        with get_db() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                cur.execute("""
                    SELECT id FROM documents 
                    WHERE id = %s
                """, (document_id,))
                doc = cur.fetchone()
                
                if not doc:
                    raise HTTPException(status_code=404, detail="Document not found")

        # For now, use embedding-based retrieval
        return await chat_embedding(request)
        
    except Exception as e:
        print(f"ColBERT chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
