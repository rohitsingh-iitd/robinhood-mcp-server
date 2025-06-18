[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/rohitsingh-iitd-robinhood-mcp-server-badge.png)](https://mseep.ai/app/rohitsingh-iitd-robinhood-mcp-server)

# Robinhood MCP Server - User Guide

## Overview

The Robinhood MCP Server provides a comprehensive interface to the Robinhood Crypto API. This server handles authentication, account management, market data retrieval, and trading operations through both REST API and WebSocket interfaces.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Development](#development)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Disclaimer](#disclaimer)

## Features

- REST API for account management and trading operations
- WebSocket support for real-time market data and order updates
- Comprehensive error handling and logging
- Rate limiting and security best practices
- Easy configuration via environment variables

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Robinhood API credentials

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rohitsingh-iitd/robinhood-mcp-server
   cd robinhood-mcp-server
   ```

2. **Set up a virtual environment** (recommended):
   ```bash
   # Create a virtual environment
   python -m venv venv
   
   # Activate the virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   # .\venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. **Create a `.env` file** in the project root with the following content:
   ```env
   # Required
   ROBINHOOD_API_KEY=your_api_key_here
   ROBINHOOD_PRIVATE_KEY=your_base64_encoded_private_key_here
   
   # Optional (with defaults)
   HOST=0.0.0.0
   PORT=8000
   WEBSOCKET_PORT=8001
   DEBUG=False
   LOG_LEVEL=INFO
   LOG_FILE=robinhood_mcp_server.log
   RATE_LIMIT_ENABLED=True
   RATE_LIMIT_REQUESTS=100
   RATE_LIMIT_PERIOD=60
   ```

2. **Replace the placeholder values** with your actual Robinhood API credentials.

## Running the Server

Start the server with the following command:

```bash
python -m src.main
```

This will start:
- REST API server at `http://localhost:8000`
- WebSocket server at `ws://localhost:8001`

### Running in Production

For production use, consider using a production-grade ASGI server like Uvicorn with Gunicorn:

```bash
pip install gunicorn uvicorn[standard]
gunicorn src.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Running the Server

Start the server with the following command:

```
python -m src.main
```

This will start both the REST API server (default port 8000) and the WebSocket server (default port 8001).

## REST API Endpoints

### Authentication

- `GET /auth/status` - Check authentication status

### Account

- `GET /account` - Get account information
- `GET /account/holdings` - Get account holdings (optional query param: `asset_code`)

### Market Data

- `GET /market/best-price` - Get best bid/ask price (optional query param: `symbol`)
- `GET /market/estimated-price` - Get estimated price for quantity (required query params: `symbol`, `side`, `quantity`)

### Trading

- `GET /trading/pairs` - Get available trading pairs (optional query param: `symbol`)
- `GET /trading/orders` - Get order history (optional query param: `status`)
- `GET /trading/orders/{id}` - Get order details
- `POST /trading/orders` - Place a new order
  - Required fields: `symbol`, `side`, `quantity`
  - Optional fields: `type`, `price`, `time_in_force`, `stop_price`
- `DELETE /trading/orders/{id}` - Cancel an order

## WebSocket API

The WebSocket server provides real-time updates for market data and order status.

### Connection

Connect to the WebSocket server at:
```
ws://localhost:8001
```

### Market Data Subscription

Subscribe to market data updates:
```json
{
  "type": "market_data",
  "action": "subscribe",
  "symbols": ["BTC-USD", "ETH-USD"]
}
```

Unsubscribe from market data updates:
```json
{
  "type": "market_data",
  "action": "unsubscribe",
  "symbols": ["BTC-USD", "ETH-USD"]
}
```

### Order Updates Subscription

Subscribe to order updates:
```json
{
  "type": "orders",
  "action": "subscribe"
}
```

Unsubscribe from order updates:
```json
{
  "type": "orders",
  "action": "unsubscribe"
}
```

### Ping/Pong

Send a ping to keep the connection alive:
```json
{
  "type": "ping"
}
```

The server will respond with:
```json
{
  "type": "pong"
}
```

## Testing

Run the validation tests to ensure the server is working correctly:

```
python -m tests.test_server
```

## Configuration Options

The following environment variables can be configured in the `.env` file:

- `ROBINHOOD_API_KEY` - Your Robinhood API key
- `ROBINHOOD_PRIVATE_KEY` - Your base64-encoded private key
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - REST API server port (default: 8000)
- `DEBUG` - Enable debug mode (default: False)
- `LOG_LEVEL` - Logging level (default: INFO)
- `LOG_FILE` - Log file path (default: robinhood_mcp_server.log)
- `RATE_LIMIT_ENABLED` - Enable rate limiting (default: True)
- `RATE_LIMIT_REQUESTS` - Maximum requests per period (default: 100)
- `RATE_LIMIT_PERIOD` - Rate limit period in seconds (default: 60)

## Security Considerations

- API keys and secrets are stored in environment variables, never in code
- All sensitive data is properly handled
- Input validation is implemented for all API endpoints
- Rate limiting is enforced to prevent abuse
- Proper error handling to avoid leaking sensitive information

## Troubleshooting

If you encounter issues:

1. Check the log file for detailed error messages
2. Verify your API credentials are correct
3. Ensure you have proper network connectivity
4. Check that the Robinhood API is available

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

The author is not responsible for any loss or damage that may occur as a result of using this project.

[![smithery badge](https://smithery.ai/badge/@rohitsingh-iitd/robinhood-mcp-server)](https://smithery.ai/server/@rohitsingh-iitd/robinhood-mcp-server)


