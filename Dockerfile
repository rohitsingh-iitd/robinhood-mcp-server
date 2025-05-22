FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create a non-root user to run the application
RUN useradd -m appuser
USER appuser

# Expose ports for REST API and WebSocket
EXPOSE 8000
EXPOSE 8001

# Run the application
CMD ["python", "-m", "src.main"]
