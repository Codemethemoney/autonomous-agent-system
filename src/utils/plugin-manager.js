const fs = require('fs').promises;
const path = require('path');
const Logger = require('./logger');
const PluginConfig = require('./plugin-config');

class PluginManager {
    constructor(pluginDirectory) {
        this.pluginDirectory = pluginDirectory || path.join(process.cwd(), 'plugins');
        this.plugins = new Map();
        this.hooks = new Map();

        Logger.agent('PluginManager initialized', {
            pluginDirectory: this.pluginDirectory
        });
    }

    async loadPlugins() {
        const performanceTracker = Logger.measure('PluginManager:LoadPlugins', async () => {
            try {
                // Ensure plugin directory exists
                await fs.mkdir(this.pluginDirectory, { recursive: true });

                // Load plugin configuration
                await PluginConfig.loadConfig();

                // Read plugin files
                const pluginFiles = await fs.readdir(this.pluginDirectory);
                
                for (const file of pluginFiles) {
                    if (file.endsWith('.js')) {
                        const pluginName = path.basename(file, '.js');
                        
                        // Check if plugin is configured and enabled
                        const isEnabled = await PluginConfig.validatePluginConfig(pluginName);
                        
                        if (isEnabled) {
                            await this.loadPlugin(path.join(this.pluginDirectory, file));
                        }
                    }
                }

                Logger.performance('Plugins loaded', {
                    totalPlugins: this.plugins.size
                });
            } catch (error) {
                Logger.error('PluginManager', 'Plugin loading failed', error);
            }
        });

        return performanceTracker();
    }

    async loadPlugin(pluginPath) {
        try {
            // Dynamically import plugin
            const pluginModule = require(pluginPath);
            const pluginName = path.basename(pluginPath, '.js');

            // Validate plugin structure using PluginConfig
            if (!await PluginConfig.validatePlugin(pluginModule)) {
                throw new Error(`Invalid plugin structure: ${pluginName}`);
            }

            this.plugins.set(pluginName, pluginModule);
            
            // Register plugin hooks
            if (pluginModule.hooks) {
                Object.entries(pluginModule.hooks).forEach(([hookName, hookHandler]) => {
                    this.registerHook(hookName, hookHandler);
                });
            }

            Logger.agent('Plugin loaded', { 
                name: pluginName, 
                hooks: Object.keys(pluginModule.hooks || {}) 
            });

            return pluginModule;
        } catch (error) {
            Logger.error('PluginManager', `Failed to load plugin: ${pluginPath}`, error);
            throw error;
        }
    }

    registerHook(hookName, handler) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        
        this.hooks.get(hookName).push(handler);
        
        Logger.debug('PluginManager', 'Hook registered', { 
            hookName, 
            totalHandlers: this.hooks.get(hookName).length 
        });
    }

    async executeHook(hookName, ...args) {
        const performanceTracker = Logger.measure(`PluginManager:ExecuteHook:${hookName}`, async () => {
            try {
                const hookHandlers = this.hooks.get(hookName) || [];
                
                const results = [];
                for (const handler of hookHandlers) {
                    const result = await handler(...args);
                    results.push(result);
                }

                Logger.performance('Hook executed', {
                    hookName,
                    handlersInvoked: hookHandlers.length
                });

                return results;
            } catch (error) {
                Logger.error('PluginManager', `Hook execution failed: ${hookName}`, error);
                throw error;
            }
        });

        return performanceTracker();
    }

    async createPlugin(pluginName, pluginContent) {
        const performanceTracker = Logger.measure('PluginManager:CreatePlugin', async () => {
            try {
                const pluginPath = path.join(this.pluginDirectory, `${pluginName}.js`);
                
                await fs.writeFile(pluginPath, pluginContent, 'utf-8');
                
                Logger.agent('Plugin created', { 
                    name: pluginName, 
                    path: pluginPath 
                });

                // Reload plugins to include new plugin
                await this.loadPlugins();

                return pluginPath;
            } catch (error) {
                Logger.error('PluginManager', 'Plugin creation failed', error);
                throw error;
            }
        });

        return performanceTracker();
    }

    listPlugins() {
        return Array.from(this.plugins.keys());
    }

    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }
}

module.exports = new PluginManager();
