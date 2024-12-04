#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecureToken(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

function rotateCredentials() {
    const envPath = path.resolve(process.cwd(), '.env');
    
    try {
        // Read current .env file
        let envContents = fs.readFileSync(envPath, 'utf8');
        
        // Rotate specific tokens
        const rotationMap = {
            'OPENAI_API_KEY': generateSecureToken(32),
            'GITHUB_TOKEN': generateSecureToken(40),
            'BRAVE_SEARCH_API_KEY': generateSecureToken(32),
            'SESSION_SECRET': generateSecureToken(64),
            'ENCRYPTION_SALT': generateSecureToken(16)
        };
        
        // Replace tokens in env file
        Object.entries(rotationMap).forEach(([key, value]) => {
            const regex = new RegExp(`(${key}=).*`, 'g');
            envContents = envContents.replace(regex, `$1${value}`);
        });
        
        // Write updated .env file
        fs.writeFileSync(envPath, envContents);
        
        console.log('✅ Credentials rotated successfully');
        console.log('Rotated keys:', Object.keys(rotationMap).join(', '));
    } catch (error) {
        console.error('❌ Credential rotation failed:', error);
        process.exit(1);
    }
}

// Run rotation
rotateCredentials();
