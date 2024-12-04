const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);

async function setupDatabase() {
    try {
        // Create test table using Supabase's REST API
        const { error: createError } = await supabase.rpc('create_test_table', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.test (
                    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
                    name TEXT,
                    data JSONB
                );
            `
        });

        if (createError) {
            console.error('Failed to create table:', createError);
            return;
        }

        console.log('✅ Database table created successfully');

        // Insert test data
        const { error: insertError } = await supabase
            .from('test')
            .insert([
                { name: 'initial_test', data: { status: 'active' } }
            ]);

        if (insertError) {
            console.error('Failed to insert test data:', insertError);
            return;
        }

        console.log('✅ Test data inserted successfully');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
}

setupDatabase().catch(console.error);
