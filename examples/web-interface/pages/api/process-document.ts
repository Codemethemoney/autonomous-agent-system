import { NextApiRequest, NextApiResponse } from 'next';
import SmartDocProcessor from '../../smart-doc-processor';
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = {
    api: {
        bodyParser: false, // Disable body parser for file uploads
    },
};

const docProcessor = new SmartDocProcessor();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = formidable({ uploadDir: '/tmp' });
        const [fields, files] = await form.parse(req);
        
        const file = files.document?.[0];
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get file type from extension
        const fileType = file.originalFilename?.split('.').pop() || 'text';
        
        // Process the document
        const result = await docProcessor.processComplete({
            data: {
                filePath: file.filepath,
                fileType,
                targetLanguage: fields.targetLanguage?.[0],
                summaryLength: fields.summaryLength?.[0] || 'medium'
            }
        });

        // Clean up uploaded file
        await fs.unlink(file.filepath);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({ error: 'Failed to process document' });
    }
}
