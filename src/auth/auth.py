import base64
import datetime
import json
from typing import Any, Dict, List, Optional
import uuid
import requests
from nacl.signing import SigningKey

from src.config import API_KEY, PRIVATE_KEY, BASE_URL


class AuthClient:
    """
    Authentication client for Robinhood Crypto API
    Handles API key authentication and request signing
    """
    def __init__(self):
        self.api_key = API_KEY
        if not self.api_key:
            raise ValueError("API key not found in environment variables")
            
        self.private_key_seed = base64.b64decode(PRIVATE_KEY) if PRIVATE_KEY else None
        if not self.private_key_seed:
            raise ValueError("Private key not found in environment variables")
            
        self.private_key = SigningKey(self.private_key_seed)
        self.base_url = BASE_URL

    @staticmethod
    def _get_current_timestamp() -> int:
        """Get current UTC timestamp in seconds"""
        return int(datetime.datetime.now(tz=datetime.timezone.utc).timestamp())

    def get_authorization_header(
            self, method: str, path: str, body: str = "", timestamp: Optional[int] = None
    ) -> Dict[str, str]:
        """
        Generate authorization headers for Robinhood API requests
        
        Args:
            method: HTTP method (GET, POST, etc.)
            path: API endpoint path
            body: Request body as JSON string
            timestamp: Optional timestamp override (for testing)
            
        Returns:
            Dict containing authorization headers
        """
        if timestamp is None:
            timestamp = self._get_current_timestamp()
            
        message_to_sign = f"{self.api_key}{timestamp}{path}{method}{body}"
        signed = self.private_key.sign(message_to_sign.encode("utf-8"))

        return {
            "x-api-key": self.api_key,
            "x-signature": base64.b64encode(signed.signature).decode("utf-8"),
            "x-timestamp": str(timestamp),
        }

    def make_api_request(self, method: str, path: str, body: str = "", params: Dict = None) -> Any:
        """
        Make authenticated API request to Robinhood
        
        Args:
            method: HTTP method (GET, POST, etc.)
            path: API endpoint path
            body: Request body as JSON string
            params: Query parameters
            
        Returns:
            API response as JSON
        """
        timestamp = self._get_current_timestamp()
        headers = self.get_authorization_header(method, path, body, timestamp)
        url = self.base_url + path

        try:
            response = None
            if method == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == "POST":
                response = requests.post(
                    url, 
                    headers=headers, 
                    json=json.loads(body) if body else None, 
                    timeout=10
                )
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
                
            if response:
                response.raise_for_status()
                return response.json() if response.content else {}
                
        except requests.RequestException as e:
            error_msg = f"Error making API request: {e}"
            if hasattr(e, 'response') and e.response:
                error_msg += f", Status code: {e.response.status_code}"
                if e.response.content:
                    try:
                        error_msg += f", Response: {e.response.json()}"
                    except:
                        error_msg += f", Response: {e.response.content}"
            raise Exception(error_msg)
            
        return None

    def check_auth_status(self) -> Dict:
        """
        Check if authentication is working properly
        
        Returns:
            Dict with authentication status
        """
        try:
            # Try to get account info as a test
            path = "/api/v1/crypto/trading/accounts/"
            result = self.make_api_request("GET", path)
            return {
                "status": "authenticated",
                "message": "Authentication successful",
                "timestamp": self._get_current_timestamp()
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "timestamp": self._get_current_timestamp()
            }
