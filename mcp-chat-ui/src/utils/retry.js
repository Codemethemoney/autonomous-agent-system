class RetryHandler {
    constructor(maxRetries = 3, initialDelay = 5000) { 
        this.maxRetries = maxRetries;
        this.initialDelay = initialDelay;
        this.lastCallTime = 0;
        this.minTimeBetweenCalls = 1000; 
    }

    async withRetry(operation, context = '') {
        let lastError;
        let delay = this.initialDelay;

        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.minTimeBetweenCalls) {
            await this.sleep(this.minTimeBetweenCalls - timeSinceLastCall);
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await operation();
                this.lastCallTime = Date.now();
                return result;
            } catch (error) {
                lastError = error;
                console.log(`Attempt ${attempt} failed:`, error.message);
                
                if (!this.isRetryableError(error)) {
                    throw error;
                }

                if (attempt === this.maxRetries) {
                    break;
                }

                const retryDelay = this.calculateDelay(error, attempt, delay);
                console.log(`Waiting ${retryDelay}ms before retry...`);
                await this.sleep(retryDelay);
                delay *= 2; 
            }
        }

        throw new Error(`Failed after ${this.maxRetries} retries. Context: ${context}. Original error: ${lastError.message}`);
    }

    calculateDelay(error, attempt, baseDelay) {
        if (error.message?.toLowerCase().includes('rate limit')) {
            return Math.max(60000 * attempt, baseDelay) * (1 + Math.random() * 0.1);
        }
        
        return baseDelay * (1 + Math.random() * 0.1);
    }

    isRetryableError(error) {
        const retryableErrors = [
            'overloaded_error',
            'rate limit exceeded',
            'timeout',
            'ECONNRESET',
            'ETIMEDOUT',
            'resource_exhausted'
        ];

        return retryableErrors.some(errType => 
            error.message?.toLowerCase().includes(errType.toLowerCase()) ||
            error.type?.toLowerCase().includes(errType.toLowerCase())
        );
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new RetryHandler();
