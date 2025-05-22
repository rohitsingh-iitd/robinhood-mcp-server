# Use Node.js as base image with Python
FROM node:18-bullseye-slim

WORKDIR /app

# Install Python and required tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN if [ -f "requirements.txt" ]; then \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt; \
    fi

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --production --no-audit

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9593
ENV ENDPOINT=/rest
ENV PYTHONUNBUFFERED=1

# Expose the port for REST transport
EXPOSE 9593

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9593/health || exit 1

# Start the application
CMD ["node", "server.js"]
