const axios = require('axios');
const ConfigManager = require('../utils/config-manager');

class OllamaClient {
    constructor(config = {}) {
        this.configManager = ConfigManager;
        this.apiBase = config.apiBase || this.configManager.get('OLLAMA_API_BASE', 'http://localhost:11434');
        this.defaultModel = config.defaultModel || this.configManager.get('OLLAMA_DEFAULT_MODEL', 'qwen2.5-coder');
        this.currentModel = null;
    }

    async initialize(model = null) {
        try {
            // Use provided model or default
            const targetModel = model || this.defaultModel;

            // Check if model is available
            const available = await this.checkModelAvailability(targetModel);
            
            if (!available) {
                throw new Error(`Model ${targetModel} not available`);
            }

            this.currentModel = targetModel;
            console.log(`✅ Ollama Client initialized with model: ${this.currentModel}`);
            return this;
        } catch (error) {
            console.error('❌ Ollama Client Initialization Failed:', error);
            throw error;
        }
    }

    async checkModelAvailability(model) {
        try {
            const response = await axios.get(`${this.apiBase}/api/tags`);
            const availableModels = response.data.models.map(m => m.name);
            return availableModels.includes(model);
        } catch (error) {
            console.warn(`Failed to check model availability: ${error.message}`);
            return false;
        }
    }

    async generate(prompt, options = {}) {
        if (!this.currentModel) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.apiBase}/api/generate`, {
                model: this.currentModel,
                prompt,
                stream: false,
                ...options
            });

            return response.data.response;
        } catch (error) {
            console.error('Ollama Generation Error:', error);
            throw error;
        }
    }

    async chat(messages, options = {}) {
        if (!this.currentModel) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.apiBase}/api/chat`, {
                model: this.currentModel,
                messages,
                stream: false,
                ...options
            });

            return response.data.message.content;
        } catch (error) {
            console.error('Ollama Chat Error:', error);
            throw error;
        }
    }

    // Additional methods for model management...
}

module.exports = OllamaClient;
