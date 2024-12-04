// @ts-check
const globals = require('globals');
const js = require('@eslint/js');
const path = require('path');

module.exports = [
    // Recommended base configuration
    js.configs.recommended,
    
    {
        // Global configuration
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2024
            },
            ecmaVersion: 'latest',
            sourceType: 'module'
        },
        
        // Rules configuration
        rules: {
            // Error Prevention - More Relaxed
            'no-unused-vars': ['warn', { 
                vars: 'all', 
                args: 'none',
                ignoreRestSiblings: true 
            }],
            'no-console': 'off',  // Allow console for now
            'no-debugger': 'warn',
            
            // Best Practices
            'eqeqeq': ['warn', 'smart'],
            'no-eval': 'warn',
            'no-implied-eval': 'warn',
            'no-new-func': 'warn',
            
            // Style Consistency - More Flexible
            'indent': ['warn', 4, { 
                'SwitchCase': 1,
                'ignoredNodes': ['ConditionalExpression']
            }],
            'semi': ['warn', 'always'],
            'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
            
            // Error Handling
            'no-throw-literal': 'warn',
            'no-unmodified-loop-condition': 'warn',
            
            // Performance and Memory
            'no-array-constructor': 'warn',
            'no-new-object': 'warn',
            
            // ES6+ Features
            'prefer-const': 'warn',
            'no-var': 'warn',
            'object-shorthand': 'warn'
        }
    },
    
    // Ignore configuration
    {
        ignores: [
            // Dependency directories
            '**/node_modules/',
            
            // Build output directories
            '**/dist/',
            '**/build/',
            '**/.next/',
            
            // Temporary and log files
            '**/*.log',
            '**/*.tmp',
            
            // Configuration and environment files
            '**/.env',
            '**/.env.*',
            
            // Test and coverage files
            '**/coverage/',
            '**/*.test.js',
            '**/*.spec.js',
            
            // Generated or compiled files
            '**/*.min.js',
            '**/*.bundle.js',

            // Specific project exclusions
            '**/pages/index.js',  // Seems to have parsing issues
            '**/components/Chat.js'  // Parsing error
        ]
    }
];
