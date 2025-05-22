# MCP Tools Documentation for Robinhood MCP Server

This document provides detailed information about the MCP tools available in the Robinhood MCP Server.

## Available MCP Tools

### 1. getAccount
**Description**: Retrieves the user's Robinhood crypto trading account details.

**Parameters**: None

**Returns**: Account information including status, balances, and account ID.

**Example Response**:
```json
{
  "account_id": "abc123",
  "status": "active",
  "currency": "USD",
  "buying_power": "5000.00",
  "cash_balance": "5000.00"
}
```

### 2. getHoldings
**Description**: Retrieves the user's cryptocurrency holdings.

**Parameters**:
- `asset_codes` (optional): Array of specific cryptocurrencies to filter by (e.g., ['BTC', 'ETH'])

**Returns**: List of holdings with quantity, cost basis, and current value.

**Example Response**:
```json
[
  {
    "asset_code": "BTC",
    "quantity": "0.5",
    "cost_basis": "15000.00",
    "current_value": "16000.00"
  },
  {
    "asset_code": "ETH",
    "quantity": "2.0",
    "cost_basis": "3000.00",
    "current_value": "3200.00"
  }
]
```

### 3. getBestPrice
**Description**: Gets the current best bid/ask prices for cryptocurrencies.

**Parameters**:
- `symbol` (optional): Trading pair symbol (e.g., 'BTC-USD')

**Returns**: Current bid and ask prices for the requested symbols.

**Example Response**:
```json
{
  "symbol": "BTC-USD",
  "bid": "32000.00",
  "ask": "32050.00",
  "spread": "50.00",
  "timestamp": "2025-05-22T09:54:00Z"
}
```

### 4. getEstimatedPrice
**Description**: Calculates estimated execution price for a potential trade.

**Parameters**:
- `symbol` (required): Trading pair symbol (e.g., 'BTC-USD')
- `side` (required): Trade side ('buy' or 'sell')
- `quantity` (required): Amount to trade (as string to preserve precision)

**Returns**: Estimated execution price including fees.

**Example Response**:
```json
{
  "symbol": "BTC-USD",
  "side": "buy",
  "quantity": "0.1",
  "estimated_price": "32075.00",
  "estimated_total": "3207.50",
  "fees": "7.50",
  "timestamp": "2025-05-22T09:54:00Z"
}
```

### 5. getTradingPairs
**Description**: Lists available cryptocurrency trading pairs.

**Parameters**:
- `symbols` (optional): List of specific trading pairs to filter by (e.g., ['BTC-USD', 'ETH-USD'])

**Returns**: List of available trading pairs with their status.

**Example Response**:
```json
[
  {
    "symbol": "BTC-USD",
    "base_currency": "BTC",
    "quote_currency": "USD",
    "status": "active",
    "min_order_size": "0.0001"
  },
  {
    "symbol": "ETH-USD",
    "base_currency": "ETH",
    "quote_currency": "USD",
    "status": "active",
    "min_order_size": "0.001"
  }
]
```

### 6. placeOrder
**Description**: Places a cryptocurrency order.

**Parameters**:
- `symbol` (required): Trading pair symbol (e.g., 'BTC-USD')
- `side` (required): Order side ('buy' or 'sell')
- `quantity` (required): Amount to trade (as string to preserve precision)
- `type` (optional): Order type ('market' or 'limit'), defaults to 'market'
- `price` (optional): Limit price (required for limit orders, as string to preserve precision)
- `time_in_force` (optional): Time in force for the order ('gtc', 'ioc', or 'fok'), defaults to 'gtc'
- `stop_price` (optional): Stop price for stop orders (as string to preserve precision)

**Returns**: Order confirmation details.

**Example Response**:
```json
{
  "order_id": "ord123456",
  "symbol": "BTC-USD",
  "side": "buy",
  "quantity": "0.1",
  "type": "market",
  "status": "pending",
  "created_at": "2025-05-22T09:54:00Z"
}
```

### 7. getOrders
**Description**: Retrieves order history.

**Parameters**:
- `status` (optional): Filter by order status (e.g., 'open', 'filled', 'canceled')

**Returns**: List of orders with their details.

**Example Response**:
```json
[
  {
    "order_id": "ord123456",
    "symbol": "BTC-USD",
    "side": "buy",
    "quantity": "0.1",
    "type": "market",
    "status": "filled",
    "filled_quantity": "0.1",
    "average_price": "32075.00",
    "created_at": "2025-05-22T09:54:00Z",
    "updated_at": "2025-05-22T09:54:05Z"
  },
  {
    "order_id": "ord123457",
    "symbol": "ETH-USD",
    "side": "sell",
    "quantity": "0.5",
    "type": "limit",
    "price": "1600.00",
    "status": "open",
    "filled_quantity": "0.0",
    "created_at": "2025-05-22T09:53:00Z"
  }
]
```

### 8. getOrder
**Description**: Gets details for a specific order.

**Parameters**:
- `order_id` (required): ID of the order to retrieve

**Returns**: Complete order details.

**Example Response**:
```json
{
  "order_id": "ord123456",
  "symbol": "BTC-USD",
  "side": "buy",
  "quantity": "0.1",
  "type": "market",
  "status": "filled",
  "filled_quantity": "0.1",
  "average_price": "32075.00",
  "fees": "7.50",
  "created_at": "2025-05-22T09:54:00Z",
  "updated_at": "2025-05-22T09:54:05Z",
  "executions": [
    {
      "price": "32075.00",
      "quantity": "0.1",
      "timestamp": "2025-05-22T09:54:05Z"
    }
  ]
}
```

### 9. cancelOrder
**Description**: Cancels an open order.

**Parameters**:
- `order_id` (required): ID of the order to cancel

**Returns**: Cancellation confirmation.

**Example Response**:
```json
{
  "order_id": "ord123457",
  "status": "canceled",
  "canceled_at": "2025-05-22T09:55:00Z"
}
```

## Using MCP Tools

These tools can be used by AI assistants that connect to this MCP server. The tools provide a comprehensive interface to Robinhood's cryptocurrency trading functionality, allowing for account information retrieval, market data access, and trading operations.

When using these tools through an AI assistant, you can provide the required parameters as described above, and the assistant will format the request appropriately for the MCP server.

## Authentication

All tools require authentication with a valid Robinhood API key and private key. These credentials must be provided when setting up the MCP server, either through environment variables or through the MCP.so configuration.
