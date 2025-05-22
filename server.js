// server.js - Main entry point for the Robinhood MCP Server
import { RestServerTransport } from '@chatmcp/sdk/server/rest.js';
import express from 'express';
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

// Simple MCP server implementation
const server = {
  connect: async (transport) => {
    console.log('Server connecting to transport...');
    serverState.transport = transport;
    
    // Simple message handler that responds immediately
    transport.onmessage = async (message) => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] Received message:`, message.method || 'unknown');
      
      try {
        let result;
        
        // Handle different message types
        switch (message.method) {
          case 'initialize':
            result = await handleInitialize(message);
            break;
            
          case 'tools/list':
            // Return tools immediately without async/await
            const toolsList = serverState.tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters || { type: "object", properties: {} }
            }));
            
            result = {
              jsonrpc: '2.0',
              id: message.id,
              result: { tools: toolsList }
            };
            break;
            
          case 'tools/execute':
            if (serverState.requestHandler) {
              const { name, parameters } = message.params;
              result = {
                jsonrpc: '2.0',
                id: message.id,
                result: await serverState.requestHandler({
                  method: name,
                  params: parameters
                })
              };
            } else {
              result = {
                jsonrpc: '2.0',
                id: message.id,
                error: { code: -32601, message: 'No request handler registered' }
              };
            }
            break;
            
          default:
            result = {
              jsonrpc: '2.0',
              id: message.id,
              error: { code: -32601, message: 'Method not found' }
            };
        }
        
        // Send response
        if (result) {
          await transport.send(result);
          console.log(`[${new Date().toISOString()}] Sent response for ${message.method} in ${Date.now() - startTime}ms`);
        }
        
      } catch (error) {
        console.error(`Error handling ${message.method}:`, error);
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
    return Promise.resolve();
  },
  
  defineTools: (tools) => {
    serverState.tools = tools || [];
    console.log(`Registered ${serverState.tools.length} tools`);
    return Promise.resolve();
  },
  
  setRequestHandler: (handler) => {
    serverState.requestHandler = handler;
    console.log('Request handler set');
    return Promise.resolve();
  }
};

// Handle initialize message - respond immediately with minimal capabilities
async function handleInitialize(message) {
  console.log('Handling initialize request');
  
  // Respond immediately with minimal capabilities
  return {
    jsonrpc: '2.0',
    id: message.id,
    result: {
      serverInfo: {
        name: "Robinhood MCP Server",
        version: "1.0.0"
      },
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
  console.log('Handling list tools request');
  
  try {
    // Return the tools list immediately
    const toolsList = serverState.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || { type: "object", properties: {} }
    }));
    
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: toolsList
      }
    };
    
    console.log('Sending tools list:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error listing tools:', error);
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32000,
        message: 'Failed to list tools',
        data: error.message
      }
    };
  }
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

// Define MCP tools (must be defined before server starts)
const MCP_TOOLS = [
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
          items: { type: "string" }
        }
      },
      required: []
    },
    returns: {
      type: "object",
      description: "List of cryptocurrency holdings with details"
    }
  },
  {
    name: "getCryptoQuote",
    description: "Gets the current quote for a cryptocurrency",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Cryptocurrency symbol (e.g., 'BTC' or 'ETH')"
        }
      },
      required: ["symbol"]
    },
    returns: {
      type: "object",
      description: "Current quote information for the specified cryptocurrency"
    }
  },
  {
    name: "placeOrder",
    description: "Places a new order for a cryptocurrency",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Cryptocurrency symbol (e.g., 'BTC' or 'ETH')"
        },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Order side (buy or sell)"
        },
        type: {
          type: "string",
          enum: ["market", "limit"],
          description: "Order type (market or limit)"
        },
        amount: {
          type: "number",
          description: "Amount to buy/sell in the cryptocurrency"
        },
        price: {
          type: "number",
          description: "Limit price (required for limit orders)"
        }
      },
      required: ["symbol", "side", "type", "amount"]
    },
    returns: {
      type: "object",
      description: "Order details and status"
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
      description: "Cancellation status"
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
];

// Initialize server with tools
server.defineTools(MCP_TOOLS);

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

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    // Respond immediately with server status
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// Start the server
async function startServer() {
  console.log('Starting server...');
  
  // Create Express app with JSON parsing
  const app = express();
  app.use(express.json());
  
  // Add request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    res.on('finish', () => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${Date.now() - startTime}ms`);
    });
    
    next();
  });
  
  // Health check endpoint (must respond quickly)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Create transport with Express app
  const transport = new RestServerTransport({
    port,
    endpoint,
    server: app
  });
  
  // Set timeouts
  const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
  const SERVER_TIMEOUT_MS = 15000;  // 15 seconds
  
  // Request timeout middleware
  app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      console.error(`Request timed out: ${req.method} ${req.url}`);
      if (!res.headersSent) {
        res.status(504).json({ 
          error: 'Request timeout',
          message: 'The server did not receive a timely response'
        });
      }
    });
    next();
  });
  
  // Connect to transport
  console.log('Connecting to transport...');
  try {
    await server.connect(transport);
    console.log('Successfully connected to transport');
  } catch (error) {
    console.error('Failed to connect to transport:', error);
    process.exit(1);
  }
  
  // Start HTTP server
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(port, '0.0.0.0', () => {
      const address = httpServer.address();
      console.log(`Server running on http://0.0.0.0:${address.port}${endpoint}`);
      console.log(`Health check: http://0.0.0.0:${address.port}/health`);
      
      // Set server timeout
      httpServer.setTimeout(SERVER_TIMEOUT_MS);
      
      // Handle server errors
      httpServer.on('error', (error) => {
        console.error('Server error:', error);
        if (!httpServer.listening) {
          reject(error);
        }
      });
      
      // Handle process termination
      const shutdown = async (signal) => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        
        try {
          // Close HTTP server
          await new Promise((resolveClose) => {
            httpServer.close((err) => {
              if (err) console.error('Error closing HTTP server:', err);
              resolveClose();
            });
          });
          
          // Close transport if available
          if (transport && typeof transport.stopServer === 'function') {
            await transport.stopServer().catch(err => {
              console.error('Error stopping transport:', err);
            });
          }
          
          console.log('Server stopped');
          process.exit(0);
          
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      };
      
      // Handle signals
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
      
      // Resolve with the server instance
      resolve(httpServer);
    });
    
    // Handle any errors during server startup
    httpServer.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });
    
    // Set a startup timeout
    setTimeout(() => {
      if (!httpServer.listening) {
        const error = new Error('Server startup timed out');
        console.error(error.message);
        httpServer.close();
        reject(error);
      }
    }, 10000); // 10 second startup timeout
  });
}

// Start the server with error handling
async function main() {
  try {
    // Register tools before starting the server
    console.log('Registering tools...');
    await server.defineTools(MCP_TOOLS);
    
    // Start the server
    console.log('Starting server...');
    await startServer();
    
    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
