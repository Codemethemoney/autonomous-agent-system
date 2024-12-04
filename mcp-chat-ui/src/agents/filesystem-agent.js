#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger');

class FilesystemAgent {
    constructor() {
        this.allowedRoots = [
            '/Users/garyoleary/MACK_MCP',
            '/Users/garyoleary/Desktop',
            '/Users/garyoleary/Documents'
        ];
        Logger.agent('FilesystemAgent initialized', {
            allowedRoots: this.allowedRoots
        });
    }

    isPathAllowed(targetPath) {
        return this.allowedRoots.some(root => 
            targetPath.startsWith(root)
        );
    }

    normalizeAndValidatePath(inputPath) {
        const resolvedPath = path.resolve(inputPath);
        
        if (!this.isPathAllowed(resolvedPath)) {
            Logger.warn('FilesystemAgent', 'Access denied to path', { path: resolvedPath });
            throw new Error(`Access denied to path: ${resolvedPath}`);
        }

        return resolvedPath;
    }

    async list(directory) {
        const performanceTracker = Logger.measure('FilesystemAgent:List', async () => {
            try {
                const normalizedPath = this.normalizeAndValidatePath(directory);
                Logger.agent('Listing directory contents', { path: normalizedPath });

                const items = await fs.readdir(normalizedPath, { withFileTypes: true });
                const formattedItems = items.map(item => ({
                    name: item.name,
                    type: item.isDirectory() ? 'directory' : 'file',
                    path: path.join(normalizedPath, item.name)
                }));

                return {
                    path: normalizedPath,
                    items: formattedItems
                };
            } catch (error) {
                Logger.error('FilesystemAgent', 'Directory listing failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    async read(filePath) {
        const performanceTracker = Logger.measure('FilesystemAgent:Read', async () => {
            try {
                const normalizedPath = this.normalizeAndValidatePath(filePath);
                Logger.agent('Reading file', { path: normalizedPath });

                const content = await fs.readFile(normalizedPath, 'utf-8');
                return content;
            } catch (error) {
                Logger.error('FilesystemAgent', 'File read failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    async write(filePath, content) {
        const performanceTracker = Logger.measure('FilesystemAgent:Write', async () => {
            try {
                const normalizedPath = this.normalizeAndValidatePath(filePath);
                Logger.agent('Writing to file', { 
                    path: normalizedPath, 
                    contentLength: content.length 
                });

                await fs.writeFile(normalizedPath, content, 'utf-8');
                return { success: true, path: normalizedPath };
            } catch (error) {
                Logger.error('FilesystemAgent', 'File write failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    async mkdir(dirPath) {
        const performanceTracker = Logger.measure('FilesystemAgent:MakeDirectory', async () => {
            try {
                const normalizedPath = this.normalizeAndValidatePath(dirPath);
                Logger.agent('Creating directory', { path: normalizedPath });

                await fs.mkdir(normalizedPath, { recursive: true });
                return { success: true, path: normalizedPath };
            } catch (error) {
                Logger.error('FilesystemAgent', 'Directory creation failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    async delete(filePath) {
        const performanceTracker = Logger.measure('FilesystemAgent:Delete', async () => {
            try {
                const normalizedPath = this.normalizeAndValidatePath(filePath);
                Logger.agent('Deleting file/directory', { path: normalizedPath });

                await fs.rm(normalizedPath, { recursive: true, force: true });
                return { success: true, path: normalizedPath };
            } catch (error) {
                Logger.error('FilesystemAgent', 'Deletion failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }
}

// Agent command processing
const agent = new FilesystemAgent();

process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    const [command, ...args] = input.split(' ');

    try {
        let result;
        switch(command) {
            case 'list':
                result = await agent.list(args[0] || process.cwd());
                break;
            case 'read':
                result = await agent.read(args[0]);
                break;
            case 'write':
                result = await agent.write(args[0], args.slice(1).join(' '));
                break;
            case 'mkdir':
                result = await agent.mkdir(args[0]);
                break;
            case 'delete':
                result = await agent.delete(args[0]);
                break;
            default:
                result = { error: `Unknown command: ${command}` };
                Logger.warn('FilesystemAgent', 'Unknown command received', { command });
        }

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        Logger.error('FilesystemAgent', 'Command processing failed', error);
        console.error(JSON.stringify({ error: error.message }, null, 2));
    }
});

console.log('Filesystem Agent Ready');
