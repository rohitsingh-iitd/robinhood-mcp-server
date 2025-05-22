from src.auth.auth import AuthClient

class AccountClient:
    """
    Client for Robinhood Crypto account operations
    """
    def __init__(self, auth_client: AuthClient = None):
        self.auth_client = auth_client or AuthClient()
        
    def get_account(self):
        """
        Get crypto trading account details
        
        Returns:
            Account information from Robinhood API
        """
        path = "/api/v1/crypto/trading/accounts/"
        return self.auth_client.make_api_request("GET", path)
        
    def get_holdings(self, asset_codes=None):
        """
        Get crypto holdings for the account
        
        Args:
            asset_codes: Optional list of asset codes to filter by
            
        Returns:
            Holdings information from Robinhood API
        """
        path = "/api/v1/crypto/trading/holdings/"
        params = {}
        
        if asset_codes:
            if isinstance(asset_codes, list):
                # Convert list to comma-separated string
                params["asset_code"] = ",".join(asset_codes)
            else:
                params["asset_code"] = asset_codes
                
        return self.auth_client.make_api_request("GET", path, params=params)
