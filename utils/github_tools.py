import os
import json
import base64
from typing import Any, Optional, Dict, List
import requests
from datetime import datetime
from .progress_monitor import ProgressMonitor, monitor_operation
from .mcp_wrapper import MCPWrapper

class GitHubTools:
    def __init__(self, token: str = None):
        self.token = token or os.getenv('GITHUB_TOKEN')
        if not self.token:
            raise ValueError("GitHub token is required. Set it in constructor or GITHUB_TOKEN environment variable.")
        self.mcp = MCPWrapper()
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json"
        }
        self.monitor = ProgressMonitor()

    def _make_request(self, method: str, endpoint: str, data: Dict = None, 
                     description: str = "Making GitHub API request") -> tuple[bool, Any, Optional[Exception]]:
        """Make a GitHub API request with progress monitoring"""
        def api_call():
            self.monitor.update(10, f"Initializing {method} request to {endpoint}...")
            
            # Check GitHub API status
            self.monitor.update(20, "Verifying GitHub API status...")
            status_response = requests.get("https://www.githubstatus.com/api/v2/status.json")
            if status_response.status_code != 200:
                raise Exception("GitHub API might be experiencing issues")
            
            # Check rate limits
            self.monitor.update(30, "Checking API rate limits...")
            rate_limit_response = requests.get(
                f"{self.base_url}/rate_limit",
                headers=self.headers
            )
            if rate_limit_response.status_code == 403:
                raise Exception("Rate limit exceeded. Please wait and try again.")
            
            # Make the actual request
            self.monitor.update(50, f"Executing {method} request...")
            response = requests.request(
                method=method,
                url=f"{self.base_url}/{endpoint.lstrip('/')}",
                headers=self.headers,
                json=data
            )
            
            self.monitor.update(90, "Processing response...")
            response.raise_for_status()
            
            self.monitor.update(100, "Request completed successfully")
            return response.json() if response.text else None

        return self.mcp.retry_with_backoff(api_call)

    # Repository Operations
    def create_repository(self, name: str, private: bool = False, 
                         description: str = "") -> tuple[bool, Any, Optional[Exception]]:
        """Create a new GitHub repository"""
        data = {
            "name": name,
            "private": private,
            "description": description,
            "auto_init": True
        }
        return self._make_request("POST", "/user/repos", data, 
                                f"Creating repository: {name}")

    def delete_repository(self, owner: str, repo: str) -> tuple[bool, Any, Optional[Exception]]:
        """Delete a GitHub repository"""
        return self._make_request("DELETE", f"/repos/{owner}/{repo}",
                                description=f"Deleting repository: {owner}/{repo}")

    def list_repositories(self) -> tuple[bool, Any, Optional[Exception]]:
        """List user's GitHub repositories"""
        return self._make_request("GET", "/user/repos",
                                description="Fetching repository list")

    # Branch Operations
    def create_branch(self, owner: str, repo: str, branch_name: str, 
                     from_branch: str = "main") -> tuple[bool, Any, Optional[Exception]]:
        """Create a new branch in a repository"""
        def create_branch_operation():
            # Get the SHA of the source branch
            success, result, error = self._make_request(
                "GET", f"/repos/{owner}/{repo}/git/refs/heads/{from_branch}",
                description=f"Getting SHA of {from_branch}")
            
            if not success:
                raise Exception(f"Failed to get SHA of {from_branch}: {error}")

            sha = result["object"]["sha"]
            
            # Create new branch
            data = {
                "ref": f"refs/heads/{branch_name}",
                "sha": sha
            }
            return self._make_request(
                "POST", f"/repos/{owner}/{repo}/git/refs", data,
                description=f"Creating branch: {branch_name}")

        return self.mcp.retry_with_backoff(create_branch_operation)

    def delete_branch(self, owner: str, repo: str, 
                     branch_name: str) -> tuple[bool, Any, Optional[Exception]]:
        """Delete a branch from a repository"""
        return self._make_request(
            "DELETE", f"/repos/{owner}/{repo}/git/refs/heads/{branch_name}",
            description=f"Deleting branch: {branch_name}")

    # File Operations
    def create_file(self, owner: str, repo: str, path: str, content: str,
                   commit_message: str, branch: str = "main") -> tuple[bool, Any, Optional[Exception]]:
        """Create a new file in a repository"""
        data = {
            "message": commit_message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch
        }
        return self._make_request(
            "PUT", f"/repos/{owner}/{repo}/contents/{path}", data,
            description=f"Creating file: {path}")

    def update_file(self, owner: str, repo: str, path: str, content: str,
                   commit_message: str, sha: str, branch: str = "main") -> tuple[bool, Any, Optional[Exception]]:
        """Update an existing file in a repository"""
        data = {
            "message": commit_message,
            "content": base64.b64encode(content.encode()).decode(),
            "sha": sha,
            "branch": branch
        }
        return self._make_request(
            "PUT", f"/repos/{owner}/{repo}/contents/{path}", data,
            description=f"Updating file: {path}")

    def get_file_contents(self, owner: str, repo: str, path: str, 
                         ref: str = "main") -> tuple[bool, Any, Optional[Exception]]:
        """Get the contents of a file from a repository"""
        success, result, error = self._make_request(
            "GET", f"/repos/{owner}/{repo}/contents/{path}?ref={ref}",
            description=f"Fetching file contents: {path}")
        
        if success and result:
            try:
                content = base64.b64decode(result["content"]).decode()
                result["decoded_content"] = content
            except Exception as e:
                self.monitor.log_error(e, "Failed to decode file contents")
                
        return success, result, error

    # Pull Request Operations
    def create_pull_request(self, owner: str, repo: str, title: str, head: str,
                          base: str = "main", body: str = "") -> tuple[bool, Any, Optional[Exception]]:
        """Create a new pull request"""
        data = {
            "title": title,
            "head": head,
            "base": base,
            "body": body
        }
        return self._make_request(
            "POST", f"/repos/{owner}/{repo}/pulls", data,
            description=f"Creating pull request: {title}")

    def merge_pull_request(self, owner: str, repo: str, 
                          pull_number: int) -> tuple[bool, Any, Optional[Exception]]:
        """Merge a pull request"""
        return self._make_request(
            "PUT", f"/repos/{owner}/{repo}/pulls/{pull_number}/merge",
            description=f"Merging pull request #{pull_number}")

    # Issue Operations
    def create_issue(self, owner: str, repo: str, title: str,
                    body: str = "") -> tuple[bool, Any, Optional[Exception]]:
        """Create a new issue"""
        data = {
            "title": title,
            "body": body
        }
        return self._make_request(
            "POST", f"/repos/{owner}/{repo}/issues", data,
            description=f"Creating issue: {title}")

    def close_issue(self, owner: str, repo: str, 
                   issue_number: int) -> tuple[bool, Any, Optional[Exception]]:
        """Close an issue"""
        data = {
            "state": "closed"
        }
        return self._make_request(
            "PATCH", f"/repos/{owner}/{repo}/issues/{issue_number}", data,
            description=f"Closing issue #{issue_number}")

    # Workflow Operations
    def list_workflow_runs(self, owner: str, repo: str) -> tuple[bool, Any, Optional[Exception]]:
        """List all workflow runs for a repository"""
        return self._make_request(
            "GET", f"/repos/{owner}/{repo}/actions/runs",
            description="Fetching workflow runs")

    def cancel_workflow_run(self, owner: str, repo: str, 
                          run_id: int) -> tuple[bool, Any, Optional[Exception]]:
        """Cancel a workflow run"""
        return self._make_request(
            "POST", f"/repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
            description=f"Canceling workflow run #{run_id}")

    # Release Operations
    def create_release(self, owner: str, repo: str, tag_name: str, name: str,
                      body: str = "", draft: bool = False,
                      prerelease: bool = False) -> tuple[bool, Any, Optional[Exception]]:
        """Create a new release"""
        data = {
            "tag_name": tag_name,
            "name": name,
            "body": body,
            "draft": draft,
            "prerelease": prerelease
        }
        return self._make_request(
            "POST", f"/repos/{owner}/{repo}/releases", data,
            description=f"Creating release: {name}")

    # Error Handling and Retries
    def handle_rate_limit(self) -> None:
        """Handle rate limit exceeded scenario"""
        success, result, error = self._make_request("GET", "/rate_limit")
        if success and result:
            reset_time = datetime.fromtimestamp(result["resources"]["core"]["reset"])
            wait_time = (reset_time - datetime.now()).total_seconds()
            if wait_time > 0:
                self.monitor.update(status=f"Rate limit exceeded. Waiting {wait_time:.0f} seconds...")
                time.sleep(wait_time)

    def get_rate_limit_info(self) -> tuple[bool, Any, Optional[Exception]]:
        """Get current rate limit information"""
        return self._make_request("GET", "/rate_limit",
                                description="Fetching rate limit information")
