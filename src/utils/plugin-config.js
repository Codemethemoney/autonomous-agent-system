const fs = require('fs').promises;
const path = require('path');
const Logger = require('./logger');
const ConfigManager = require('./config-manager');

class PluginConfigManager {
    constructor(configPath = path.join(process.cwd(), 'plugin-config.json')) {
        this.configPath = configPath;
        this.config = {};
    }

    async loadConfig() {
        const performanceTracker = Logger.measure('PluginConfig:Load', async () => {
            try {
                // Check if config file exists
                try {
                    await fs.access(this.configPath);
                } catch {
                    // Create default config if not exists
                    await this.createDefaultConfig();
                }

                // Read and parse config
                const configContent = await fs.readFile(this.configPath, 'utf-8');
                this.config = JSON.parse(configContent);

                Logger.agent('Plugin configuration loaded', {
                    configuredPlugins: Object.keys(this.config)
                });

                return this.config;
            } catch (error) {
                Logger.error('PluginConfigManager', 'Configuration loading failed', error);
                return {};
            }
        });

        return performanceTracker();
    }

    async createDefaultConfig() {
        const defaultConfig = {
            plugins: {
                'web-search-plugin': {
                    enabled: false,
                    requiredEnvVars: ['SEARCH_API_KEY', 'SEARCH_ENGINE_ID']
                }
                // Add more default plugin configurations
            }
        };

        await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        
        Logger.agent('Default plugin configuration created', {
            configPath: this.configPath
        });
    }

    async validatePluginConfig(pluginName) {
        const performanceTracker = Logger.measure('PluginConfig:Validate', async () => {
            try {
                const pluginConfig = this.config.plugins?.[pluginName];
                
                if (!pluginConfig) {
                    Logger.warn('PluginConfigManager', 'No configuration found for plugin', { pluginName });
                    return false;
                }

                // Check if plugin is enabled
                if (!pluginConfig.enabled) {
                    Logger.debug('PluginConfigManager', 'Plugin is disabled', { pluginName });
                    return false;
                }

                // Validate required environment variables
                if (pluginConfig.requiredEnvVars) {
                    const missingVars = pluginConfig.requiredEnvVars.filter(
                        varName => !ConfigManager.get(varName)
                    );

                    if (missingVars.length > 0) {
                        Logger.error('PluginConfigManager', 'Missing required environment variables', {
                            pluginName,
                            missingVars
                        });
                        return false;
                    }
                }

                return true;
            } catch (error) {
                Logger.error('PluginConfigManager', 'Plugin configuration validation failed', error);
                return false;
            }
        });

        return performanceTracker();
    }

    async enablePlugin(pluginName) {
        try {
            if (!this.config.plugins) {
                this.config.plugins = {};
            }

            this.config.plugins[pluginName] = {
                ...this.config.plugins[pluginName],
                enabled: true
            };

            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');

            Logger.agent('Plugin enabled', { pluginName });
            return true;
        } catch (error) {
            Logger.error('PluginConfigManager', 'Failed to enable plugin', error);
            return false;
        }
    }

    async disablePlugin(pluginName) {
        try {
            if (!this.config.plugins) {
                return false;
            }

            this.config.plugins[pluginName] = {
                ...this.config.plugins[pluginName],
                enabled: false
            };

            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');

            Logger.agent('Plugin disabled', { pluginName });
            return true;
        } catch (error) {
            Logger.error('PluginConfigManager', 'Failed to disable plugin', error);
            return false;
        }
    }
}

module.exports = new PluginConfigManager();
