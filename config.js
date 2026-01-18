// සත්සර මල් පැළ - Configuration File
// Version: 2.0.0

// Supabase Configuration
const SUPABASE_CONFIG = {
    // Your Project URL (Settings > API > Project URL)
    url: 'https://pgavlqfhmelkhjnjzrsz.supabase.co',
    
    // Your API Key (Settings > API > Project API keys > anon public)
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYXZscWZobWVsa2hqbmp6cnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzMzNzMsImV4cCI6MjA4Mzg0OTM3M30.7KmX3yMwCo9klCMjOHmRT2e6qMni4Cjimo0_BAMFK00'
};

// WhatsApp Configuration
const WHATSAPP_CONFIG = {
    enabled: true,
    phoneNumber: '94772254513' // Replace with your WhatsApp number
};

// Store Configuration
const STORE_CONFIG = {
    name: 'සත්සර මල් පැළ',
    tagline: 'Premium Flower Plants & Gardening Solutions',
    currency: 'Rs.',
    currencySymbol: 'රු.',
    contact: {
        phone: '+94771234567',
        email: 'info@sathsaraplants.com',
        address: '123, Flower Lane, Colombo 07'
    },
    social: {
        facebook: 'https://facebook.com/sathsaraplants',
        instagram: 'https://instagram.com/sathsaraplants',
        whatsapp: 'https://wa.me/94771234567'
    }
};

// Initialize Supabase
(function initSupabase() {
    console.log('🌺 සත්සර මල් පැළ: Initializing Supabase connection...');
    
    // Check if supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase library not loaded!');
        console.error('Please check if the Supabase CDN is loaded correctly.');
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
        
        // Test connection
        console.log('🔧 Testing Supabase connection...');
        
        // Store globally
        window.supabaseClient = supabaseClient;
        window.WHATSAPP_CONFIG = WHATSAPP_CONFIG;
        window.STORE_CONFIG = STORE_CONFIG;
        
        console.log('✅ Supabase client initialized successfully');
        
        // Dispatch ready event
        const event = new Event('supabaseReady');
        document.dispatchEvent(event);
        
        // Test the connection
        setTimeout(async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('products')
                    .select('id')
                    .limit(1);
                
                if (error) {
                    console.warn('⚠️ Supabase connection test warning:', error.message);
                } else {
                    console.log('✅ Database connection test successful');
                }
            } catch (testError) {
                console.warn('⚠️ Could not test database connection:', testError.message);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        console.error('Error details:', error.message);
        
        // Show user-friendly error
        if (typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', function() {
                const container = document.getElementById('productsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <span style="font-size: 4rem;">🔧</span>
                            <h3>Database Connection Error</h3>
                            <p style="max-width: 500px; margin: 10px auto;">
                                Unable to connect to the database. Please check your internet connection and try again.
                            </p>
                            <button class="btn-3d btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                                🔄 Refresh Page
                            </button>
                        </div>
                    `;
                }
            });
        }
    }
})();

// Export configurations for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        WHATSAPP_CONFIG,
        STORE_CONFIG
    };
}
