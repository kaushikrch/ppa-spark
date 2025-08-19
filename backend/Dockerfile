FROM python:3.11-slim

# Install system dependencies required by scientific Python libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    libgfortran5 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first to leverage Docker layer caching
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY app /app/app

EXPOSE 8080

# Use sh for PORT substitution and ensure uvicorn becomes PID 1 via exec
CMD ["sh","-c","exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
