const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { spawn } = require('child_process');
const ollamaService = require('./ollama-service');

class AIService {
    constructor() {
        this.openai = null;
        this.anthropic = null;
    }

    initializeClients(apiKeys) {
        if (apiKeys.openai) {
            this.openai = new OpenAI({ apiKey: apiKeys.openai });
        }
        if (apiKeys.anthropic) {
            this.anthropic = new Anthropic({ apiKey: apiKeys.anthropic });
        }
    }

    async generateResponse(model, message, systemInstructions, files = []) {
        switch (model) {
        case 'gpt4':
            return this.generateGPT4Response(message, systemInstructions, files);
        case 'claude':
            return this.generateClaudeResponse(message, systemInstructions, files);
        case 'llama2':
            return this.generateLlamaResponse(message, systemInstructions);
        case 'qwen2.5-coder':
            return this.generateQwenResponse(message, systemInstructions);
        default:
            throw new Error('Unsupported model');
        }
    }

    async generateGPT4Response(message, systemInstructions, files = []) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Please check your API key.');
        }

        const messages = [
            { role: 'system', content: systemInstructions || 'You are a helpful assistant.' },
            { role: 'user', content: message }
        ];

        // Handle file attachments if present
        if (files.length > 0) {
            const fileContents = await Promise.all(files.map(async (file) => {
                if (file.type.startsWith('image/')) {
                    return {
                        type: 'image_url',
                        image_url: {
                            url: `data:${file.type};base64,${file.content.toString('base64')}`
                        }
                    };
                }
                return null;
            }));

            messages[1].content = [
                { type: 'text', text: message },
                ...fileContents.filter(f => f !== null)
            ];
        }

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages,
            max_tokens: 2000,
            temperature: 0.7,
            stream: true
        });

        return response;
    }

    async generateClaudeResponse(message, systemInstructions, files = []) {
        if (!this.anthropic) {
            throw new Error('Anthropic client not initialized. Please check your API key.');
        }

        const systemPrompt = systemInstructions || 'You are Claude, a helpful AI assistant.';
        let messageContent = message;

        // Handle file attachments if present
        if (files.length > 0) {
            const fileContents = await Promise.all(files.map(async (file) => {
                if (file.type.startsWith('image/')) {
                    return {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: file.type,
                            data: file.content.toString('base64')
                        }
                    };
                }
                return null;
            }));

            messageContent = {
                type: 'text',
                text: message,
                files: fileContents.filter(f => f !== null)
            };
        }

        const response = await this.anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 2000,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: messageContent
                }
            ],
            stream: true
        });

        return response;
    }

    async generateLlamaResponse(message, systemInstructions) {
        return new Promise((resolve, reject) => {
            const prompt = `${systemInstructions || 'You are a helpful AI assistant.'}\n\nUser: ${message}\n\nAssistant:`;
            
            // Use Ollama CLI to generate response
            const ollama = spawn('ollama', ['run', 'llama2', prompt]);
            let response = '';
            let error = '';

            ollama.stdout.on('data', (data) => {
                response += data.toString();
            });

            ollama.stderr.on('data', (data) => {
                error += data.toString();
            });

            ollama.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Llama2 process exited with code ${code}: ${error}`));
                } else {
                    resolve(response.trim());
                }
            });
        });
    }

    async generateQwenResponse(message, systemInstructions) {
        const isAvailable = await ollamaService.isAvailable();
        if (!isAvailable) {
            throw new Error('Ollama service is not available. Please ensure Ollama is running.');
        }
        return ollamaService.generateResponse(message, systemInstructions);
    }
}

module.exports = new AIService();
