#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

class LogAnalyzer {
    constructor(options = {}) {
        this.logsDir = options.logsDir || path.join(process.cwd(), 'logs');
        this.decryptionKey = options.decryptionKey;

        // Ensure logs directory exists
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
            console.log(`Created logs directory: ${this.logsDir}`);
        }
    }

    // Decrypt log entries
    decrypt(encryptedData) {
        if (!this.decryptionKey || !encryptedData.iv) return encryptedData;

        try {
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const decipher = crypto.createDecipheriv(
                'aes-256-cbc', 
                this.decryptionKey, 
                iv
            );

            let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedData;
        }
    }

    // Read and parse log files
    async readLogs(options = {}) {
        const {
            level = null,
            namespace = null,
            startDate = null,
            endDate = null
        } = options;

        const logFiles = this.getLogFiles();
        const parsedLogs = [];

        for (const logFile of logFiles) {
            const logEntries = await this.parseLogFile(logFile);
            const filteredEntries = logEntries.filter(entry => {
                const matchesLevel = !level || entry.level === level;
                const matchesNamespace = !namespace || entry.namespace === namespace;
                const matchesStartDate = !startDate || new Date(entry.timestamp) >= startDate;
                const matchesEndDate = !endDate || new Date(entry.timestamp) <= endDate;

                return matchesLevel && matchesNamespace && matchesStartDate && matchesEndDate;
            });

            parsedLogs.push(...filteredEntries);
        }

        return parsedLogs;
    }

    // Get all log files (including compressed)
    getLogFiles() {
        return fs.readdirSync(this.logsDir)
            .filter(file => file.endsWith('.log') || file.endsWith('.log.gz'))
            .map(file => path.join(this.logsDir, file));
    }

    // Parse individual log file
    async parseLogFile(filePath) {
        const fileContent = await this.readFileContent(filePath);
        return fileContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    const entry = JSON.parse(line);
                    entry.data = this.decrypt(entry.data);
                    return entry;
                } catch (error) {
                    console.error('Log parsing error:', error);
                    return null;
                }
            })
            .filter(entry => entry !== null);
    }

    // Read file content (handle gzip)
    readFileContent(filePath) {
        return new Promise((resolve, reject) => {
            const readStream = filePath.endsWith('.gz')
                ? fs.createReadStream(filePath).pipe(zlib.createGunzip())
                : fs.createReadStream(filePath);

            let content = '';
            readStream.on('data', chunk => { content += chunk; });
            readStream.on('end', () => resolve(content));
            readStream.on('error', reject);
        });
    }

    // Generate log statistics
    async generateStatistics(options = {}) {
        const logs = await this.readLogs(options);

        const statistics = {
            totalLogs: logs.length,
            logsByLevel: {},
            logsByNamespace: {},
            errorDetails: []
        };

        logs.forEach(log => {
            // Count logs by level
            statistics.logsByLevel[log.level] = 
                (statistics.logsByLevel[log.level] || 0) + 1;

            // Count logs by namespace
            statistics.logsByNamespace[log.namespace] = 
                (statistics.logsByNamespace[log.namespace] || 0) + 1;

            // Collect error details
            if (log.level === 'error') {
                statistics.errorDetails.push({
                    namespace: log.namespace,
                    message: log.message,
                    timestamp: log.timestamp
                });
            }
        });

        return statistics;
    }

    // Export logs to JSON
    async exportLogsToJson(outputPath, options = {}) {
        const logs = await this.readLogs(options);
        fs.writeFileSync(outputPath, JSON.stringify(logs, null, 2));
        return outputPath;
    }
}

// CLI Interface
async function main() {
    const analyzer = new LogAnalyzer();
    const command = process.argv[2];

    switch (command) {
        case 'stats':
            const stats = await analyzer.generateStatistics();
            console.log(JSON.stringify(stats, null, 2));
            break;
        case 'export':
            const outputPath = path.join(process.cwd(), 'logs-export.json');
            const exportedPath = await analyzer.exportLogsToJson(outputPath);
            console.log(`Logs exported to: ${exportedPath}`);
            break;
        default:
            console.log('Usage: node log-analyzer.js [stats|export]');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = LogAnalyzer;
