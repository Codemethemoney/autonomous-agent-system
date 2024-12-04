#!/usr/bin/env node
const PluginManager = require('../src/utils/plugin-manager');
const PluginConfig = require('../src/utils/plugin-config');

async function main() {
    try {
        // Load and enable web search plugin
        await PluginConfig.enablePlugin('web-search-plugin');

        // Load plugins
        await PluginManager.loadPlugins();

        // List available plugins
        console.log('Available Plugins:', PluginManager.listPlugins());

        // Example of using a web search plugin
        const webSearchPlugin = PluginManager.getPlugin('web-search-plugin');
        
        if (webSearchPlugin) {
            // Execute preprocessing hook
            const processedQuery = await PluginManager.executeHook('search:preprocess', 'nodejs');
            console.log('Processed Query:', processedQuery);

            // Perform search
            const searchResults = await webSearchPlugin.search(processedQuery[0]);
            console.log('Search Results:', searchResults);

            // Execute postprocessing hook
            const processedResults = await PluginManager.executeHook('search:postprocess', searchResults);
            console.log('Processed Results:', processedResults);
        } else {
            console.log('Web search plugin not available. Check configuration and credentials.');
        }
    } catch (error) {
        console.error('Plugin Demo Error:', error);
        process.exit(1);
    }
}

main();
