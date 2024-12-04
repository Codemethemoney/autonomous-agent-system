const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPAgentExecutor {
    constructor() {
        this.agents = {};
        this.agentConfigs = {};
    }

    async loadAgents() {
        try {
            const agentsDir = path.join(__dirname, 'available');
            const agentFiles = await fs.readdir(agentsDir);

            for (const file of agentFiles) {
                if (file.endsWith('.json')) {
                    const configPath = path.join(agentsDir, file);
                    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
                    this.agentConfigs[config.id] = config;
                }
            }

            console.log('🤖 Loaded agents:', Object.keys(this.agentConfigs).map(id => id));
            return this.agentConfigs;
        } catch (error) {
            console.error('Failed to load agents:', error);
            throw error;
        }
    }

    async initializeAgent(agentId) {
        try {
            const config = this.agentConfigs[agentId];
            if (!config) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            // Spawn the agent process
            const agentProcess = spawn(config.command, config.args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Capture and log agent output
            agentProcess.stdout.on('data', (data) => {
                console.log(`📤 [${agentId}] STDOUT: ${data.toString().trim()}`);
            });

            agentProcess.stderr.on('data', (data) => {
                console.error(`📛 [${agentId}] STDERR: ${data.toString().trim()}`);
            });

            agentProcess.on('close', (code) => {
                console.log(`🔴 [${agentId}] Agent process exited with code ${code}`);
            });

            this.agents[agentId] = agentProcess;
            console.log(`🚀 Agent ${agentId} initialized successfully`);
            return agentProcess;
        } catch (error) {
            console.error(`Failed to initialize agent ${agentId}:`, error);
            throw error;
        }
    }

    listActiveAgents() {
        return Object.keys(this.agents);
    }

    async executeCommand(agentId, command, ...args) {
        return new Promise((resolve, reject) => {
            const agent = this.agents[agentId];
            if (!agent) {
                return reject(new Error(`Agent not found: ${agentId}`));
            }

            // Normalize args to ensure it's an array
            const normalizedArgs = Array.isArray(args[0]) ? args[0] : args;

            // Construct the full command string
            const fullCommand = `${command} ${normalizedArgs.join(' ')}`.trim();

            // Write command to agent's stdin
            agent.stdin.write(fullCommand + '\n', 'utf-8', (err) => {
                if (err) {
                    return reject(err);
                }
            });

            // Set up a temporary listener for the response
            const responseHandler = (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    resolve(response);
                } catch (parseError) {
                    reject(new Error(`Failed to parse agent response: ${data}`));
                }
            };

            const errorHandler = (err) => {
                reject(err);
            };

            // Attach one-time listeners
            agent.stdout.once('data', responseHandler);
            agent.stderr.once('data', errorHandler);
        });
    }

    async closeAgent(agentId) {
        const agent = this.agents[agentId];
        if (agent) {
            agent.stdin.end();
            delete this.agents[agentId];
        }
    }

    async closeAllAgents() {
        for (const agentId of Object.keys(this.agents)) {
            await this.closeAgent(agentId);
        }
    }
}

module.exports = new MCPAgentExecutor();
