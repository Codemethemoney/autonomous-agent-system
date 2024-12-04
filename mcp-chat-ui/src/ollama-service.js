const fetch = require('node-fetch');
const { spawn } = require('child_process');
const MCPToolIntegrationAgent = require('./agents/mcp-tool-integration-agent');

class OllamaService {
    constructor() {
        this.apiBase = 'http://localhost:11434';
        this.toolAgent = new MCPToolIntegrationAgent();
        this.model = 'llama3:70b';
    }

    async executeToolCommand(server, tool, ...args) {
        try {
            const result = await this.toolAgent.executeCommand(server, tool, ...args);
            return JSON.stringify(result, null, 2);
        } catch (error) {
            return `Error executing tool: ${error.message}`;
        }
    }

    async generateResponse(message, systemInstructions = '') {
        // Enhanced system instructions to support tool execution
        const enhancedSystemInstructions = `
${systemInstructions}

IMPORTANT INSTRUCTIONS:
- You are an AI assistant with direct access to system tools
- If a user request requires using a system tool, use this format:
  TOOL_EXECUTE: [server] [tool] [arg1] [arg2] ...
- Example: TOOL_EXECUTE: filesystem list_directory /Users/garyoleary/MACK_MCP
- Always explain what tool you're about to execute
- Return the tool's output directly to the user
`;

        try {
            const response = await fetch(`${this.apiBase}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: `${enhancedSystemInstructions}\n\nUser: ${message}\nAssistant:`,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 2048,
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Check if response contains a tool execution command
            const toolMatch = data.response.match(/TOOL_EXECUTE:\s*(\w+)\s+(\w+)\s*(.*)/);
            if (toolMatch) {
                const [, server, tool, argsString] = toolMatch;
                const args = argsString ? argsString.split(' ') : [];
                
                const toolResult = await this.executeToolCommand(server, tool, ...args);
                return `Tool Execution Result:\n${toolResult}`;
            }

            return data.response;
        } catch (error) {
            console.error('Error calling Ollama API:', error);
            throw error;
        }
    }

    async isAvailable() {
        try {
            const response = await fetch(`${this.apiBase}/api/version`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new OllamaService();
