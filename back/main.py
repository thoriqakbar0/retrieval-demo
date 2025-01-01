import pymupdf
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
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

load_dotenv()

app = FastAPI()

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

openai.api_key = os.getenv("OPENAI_API_KEY")

# Download required NLTK data
nltk.download('punkt', quiet=True)

def get_embedding(text: str) -> list[float]:
    """Get embedding for text using OpenAI's API."""
    response = openai.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding

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
        
        # Get embeddings for each chunk
        processed_chunks = []
        for chunk in chunks:
            embedding = get_embedding(chunk)
            processed_chunks.append({
                "text": chunk,
                "embedding": embedding
            })
        
        # Store chunks for later retrieval
        document_chunks[document_id] = processed_chunks
        
        # Update status to completed
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{document_id}")
async def get_status(document_id: str):
    status = processing_status.get(document_id, ProcessingStatus.FAILED)
    return {
        "status": status.value,
        "chunks": document_chunks.get(document_id, []) if status == ProcessingStatus.COMPLETED else None
    }


