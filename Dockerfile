# Use Node.js as base image
FROM node:18 AS builder

WORKDIR /app

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    make \
    g++

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci --no-audit --prefer-offline --legacy-peer-deps

# Copy the rest of the application (excluding node_modules)
COPY . .

# Install Python dependencies if needed
COPY requirements.txt .
RUN if [ -f "requirements.txt" ]; then \
    pip install --no-cache-dir -r requirements.txt; \
    fi

# Make Python bridge executable if it exists
RUN if [ -f "python_bridge.py" ]; then chmod +x python_bridge.py; fi

# Production stage
FROM node:18-slim

WORKDIR /app

# Install Python runtime
RUN apt-get update && apt-get install -y python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy built node_modules and application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9593
ENV ENDPOINT=/rest

# Expose the port for REST transport
EXPOSE 9593

# Start the application
CMD ["node", "server.js"]
