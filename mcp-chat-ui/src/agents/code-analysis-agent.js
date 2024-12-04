#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const Logger = require('../utils/logger');

class CodeAnalysisAgent {
    constructor() {
        this.supportedCommands = {
            'complexity': this.calculateComplexity.bind(this),
            'duplicates': this.findDuplicateCode.bind(this),
            'lint': this.lintCode.bind(this)
        };
        Logger.agent('CodeAnalysisAgent initialized', {
            supportedCommands: Object.keys(this.supportedCommands)
        });
    }

    async executeCommand(command, ...args) {
        try {
            Logger.debug('CodeAnalysisAgent', `Executing command: ${command}`, { args });
            
            if (!this.supportedCommands[command]) {
                throw new Error(`Unsupported command: ${command}`);
            }

            const result = await this.supportedCommands[command](...args);
            Logger.performance(`CodeAnalysisAgent ${command}`, { 
                inputArgs: args, 
                resultType: typeof result 
            });
            
            return result;
        } catch (error) {
            Logger.error('CodeAnalysisAgent', 'Command execution failed', error);
            return {
                status: 'error',
                message: error.message,
                details: error.toString()
            };
        }
    }

    async calculateComplexity(filePath) {
        const performanceTracker = Logger.measure('CodeAnalysisAgent:Complexity', async () => {
            try {
                Logger.agent('Calculating code complexity', { filePath });
                await fs.access(filePath);

                const command = `npx cyclomatic-complexity ${filePath}`;
                const output = execSync(command, { encoding: 'utf-8' });

                const complexityResult = this.parseComplexityOutput(output);

                return {
                    status: 'success',
                    filePath,
                    ...complexityResult
                };
            } catch (error) {
                Logger.warn('CodeAnalysisAgent', 'Complexity calculation failed', { 
                    filePath, 
                    errorMessage: error.message 
                });
                return {
                    status: 'error',
                    filePath,
                    message: 'Complexity calculation failed',
                    details: error.message
                };
            }
        });

        return performanceTracker();
    }

    parseComplexityOutput(output) {
        // Handle different possible output formats
        const lines = output.trim().split('\n');
        
        // If no complexity data found
        if (lines.length === 0 || lines[0].includes('No issues found')) {
            return {
                complexity: 0,
                message: 'No complexity issues detected'
            };
        }

        // Try to parse more detailed complexity information
        try {
            const complexityData = lines.map(line => {
                const match = line.match(/(.+):\s*(\d+)/);
                return match ? { 
                    file: match[1], 
                    complexity: parseInt(match[2], 10) 
                } : null;
            }).filter(Boolean);

            return {
                complexity: complexityData.reduce((sum, item) => sum + item.complexity, 0),
                details: complexityData
            };
        } catch (parseError) {
            return {
                complexity: 0,
                message: 'Unable to parse complexity output',
                rawOutput: output
            };
        }
    }

    async findDuplicateCode(dirPath) {
        try {
            Logger.agent('Finding duplicate code', { dirPath });
            // Use jsinspect for duplicate code detection
            const command = `npx jsinspect ${dirPath}`;
            const output = execSync(command, { encoding: 'utf-8' });

            const duplicates = this.parseDuplicatesOutput(output);

            return {
                status: 'success',
                dirPath,
                duplicatesFound: duplicates.length,
                details: duplicates
            };
        } catch (error) {
            Logger.error('CodeAnalysisAgent', 'Duplicate code detection failed', error);
            return {
                status: 'error',
                dirPath,
                message: 'Duplicate code detection failed',
                details: error.message
            };
        }
    }

    parseDuplicatesOutput(output) {
        // Implement parsing logic for jsinspect output
        // This is a simplified example
        const duplicateMatches = output.match(/(\d+)\s*duplicates found/);
        return duplicateMatches ? parseInt(duplicateMatches[1], 10) : 0;
    }

    async lintCode(filePath) {
        try {
            Logger.agent('Linting code', { filePath });
            // Use eslint for code linting
            const command = `npx eslint ${filePath} --format json`;
            const output = execSync(command, { encoding: 'utf-8' });

            const lintResults = JSON.parse(output);

            return {
                status: 'success',
                filePath,
                errorCount: lintResults.reduce((sum, file) => sum + file.errorCount, 0),
                warningCount: lintResults.reduce((sum, file) => sum + file.warningCount, 0),
                details: lintResults
            };
        } catch (error) {
            Logger.error('CodeAnalysisAgent', 'Code linting failed', error);
            return {
                status: 'error',
                filePath,
                message: 'Code linting failed',
                details: error.message
            };
        }
    }
}

// Agent command processing
const agent = new CodeAnalysisAgent();

process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    const [command, ...args] = input.split(' ');

    try {
        // Execute the command
        const result = await agent.executeCommand(command, ...args);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }, null, 2));
    }
});

console.log('Code Analysis Agent Ready');
