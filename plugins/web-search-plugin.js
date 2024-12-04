const axios = require('axios');
const Logger = require('../src/utils/logger');
const ConfigManager = require('../src/utils/config-manager');

class WebSearchPlugin {
    constructor() {
        // Retrieve API credentials from config manager
        this.apiKey = ConfigManager.get('SEARCH_API_KEY');
        this.engineId = ConfigManager.get('SEARCH_ENGINE_ID');
        this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
    }

    async search(query, options = {}) {
        const performanceTracker = Logger.measure('WebSearchPlugin:Search', async () => {
            try {
                Logger.agent('Performing web search', { query });

                if (!this.apiKey || !this.engineId) {
                    throw new Error('Search API credentials not configured');
                }

                const response = await axios.get(this.baseUrl, {
                    params: {
                        key: this.apiKey,
                        cx: this.engineId,
                        q: query,
                        ...options
                    }
                });

                const results = response.data.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet
                }));

                Logger.performance('Web search completed', {
                    resultsCount: results.length
                });

                return results;
            } catch (error) {
                Logger.error('WebSearchPlugin', 'Search failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    // Plugin hooks for extensibility
    hooks = {
        'search:preprocess': async (query) => {
            // Example preprocessing hook
            return query.trim().toLowerCase();
        },
        'search:postprocess': async (results) => {
            // Example postprocessing hook
            return results.slice(0, 5);  // Limit to top 5 results
        }
    };

    // Validation method
    static validate() {
        const apiKey = ConfigManager.get('SEARCH_API_KEY');
        const engineId = ConfigManager.get('SEARCH_ENGINE_ID');
        return !!(apiKey && engineId);
    }
}

module.exports = new WebSearchPlugin();
