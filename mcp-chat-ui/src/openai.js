const OpenAI = require('openai');
const rateLimiter = require('./utils/rate-limiter');
const Logger = require('./utils/logger');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI.OpenAIApi({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async createChatCompletion(messages, model = 'gpt-4-1106-preview') {
        try {
            await rateLimiter.checkRateLimit(model);

            const completion = await this.openai.chat.completions.create({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 2000
            });

            return completion;
        } catch (error) {
            const errorMessage = rateLimiter.handleRateLimitError(model, error);
            Logger.error('openai', errorMessage, error);
            throw new Error(errorMessage);
        }
    }
}

module.exports = new OpenAIService();
