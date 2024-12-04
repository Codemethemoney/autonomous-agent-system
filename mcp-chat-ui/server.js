require('dotenv').config();

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const aiService = require('./src/ai-service');
const mcpTools = require('./src/mcp-tools');
const promptIndex = require('./src/prompt-index.json');
const workshopService = require('./src/workshop-service');
const generatorService = require('./src/generator-service');
const { marked } = require('marked');
const { openai } = require('./src/openai');
const fileDocs = require('./src/docs/file-docs.json');
const testError = require('./src/test-error');
const errorTracker = require('./src/utils/error-tracker');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Store API keys in memory (in production, use proper secure storage)
const apiKeys = {
    openai: '',
    anthropic: ''
};

// Initialize AI service with API keys
app.post('/api/keys', (req, res) => {
    const { openai, anthropic } = req.body;
    if (openai) apiKeys.openai = openai;
    if (anthropic) apiKeys.anthropic = anthropic;
    aiService.initializeClients(apiKeys);
    res.json({ success: true });
});

app.get('/api/keys', (req, res) => {
    res.json(apiKeys);
});

// Handle chat messages
app.post('/api/chat', upload.array('files'), async (req, res) => {
    try {
        const { message, model, systemInstructions } = req.body;
        const files = req.files || [];

        // Process files if present
        const processedFiles = await Promise.all(files.map(async (file) => {
            const content = await fs.promises.readFile(file.path);
            return {
                type: file.mimetype,
                content
            };
        }));

        // Get AI response
        const response = await aiService.generateResponse(
            model,
            message,
            systemInstructions,
            processedFiles
        );

        // Stream the response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Handle streaming responses
        if (model === 'gpt4' || model === 'claude') {
            for await (const chunk of response) {
                const content = chunk.choices?.[0]?.delta?.content || chunk.content;
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }
        } else {
            // Llama2 returns a complete response
            res.write(`data: ${JSON.stringify({ content: response })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

        // Clean up uploaded files
        files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle file uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
        success: true, 
        filename: req.file.filename,
        path: req.file.path
    });
});

// Handle knowledge base additions
app.post('/api/knowledge', express.text(), (req, res) => {
    const knowledgeDir = path.join(__dirname, 'knowledge');
    if (!fs.existsSync(knowledgeDir)){
        fs.mkdirSync(knowledgeDir);
    }
    const filename = `knowledge_${Date.now()}.txt`;
    fs.writeFileSync(path.join(knowledgeDir, filename), req.body);
    res.json({ success: true, filename });
});

// Get prompt index
app.get('/api/prompts', (req, res) => {
    res.json(promptIndex);
});

// Execute MCP tool
app.post('/api/tools/execute', express.json(), async (req, res) => {
    try {
        const { tool, params } = req.body;
        let result;

        switch (tool) {
        case 'scraper':
            result = await mcpTools.runScraper(params.url);
            break;
        case 'enhanced-chat':
            result = await mcpTools.runEnhancedChat(params.prompt);
            break;
        case 'workflow':
            result = await mcpTools.runWorkflow(params.workflowName, params.workflowParams);
            break;
        default:
            throw new Error('Unknown tool');
        }

        res.json({ success: true, result });
    } catch (error) {
        console.error('Error executing tool:', error);
        res.status(500).json({ error: error.message });
    }
});

// Research Assistant endpoint
const researchAssistantPrompt = `You are a knowledgeable research assistant for the MCP Bot Builder Workshop. 
Your role is to help users understand how to create and use tools and workflows effectively.
Focus on providing practical, actionable advice with concrete examples.
When appropriate, include code snippets, parameter suggestions, and best practices.`;

app.post('/api/research-assistant', async (req, res) => {
    try {
        const { message, model = 'gpt-4' } = req.body;
        
        // Initialize the conversation with the research assistant prompt
        const conversation = [
            { role: 'system', content: researchAssistantPrompt },
            { role: 'user', content: message }
        ];

        const completion = await openai.createChatCompletion({
            model,
            messages: conversation,
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = completion.choices[0].message.content;
        
        // Convert markdown to HTML for better display
        const html = marked(response);
        
        res.json({ content: html });
    } catch (error) {
        console.error('Error in research assistant endpoint:', error);
        res.status(500).json({ error: 'Failed to process research assistant request' });
    }
});

// File documentation endpoint
app.get('/api/docs/files', (req, res) => {
    res.json(fileDocs);
});

// Enhanced logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Tool and Workflow Generation endpoints with detailed logging
app.post('/api/generate/tool', async (req, res) => {
    try {
        console.log('[Tool Generation] Request:', req.body);
        const { prompt } = req.body;
        const toolSpec = await generatorService.generateTool(prompt);
        console.log('[Tool Generation] Success:', toolSpec);
        res.json(toolSpec);
    } catch (error) {
        console.error('[Tool Generation] Error:', error);
        res.status(500).json({ error: 'Failed to generate tool', details: error.message });
    }
});

app.post('/api/generate/workflow', async (req, res) => {
    try {
        console.log('[Workflow Generation] Request:', req.body);
        const { prompt } = req.body;
        const workflowSpec = await generatorService.generateWorkflow(prompt);
        console.log('[Workflow Generation] Success:', workflowSpec);
        res.json(workflowSpec);
    } catch (error) {
        console.error('[Workflow Generation] Error:', error);
        res.status(500).json({ error: 'Failed to generate workflow', details: error.message });
    }
});

// Generate fixes for errors
app.post('/api/generate-fixes', async (req, res) => {
    try {
        const { error, context } = req.body;
        
        const prompt = `Given this error in the ${context} tab:
Error: ${error}

Provide two potential fixes in this JSON format:
{
    "fixes": [
        {
            "description": "Brief description of fix",
            "explanation": "Why this fix works",
            "type": "safe|enhanced",
            "confidence": 0.0-1.0
        }
    ]
}

One fix should be a safe minimal change, the other should be an enhanced version with improved error handling.`;

        const completion = await openai.createChatCompletion([
            { role: 'user', content: prompt }
        ]);

        const response = JSON.parse(completion.choices[0].message.content);
        res.json(response.fixes);
    } catch (error) {
        console.error('Error generating fixes:', error);
        res.status(500).json({
            error: 'Failed to generate fixes',
            details: error.message
        });
    }
});

// Workshop endpoints
app.post('/api/workshop/tool', express.json(), async (req, res) => {
    try {
        const result = await workshopService.createTool(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error creating tool:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/workshop/tools', async (req, res) => {
    try {
        const tools = await workshopService.listTools();
        res.json(tools);
    } catch (error) {
        console.error('Error listing tools:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/workshop/workflow', express.json(), async (req, res) => {
    try {
        const result = await workshopService.createWorkflow(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/workshop/workflows', async (req, res) => {
    try {
        const workflows = await workshopService.listWorkflows();
        res.json(workflows);
    } catch (error) {
        console.error('Error listing workflows:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/workshop/execute', express.json(), async (req, res) => {
    try {
        const { workflow, params } = req.body;
        const result = await workshopService.executeWorkflow(workflow, params);
        res.json(result);
    } catch (error) {
        console.error('Error executing workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error tracking middleware
app.use((err, req, res, next) => {
    const error = errorTracker.trackError(err);
    res.status(500).json({ error });
});

// Tools endpoints
const tools = {
    scraper: {
        name: 'Web Scraper',
        description: 'Extract data from websites with ease',
        interface: `
            <div class="tool-form">
                <input type="text" placeholder="Enter URL to scrape" class="tool-input">
                <button class="button" onclick="startScraping()">Start Scraping</button>
                <div id="scrapeResults" class="tool-results"></div>
            </div>
        `
    },
    generator: {
        name: 'Code Generator',
        description: 'Generate code snippets based on your requirements',
        interface: `
            <div class="tool-form">
                <textarea placeholder="Describe what code you need" class="tool-input" rows="4"></textarea>
                <button class="button" onclick="generateCode()">Generate Code</button>
                <pre id="generatedCode" class="tool-results"></pre>
            </div>
        `
    },
    workflow: {
        name: 'Workflow Builder',
        description: 'Create automated workflows by connecting different tools',
        interface: `
            <div class="tool-form">
                <div id="workflowBuilder" class="workflow-builder">
                    <div class="workflow-steps"></div>
                    <button class="button" onclick="addWorkflowStep()">Add Step</button>
                </div>
            </div>
        `
    }
};

app.get('/api/tools/:type', (req, res) => {
    const { type } = req.params;
    const tool = tools[type];
    
    if (tool) {
        res.json(tool);
    } else {
        res.status(404).json({ error: 'Tool not found' });
    }
});

// Test endpoints for error handling
app.post('/api/test/error/division', (req, res) => {
    try {
        testError.testDivision(10, 0);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/error/undefined', (req, res) => {
    try {
        testError.testUndefined();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/error/syntax', (req, res) => {
    try {
        testError.testSyntax();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/division-error', (req, res) => {
    try {
        const result = 1 / 0;
        res.json({ result });
    } catch (error) {
        errorTracker.trackError(error);
        res.status(500).json({ error: 'Division by zero error' });
    }
});

app.get('/api/test/undefined-error', (req, res) => {
    try {
        const obj = undefined;
        const result = obj.nonexistent.property;
        res.json({ result });
    } catch (error) {
        errorTracker.trackError(error);
        res.status(500).json({ error: 'Undefined error' });
    }
});

app.get('/api/test/syntax-error', (req, res) => {
    try {
        eval('this is not valid javascript');
        res.json({ success: true });
    } catch (error) {
        errorTracker.trackError(error);
        res.status(500).json({ error: 'Syntax error' });
    }
});

const PORT = 3456;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
