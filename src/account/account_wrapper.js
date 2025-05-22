// account_wrapper.js - Wrapper for the Python AccountClient for Node.js compatibility

const { spawn } = require('child_process');
const path = require('path');

class AccountClient {
  constructor(authClient) {
    this.authClient = authClient;
  }
  
  async getAccount() {
    // Execute the Python account client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'account',
        'get_account'
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
  
  async getHoldings(assetCodes = null) {
    // Execute the Python account client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        path.join(__dirname, '../../python_bridge.py'),
        'account',
        'get_holdings',
        JSON.stringify(assetCodes || [])
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

module.exports = { AccountClient };
