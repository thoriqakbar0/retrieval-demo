import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
from markdown_it import MarkdownIt
from dotenv import load_dotenv
import boto3
from datetime import datetime
import uuid

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")

def get_embedding(text: str) -> list[float]:
    response = openai.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding

def split_into_chunks(text: str, chunk_size: int = 1000) -> list[str]:
    """Split text into chunks of approximately chunk_size characters."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0
    
    for word in words:
        word_size = len(word) + 1  # +1 for the space
        if current_size + word_size > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_size = word_size
        else:
            current_chunk.append(word)
            current_size += word_size
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def process_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF."""
    doc = fitz.open(stream=file_content, filetype="pdf")
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
            ACL='public-read'  # Make the file publicly accessible
        )
        
        # Return the public URL
        return f"https://{SPACE_NAME}.sgp1.digitaloceanspaces.com/{key}"
    except Exception as e:
        print(f"Error uploading to Spaces: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

@app.post("/process")
async def process_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # Upload the original file to Spaces
        file_url = upload_to_spaces(content, filename)
        
        # Determine file type and process accordingly
        if filename.endswith('.pdf'):
            text = process_pdf(content)
        else:
            # For markdown and other text files
            text = process_markdown(content.decode('utf-8'))
        
        # Split into chunks
        chunks = split_into_chunks(text)
        
        # Get embeddings for each chunk
        processed_chunks = []
        for chunk in chunks:
            if chunk.strip():  # Only process non-empty chunks
                embedding = get_embedding(chunk)
                processed_chunks.append({
                    "text": chunk,
                    "embedding": embedding
                })
        
        return {
            "chunks": processed_chunks,
            "file_url": file_url
        }
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


