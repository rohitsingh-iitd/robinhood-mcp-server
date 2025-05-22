#!/usr/bin/env python3
"""
Python bridge for connecting Node.js MCP server to Python Robinhood client
This script acts as a bridge between the Node.js MCP server and the Python Robinhood client
"""

import sys
import json
import os
from src.auth.auth import AuthClient
from src.account.account import AccountClient
from src.market_data.market_data import MarketDataClient
from src.trading.trading import TradingClient

def main():
    # Check arguments
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
    
    # Get module and function from arguments
    module = sys.argv[1]
    function = sys.argv[2]
    
    # Initialize auth client
    auth_client = AuthClient()
    
    try:
        # Handle auth module functions
        if module == "auth":
            if function == "make_api_request":
                if len(sys.argv) < 5:
                    print(json.dumps({"error": "Invalid arguments for make_api_request"}))
                    sys.exit(1)
                
                method = sys.argv[3]
                path = sys.argv[4]
                body = sys.argv[5] if len(sys.argv) > 5 else ""
                params = json.loads(sys.argv[6]) if len(sys.argv) > 6 else None
                
                result = auth_client.make_api_request(method, path, body, params)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Unknown auth function: {function}"}))
                sys.exit(1)
        
        # Handle account module functions
        elif module == "account":
            account_client = AccountClient(auth_client)
            
            if function == "get_account":
                result = account_client.get_account()
                print(json.dumps(result))
            elif function == "get_holdings":
                asset_codes = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
                result = account_client.get_holdings(asset_codes)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Unknown account function: {function}"}))
                sys.exit(1)
        
        # Handle market_data module functions
        elif module == "market_data":
            market_data_client = MarketDataClient(auth_client)
            
            if function == "get_best_bid_ask":
                symbols = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
                result = market_data_client.get_best_bid_ask(symbols)
                print(json.dumps(result))
            elif function == "get_estimated_price":
                if len(sys.argv) < 6:
                    print(json.dumps({"error": "Invalid arguments for get_estimated_price"}))
                    sys.exit(1)
                
                symbol = sys.argv[3]
                side = sys.argv[4]
                quantity = sys.argv[5]
                
                result = market_data_client.get_estimated_price(symbol, side, quantity)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Unknown market_data function: {function}"}))
                sys.exit(1)
        
        # Handle trading module functions
        elif module == "trading":
            trading_client = TradingClient(auth_client)
            
            if function == "get_trading_pairs":
                symbols = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
                result = trading_client.get_trading_pairs(symbols)
                print(json.dumps(result))
            elif function == "place_order":
                if len(sys.argv) < 6:
                    print(json.dumps({"error": "Invalid arguments for place_order"}))
                    sys.exit(1)
                
                symbol = sys.argv[3]
                side = sys.argv[4]
                quantity = sys.argv[5]
                order_type = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] else "market"
                price = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] else None
                time_in_force = sys.argv[8] if len(sys.argv) > 8 and sys.argv[8] else "gtc"
                stop_price = sys.argv[9] if len(sys.argv) > 9 and sys.argv[9] else None
                
                result = trading_client.place_order(
                    symbol, side, quantity, order_type, price, time_in_force, stop_price
                )
                print(json.dumps(result))
            elif function == "get_orders":
                status = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
                result = trading_client.get_orders(status)
                print(json.dumps(result))
            elif function == "get_order":
                if len(sys.argv) < 4:
                    print(json.dumps({"error": "Invalid arguments for get_order"}))
                    sys.exit(1)
                
                order_id = sys.argv[3]
                result = trading_client.get_order(order_id)
                print(json.dumps(result))
            elif function == "cancel_order":
                if len(sys.argv) < 4:
                    print(json.dumps({"error": "Invalid arguments for cancel_order"}))
                    sys.exit(1)
                
                order_id = sys.argv[3]
                result = trading_client.cancel_order(order_id)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Unknown trading function: {function}"}))
                sys.exit(1)
        
        else:
            print(json.dumps({"error": f"Unknown module: {module}"}))
            sys.exit(1)
    
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
