// auth_wrapper.js - Wrapper for the Python AuthClient for Node.js compatibility

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AuthClient {
  constructor(apiKey, privateKey) {
    this.apiKey = apiKey;
    this.privateKey = privateKey;
    
    // Store credentials in environment for Python modules
    process.env.ROBINHOOD_API_KEY = apiKey;
    process.env.ROBINHOOD_PRIVATE_KEY = privateKey;
  }
  
  async makeApiRequest(method, path, body = "", params = null) {
    // Execute the Python auth client via a subprocess
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        join(__dirname, '../../python_bridge.py'),
        'auth',
        'make_api_request',
        method,
        path,
        body,
        JSON.stringify(params || {})
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
  
  async checkAuthStatus() {
    return this.makeApiRequest('GET', '/api/v1/crypto/trading/accounts/');
  }
}

export { AuthClient };
