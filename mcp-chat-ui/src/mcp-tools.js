const { spawn } = require('child_process');
const path = require('path');

class MCPTools {
    constructor() {
        this.toolsPath = path.join(__dirname, '../../.mcp-shared/web-tools');
    }

    async runScraper(url) {
        const scraperPath = path.join(this.toolsPath, 'mcp-scraper.js');
        return this.runNodeScript(scraperPath, [url]);
    }

    async runEnhancedChat(prompt) {
        const chatPath = path.join(this.toolsPath, 'examples/enhanced-chat.js');
        return this.runNodeScript(chatPath, [prompt]);
    }

    async runWorkflow(workflowName, params) {
        // Add workflow execution logic here
        const workflowPath = path.join(this.toolsPath, 'workflows', `${workflowName}.js`);
        return this.runNodeScript(workflowPath, [JSON.stringify(params)]);
    }

    runNodeScript(scriptPath, args = []) {
        return new Promise((resolve, reject) => {
            const process = spawn('node', [scriptPath, ...args]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}: ${error}`));
                } else {
                    resolve(output);
                }
            });
        });
    }
}

module.exports = new MCPTools();
