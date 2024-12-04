import os
from dotenv import load_dotenv
from utils.github_tools import GitHubTools

# Load environment variables
load_dotenv()

def main():
    # Initialize GitHub tools with token from environment
    github = GitHubTools()
    
    # Example 1: Create a repository
    print("\n1. Creating a repository...")
    success, repo, error = github.create_repository(
        name="test-repo",
        private=True,
        description="A test repository"
    )
    if success:
        print(f"Repository created: {repo['html_url']}")
    else:
        print(f"Failed to create repository: {error}")

    if success:
        owner = repo['owner']['login']
        repo_name = repo['name']
        
        # Example 2: Create a new branch
        print("\n2. Creating a new branch...")
        success, branch, error = github.create_branch(
            owner=owner,
            repo=repo_name,
            branch_name="feature/test"
        )
        if success:
            print("Branch created successfully")
        else:
            print(f"Failed to create branch: {error}")

        # Example 3: Create a file
        print("\n3. Creating a file...")
        success, file, error = github.create_file(
            owner=owner,
            repo=repo_name,
            path="README.md",
            content="# Test Repository\nThis is a test repository.",
            commit_message="Add README.md"
        )
        if success:
            print("File created successfully")
        else:
            print(f"Failed to create file: {error}")

        # Example 4: Create a pull request
        print("\n4. Creating a pull request...")
        success, pr, error = github.create_pull_request(
            owner=owner,
            repo=repo_name,
            title="Add README",
            head="feature/test",
            base="main",
            body="Added README.md file"
        )
        if success:
            print(f"Pull request created: {pr['html_url']}")
        else:
            print(f"Failed to create pull request: {error}")

    # Example 5: Check rate limit
    print("\n5. Checking rate limit...")
    success, rate_limit, error = github.get_rate_limit_info()
    if success:
        core = rate_limit['resources']['core']
        print(f"API Rate Limit: {core['remaining']}/{core['limit']}")
    else:
        print(f"Failed to get rate limit info: {error}")

if __name__ == "__main__":
    main()
