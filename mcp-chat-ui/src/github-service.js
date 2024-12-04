const { Octokit } = require('@octokit/rest');
const Logger = require('./utils/logger');

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

class GitHubService {
    async searchGitHubRepositories(query) {
        try {
            Logger.github('Searching repositories', { query });
            
            const response = await octokit.search.repos({
                q: query,
                sort: 'stars',
                order: 'desc',
                per_page: 10
            });

            Logger.github('Repository search results', { 
                total_count: response.data.total_count,
                items: response.data.items.map(repo => ({
                    full_name: repo.full_name,
                    description: repo.description,
                    stars: repo.stargazers_count,
                    language: repo.language
                }))
            });

            return response.data.items;
        } catch (error) {
            Logger.error('github', 'Failed to search repositories', error);
            throw new Error(`Failed to search GitHub repositories: ${error.message}`);
        }
    }

    async fetchRepositoryContent(repoFullName) {
        try {
            Logger.github('Fetching repository content', { repoFullName });
            
            const [owner, repo] = repoFullName.split('/');
            
            // Get the default branch
            Logger.github('Fetching repository info', { owner, repo });
            const repoInfo = await octokit.repos.get({
                owner,
                repo
            });
            
            const defaultBranch = repoInfo.data.default_branch;
            Logger.github('Retrieved default branch', { defaultBranch });
            
            // Get repository contents
            Logger.github('Fetching root directory contents', { owner, repo, branch: defaultBranch });
            const response = await octokit.repos.getContent({
                owner,
                repo,
                path: '',
                ref: defaultBranch
            });

            const files = [];
            const errors = [];
            
            for (const item of response.data) {
                if (item.type === 'file') {
                    try {
                        Logger.github('Fetching file content', { 
                            owner, 
                            repo, 
                            path: item.path 
                        });
                        
                        const fileContent = await octokit.repos.getContent({
                            owner,
                            repo,
                            path: item.path,
                            ref: defaultBranch
                        });
                        
                        files.push({
                            name: item.name,
                            path: item.path,
                            content: Buffer.from(fileContent.data.content, 'base64').toString()
                        });

                        Logger.github('Successfully fetched file', { 
                            path: item.path,
                            size: fileContent.data.size
                        });
                    } catch (fileError) {
                        Logger.error('github', `Failed to fetch file: ${item.path}`, fileError);
                        errors.push({
                            path: item.path,
                            error: fileError.message
                        });
                    }
                }
            }

            Logger.github('Completed repository content fetch', { 
                totalFiles: files.length,
                errors: errors.length,
                errorDetails: errors
            });

            return files;
        } catch (error) {
            Logger.error('github', 'Failed to fetch repository content', error);
            throw new Error(`Failed to fetch repository content: ${error.message}`);
        }
    }
}

module.exports = new GitHubService();
