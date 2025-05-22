// trading_wrapper.js - Wrapper for the Python TradingClient for Node.js compatibility

const { spawn } = require('child_process');
const path = require('path');

class TradingClient {
  constructor(authClient) {
    this.authClient = authClient;
  }
  
  async getTradingPairs(symbols = null) {
    // Execute the Python trading client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'trading',
        'get_trading_pairs',
        JSON.stringify(symbols || [])
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
  
  async placeOrder(symbol, side, quantity, type = "market", price = null, timeInForce = "gtc", stopPrice = null) {
    // Execute the Python trading client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'trading',
        'place_order',
        symbol,
        side,
        quantity,
        type,
        price || "",
        timeInForce,
        stopPrice || ""
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
  
  async getOrders(status = null) {
    // Execute the Python trading client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'trading',
        'get_orders',
        status || ""
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
  
  async getOrder(orderId) {
    // Execute the Python trading client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'trading',
        'get_order',
        orderId
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
  
  async cancelOrder(orderId) {
    // Execute the Python trading client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'trading',
        'cancel_order',
        orderId
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

module.exports = { TradingClient };
