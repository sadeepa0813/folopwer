/**
 * සත්සර මල් පැළ - Navigation System
 * Version: 2.0.0
 */

(function() {
    'use strict';
    
    console.log('🧭 සත්සර මල් පැළ: Navigation Initializing...');
    
    const CONFIG = {
        pages: {
            home: 'index.html',
            track: 'track.html',
            contact: 'contact.html',
            faq: 'faq.html',
            about: 'about.html',
            privacy: 'privacy.html'
        }
    };
    
    let isMobileMenuOpen = false;
    
    const elements = {
        hamburger: document.getElementById('hamburger'),
        mobileMenu: document.getElementById('mobileMenu'),
        overlay: document.getElementById('mobileMenuOverlay'),
        body: document.body
    };
    
    // Check if elements exist
    function checkElements() {
        return elements.hamburger && elements.mobileMenu && elements.overlay;
    }
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        if (!checkElements()) return;
        
        isMobileMenuOpen = !isMobileMenuOpen;
        
        elements.hamburger.classList.toggle('active');
        elements.mobileMenu.classList.toggle('active');
        elements.overlay.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (isMobileMenuOpen) {
            elements.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscapeKey);
        } else {
            elements.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscapeKey);
        }
        
        console.log(`📱 Mobile menu ${isMobileMenuOpen ? 'opened' : 'closed'}`);
    }
    
    // Close mobile menu
    function closeMobileMenu() {
        if (!checkElements()) return;
        
        isMobileMenuOpen = false;
        elements.hamburger.classList.remove('active');
        elements.mobileMenu.classList.remove('active');
        elements.overlay.classList.remove('active');
        elements.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
    }
    
    // Handle escape key
    function handleEscapeKey(e) {
        if (e.key === 'Escape' && isMobileMenuOpen) {
            closeMobileMenu();
        }
    }
    
    // Navigate to page
    function navigateTo(pageKey) {
        const pageUrl = CONFIG.pages[pageKey];
        if (pageUrl) {
            console.log(`📍 Navigating to: ${pageKey} (${pageUrl})`);
            closeMobileMenu();
            
            // Small delay for smooth transition
            setTimeout(() => {
                window.location.href = pageUrl;
            }, 300);
        } else {
            console.warn(`⚠️ Page not found: ${pageKey}`);
        }
    }
    
    // Highlight active page based on current URL
    function highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Helper function to check if page matches
        const isActivePage = (pageAttr) => {
            const pageUrl = CONFIG.pages[pageAttr];
            return pageUrl && currentPage.includes(pageUrl);
        };
        
        // Highlight desktop navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            const pageAttr = item.getAttribute('data-page');
            if (isActivePage(pageAttr)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Highlight mobile navigation
        document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => {
            const pageAttr = item.getAttribute('data-page');
            if (isActivePage(pageAttr)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        console.log(`📍 Active page: ${currentPage}`);
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Hamburger button
        if (elements.hamburger) {
            elements.hamburger.addEventListener('click', toggleMobileMenu);
        }
        
        // Overlay close
        if (elements.overlay) {
            elements.overlay.addEventListener('click', closeMobileMenu);
        }
        
        // Desktop navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const pageKey = this.getAttribute('data-page');
                navigateTo(pageKey);
            });
        });
        
        // Mobile navigation
        document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const pageKey = this.getAttribute('data-page');
                navigateTo(pageKey);
            });
        });
        
        // Logo click - go home
        document.querySelectorAll('.nav-logo[data-action="go-home"]').forEach(logo => {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('home');
            });
        });
        
        // Close menu when clicking on menu items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', closeMobileMenu);
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && isMobileMenuOpen) {
                closeMobileMenu();
            }
        });
    }
    
    // Initialize navigation
    function initNavigation() {
        if (!checkElements()) {
            console.warn('⚠️ Navigation elements missing. Some features may not work.');
        }
        
        setupEventListeners();
        highlightActivePage();
        
        // Update active page on browser navigation
        window.addEventListener('popstate', highlightActivePage);
        
        console.log('✅ Navigation system initialized');
    }
    
    // Public API
    window.SathsaraNavigation = {
        toggleMenu: toggleMobileMenu,
        closeMenu: closeMobileMenu,
        navigate: navigateTo,
        refresh: highlightActivePage
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }
    
})();
