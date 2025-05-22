from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict, List, Optional, Any

from src.auth.auth import AuthClient
from src.account.account import AccountClient
from src.market_data.market_data import MarketDataClient
from src.trading.trading import TradingClient
from src.utils.helpers import APIError, format_response
from src.utils.logging import setup_logger
from src.config import HOST, PORT, DEBUG, RATE_LIMIT_ENABLED, RATE_LIMIT_REQUESTS, RATE_LIMIT_PERIOD

# Set up logger
logger = setup_logger("api_server")

# Create FastAPI app
app = FastAPI(
    title="Robinhood MCP Server",
    description="Market Connectivity Protocol Server for Robinhood Crypto API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create client instances
auth_client = AuthClient()
account_client = AccountClient(auth_client)
market_data_client = MarketDataClient(auth_client)
trading_client = TradingClient(auth_client)

# Exception handler for APIError
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error_type": exc.error_type,
            "detail": exc.detail
        }
    )

# Root endpoint
@app.get("/")
async def root():
    return format_response(
        data={"name": "Robinhood MCP Server", "status": "running"},
        message="Server is running"
    )

# Authentication endpoints
@app.get("/auth/status")
async def auth_status():
    try:
        status = auth_client.check_auth_status()
        return format_response(data=status)
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

# Account endpoints
@app.get("/account")
async def get_account():
    try:
        account_info = account_client.get_account()
        return format_response(data=account_info)
    except Exception as e:
        logger.error(f"Error retrieving account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve account information: {str(e)}"
        )

@app.get("/account/holdings")
async def get_holdings(asset_code: Optional[str] = None):
    try:
        holdings = account_client.get_holdings(asset_code)
        return format_response(data=holdings)
    except Exception as e:
        logger.error(f"Error retrieving holdings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve holdings: {str(e)}"
        )

# Market data endpoints
@app.get("/market/best-price")
async def get_best_price(symbol: Optional[str] = None):
    try:
        prices = market_data_client.get_best_bid_ask(symbol)
        return format_response(data=prices)
    except Exception as e:
        logger.error(f"Error retrieving best prices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve best prices: {str(e)}"
        )

@app.get("/market/estimated-price")
async def get_estimated_price(symbol: str, side: str, quantity: str):
    try:
        price = market_data_client.get_estimated_price(symbol, side, quantity)
        return format_response(data=price)
    except Exception as e:
        logger.error(f"Error retrieving estimated price: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve estimated price: {str(e)}"
        )

# Trading endpoints
@app.get("/trading/pairs")
async def get_trading_pairs(symbol: Optional[str] = None):
    try:
        pairs = trading_client.get_trading_pairs(symbol)
        return format_response(data=pairs)
    except Exception as e:
        logger.error(f"Error retrieving trading pairs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve trading pairs: {str(e)}"
        )

@app.get("/trading/orders")
async def get_orders(status: Optional[str] = None):
    try:
        orders = trading_client.get_orders(status)
        return format_response(data=orders)
    except Exception as e:
        logger.error(f"Error retrieving orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve orders: {str(e)}"
        )

@app.get("/trading/orders/{order_id}")
async def get_order(order_id: str):
    try:
        order = trading_client.get_order(order_id)
        return format_response(data=order)
    except Exception as e:
        logger.error(f"Error retrieving order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve order: {str(e)}"
        )

@app.post("/trading/orders")
async def place_order(order: Dict):
    try:
        # Extract order parameters
        symbol = order.get("symbol")
        side = order.get("side")
        quantity = order.get("quantity")
        order_type = order.get("type", "market")
        price = order.get("price")
        time_in_force = order.get("time_in_force", "gtc")
        stop_price = order.get("stop_price")
        
        # Validate required fields
        if not all([symbol, side, quantity]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: symbol, side, and quantity are required"
            )
            
        # Place order
        result = trading_client.place_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            type=order_type,
            price=price,
            time_in_force=time_in_force,
            stop_price=stop_price
        )
        
        return format_response(
            data=result,
            message=f"{side.capitalize()} order placed successfully"
        )
    except Exception as e:
        logger.error(f"Error placing order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}"
        )

@app.delete("/trading/orders/{order_id}")
async def cancel_order(order_id: str):
    try:
        result = trading_client.cancel_order(order_id)
        return format_response(
            data=result,
            message="Order cancelled successfully"
        )
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )

def start_server():
    """Start the FastAPI server"""
    uvicorn.run(
        "src.api.rest:app",
        host=HOST,
        port=PORT,
        reload=DEBUG
    )

if __name__ == "__main__":
    start_server()
