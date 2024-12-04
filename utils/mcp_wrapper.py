from typing import Any, Optional
import requests
import time
from .progress_monitor import ProgressMonitor, monitor_operation

class MCPWrapper:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.monitor = ProgressMonitor()
        
    def _handle_github_api_call(self, api_call: callable) -> tuple[bool, Any, Optional[Exception]]:
        """Handle GitHub API calls with proper error handling and monitoring"""
        try:
            self.monitor.update(10, "Initializing GitHub API call...")
            
            # Check GitHub API status
            self.monitor.update(20, "Checking GitHub API status...")
            status_response = requests.get("https://www.githubstatus.com/api/v2/status.json")
            if status_response.status_code != 200:
                raise Exception("GitHub API might be experiencing issues")
            
            # Check rate limits
            self.monitor.update(30, "Checking rate limits...")
            rate_limit_response = requests.get("https://api.github.com/rate_limit")
            if rate_limit_response.status_code == 403:
                raise Exception("Rate limit exceeded. Please wait and try again.")
            
            # Execute the actual API call
            self.monitor.update(50, "Executing API call...")
            result = api_call()
            
            self.monitor.update(100, "Operation completed successfully")
            return True, result, None
            
        except requests.exceptions.Timeout:
            error_msg = "Request timed out. Please check your internet connection and try again."
            self.monitor.log_error(Exception(error_msg))
            return False, None, Exception(error_msg)
            
        except requests.exceptions.RequestException as e:
            self.monitor.log_error(e, "Network error occurred")
            return False, None, e
            
        except Exception as e:
            self.monitor.log_error(e)
            return False, None, e
            
    def create_repository(self, name: str, token: str, private: bool = False) -> tuple[bool, Any, Optional[Exception]]:
        """Create a GitHub repository with progress monitoring"""
        def api_call():
            headers = {
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github.v3+json"
            }
            data = {
                "name": name,
                "private": private,
                "auto_init": True
            }
            response = requests.post(
                "https://api.github.com/user/repos",
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
            
        return self._handle_github_api_call(api_call)

    def retry_with_backoff(self, operation: callable, max_retries: int = 3) -> tuple[bool, Any, Optional[Exception]]:
        """Retry an operation with exponential backoff"""
        for attempt in range(max_retries):
            success, result, error = operation()
            if success:
                return success, result, error
                
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 1  # Exponential backoff: 1, 2, 4 seconds
                self.monitor.update(status=f"Attempt {attempt + 1} failed. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                
        return False, None, error  # Return the last error if all retries failed
