// Example 1: Just summarize a document
const result = await tool.summarize({
    data: {
        content: "Your long document here",
        length: "short"
    }
});

// Example 2: Do everything at once
const result = await tool.processComplete({
    data: {
        filePath: "/path/to/document.pdf",
        fileType: "pdf",
        targetLanguage: "Spanish",
        summaryLength: "short"
    }
});