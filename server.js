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

// Set up request handler
server.setRequestHandler(async (request) => {
  try {
    // Get auth params from request if global params not set
    const apiKey = robinhoodApiKey || getAuthValue(request, "ROBINHOOD_API_KEY");
    if (!apiKey) {
      throw new Error("ROBINHOOD_API_KEY not set");
    }
    
    const { name, arguments: args } = request.params;
    if (!args) {
      throw new Error("No arguments provided");
    }
    
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
      console.log("Robinhood MCP Server running on stdio with Ask, Research, and Reason tools");
    }
  } catch (error) {
    console.error(`Fatal error running server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
runServer();
