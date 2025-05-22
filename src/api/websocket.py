import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Callable
import websockets
from websockets.server import WebSocketServerProtocol

from src.auth.auth import AuthClient
from src.market_data.market_data import MarketDataClient
from src.trading.trading import TradingClient
from src.utils.logging import setup_logger
from src.config import HOST, PORT

# Set up logger
logger = setup_logger("websocket_server")

class WebSocketServer:
    """
    WebSocket server for real-time data streaming
    """
    def __init__(self, host: str = HOST, port: int = int(PORT) + 1):
        self.host = host
        self.port = port
        self.clients = set()
        self.auth_client = AuthClient()
        self.market_data_client = MarketDataClient(self.auth_client)
        self.trading_client = TradingClient(self.auth_client)
        self.market_data_subscriptions = {}
        self.order_subscriptions = {}
        
    async def register(self, websocket: WebSocketServerProtocol):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"New client connected. Total clients: {len(self.clients)}")
        
    async def unregister(self, websocket: WebSocketServerProtocol):
        """Unregister a client"""
        self.clients.remove(websocket)
        # Remove any subscriptions for this client
        for symbol, subscribers in list(self.market_data_subscriptions.items()):
            if websocket in subscribers:
                subscribers.remove(websocket)
                if not subscribers:
                    del self.market_data_subscriptions[symbol]
                    
        # Remove order subscriptions
        if websocket in self.order_subscriptions:
            del self.order_subscriptions[websocket]
            
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def send_message(self, websocket: WebSocketServerProtocol, message: Dict):
        """Send a message to a client"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            await self.unregister(websocket)
            
    async def broadcast(self, message: Dict):
        """Broadcast a message to all connected clients"""
        if not self.clients:
            return
            
        await asyncio.gather(
            *[self.send_message(client, message) for client in self.clients]
        )
        
    async def handle_market_data_subscription(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle market data subscription request"""
        action = data.get("action")
        symbols = data.get("symbols", [])
        
        if not symbols:
            await self.send_message(
                websocket, 
                {"type": "error", "message": "No symbols provided for subscription"}
            )
            return
            
        if action == "subscribe":
            # Add subscriptions
            for symbol in symbols:
                if symbol not in self.market_data_subscriptions:
                    self.market_data_subscriptions[symbol] = set()
                self.market_data_subscriptions[symbol].add(websocket)
                
            await self.send_message(
                websocket,
                {
                    "type": "subscription",
                    "status": "success",
                    "message": f"Subscribed to {len(symbols)} symbols",
                    "symbols": symbols
                }
            )
            
        elif action == "unsubscribe":
            # Remove subscriptions
            for symbol in symbols:
                if symbol in self.market_data_subscriptions and websocket in self.market_data_subscriptions[symbol]:
                    self.market_data_subscriptions[symbol].remove(websocket)
                    if not self.market_data_subscriptions[symbol]:
                        del self.market_data_subscriptions[symbol]
                        
            await self.send_message(
                websocket,
                {
                    "type": "subscription",
                    "status": "success",
                    "message": f"Unsubscribed from {len(symbols)} symbols",
                    "symbols": symbols
                }
            )
            
    async def handle_order_subscription(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle order updates subscription request"""
        action = data.get("action")
        
        if action == "subscribe":
            self.order_subscriptions[websocket] = True
            await self.send_message(
                websocket,
                {
                    "type": "subscription",
                    "status": "success",
                    "message": "Subscribed to order updates"
                }
            )
            
        elif action == "unsubscribe":
            if websocket in self.order_subscriptions:
                del self.order_subscriptions[websocket]
                
            await self.send_message(
                websocket,
                {
                    "type": "subscription",
                    "status": "success",
                    "message": "Unsubscribed from order updates"
                }
            )
            
    async def handle_message(self, websocket: WebSocketServerProtocol, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "ping":
                await self.send_message(websocket, {"type": "pong"})
                
            elif message_type == "market_data":
                await self.handle_market_data_subscription(websocket, data)
                
            elif message_type == "orders":
                await self.handle_order_subscription(websocket, data)
                
            else:
                await self.send_message(
                    websocket,
                    {"type": "error", "message": f"Unknown message type: {message_type}"}
                )
                
        except json.JSONDecodeError:
            await self.send_message(
                websocket,
                {"type": "error", "message": "Invalid JSON format"}
            )
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            await self.send_message(
                websocket,
                {"type": "error", "message": f"Error processing request: {str(e)}"}
            )
            
    async def market_data_updater(self):
        """Background task to update market data for subscribed symbols"""
        while True:
            try:
                # Get all subscribed symbols
                symbols = list(self.market_data_subscriptions.keys())
                
                if symbols:
                    # Get market data for all subscribed symbols
                    market_data = self.market_data_client.get_best_bid_ask(symbols)
                    
                    # Send updates to subscribers
                    for symbol, data in market_data.items():
                        if symbol in self.market_data_subscriptions:
                            message = {
                                "type": "market_data",
                                "symbol": symbol,
                                "data": data,
                                "timestamp": self.auth_client._get_current_timestamp()
                            }
                            
                            # Send to all subscribers of this symbol
                            for websocket in self.market_data_subscriptions[symbol]:
                                await self.send_message(websocket, message)
            except Exception as e:
                logger.error(f"Error in market data updater: {str(e)}")
                
            # Update every 1 second
            await asyncio.sleep(1)
            
    async def order_updater(self):
        """Background task to update order status for subscribed clients"""
        while True:
            try:
                if self.order_subscriptions:
                    # Get all orders
                    orders = self.trading_client.get_orders()
                    
                    # Send updates to subscribers
                    message = {
                        "type": "orders",
                        "data": orders,
                        "timestamp": self.auth_client._get_current_timestamp()
                    }
                    
                    for websocket in self.order_subscriptions:
                        await self.send_message(websocket, message)
            except Exception as e:
                logger.error(f"Error in order updater: {str(e)}")
                
            # Update every 2 seconds
            await asyncio.sleep(2)
            
    async def handler(self, websocket: WebSocketServerProtocol):
        """Handle WebSocket connection"""
        await self.register(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)
            
    async def start(self):
        """Start the WebSocket server"""
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        
        # Start background tasks
        asyncio.create_task(self.market_data_updater())
        asyncio.create_task(self.order_updater())
        
        # Start server
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()  # Run forever

def start_server():
    """Start the WebSocket server"""
    server = WebSocketServer()
    asyncio.run(server.start())

if __name__ == "__main__":
    start_server()
