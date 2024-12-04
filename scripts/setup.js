const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

async function setupDatabase() {
    try {
        // Test database connection
        const { data, error } = await supabase
            .from('test')
            .select('*')
            .limit(1);
            
        if (error) throw error;
        console.log('✅ Database connection successful');
        
        // Create necessary tables if they don't exist
        const { error: createError } = await supabase.rpc('init_database');
        if (createError) {
            console.warn('Warning: Could not initialize database schema:', createError.message);
        } else {
            console.log('✅ Database schema initialized');
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

async function setupAutomation() {
    try {
        // Launch puppeteer browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        // Test basic automation
        const page = await browser.newPage();
        await page.goto(process.env.SUPABASE_URL);
        await page.screenshot({ path: 'automation-test.png' });
        
        await browser.close();
        console.log('✅ Puppeteer setup successful');
    } catch (error) {
        console.error('❌ Puppeteer setup failed:', error.message);
    }
}

async function setupNextJS() {
    try {
        // Check if Next.js is installed
        execSync('npm list next', { stdio: 'ignore' });
        console.log('✅ Next.js is already installed');
    } catch {
        console.log('Installing Next.js...');
        execSync('npm install next@latest react@latest react-dom@latest');
        console.log('✅ Next.js installation successful');
    }
}

async function createSupabaseConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    const config = {
        supabase: {
            url: process.env.SUPABASE_URL,
            anonKey: process.env.SUPABASE_ANON_KEY,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            jwtSecret: process.env.SUPABASE_JWT_SECRET,
            options: {
                db: {
                    schema: 'public'
                },
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created Supabase configuration file');
}

async function main() {
    console.log('🚀 Starting setup...');
    
    // Create necessary directories
    if (!fs.existsSync(path.join(__dirname))) {
        fs.mkdirSync(path.join(__dirname), { recursive: true });
    }

    // Run setup functions
    await setupDatabase();
    await setupAutomation();
    await setupNextJS();
    await createSupabaseConfig();
    
    console.log('✅ Setup complete!');
}

main().catch(console.error);
