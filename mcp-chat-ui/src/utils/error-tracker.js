const { OpenAI } = require('openai');

class ErrorTracker {
    constructor() {
        this.errors = new Map();
        this.uiMapping = {
            // Map backend endpoints to UI elements
            '/api/prompts': 'prompts-tab',
            '/api/workshop': 'workshop-tab',
            '/api/chat': 'chat-tab',
            '/api/tools': 'tools-section',
            '/api/workflows': 'workflows-section',
            // Map file types to UI elements
            'scraper': 'scraper-icon',
            'workflow': 'workflow-icon',
            'generator': 'generator-icon',
            'openai': 'ai-icon',
            // Default fallback
            'default': 'status-icon'
        };
    }

    findNearestUIElement(error) {
        // Extract useful information from the error
        const stack = error.stack || '';
        const url = error.url || '';
        const filename = error.filename || '';

        // Check for API endpoints first
        for (const [endpoint, element] of Object.entries(this.uiMapping)) {
            if (url.includes(endpoint)) {
                return element;
            }
        }

        // Check for file types
        for (const [type, element] of Object.entries(this.uiMapping)) {
            if (filename.includes(type) || stack.includes(type)) {
                return element;
            }
        }

        // If no specific match, return default
        return this.uiMapping.default;
    }

    async trackError(error) {
        try {
            // Find the nearest UI element
            const nearestElement = this.findNearestUIElement(error);
            
            // Generate AI fixes
            const fixes = await this.generateFixes(error);
            
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                nearestElement,
                fixes,
                type: error.name || 'Error'
            };

            // Store error
            const errorKey = `${nearestElement}-${Date.now()}`;
            this.errors.set(errorKey, errorDetails);

            // Emit error event for UI
            this.emitErrorEvent(errorDetails);

            return errorDetails;
        } catch (genError) {
            console.error('Error in error tracking:', genError);
            // Fallback error details
            return {
                message: error.message,
                nearestElement: this.uiMapping.default,
                fixes: [{
                    description: 'Reload the application',
                    explanation: 'This will reset the application state',
                    type: 'safe',
                    confidence: 0.9
                }]
            };
        }
    }

    async generateFixes(error) {
        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            const prompt = `Given this error:
Error Type: ${error.name}
Message: ${error.message}
Stack: ${error.stack}

Provide two potential fixes in this JSON format:
{
    "fixes": [
        {
            "description": "Brief description of fix",
            "explanation": "Why this fix works",
            "code": "Code to implement the fix (if applicable)",
            "type": "safe|enhanced",
            "confidence": 0.0-1.0
        }
    ]
}

One fix should be a safe minimal change, the other should be an enhanced version with improved error handling.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1000
            });

            const response = JSON.parse(completion.choices[0].message.content);
            return response.fixes;
        } catch (error) {
            console.error('Failed to generate fixes:', error);
            return [{
                description: 'Restart the affected component',
                explanation: 'This will reset any corrupted state',
                type: 'safe',
                confidence: 0.8
            }, {
                description: 'Clear application data and refresh',
                explanation: 'This will ensure a clean state',
                type: 'enhanced',
                confidence: 0.6
            }];
        }
    }

    emitErrorEvent(errorDetails) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('system-error', {
                detail: errorDetails
            });
            window.dispatchEvent(event);
        }
    }

    async applyFix(nearestElement, fixIndex) {
        const error = Array.from(this.errors.values())
            .find(e => e.nearestElement === nearestElement);
        
        if (!error || !error.fixes || !error.fixes[fixIndex]) {
            return false;
        }

        const fix = error.fixes[fixIndex];
        
        try {
            // If fix has code, try to apply it
            if (fix.code) {
                // In a real implementation, you'd want to safely evaluate this
                // For now, we'll just log it
                console.log('Would apply fix code:', fix.code);
            }

            // Clear the error
            this.clearError(nearestElement);
            
            // Emit fix applied event
            if (typeof window !== 'undefined') {
                const event = new CustomEvent('fix-applied', {
                    detail: { nearestElement, fix }
                });
                window.dispatchEvent(event);
            }

            return true;
        } catch (error) {
            console.error('Failed to apply fix:', error);
            return false;
        }
    }

    clearError(nearestElement) {
        // Remove all errors associated with this element
        for (const [key, error] of this.errors.entries()) {
            if (error.nearestElement === nearestElement) {
                this.errors.delete(key);
            }
        }

        // Emit error cleared event
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('error-cleared', {
                detail: { nearestElement }
            });
            window.dispatchEvent(event);
        }
    }
}

module.exports = new ErrorTracker();
