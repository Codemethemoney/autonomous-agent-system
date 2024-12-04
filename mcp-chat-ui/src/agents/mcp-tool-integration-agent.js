#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

class MCPToolIntegrationAgent {
    constructor() {
        // Predefined tool configurations
        this.toolConfigs = {
            'filesystem': {
                'list_allowed_directories': this.listAllowedDirectories.bind(this),
                'list_directory': this.listDirectory.bind(this),
                'read_file': this.readFile.bind(this)
            },
            'brave-search': {
                'brave_web_search': this.braveWebSearch.bind(this)
            },
            'fetch': {
                'fetch': this.fetchWebContent.bind(this)
            },
            'sqlite': {
                'list-tables': this.listSQLiteTables.bind(this)
            }
        };

        // Allowed roots for filesystem operations
        this.allowedRoots = [
            '/Users/garyoleary/MACK_MCP',
            '/Users/garyoleary/Desktop',
            '/Users/garyoleary/Documents'
        ];
    }

    // Utility method to check if a path is allowed
    isPathAllowed(targetPath) {
        const normalizedPath = path.resolve(targetPath);
        return this.allowedRoots.some(root => 
            normalizedPath.startsWith(root)
        );
    }

    async executeCommand(server, tool, ...args) {
        try {
            // Validate server and tool
            if (!this.toolConfigs[server]) {
                throw new Error(`Unsupported server: ${server}`);
            }

            if (!this.toolConfigs[server][tool]) {
                throw new Error(`Unsupported tool: ${tool}`);
            }

            // Execute the tool-specific method
            const result = await this.toolConfigs[server][tool](...args);
            return result;
        } catch (error) {
            console.error(`Tool execution error: ${error.message}`);
            return { 
                error: error.message, 
                details: error.toString() 
            };
        }
    }

    async listAllowedDirectories() {
        return this.allowedRoots;
    }

    async listDirectory(dirPath) {
        // Validate path
        if (!this.isPathAllowed(dirPath)) {
            throw new Error(`Access denied to path: ${dirPath}`);
        }

        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            return files.map(file => ({
                name: file.name,
                type: file.isDirectory() ? 'directory' : 'file',
                path: path.join(dirPath, file.name)
            }));
        } catch (error) {
            throw new Error(`Failed to list directory: ${error.message}`);
        }
    }

    async readFile(filePath) {
        // Validate path
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`Access denied to path: ${filePath}`);
        }

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    async braveWebSearch(query) {
        // Simulate web search (replace with actual implementation)
        return {
            results: [
                { 
                    title: `Search results for: ${query}`, 
                    snippet: 'Simulated web search results' 
                }
            ]
        };
    }

    async fetchWebContent(url) {
        try {
            const response = await fetch(url);
            const content = await response.text();
            return {
                url,
                contentLength: content.length,
                contentPreview: content.slice(0, 500) + '...'
            };
        } catch (error) {
            throw new Error(`Failed to fetch content: ${error.message}`);
        }
    }

    async listSQLiteTables() {
        // Simulate SQLite table listing (replace with actual implementation)
        return {
            tables: [
                'users',
                'sessions',
                'logs'
            ]
        };
    }
}

// Agent command processing
const agent = new MCPToolIntegrationAgent();

process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    const [server, tool, ...args] = input.split(' ');

    try {
        // Execute the tool
        const result = await agent.executeCommand(server, tool, ...args);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
    }
});

console.log('MCP Tool Integration Agent Ready');
