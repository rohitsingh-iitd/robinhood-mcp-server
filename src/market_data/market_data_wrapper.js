// market_data_wrapper.js - Wrapper for the Python MarketDataClient for Node.js compatibility

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MarketDataClient {
  constructor(authClient) {
    this.authClient = authClient;
  }
  
  async getBestBidAsk(symbols = null) {
    // Execute the Python market data client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        join(__dirname, '../../python_bridge.py'),
        'market_data',
        'get_best_bid_ask',
        ...(symbols ? [JSON.stringify(symbols)] : [])
      ]);
      
      let result = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
        } else {
          try {
            resolve(JSON.parse(result));
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e.message}`));
          }
        }
      });
    });
  }
  
  async getEstimatedPrice(symbol, side, quantity) {
    // Execute the Python market data client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'market_data',
        'get_estimated_price',
        symbol,
        side,
        quantity
      ]);
      
      let result = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
        } else {
          try {
            resolve(JSON.parse(result));
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e.message}`));
          }
        }
      });
    });
  }
}

export { MarketDataClient };
