const { openai } = require('./openai');
const { searchGitHubRepositories, fetchRepositoryContent } = require('./github-service');
const Logger = require('./utils/logger');
const { WORKFLOW_SYSTEM_PROMPT, WORKFLOW_USER_TEMPLATE } = require('./prompts/workflow-prompts');

const TOOL_TYPES = ['web-scraper', 'data-processor', 'api-tool', 'browser-automation'];

class GeneratorService {
    async generateTool(prompt) {
        const context = { prompt, startTime: Date.now() };
        try {
            Logger.generator('Starting tool generation', { prompt });
            
            // Track the generation process state
            const state = {
                stage: 'analysis',
                completedSteps: [],
                currentStep: null,
                error: null
            };
            
            Logger.generator('Analyzing tool prompt');
            state.currentStep = 'analysis';
            const analysis = await this._analyzeToolPrompt(prompt);
            state.completedSteps.push({ step: 'analysis', result: analysis });
            Logger.debugState('tool', state);
            
            Logger.generator('Searching GitHub repositories', { searchQuery: analysis.searchQuery });
            state.currentStep = 'github_search';
            const repos = await searchGitHubRepositories(analysis.searchQuery);
            state.completedSteps.push({ 
                step: 'github_search', 
                result: { repoCount: repos.length, repos: repos.map(r => r.full_name) }
            });
            Logger.debugState('tool', state);
            
            Logger.generator('Fetching code samples');
            state.currentStep = 'fetch_samples';
            const samples = await this._getCodeSamples(repos, analysis.toolType);
            state.completedSteps.push({ 
                step: 'fetch_samples', 
                result: { sampleCount: samples.length }
            });
            Logger.debugState('tool', state);
            
            Logger.generator('Generating tool specification');
            state.currentStep = 'generate_spec';
            const messages = [
                { 
                    role: 'system', 
                    content: 'You are an expert tool builder. Generate a complete tool specification based on the user prompt and code samples provided. Include name, description, parameters, and implementation details.' 
                },
                { 
                    role: 'user', 
                    content: `
                        User Prompt: ${prompt}
                        
                        Analysis: ${JSON.stringify(analysis, null, 2)}
                        
                        Code Samples: ${JSON.stringify(samples, null, 2)}
                        
                        Generate a complete tool specification in JSON format with the following structure:
                        {
                            "name": "tool name",
                            "description": "detailed description",
                            "type": "tool type",
                            "parameters": [
                                {
                                    "name": "parameter name",
                                    "type": "parameter type",
                                    "description": "parameter description",
                                    "required": boolean
                                }
                            ],
                            "sourceCode": "implementation code"
                        }
                    `
                }
            ];

            Logger.generator('Sending request to OpenAI', { messages });
            const completion = await openai.createChatCompletion({
                model: 'gpt-4',
                messages,
                temperature: 0.7,
                max_tokens: 2000
            });

            const rawResponse = completion.choices[0].message.content;
            Logger.generator('Received OpenAI response', { rawResponse });

            try {
                const result = JSON.parse(rawResponse);
                state.completedSteps.push({ 
                    step: 'generate_spec', 
                    result: { specification: result }
                });
                Logger.debugState('tool', state);

                // Validate the generated specification
                this._validateToolSpec(result);

                context.endTime = Date.now();
                context.duration = context.endTime - context.startTime;
                Logger.generator('Tool generation completed', { 
                    duration: context.duration,
                    specification: result 
                });

                return result;
            } catch (parseError) {
                Logger.error('tool', 'Failed to parse OpenAI response', parseError);
                state.error = {
                    stage: 'parse_response',
                    error: parseError.message,
                    rawResponse
                };
                throw new Error('Invalid tool specification format');
            }
        } catch (error) {
            context.endTime = Date.now();
            context.duration = context.endTime - context.startTime;
            context.error = error;

            Logger.error('tool', 'Tool generation failed', error);
            throw error;
        }
    }

    async generateWorkflow(prompt) {
        const context = { prompt, startTime: Date.now() };
        try {
            Logger.generator('Starting workflow generation', { prompt });
            
            // Track the generation process state
            const state = {
                stage: 'analysis',
                completedSteps: [],
                currentStep: null,
                error: null
            };
            
            Logger.generator('Analyzing workflow prompt');
            state.currentStep = 'analysis';
            const analysis = await this._analyzeWorkflowPrompt(prompt);
            state.completedSteps.push({ step: 'analysis', result: analysis });
            Logger.debugState('workflow', state);
            
            Logger.generator('Searching GitHub repositories', { searchQuery: analysis.searchQuery });
            state.currentStep = 'github_search';
            const repos = await searchGitHubRepositories(analysis.searchQuery);
            state.completedSteps.push({ 
                step: 'github_search', 
                result: { repoCount: repos.length, repos: repos.map(r => r.full_name) }
            });
            Logger.debugState('workflow', state);
            
            Logger.generator('Fetching workflow samples');
            state.currentStep = 'fetch_samples';
            const samples = await this._getWorkflowSamples(repos);
            state.completedSteps.push({ 
                step: 'fetch_samples', 
                result: { sampleCount: samples.length }
            });
            Logger.debugState('workflow', state);
            
            Logger.generator('Generating workflow specification');
            state.currentStep = 'generate_spec';
            const messages = [
                { 
                    role: 'system', 
                    content: 'You are an expert workflow designer. Generate a complete workflow specification based on the user prompt and workflow samples provided. Break down complex tasks into logical steps.' 
                },
                { 
                    role: 'user', 
                    content: `
                        User Prompt: ${prompt}
                        
                        Analysis: ${JSON.stringify(analysis, null, 2)}
                        
                        Workflow Samples: ${JSON.stringify(samples, null, 2)}
                        
                        Generate a complete workflow specification in JSON format with the following structure:
                        {
                            "name": "workflow name",
                            "description": "detailed description",
                            "steps": [
                                {
                                    "tool": "tool name",
                                    "description": "step description",
                                    "parameters": {
                                        "param1": "value1",
                                        "param2": "value2"
                                    }
                                }
                            ]
                        }
                    `
                }
            ];

            Logger.generator('Sending request to OpenAI', { messages });
            const completion = await openai.createChatCompletion({
                model: 'gpt-4',
                messages,
                temperature: 0.7,
                max_tokens: 2000
            });

            const rawResponse = completion.choices[0].message.content;
            Logger.generator('Received OpenAI response', { rawResponse });

            try {
                const result = JSON.parse(rawResponse);
                state.completedSteps.push({ 
                    step: 'generate_spec', 
                    result: { specification: result }
                });
                Logger.debugState('workflow', state);

                // Validate the generated specification
                this._validateWorkflowSpec(result);

                context.endTime = Date.now();
                context.duration = context.endTime - context.startTime;
                Logger.generator('Workflow generation completed', { 
                    duration: context.duration,
                    specification: result 
                });

                return result;
            } catch (parseError) {
                Logger.error('workflow', 'Failed to parse OpenAI response', parseError);
                state.error = {
                    stage: 'parse_response',
                    error: parseError.message,
                    rawResponse
                };
                throw new Error('Invalid workflow specification format');
            }
        } catch (error) {
            context.endTime = Date.now();
            context.duration = context.endTime - context.startTime;
            context.error = error;

            Logger.error('workflow', 'Workflow generation failed', error);
            throw error;
        }
    }

    async _analyzeToolPrompt(prompt) {
        const completion = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                { 
                    role: 'system', 
                    content: `You are an expert at analyzing tool requirements. Tool types include: ${TOOL_TYPES.join(', ')}` 
                },
                { 
                    role: 'user', 
                    content: `
                        Analyze this tool request and provide:
                        1. The most appropriate tool type
                        2. Key requirements
                        3. A GitHub search query to find relevant examples
                        
                        Prompt: ${prompt}
                        
                        Respond in JSON format:
                        {
                            "toolType": "type",
                            "requirements": ["req1", "req2"],
                            "searchQuery": "github search query"
                        }
                    `
                }
            ]
        });

        return JSON.parse(completion.choices[0].message.content);
    }

    async _analyzeWorkflowPrompt(prompt) {
        try {
            const completion = await openai.createChatCompletion([
                { 
                    role: 'system', 
                    content: WORKFLOW_SYSTEM_PROMPT
                },
                { 
                    role: 'user', 
                    content: WORKFLOW_USER_TEMPLATE(prompt)
                }
            ]);

            const response = completion.choices[0].message.content;
            Logger.generator('Workflow analysis response', { response });

            try {
                return JSON.parse(response);
            } catch (parseError) {
                Logger.error('workflow', 'Failed to parse workflow analysis', parseError);
                throw new Error('Invalid workflow analysis format. Please try again later.');
            }
        } catch (error) {
            if (error.message.includes('rate limit')) {
                // Pass the rate limit error up to be displayed in the UI
                throw error;
            }
            Logger.error('workflow', 'Failed to analyze workflow prompt', error);
            throw new Error('Failed to analyze workflow. Please try again later.');
        }
    }

    async _getCodeSamples(repos, toolType) {
        const samples = [];
        
        for (const repo of repos.slice(0, 3)) { // Get samples from top 3 repos
            const files = await fetchRepositoryContent(repo.full_name);
            const relevantFiles = files.filter(file => 
                file.name.toLowerCase().includes(toolType.toLowerCase()) ||
                file.name.endsWith('.js') || 
                file.name.endsWith('.py')
            );
            
            for (const file of relevantFiles.slice(0, 2)) { // Get up to 2 relevant files per repo
                samples.push({
                    repo: repo.full_name,
                    file: file.name,
                    content: file.content
                });
            }
        }
        
        return samples;
    }

    async _getWorkflowSamples(repos) {
        const samples = [];
        
        for (const repo of repos.slice(0, 3)) {
            const files = await fetchRepositoryContent(repo.full_name);
            const relevantFiles = files.filter(file => 
                file.name.toLowerCase().includes('workflow') ||
                file.name.toLowerCase().includes('pipeline') ||
                file.name.endsWith('.yaml') ||
                file.name.endsWith('.yml')
            );
            
            for (const file of relevantFiles.slice(0, 2)) {
                samples.push({
                    repo: repo.full_name,
                    file: file.name,
                    content: file.content
                });
            }
        }
        
        return samples;
    }

    _validateToolSpec(spec) {
        const requiredFields = ['name', 'description', 'type', 'parameters', 'sourceCode'];
        const missingFields = requiredFields.filter(field => !spec[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Invalid tool specification: missing required fields: ${missingFields.join(', ')}`);
        }

        if (!Array.isArray(spec.parameters) || spec.parameters.length === 0) {
            throw new Error('Invalid tool specification: parameters must be a non-empty array');
        }

        spec.parameters.forEach((param, index) => {
            const paramRequired = ['name', 'type', 'description', 'required'];
            const missingParamFields = paramRequired.filter(field => !param[field]);
            
            if (missingParamFields.length > 0) {
                throw new Error(`Invalid parameter ${index + 1}: missing required fields: ${missingParamFields.join(', ')}`);
            }
        });
    }

    _validateWorkflowSpec(spec) {
        const requiredFields = ['name', 'description', 'steps'];
        const missingFields = requiredFields.filter(field => !spec[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Invalid workflow specification: missing required fields: ${missingFields.join(', ')}`);
        }

        if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
            throw new Error('Invalid workflow specification: steps must be a non-empty array');
        }

        spec.steps.forEach((step, index) => {
            const stepRequired = ['tool', 'description', 'parameters'];
            const missingStepFields = stepRequired.filter(field => !step[field]);
            
            if (missingStepFields.length > 0) {
                throw new Error(`Invalid step ${index + 1}: missing required fields: ${missingStepFields.join(', ')}`);
            }
        });
    }
}

module.exports = new GeneratorService();
