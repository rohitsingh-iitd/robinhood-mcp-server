"""
Test script for validating the Robinhood MCP Server
"""
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base URL for the MCP server
BASE_URL = "http://localhost:8000"

def test_auth_status():
    """Test authentication status endpoint"""
    print("\n=== Testing Authentication Status ===")
    response = requests.get(f"{BASE_URL}/auth/status")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_account_info():
    """Test account information endpoint"""
    print("\n=== Testing Account Information ===")
    response = requests.get(f"{BASE_URL}/account")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_holdings():
    """Test holdings endpoint"""
    print("\n=== Testing Holdings ===")
    response = requests.get(f"{BASE_URL}/account/holdings")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_trading_pairs():
    """Test trading pairs endpoint"""
    print("\n=== Testing Trading Pairs ===")
    response = requests.get(f"{BASE_URL}/trading/pairs")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_best_price():
    """Test best price endpoint"""
    print("\n=== Testing Best Price ===")
    # Test with BTC-USD
    response = requests.get(f"{BASE_URL}/market/best-price?symbol=BTC-USD")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_estimated_price():
    """Test estimated price endpoint"""
    print("\n=== Testing Estimated Price ===")
    # Test with BTC-USD, buy, 0.001 BTC
    response = requests.get(
        f"{BASE_URL}/market/estimated-price?symbol=BTC-USD&side=buy&quantity=0.001"
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_orders():
    """Test orders endpoint"""
    print("\n=== Testing Orders ===")
    response = requests.get(f"{BASE_URL}/trading/orders")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def run_all_tests():
    """Run all validation tests"""
    print("Starting Robinhood MCP Server validation tests...")
    
    tests = [
        test_auth_status,
        test_account_info,
        test_holdings,
        test_trading_pairs,
        test_best_price,
        test_estimated_price,
        test_orders
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"Error: {str(e)}")
            results.append(False)
    
    # Print summary
    print("\n=== Test Summary ===")
    total = len(tests)
    passed = sum(results)
    print(f"Passed: {passed}/{total} tests")
    
    if passed == total:
        print("All tests passed! The MCP server is working correctly.")
    else:
        print(f"Failed {total - passed} tests. Please check the logs for details.")

if __name__ == "__main__":
    run_all_tests()
