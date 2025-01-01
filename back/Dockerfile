FROM python:3.11-slim

# Install curl for uv installer
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Define build arguments
ARG OPENAI_API_KEY
ARG POSTGRES_URL
ARG S3_ACCESS_KEY
ARG S3_SECRET_KEY
ARG VOYAGE_API_KEY

# Set environment variables
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV POSTGRES_URL=${POSTGRES_URL}
ENV S3_ACCESS_KEY=${S3_ACCESS_KEY}
ENV S3_SECRET_KEY=${S3_SECRET_KEY}
ENV VOYAGE_API_KEY=${VOYAGE_API_KEY}

# Copy and install requirements
COPY requirements.txt .
RUN uv pip install --no-cache -r requirements.txt --system

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
