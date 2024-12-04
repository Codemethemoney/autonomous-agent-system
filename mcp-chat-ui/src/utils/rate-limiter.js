const ConfigManager = require('./config-manager');

class RateLimiter {
    constructor() {
        this.configManager = ConfigManager;
        this.modelLimits = {
            'llama3:70b': {
                requestsPerHour: this.configManager.get('RATE_LIMIT_LLAMA3_REQUESTS', 200),
                resetIntervalMs: this.configManager.get('RATE_LIMIT_LLAMA3_WINDOW', 30 * 1000),
                retryDelayMs: this.configManager.get('RATE_LIMIT_LLAMA3_RETRY', 5 * 1000)
            },
            'llama2:13b': {
                requestsPerHour: this.configManager.get('RATE_LIMIT_LLAMA2_REQUESTS', 300),
                resetIntervalMs: this.configManager.get('RATE_LIMIT_LLAMA2_WINDOW', 15 * 1000),
                retryDelayMs: this.configManager.get('RATE_LIMIT_LLAMA2_RETRY', 3 * 1000)
            },
            'qwen2.5-coder:latest': {
                requestsPerHour: this.configManager.get('RATE_LIMIT_QWEN_REQUESTS', 400),
                resetIntervalMs: this.configManager.get('RATE_LIMIT_QWEN_WINDOW', 10 * 1000),
                retryDelayMs: this.configManager.get('RATE_LIMIT_QWEN_RETRY', 2 * 1000)
            }
        };

        this.requestCounts = new Map();
        this.lastResetTime = new Map();
        this.cooldowns = new Map();
    }

    updateGlobalLimits(config) {
        // Update global rate limit configuration
        this.globalConfig = {
            windowMs: config.windowMs || 60000,
            max: config.max || 100
        };
    }

    async checkRateLimit(modelId) {
        const now = Date.now();
        
        // Check if model is in cooldown
        const cooldownUntil = this.cooldowns.get(modelId);
        if (cooldownUntil && now < cooldownUntil) {
            const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
            throw new Error(`Model ${modelId} in cooldown. Try again in ${remainingSeconds} seconds.`);
        }

        const limits = this.modelLimits[modelId] || {
            requestsPerHour: this.globalConfig?.max || 100,
            resetIntervalMs: this.globalConfig?.windowMs || 60000,
            retryDelayMs: 5000
        };

        if (!this.lastResetTime.has(modelId)) {
            this.lastResetTime.set(modelId, now);
            this.requestCounts.set(modelId, 0);
        }

        const timeSinceReset = now - this.lastResetTime.get(modelId);
        if (timeSinceReset >= limits.resetIntervalMs) {
            this.lastResetTime.set(modelId, now);
            this.requestCounts.set(modelId, 0);
        }

        const currentCount = this.requestCounts.get(modelId) || 0;
        if (currentCount >= limits.requestsPerHour) {
            const cooldownTime = limits.retryDelayMs;
            this.cooldowns.set(modelId, now + cooldownTime);
            throw new Error(`Rate limit exceeded for ${modelId}. Try again in ${Math.ceil(cooldownTime / 1000)} seconds.`);
        }

        this.requestCounts.set(modelId, currentCount + 1);
        return true;
    }

    async handleRateLimit(modelId, error) {
        const now = Date.now();
        const limits = this.modelLimits[modelId] || {
            retryDelayMs: 5000
        };

        const cooldownTime = Math.min(limits.retryDelayMs, 5000);
        this.cooldowns.set(modelId, now + cooldownTime);
        
        console.log(`Rate limit hit for ${modelId}. Quick cooldown for ${cooldownTime / 1000} seconds.`);
        return new Promise(resolve => setTimeout(resolve, cooldownTime));
    }

    getRemainingRequests(modelId) {
        const limits = this.modelLimits[modelId] || { 
            requestsPerHour: this.globalConfig?.max || 100 
        };
        const currentCount = this.requestCounts.get(modelId) || 0;
        return Math.max(0, limits.requestsPerHour - currentCount);
    }

    getResetTime(modelId) {
        const lastReset = this.lastResetTime.get(modelId);
        if (!lastReset) {
            return new Date();
        }

        const limits = this.modelLimits[modelId] || { 
            resetIntervalMs: this.globalConfig?.windowMs || 60000 
        };
        return new Date(lastReset + limits.resetIntervalMs);
    }

    getCooldownStatus(modelId) {
        const now = Date.now();
        const cooldownUntil = this.cooldowns.get(modelId);
        
        if (!cooldownUntil || now >= cooldownUntil) {
            return null;
        }

        return {
            remainingMs: cooldownUntil - now,
            resetTime: new Date(cooldownUntil)
        };
    }

    resetLimits(modelId) {
        this.requestCounts.delete(modelId);
        this.lastResetTime.delete(modelId);
        this.cooldowns.delete(modelId);
    }

    forceReset() {
        this.requestCounts.clear();
        this.lastResetTime.clear();
        this.cooldowns.clear();
    }
}

module.exports = RateLimiter;
