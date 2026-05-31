# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies, including LibreOffice (headless) for PPTX to PDF conversion
# and fonts for proper text rendering in generated documents.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-impress \
    fonts-liberation \
    fontconfig \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create directories for local data storage, credentials, and output
RUN mkdir -p data credentials output

# Expose the port FastAPI runs on
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Run the FastAPI server using uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
