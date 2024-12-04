const MCPAgentExecutor = require('./agents/mcp-agent-executor');

async function runAgentDemo() {
    const agents = [];
    try {
        // Load available agents
        await MCPAgentExecutor.loadAgents();

        // Initialize agents with error handling
        const initializeAgentSafely = async (agentId) => {
            try {
                const agent = await MCPAgentExecutor.initializeAgent(agentId);
                agents.push(agentId);
                return agent;
            } catch (error) {
                console.error(`❌ Failed to initialize agent ${agentId}:`, error);
                return null;
            }
        };

        const filesystemAgent = await initializeAgentSafely('filesystem-agent');
        const codeAnalysisAgent = await initializeAgentSafely('code-analysis-agent');
        const mcpToolAgent = await initializeAgentSafely('mcp-tool-integration-agent');

        // Verify agents are initialized
        if (!filesystemAgent || !codeAnalysisAgent || !mcpToolAgent) {
            throw new Error('One or more agents failed to initialize');
        }

        // List active agents
        console.log('Active Agents:', MCPAgentExecutor.listActiveAgents());

        // Wait for agents to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Utility function for safe command execution
        const executeCommandSafely = async (agentId, command, ...args) => {
            try {
                console.log(`\n🚀 Executing ${command} on ${agentId}`);
                const result = await MCPAgentExecutor.executeCommand(agentId, command, ...args);
                console.log('✅ Command Result:', JSON.stringify(result, null, 2));
                return result;
            } catch (error) {
                console.error(`❌ Command execution error for ${agentId} - ${command}:`, error);
                return null;
            }
        };

        // Filesystem Operations
        await executeCommandSafely('mcp-tool-integration-agent', 'filesystem list_directory', '/Users/garyoleary/MACK_MCP');

        // Read package.json
        const packageContent = await executeCommandSafely('mcp-tool-integration-agent', 'filesystem read_file', '/Users/garyoleary/MACK_MCP/package.json');
        if (packageContent) {
            console.log('\n📦 Package.json Preview:', packageContent.slice(0, 500) + '...');
        }

        // Code Analysis
        await executeCommandSafely('code-analysis-agent', 'complexity', '/Users/garyoleary/MACK_MCP/package.json');

        // MCP Tool Integration Demos
        await executeCommandSafely('mcp-tool-integration-agent', 'filesystem list_allowed_directories');
        await executeCommandSafely('mcp-tool-integration-agent', 'brave-search brave_web_search', 'Codeium AI development tools');
        await executeCommandSafely('mcp-tool-integration-agent', 'fetch fetch', 'https://codeium.com');
        await executeCommandSafely('mcp-tool-integration-agent', 'sqlite list-tables');

    } catch (error) {
        console.error('🔥 Catastrophic Agent Execution Error:', error);
    } finally {
        // Graceful agent shutdown
        try {
            console.log('\n🔌 Shutting down agents...');
            await MCPAgentExecutor.closeAllAgents();
            console.log('✨ All agents successfully closed.');
        } catch (shutdownError) {
            console.error('❌ Error during agent shutdown:', shutdownError);
        }
    }
}

// Run the demo
runAgentDemo().catch(console.error);
