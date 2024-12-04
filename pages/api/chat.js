import aiService from '../../mcp-chat-ui/src/ai-service';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, model = 'qwen2.5-coder' } = req.body;
    
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const systemInstructions = 'You are a helpful AI assistant powered by the Qwen 2.5 model. Help the user with their questions and tasks.';
        const response = await aiService.generateResponse(model, message, systemInstructions);
    
        res.status(200).json({ response });
    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
}
