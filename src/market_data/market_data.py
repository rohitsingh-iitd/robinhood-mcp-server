from typing import Dict, List, Optional
from src.auth.auth import AuthClient

class MarketDataClient:
    """
    Client for Robinhood Crypto market data operations
    """
    def __init__(self, auth_client: AuthClient = None):
        self.auth_client = auth_client or AuthClient()
        
    def get_best_bid_ask(self, symbols=None):
        """
        Get best bid/ask prices for crypto trading pairs
        
        Args:
            symbols: Optional list of symbols to filter by
            
        Returns:
            Best bid/ask information from Robinhood API
        """
        path = "/api/v1/crypto/marketdata/best_bid_ask/"
        params = {}
        
        if symbols:
            if isinstance(symbols, list):
                # Convert list to comma-separated string
                params["symbol"] = ",".join(symbols)
            else:
                params["symbol"] = symbols
                
        return self.auth_client.make_api_request("GET", path, params=params)
        
    def get_estimated_price(self, symbol: str, side: str, quantity: str):
        """
        Get estimated price for a crypto trade
        
        Args:
            symbol: Trading pair symbol (e.g., "BTC-USD")
            side: Trade side ("buy" or "sell")
            quantity: Trade quantity
            
        Returns:
            Estimated price information from Robinhood API
        """
        path = f"/api/v1/crypto/marketdata/estimated_price/"
        params = {
            "symbol": symbol,
            "side": side,
            "quantity": quantity
        }
        
        return self.auth_client.make_api_request("GET", path, params=params)
