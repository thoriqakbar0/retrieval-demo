FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
FROM python:3.11-slim

# Install curl for uv installer
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy and install requirements
COPY requirements.txt .
RUN uv pip install --no-cache -r requirements.txt --system

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Allow environment variables to be passed in
ARG OPENAI_API_KEY
ARG POSTGRES_URL
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV POSTGRES_URL=${POSTGRES_URL}

# Expose POSTGRES_URL to the container
ENV POSTGRES_URL=${POSTGRES_URL}
