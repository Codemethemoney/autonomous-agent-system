const ConfigManager = require('./utils/config-manager');
const OllamaClient = require('./clients/ollama-client');
const RateLimiter = require('./utils/rate-limiter');

class MCPSetup {
    constructor() {
        this.configManager = ConfigManager;
        this.rateLimiter = new RateLimiter();
        this.ollamaClient = null;
    }

    async initializeEnvironment() {
        try {
            // Validate configuration
            this.configManager.validateConfig();

            // Initialize Ollama client with configuration
            this.ollamaClient = new OllamaClient({
                apiBase: this.configManager.get('OLLAMA_API_BASE', 'http://localhost:11434'),
                defaultModel: this.configManager.get('OLLAMA_DEFAULT_MODEL', 'qwen2.5-coder')
            });

            // Setup rate limiting
            this.configureRateLimiting();

            console.log('✅ MCP Environment Initialized Successfully');
            return this;
        } catch (error) {
            console.error('❌ MCP Environment Initialization Failed:', error);
            throw error;
        }
    }

    configureRateLimiting() {
        // Configure rate limits from environment or use defaults
        const rateLimitWindow = this.configManager.get('RATE_LIMIT_WINDOW_MS', 60000);
        const rateLimitMax = this.configManager.get('RATE_LIMIT_MAX_REQUESTS', 100);

        this.rateLimiter.updateGlobalLimits({
            windowMs: rateLimitWindow,
            max: rateLimitMax
        });
    }

    async selectOptimalModel() {
        const models = [
            'llama3:70b', 
            'llama2:13b', 
            'qwen2.5-coder:latest'
        ];

        for (const model of models) {
            try {
                // Attempt to use the model with rate limit protection
                await this.rateLimiter.checkRateLimit(model);
                
                // If successful, return the model
                return model;
            } catch (error) {
                console.warn(`Model ${model} not available:`, error.message);
                continue;
            }
        }

        // Fallback to a default model if all fail
        return this.configManager.get('OLLAMA_DEFAULT_MODEL', 'qwen2.5-coder');
    }

    async initializeModel() {
        const selectedModel = await this.selectOptimalModel();
        
        try {
            await this.ollamaClient.initialize(selectedModel);
            console.log(`🤖 Initialized with model: ${selectedModel}`);
            return selectedModel;
        } catch (error) {
            console.error('❌ Model Initialization Failed:', error);
            throw error;
        }
    }

    async initialize() {
        await this.initializeEnvironment();
        await this.initializeModel();
    }
}

module.exports = new MCPSetup();
