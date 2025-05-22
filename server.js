// server.js - Main entry point for the Robinhood MCP Server
import { RestServerTransport } from '@chatmcp/sdk/server/rest.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Store server state
const serverState = {
  tools: [],
  requestHandler: null,
  transport: null
};

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import Robinhood modules using dynamic imports with full file paths
const { AuthClient } = await import(`file://${__dirname}/src/auth/auth_wrapper.js`);
const { AccountClient } = await import(`file://${__dirname}/src/account/account_wrapper.js`);
const { MarketDataClient } = await import(`file://${__dirname}/src/market_data/market_data_wrapper.js`);
const { TradingClient } = await import(`file://${__dirname}/src/trading/trading_wrapper.js`);

// Configuration
const port = process.env.PORT || 9593;
const endpoint = process.env.ENDPOINT || "/rest";

// Get credentials from environment
const robinhoodApiKey = process.env.ROBINHOOD_API_KEY || "";
const robinhoodPrivateKey = process.env.ROBINHOOD_PRIVATE_KEY || "";

// Initialize clients
const authClient = new AuthClient(robinhoodApiKey, robinhoodPrivateKey);
const accountClient = new AccountClient(authClient);
const marketDataClient = new MarketDataClient(authClient);
const tradingClient = new TradingClient(authClient);

// Create MCP server
const server = {
  connect: async (transport) => {
    // Store the transport for later use
    serverState.transport = transport;
    
    // Set up message handler
    transport.onmessage = async (message) => {
      try {
        console.log('Received message:', JSON.stringify(message, null, 2));
        
        // Handle the message based on its method
        let result;
        switch (message.method) {
          case 'initialize':
            result = await handleInitialize(message);
            break;
          case 'tools/list':
            result = await handleListTools(message);
            break;
          case 'tools/execute':
            result = await handleExecuteTool(message);
            break;
          default:
            result = {
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32601,
                message: 'Method not found'
              }
            };
        }
        
        // Send the response if we have a result
        if (result) {
          await transport.send(result);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        if (message && message.id) {
          await transport.send({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: 'Internal error',
              data: error.message
            }
          });
        }
      }
    };
    
    console.log('Server connected to transport');
  },
  
  defineTools: (tools) => {
    serverState.tools = tools;
    console.log(`Registered ${tools.length} tools`);
  },
  
  setRequestHandler: (handler) => {
    serverState.requestHandler = handler;
    console.log('Request handler set');
  }
};

// Handle initialize message
async function handleInitialize(message) {
  return {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      capabilities: {
        tools: {
          list: {},
          execute: {}
        }
      }
    }
  };
}

// Handle list tools message
async function handleListTools(message) {
  return {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      tools: serverState.tools
    }
  };
}

// Handle execute tool message
async function handleExecuteTool(message) {
  const { name, parameters } = message.params;
  const tool = serverState.tools.find(t => t.name === name);
  
  if (!tool) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32601,
        message: 'Tool not found'
      }
    };
  }
  
  try {
    // Execute the tool using the request handler if available
    let result;
    if (serverState.requestHandler) {
      result = await serverState.requestHandler({
        method: name,
        params: parameters
      });
    } else {
      // Fallback to a simple execution
      result = { status: 'success', tool: name };
    }
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result
    };
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32000,
        message: 'Tool execution failed',
        data: error.message
      }
    };
  }
}

// Define MCP tools
server.defineTools([
  {
    name: "getAccount",
    description: "Retrieves the user's Robinhood crypto trading account details",
    parameters: {},
    returns: {
      type: "object",
      description: "Account information including status, balances, and account ID"
    }
  },
  {
    name: "getHoldings",
    description: "Retrieves the user's cryptocurrency holdings",
    parameters: {
      type: "object",
      properties: {
        asset_codes: {
          type: "array",
          description: "List of specific cryptocurrencies to filter by (e.g., ['BTC', 'ETH'])",
          items: {
            type: "string"
          }
        }
      }
    },
    returns: {
      type: "array",
      description: "List of holdings with quantity, cost basis, and current value",
      items: {
        type: "object"
      }
    }
  },
  {
    name: "getBestPrice",
    description: "Gets the current best bid/ask prices for cryptocurrencies",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Trading pair symbol (e.g., 'BTC-USD')"
        }
      }
    },
    returns: {
      type: "object",
      description: "Current bid and ask prices for the requested symbols"
    }
  },
  {
    name: "getEstimatedPrice",
    description: "Calculates estimated execution price for a potential trade",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Trading pair symbol (e.g., 'BTC-USD')"
        },
        side: {
          type: "string",
          description: "Trade side ('buy' or 'sell')",
          enum: ["buy", "sell"]
        },
        quantity: {
          type: "string",
          description: "Amount to trade (as string to preserve precision)"
        }
      },
      required: ["symbol", "side", "quantity"]
    },
    returns: {
      type: "object",
      description: "Estimated execution price including fees"
    }
  },
  {
    name: "getTradingPairs",
    description: "Lists available cryptocurrency trading pairs",
    parameters: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          description: "List of specific trading pairs to filter by (e.g., ['BTC-USD', 'ETH-USD'])",
          items: {
            type: "string"
          }
        }
      }
    },
    returns: {
      type: "array",
      description: "List of available trading pairs with their status",
      items: {
        type: "object"
      }
    }
  },
  {
    name: "placeOrder",
    description: "Places a cryptocurrency order",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Trading pair symbol (e.g., 'BTC-USD')"
        },
        side: {
          type: "string",
          description: "Order side ('buy' or 'sell')",
          enum: ["buy", "sell"]
        },
        quantity: {
          type: "string",
          description: "Amount to trade (as string to preserve precision)"
        },
        type: {
          type: "string",
          description: "Order type ('market' or 'limit')",
          enum: ["market", "limit"],
          default: "market"
        },
        price: {
          type: "string",
          description: "Limit price (required for limit orders, as string to preserve precision)"
        },
        time_in_force: {
          type: "string",
          description: "Time in force for the order ('gtc', 'ioc', or 'fok')",
          enum: ["gtc", "ioc", "fok"],
          default: "gtc"
        },
        stop_price: {
          type: "string",
          description: "Stop price for stop orders (as string to preserve precision)"
        }
      },
      required: ["symbol", "side", "quantity"]
    },
    returns: {
      type: "object",
      description: "Order confirmation details"
    }
  },
  {
    name: "getOrders",
    description: "Retrieves order history",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by order status (e.g., 'open', 'filled', 'canceled')"
        }
      }
    },
    returns: {
      type: "array",
      description: "List of orders with their details",
      items: {
        type: "object"
      }
    }
  },
  {
    name: "getOrder",
    description: "Gets details for a specific order",
    parameters: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "ID of the order to retrieve"
        }
      },
      required: ["order_id"]
    },
    returns: {
      type: "object",
      description: "Complete order details"
    }
  },
  {
    name: "cancelOrder",
    description: "Cancels an open order",
    parameters: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "ID of the order to cancel"
        }
      },
      required: ["order_id"]
    },
    returns: {
      type: "object",
      description: "Cancellation confirmation"
    }
  }
]);

// Set up request handler
server.setRequestHandler(async (request) => {
  try {
    // Get auth params from request if global params not set
    const apiKey = robinhoodApiKey || getAuthValue(request, "ROBINHOOD_API_KEY");
    if (!apiKey) {
      throw new Error("ROBINHOOD_API_KEY not set");
    }
    
    const { name, arguments: args = {} } = request.params;
    
    // Handle different function calls
    switch (name) {
      case "getAccount":
        return await accountClient.getAccount();
        
      case "getHoldings":
        return await accountClient.getHoldings(args.asset_codes);
        
      case "getBestPrice":
        return await marketDataClient.getBestBidAsk(args.symbol);
        
      case "getEstimatedPrice":
        return await marketDataClient.getEstimatedPrice(
          args.symbol,
          args.side,
          args.quantity
        );
        
      case "getTradingPairs":
        return await tradingClient.getTradingPairs(args.symbols);
        
      case "placeOrder":
        return await tradingClient.placeOrder(
          args.symbol,
          args.side,
          args.quantity,
          args.type,
          args.price,
          args.time_in_force,
          args.stop_price
        );
        
      case "getOrders":
        return await tradingClient.getOrders(args.status);
        
      case "getOrder":
        return await tradingClient.getOrder(args.order_id);
        
      case "cancelOrder":
        return await tradingClient.cancelOrder(args.order_id);
        
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
    throw error;
  }
});

// Start the server
async function startServer() {
  try {
    console.log('Starting server...');
    
    // Create a new transport instance
    const transport = new RestServerTransport({
      port,
      endpoint
    });
    
    console.log('Connecting server to transport...');
    await server.connect(transport);
    
    console.log('Starting transport server...');
    await transport.startServer();
    
    console.log(`Server running on http://localhost:${port}${endpoint}`);
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      try {
        await transport.stopServer();
        console.log('Server stopped');
        process.exit(0);
      } catch (error) {
        console.error('Error shutting down server:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Unhandled error in server startup:', error);
  process.exit(1);
});
