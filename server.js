// server.js - Main entry point for the Robinhood MCP Server

const { Server, StdioServerTransport, RestServerTransport } = require('@chatmcp/sdk');
const { getParamValue, getAuthValue } = require('@chatmcp/sdk/utils/index.js');

// Import Robinhood modules
const { AuthClient } = require('./src/auth/auth_wrapper');
const { AccountClient } = require('./src/account/account_wrapper');
const { MarketDataClient } = require('./src/market_data/market_data_wrapper');
const { TradingClient } = require('./src/trading/trading_wrapper');

// Get parameters from environment or command line
const robinhoodApiKey = getParamValue("robinhood_api_key") || "";
const robinhoodPrivateKey = getParamValue("robinhood_private_key") || "";
const mode = getParamValue("mode") || "stdio";
const port = getParamValue("port") || 9593;
const endpoint = getParamValue("endpoint") || "/rest";

// Initialize clients
const authClient = new AuthClient(robinhoodApiKey, robinhoodPrivateKey);
const accountClient = new AccountClient(authClient);
const marketDataClient = new MarketDataClient(authClient);
const tradingClient = new TradingClient(authClient);

// Create MCP server
const server = new Server();

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

// Run the server
async function runServer() {
  try {
    // Support both stdio and REST transport
    if (mode === "rest") {
      const transport = new RestServerTransport({
        port,
        endpoint,
      });
      await server.connect(transport);
      await transport.startServer();
      console.log(`Robinhood MCP Server running on REST with port ${port} and endpoint ${endpoint}`);
    } else {
      // Default to stdio transport
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log("Robinhood MCP Server running on stdio with Robinhood Crypto trading tools");
    }
  } catch (error) {
    console.error(`Fatal error running server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
runServer();
