class MCPClient {
    constructor(config) {
        this.config = config;
        this.modelId = config.modelId;
        this.initialized = false;
        this.retryConfig = config.retryConfig || {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000
        };
    }

    async initialize() {
        try {
            // Initialize connection to model
            await this.initializeModel();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize MCP client:', error);
            throw error;
        }
    }

    async initializeModel() {
        const modelConfig = {
            model: this.modelId,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            topP: this.config.topP
        };

        if (this.modelId.startsWith('gpt')) {
            return this.initializeOpenAI(modelConfig);
        } else {
            return this.initializeOllama(modelConfig);
        }
    }

    async initializeOpenAI(config) {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key not provided');
        }

        // Initialize OpenAI configuration
        // This is just a placeholder - implement actual OpenAI setup
        return true;
    }

    async initializeOllama(config) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    prompt: 'System: Initializing model connection. Respond with "ok" if successful.',
                    stream: false,
                    options: {
                        temperature: config.temperature,
                        top_p: config.topP,
                        num_predict: config.maxTokens
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Ollama initialization failed: ${error.message}`);
            }

            const data = await response.json();
            return data.response.includes('ok');
        } catch (error) {
            if (error.message.includes('rate limit exceeded')) {
                throw error; // Let rate limiter handle this
            }
            throw new Error(`Failed to initialize Ollama: ${error.message}`);
        }
    }

    async generate(prompt, options = {}) {
        if (!this.initialized) {
            throw new Error('MCP client not initialized');
        }

        const config = {
            ...this.config,
            ...options
        };

        return this.executeWithRetry(async () => {
            if (this.modelId.startsWith('gpt')) {
                return this.generateWithOpenAI(prompt, config);
            } else {
                return this.generateWithOllama(prompt, config);
            }
        });
    }

    async generateWithOpenAI(prompt, config) {
        // Implement OpenAI generation
        throw new Error('OpenAI generation not implemented');
    }

    async generateWithOllama(prompt, config) {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.modelId,
                    prompt,
                    stream: false,
                    options: {
                        temperature: config.temperature,
                        top_p: config.topP,
                        num_predict: config.maxTokens
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Ollama generation failed: ${error.message}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            if (error.message.includes('rate limit exceeded')) {
                throw error; // Let rate limiter handle this
            }
            throw new Error(`Failed to generate with Ollama: ${error.message}`);
        }
    }

    async executeWithRetry(operation) {
        let lastError;
        let delay = this.retryConfig.initialDelayMs;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (error.message.includes('rate limit exceeded')) {
                    throw error; // Let rate limiter handle this
                }

                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }

                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * 2, this.retryConfig.maxDelayMs);
            }
        }

        throw lastError;
    }
}

module.exports = { MCPClient };
