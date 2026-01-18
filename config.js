// ════════════════════════════════════════════════════════════════
// 3D STORE CONFIGURATION - USE YOUR ACTUAL API KEY
// ════════════════════════════════════════════════════════════════

// Supabase Configuration - GET NEW KEY FROM SUPABASE DASHBOARD
const SUPABASE_CONFIG = {
    // Your Project URL (Settings > API > Project URL)
    url: 'https://pgavlqfhmelkhjnjzrsz.supabase.co',
    
    // YOUR NEW API KEY HERE (Settings > API > Project API keys > anon public)
    // අනිවාර්යෙන්ම මෙතන ඔබේ නව API key එක දමන්න!
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXZscWZobWVsa2hqbmp6cnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzMzNzMsImV4cCI6MjA4Mzg0OTM3M30.7KmX3yMwCo9klCMjOHmRT2e6qMni4Cjimo0_BAMFK00'
};

// WhatsApp Configuration
const WHATSAPP_CONFIG = {
    enabled: true,
    phoneNumber: '94772254513' // Replace with your number
};

// Initialize Supabase
(function initSupabase() {
    console.log('🔧 Initializing Supabase connection...');
    
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase library not loaded!');
        return;
    }
    
    try {
        // Create Supabase client with proper headers
        const supabaseClient = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                },
                global: {
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                    }
                }
            }
        );
        
        // Store globally
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase client initialized successfully');
        
        // Dispatch ready event
        if (document.createEvent) {
            const event = new Event('supabaseReady');
            document.dispatchEvent(event);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
    }
})();
