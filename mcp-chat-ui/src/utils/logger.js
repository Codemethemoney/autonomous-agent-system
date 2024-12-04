const debug = require('debug');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// Secure log masking configuration
const SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credentials/i
];

class Logger {
    constructor(options = {}) {
        // Log directory configuration
        this.logsDir = options.logsDir || path.join(process.cwd(), 'logs');
        this.maxLogFiles = options.maxLogFiles || 10;
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        
        // Encryption key for sensitive logs
        this.encryptionKey = options.encryptionKey || crypto.randomBytes(32);
        
        // Ensure logs directory exists
        this.ensureLogDirectory();
        
        // Current log stream
        this.currentLogStream = this.createLogStream();
        
        // Debug namespaces
        this.debugNamespaces = {
            api: debug('mcp:api'),
            generator: debug('mcp:generator'),
            github: debug('mcp:github'),
            error: debug('mcp:error'),
            agent: debug('mcp:agent'),
            performance: debug('mcp:performance')
        };
    }

    ensureLogDirectory() {
        try {
            fsSync.mkdirSync(this.logsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
    }

    createLogStream() {
        const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
        const logPath = path.join(this.logsDir, logFileName);
        
        return fsSync.createWriteStream(logPath, { flags: 'a' });
    }

    rotateLogsIfNeeded() {
        try {
            const logFiles = fsSync.readdirSync(this.logsDir)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logsDir, file),
                    stats: fsSync.statSync(path.join(this.logsDir, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime);

            // Rotate logs if too many or too large
            if (logFiles.length > this.maxLogFiles || 
                logFiles[0].stats.size > this.maxLogSize) {
                this.archiveLogs(logFiles);
            }
        } catch (error) {
            console.error('Log rotation failed:', error);
        }
    }

    archiveLogs(logFiles) {
        // Archive oldest logs
        logFiles.slice(this.maxLogFiles - 1).forEach(logFile => {
            const archivePath = `${logFile.path}.gz`;
            
            // Compress log file
            const gzip = zlib.createGzip();
            const source = fsSync.createReadStream(logFile.path);
            const destination = fsSync.createWriteStream(archivePath);
            
            source.pipe(gzip).pipe(destination);
            
            // Remove original log file after compression
            source.on('end', () => {
                fsSync.unlinkSync(logFile.path);
            });
        });
    }

    maskSensitiveData(data) {
        if (typeof data === 'string') {
            return SENSITIVE_PATTERNS.reduce((maskedData, pattern) => 
                maskedData.replace(pattern, '***REDACTED***'), data);
        }
        
        if (typeof data === 'object' && data !== null) {
            return Object.entries(data).reduce((masked, [key, value]) => {
                masked[key] = this.maskSensitiveData(value);
                return masked;
            }, {});
        }
        
        return data;
    }

    encrypt(data) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                data: encrypted
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            return data;
        }
    }

    writeLog(level, namespace, message, data = null) {
        try {
            // Mask sensitive data
            const maskedData = this.maskSensitiveData(data);
            
            // Optional encryption for sensitive logs
            const processedData = level === 'error' 
                ? this.encrypt(maskedData) 
                : maskedData;

            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                namespace,
                message,
                data: processedData,
                pid: process.pid
            };

            // Write to log stream
            this.currentLogStream.write(JSON.stringify(logEntry) + '\n');
            
            // Rotate logs if needed
            this.rotateLogsIfNeeded();
        } catch (error) {
            console.error('Log writing failed:', error);
        }
    }

    api(message, data = null) {
        this.debugNamespaces.api(message, data);
        this.writeLog('info', 'api', message, data);
    }

    generator(message, data = null) {
        this.debugNamespaces.generator(message, data);
        this.writeLog('info', 'generator', message, data);
    }

    github(message, data = null) {
        this.debugNamespaces.github(message, data);
        this.writeLog('info', 'github', message, data);
    }

    agent(message, data = null) {
        this.debugNamespaces.agent(message, data);
        this.writeLog('info', 'agent', message, data);
    }

    performance(message, data = null) {
        this.debugNamespaces.performance(message, data);
        this.writeLog('performance', 'performance', message, data);
    }

    error(namespace, message, error) {
        this.debugNamespaces.error(`[${namespace}] ${message}`, error);
        this.writeLog('error', namespace, message, {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }

    warn(namespace, message, details = null) {
        console.warn(`[${namespace}] ${message}`);
        this.writeLog('warn', namespace, message, details);
    }

    debug(namespace, message, details = null) {
        debug(`mcp:${namespace}`)(message, details);
        this.writeLog('debug', namespace, message, details);
    }

    measure(namespace, fn) {
        return async (...args) => {
            const start = performance.now();
            try {
                const result = await fn(...args);
                const duration = performance.now() - start;
                this.performance(`${namespace} execution`, { duration });
                return result;
            } catch (error) {
                this.error(namespace, 'Execution failed', error);
                throw error;
            }
        };
    }
}

// Configure debug to output to console in development
debug.enable('mcp:*');

// Export a configurable logger
module.exports = new Logger();
