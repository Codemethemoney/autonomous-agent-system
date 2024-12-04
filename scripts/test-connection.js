const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
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

    try {
        // Test database connection
        console.log('Testing database connection...');
        const { data, error } = await supabase
            .from('test')
            .select('*')
            .limit(1);

        if (error) throw error;

        console.log('✅ Database connection successful');
        console.log('Data:', data);

        // Test real-time subscription
        console.log('\nTesting real-time subscription...');
        const subscription = supabase
            .channel('test-channel')
            .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
                console.log('Change received:', payload);
            })
            .subscribe();

        // Insert test data
        console.log('\nInserting test data...');
        const { error: insertError } = await supabase
            .from('test')
            .insert([
                { name: 'test_entry_' + Date.now(), data: { status: 'active' } }
            ]);

        if (insertError) throw insertError;
        console.log('✅ Test data inserted successfully');

        // Wait for a moment to see real-time updates
        await new Promise(resolve => setTimeout(resolve, 2000));
        subscription.unsubscribe();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testConnection().catch(console.error);
