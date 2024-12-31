from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://retrieval.rethoriq.com", "https://api.retrieval.rethoriq.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI!"}
