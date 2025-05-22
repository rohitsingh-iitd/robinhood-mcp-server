import json
from typing import Dict, Any, Optional

class APIError(Exception):
    """Custom exception for API errors"""
    def __init__(self, status_code: int, detail: str, error_type: str = "api_error"):
        self.status_code = status_code
        self.detail = detail
        self.error_type = error_type
        super().__init__(self.detail)

def format_response(data: Any, status: str = "success", message: str = None) -> Dict:
    """
    Format API response in a consistent structure
    
    Args:
        data: Response data
        status: Response status
        message: Optional message
        
    Returns:
        Formatted response dictionary
    """
    response = {
        "status": status,
        "data": data
    }
    
    if message:
        response["message"] = message
        
    return response

def parse_query_params(params: Dict) -> Dict:
    """
    Parse and validate query parameters
    
    Args:
        params: Query parameters dictionary
        
    Returns:
        Validated and processed parameters
    """
    # Process parameters as needed
    return {k: v for k, v in params.items() if v is not None}

def validate_request_body(body: Dict, required_fields: list) -> None:
    """
    Validate request body has all required fields
    
    Args:
        body: Request body dictionary
        required_fields: List of required field names
        
    Raises:
        APIError: If validation fails
    """
    missing_fields = [field for field in required_fields if field not in body]
    
    if missing_fields:
        raise APIError(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing_fields)}",
            error_type="validation_error"
        )
