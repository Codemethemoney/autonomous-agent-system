const fs = require('fs').promises;
const path = require('path');

class FileSystemServer {
    constructor(allowedPaths) {
        this.allowedPaths = allowedPaths;
    }

    validatePath(targetPath) {
        const normalizedPath = path.normalize(targetPath);
        const isAllowed = this.allowedPaths.some(allowedPath => 
            normalizedPath.startsWith(path.normalize(allowedPath))
        );

        if (!isAllowed) {
            throw new Error(`Access denied: ${targetPath} is not in allowed paths`);
        }
    }

    async list(dirPath) {
        this.validatePath(dirPath);
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const items = await Promise.all(entries.map(async entry => {
                const fullPath = path.join(dirPath, entry.name);
                const stats = await fs.stat(fullPath);
                
                return {
                    name: entry.name,
                    path: fullPath,
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime
                };
            }));

            return {
                path: dirPath,
                items
            };
        } catch (error) {
            throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
        }
    }

    async read(filePath) {
        this.validatePath(filePath);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const stats = await fs.stat(filePath);
            
            return {
                path: filePath,
                content,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    async write(filePath, content) {
        this.validatePath(filePath);
        
        try {
            await fs.writeFile(filePath, content, 'utf8');
            const stats = await fs.stat(filePath);
            
            return {
                path: filePath,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    async delete(targetPath) {
        this.validatePath(targetPath);
        
        try {
            const stats = await fs.stat(targetPath);
            if (stats.isDirectory()) {
                await fs.rmdir(targetPath, { recursive: true });
            } else {
                await fs.unlink(targetPath);
            }
            
            return {
                path: targetPath,
                type: stats.isDirectory() ? 'directory' : 'file',
                deleted: true
            };
        } catch (error) {
            throw new Error(`Failed to delete ${targetPath}: ${error.message}`);
        }
    }

    async search(dirPath, pattern, options = {}) {
        this.validatePath(dirPath);
        
        const results = [];
        const searchOptions = {
            maxDepth: options.maxDepth || Infinity,
            extensions: options.extensions || null,
            ...options
        };

        async function* walk(dir, depth = 0) {
            if (depth > searchOptions.maxDepth) return;
            
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    yield* walk(fullPath, depth + 1);
                } else if (entry.isFile()) {
                    if (searchOptions.extensions) {
                        const ext = path.extname(entry.name);
                        if (!searchOptions.extensions.includes(ext)) continue;
                    }
                    
                    if (pattern instanceof RegExp ? 
                        pattern.test(entry.name) : 
                        entry.name.includes(pattern)) {
                        const stats = await fs.stat(fullPath);
                        yield {
                            name: entry.name,
                            path: fullPath,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    }
                }
            }
        }

        for await (const file of walk(dirPath)) {
            results.push(file);
        }

        return results;
    }
}

module.exports = FileSystemServer;
