import SmartDocProcessor from './smart-doc-processor';

async function demonstrateDocProcessor() {
    // 1. Create an instance of our tool
    const docProcessor = new SmartDocProcessor();

    try {
        // Example 1: Process a simple text file
        console.log('🔍 Example 1: Reading and summarizing a text file');
        const textResult = await docProcessor.processComplete({
            data: {
                filePath: './sample-docs/meeting-notes.txt',
                fileType: 'text',
                summaryLength: 'short'
            }
        });
        console.log('📝 Summary:', textResult.data.summary);
        console.log('📊 Extracted Info:', textResult.data.extractedInfo);

        // Example 2: Translate a specific section
        console.log('\n🌍 Example 2: Translating content to Spanish');
        const translationResult = await docProcessor.translate({
            data: {
                content: "Let's schedule a meeting next week to discuss the project progress.",
                targetLanguage: "Spanish"
            }
        });
        console.log('🔤 Translated:', translationResult.data.translated);

        // Example 3: Extract specific information from a document
        console.log('\n🎯 Example 3: Extracting specific information');
        const extractResult = await docProcessor.extractInfo({
            data: {
                content: `Meeting scheduled for 2024-01-15
                         Attendees: John Smith, Sarah Johnson
                         Budget: $5,000
                         Location: Conference Room A`,
                infoTypes: ['dates', 'names', 'amounts']
            }
        });
        console.log('📅 Dates found:', extractResult.data.dates);
        console.log('👥 Names found:', extractResult.data.names);
        console.log('💰 Amounts found:', extractResult.data.amounts);

        // Example 4: Process a PDF with all features
        console.log('\n📚 Example 4: Complete PDF processing');
        const pdfResult = await docProcessor.processComplete({
            data: {
                filePath: './sample-docs/report.pdf',
                fileType: 'pdf',
                targetLanguage: 'Spanish',
                summaryLength: 'medium'
            }
        });
        
        // Display the results in a structured way
        console.log('📄 Document Analysis Results:');
        console.log('----------------------------');
        console.log('📝 Summary:', pdfResult.data.summary);
        console.log('🌍 Translated Summary:', pdfResult.data.translatedSummary);
        console.log('📊 Extracted Information:');
        console.log('  - Dates:', pdfResult.data.extractedInfo.dates);
        console.log('  - Names:', pdfResult.data.extractedInfo.names);
        console.log('  - Amounts:', pdfResult.data.extractedInfo.amounts);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Create some sample documents for testing
async function createSampleDocs() {
    const fs = require('fs').promises;
    const path = require('path');

    // Create sample directory
    await fs.mkdir(path.join(__dirname, 'sample-docs'), { recursive: true });

    // Create sample text file
    await fs.writeFile(
        path.join(__dirname, 'sample-docs', 'meeting-notes.txt'),
        `Team Meeting Notes - 2024-01-10
        Attendees: John Smith, Sarah Johnson
        Budget Discussion: Approved $5,000 for Q1 projects
        Next Steps: Follow-up meeting scheduled for 2024-01-15`
    );

    // Create sample PDF content (just for demonstration)
    await fs.writeFile(
        path.join(__dirname, 'sample-docs', 'report.pdf'),
        `Sample PDF content - this is just for demonstration
        In a real implementation, we would use proper PDF creation libraries`
    );
}

// Run the demo
async function runDemo() {
    console.log('🚀 Setting up demo environment...');
    await createSampleDocs();
    
    console.log('📋 Starting document processing demo...\n');
    await demonstrateDocProcessor();
}

runDemo().catch(console.error);
