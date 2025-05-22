from typing import Dict, List, Optional, Any
import json
from src.auth.auth import AuthClient

class TradingClient:
    """
    Client for Robinhood Crypto trading operations
    """
    def __init__(self, auth_client: AuthClient = None):
        self.auth_client = auth_client or AuthClient()
        
    def get_trading_pairs(self, symbols=None):
        """
        Get available crypto trading pairs
        
        Args:
            symbols: Optional list of symbols to filter by
            
        Returns:
            Trading pairs information from Robinhood API
        """
        path = "/api/v1/crypto/trading/trading_pairs/"
        params = {}
        
        if symbols:
            if isinstance(symbols, list):
                # Convert list to comma-separated string
                params["symbol"] = ",".join(symbols)
            else:
                params["symbol"] = symbols
                
        return self.auth_client.make_api_request("GET", path, params=params)
        
    def place_order(self, symbol: str, side: str, quantity: str, type: str = "market", 
                   price: str = None, time_in_force: str = "gtc", stop_price: str = None):
        """
        Place a crypto order
        
        Args:
            symbol: Trading pair symbol (e.g., "BTC-USD")
            side: Order side ("buy" or "sell")
            quantity: Order quantity
            type: Order type ("market" or "limit")
            price: Limit price (required for limit orders)
            time_in_force: Time in force ("gtc", "ioc", or "fok")
            stop_price: Stop price (for stop orders)
            
        Returns:
            Order information from Robinhood API
        """
        path = "/api/v1/crypto/trading/orders/"
        
        order_data = {
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "type": type,
            "time_in_force": time_in_force
        }
        
        if type == "limit" and price:
            order_data["price"] = price
            
        if stop_price:
            order_data["stop_price"] = stop_price
            
        body = json.dumps(order_data)
        
        return self.auth_client.make_api_request("POST", path, body=body)
        
    def get_orders(self, status: str = None):
        """
        Get crypto orders
        
        Args:
            status: Optional order status to filter by
            
        Returns:
            Orders information from Robinhood API
        """
        path = "/api/v1/crypto/trading/orders/"
        params = {}
        
        if status:
            params["status"] = status
                
        return self.auth_client.make_api_request("GET", path, params=params)
        
    def get_order(self, order_id: str):
        """
        Get a specific crypto order
        
        Args:
            order_id: Order ID
            
        Returns:
            Order information from Robinhood API
        """
        path = f"/api/v1/crypto/trading/orders/{order_id}/"
        return self.auth_client.make_api_request("GET", path)
        
    def cancel_order(self, order_id: str):
        """
        Cancel a crypto order
        
        Args:
            order_id: Order ID
            
        Returns:
            Cancellation confirmation from Robinhood API
        """
        path = f"/api/v1/crypto/trading/orders/{order_id}/cancel/"
        return self.auth_client.make_api_request("POST", path)
