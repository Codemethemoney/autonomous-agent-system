import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const languages = ['Spanish', 'French', 'German', 'Italian', 'Portuguese'];
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [summaryLength, setSummaryLength] = useState('medium');

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        setFile(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const processDocument = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('targetLanguage', targetLanguage);
        formData.append('summaryLength', summaryLength);

        try {
            const response = await fetch('/api/process-document', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process document');
            }

            const data = await response.json();
            setResult(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center">
                    Smart Document Processor
                </h1>

                {/* File Upload Area */}
                <motion.div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 mb-8 text-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {file ? (
                        <div className="space-y-4">
                            <p className="text-green-400">✓ {file.name}</p>
                            <button
                                onClick={() => setFile(null)}
                                className="text-red-400 hover:text-red-300"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="mb-4">Drag & drop your document here or</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
                            >
                                Choose File
                            </button>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </motion.div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="block mb-2">Target Language</label>
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                        >
                            {languages.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2">Summary Length</label>
                        <select
                            value={summaryLength}
                            onChange={(e) => setSummaryLength(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                        >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    </div>
                </div>

                {/* Process Button */}
                <motion.button
                    onClick={processDocument}
                    disabled={!file || processing}
                    className={`w-full py-3 rounded-lg mb-8 ${
                        !file || processing
                            ? 'bg-gray-600'
                            : 'bg-green-600 hover:bg-green-500'
                    }`}
                    whileHover={file && !processing ? { scale: 1.02 } : {}}
                    whileTap={file && !processing ? { scale: 0.98 } : {}}
                >
                    {processing ? 'Processing...' : 'Process Document'}
                </motion.button>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6"
                    >
                        <div>
                            <h2 className="text-xl font-bold mb-2">Summary</h2>
                            <p className="text-gray-300">{result.summary}</p>
                        </div>

                        {result.translatedSummary && (
                            <div>
                                <h2 className="text-xl font-bold mb-2">
                                    Translated Summary ({targetLanguage})
                                </h2>
                                <p className="text-gray-300">{result.translatedSummary}</p>
                            </div>
                        )}

                        <div>
                            <h2 className="text-xl font-bold mb-2">Extracted Information</h2>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <h3 className="font-bold mb-1">Dates</h3>
                                    <ul className="text-gray-300">
                                        {result.extractedInfo.dates.map((date: string) => (
                                            <li key={date}>{date}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold mb-1">Names</h3>
                                    <ul className="text-gray-300">
                                        {result.extractedInfo.names.map((name: string) => (
                                            <li key={name}>{name}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold mb-1">Amounts</h3>
                                    <ul className="text-gray-300">
                                        {result.extractedInfo.amounts.map((amount: number) => (
                                            <li key={amount}>${amount}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
