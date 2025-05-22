"""
Main entry point for the Robinhood MCP Server
"""
import asyncio
import threading
import uvicorn
from src.api.rest import app
from src.api.websocket import WebSocketServer
from src.utils.logging import setup_logger
from src.config import HOST, PORT

# Set up logger
logger = setup_logger("main")

def start_rest_server():
    """Start the REST API server"""
    logger.info(f"Starting REST API server on {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)

def start_websocket_server():
    """Start the WebSocket server in a separate thread"""
    logger.info(f"Starting WebSocket server on {HOST}:{int(PORT) + 1}")
    server = WebSocketServer()
    asyncio.run(server.start())

def main():
    """Main entry point"""
    logger.info("Starting Robinhood MCP Server")
    
    # Start WebSocket server in a separate thread
    ws_thread = threading.Thread(target=start_websocket_server)
    ws_thread.daemon = True
    ws_thread.start()
    
    # Start REST API server in the main thread
    start_rest_server()

if __name__ == "__main__":
    main()
