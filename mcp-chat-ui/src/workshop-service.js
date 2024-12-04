const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class WorkshopService {
    constructor() {
        this.toolsDir = path.join(__dirname, '../mcp-tools');
        this.templatesDir = path.join(this.toolsDir, 'templates');
        this.customToolsDir = path.join(this.toolsDir, 'custom');
    }

    async createTool(config) {
        const { name, type, description, parameters = [] } = config;
        const toolPath = path.join(this.customToolsDir, `${name}.js`);
        
        // Create template based on tool type
        let template = await this.getTemplate(type);
        template = this.populateTemplate(template, {
            name,
            description,
            parameters,
            date: new Date().toISOString()
        });

        await fs.writeFile(toolPath, template);
        return { success: true, path: toolPath };
    }

    async getTemplate(type) {
        const templatePath = path.join(this.templatesDir, `${type}.js.template`);
        return await fs.readFile(templatePath, 'utf-8');
    }

    populateTemplate(template, data) {
        return template
            .replace('{{name}}', data.name)
            .replace('{{description}}', data.description)
            .replace('{{date}}', data.date)
            .replace('{{parameters}}', JSON.stringify(data.parameters, null, 2));
    }

    async listTools() {
        const tools = await fs.readdir(this.customToolsDir);
        const toolDetails = await Promise.all(
            tools.map(async (tool) => {
                const content = await fs.readFile(
                    path.join(this.customToolsDir, tool),
                    'utf-8'
                );
                const metadata = this.extractMetadata(content);
                return {
                    name: tool.replace('.js', ''),
                    ...metadata
                };
            })
        );
        return toolDetails;
    }

    extractMetadata(content) {
        // Extract metadata from tool file comments
        const metadataRegex = /\/\*\*\s*\n([^*]|\*[^/])*\*\//;
        const match = content.match(metadataRegex);
        if (match) {
            const metadata = match[0];
            return {
                description: metadata.match(/@description\s+(.+)/)?.[1] || '',
                type: metadata.match(/@type\s+(.+)/)?.[1] || '',
                author: metadata.match(/@author\s+(.+)/)?.[1] || '',
                created: metadata.match(/@created\s+(.+)/)?.[1] || ''
            };
        }
        return {};
    }

    async createWorkflow(config) {
        const { name, steps, description } = config;
        const workflowPath = path.join(this.toolsDir, 'workflows', `${name}.json`);
        
        const workflow = {
            name,
            description,
            steps,
            created: new Date().toISOString()
        };

        await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
        return { success: true, path: workflowPath };
    }

    async listWorkflows() {
        const workflowsDir = path.join(this.toolsDir, 'workflows');
        const workflows = await fs.readdir(workflowsDir);
        const workflowDetails = await Promise.all(
            workflows.map(async (workflow) => {
                const content = await fs.readFile(
                    path.join(workflowsDir, workflow),
                    'utf-8'
                );
                return {
                    name: workflow.replace('.json', ''),
                    ...JSON.parse(content)
                };
            })
        );
        return workflowDetails;
    }

    async executeWorkflow(name, params = {}) {
        const workflowPath = path.join(this.toolsDir, 'workflows', `${name}.json`);
        const workflow = JSON.parse(await fs.readFile(workflowPath, 'utf-8'));
        
        const results = [];
        for (const step of workflow.steps) {
            const result = await this.executeStep(step, params);
            results.push(result);
        }
        
        return results;
    }

    async executeStep(step, params) {
        const toolPath = path.join(this.toolsDir, 'tools', `${step.tool}.js`);
        return new Promise((resolve, reject) => {
            const process = spawn('node', [toolPath, JSON.stringify(params)]);
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Step failed: ${error}`));
                } else {
                    resolve({ output, step: step.name });
                }
            });
        });
    }
}

module.exports = new WorkshopService();
