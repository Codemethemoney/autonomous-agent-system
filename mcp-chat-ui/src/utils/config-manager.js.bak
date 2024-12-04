const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Logger = require('./logger');

class ConfigManager {
    constructor(configPath = path.join(process.cwd(), '.env')) {
        this.configPath = configPath;
        this.config = {};
        this.encryptionKey = crypto.randomBytes(32);
        
        Logger.agent('ConfigManager initialized', { 
            configPath: this.configPath 
        });
    }

    async loadConfig() {
        const performanceTracker = Logger.measure('ConfigManager:LoadConfig', async () => {
            try {
                Logger.agent('Loading configuration', { path: this.configPath });
                
                // Check if config file exists
                await fs.access(this.configPath);
                
                // Read and parse config
                const configContent = await fs.readFile(this.configPath, 'utf-8');
                this.config = dotenv.parse(configContent);
                
                Logger.performance('Configuration loaded', {
                    configKeys: Object.keys(this.config)
                });
                
                return this.config;
            } catch (error) {
                Logger.error('ConfigManager', 'Configuration loading failed', error);
                throw new Error(`Failed to load configuration: ${error.message}`);
            }
        });

        return performanceTracker();
    }

    async updateConfig(newConfig) {
        const performanceTracker = Logger.measure('ConfigManager:UpdateConfig', async () => {
            try {
                Logger.agent('Updating configuration', { 
                    updatedKeys: Object.keys(newConfig) 
                });

                // Merge new config with existing
                this.config = { ...this.config, ...newConfig };

                // Convert config to .env format
                const configString = Object.entries(this.config)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n');

                // Write updated config
                await fs.writeFile(this.configPath, configString, 'utf-8');

                Logger.performance('Configuration updated', {
                    configKeys: Object.keys(this.config)
                });

                return this.config;
            } catch (error) {
                Logger.error('ConfigManager', 'Configuration update failed', error);
                throw new Error(`Failed to update configuration: ${error.message}`);
            }
        });

        return performanceTracker();
    }

    get(key, defaultValue = null) {
        try {
            const value = this.config[key] || process.env[key] || defaultValue;
            Logger.debug('ConfigManager', 'Config value retrieved', { 
                key, 
                valueType: typeof value 
            });
            return value;
        } catch (error) {
            Logger.warn('ConfigManager', 'Config retrieval failed', { 
                key, 
                error: error.message 
            });
            return defaultValue;
        }
    }

    generateSecureToken(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
        let result = '';
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);
        
        for (let i = 0; i < length; i++) {
            result += characters[randomValues[i] % characters.length];
        }
        
        return result;
    }

    async rotateCredentials() {
        const performanceTracker = Logger.measure('ConfigManager:RotateCredentials', async () => {
            try {
                Logger.agent('Rotating credentials', {});

                // Generate new random credentials
                const newCredentials = {
                    API_KEY: this.generateSecureToken(32),
                    SECRET_TOKEN: this.generateSecureToken(64)
                };

                // Update configuration
                await this.updateConfig(newCredentials);

                Logger.performance('Credentials rotated', {
                    credentialKeys: Object.keys(newCredentials)
                });

                return newCredentials;
            } catch (error) {
                Logger.error('ConfigManager', 'Credential rotation failed', error);
                throw new Error(`Credential rotation failed: ${error.message}`);
            }
        });

        return performanceTracker();
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
            Logger.error('ConfigManager', 'Encryption failed', error);
            throw new Error('Failed to encrypt configuration');
        }
    }

    decrypt(encryptedData) {
        try {
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
            
            let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            Logger.error('ConfigManager', 'Decryption failed', error);
            throw new Error('Failed to decrypt configuration');
        }
    }

    getSecure(key, defaultValue = null) {
        const rawValue = this.get(key, defaultValue);
        
        // Additional security checks can be added here
        if (rawValue && this.isLikelySensitive(key)) {
            // Log access to sensitive information
            Logger.warn(`🔐 Accessed sensitive configuration: ${key}`);
        }
        
        return rawValue;
    }

    isLikelySensitive(key) {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /token/i,
            /key/i,
            /credentials/i,
            /api/i
        ];

        return sensitivePatterns.some(pattern => pattern.test(key));
    }
}

// Export a configurable instance
module.exports = new ConfigManager();
