FROM node:18-alpine

WORKDIR /app

# Install Python and required dependencies
RUN apk add --no-cache python3 py3-pip

# Copy package files first for better caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Python requirements
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Make Python bridge executable
RUN chmod +x python_bridge.py

# Set environment variables
ENV NODE_ENV=production

# Expose the port for REST transport
EXPOSE 9593

# Start the MCP server
CMD ["node", "server.js"]
