// navigation.js - Unified Navigation Module for SANJU Store
// Version: 2.0.0
// Last Updated: 2026-01-16

(function() {
    'use strict';
    
    console.log('🚀 SANJU Navigation Module Initializing...');
    
    // ======================
    // 1. CONFIGURATION
    // ======================
    const CONFIG = {
        animationSpeed: 300,
        mobileMenuWidth: 280,
        activeClass: 'active',
        pages: {
            home: 'index.html',
            track: 'track.html',
            contact: 'contact.html',
            faq: 'faq.html',
            about: 'about.html',
            privacy: 'privacy.html'
        }
    };
    
    // ======================
    // 2. STATE MANAGEMENT
    // ======================
    let isMobileMenuOpen = false;
    
    // ======================
    // 3. ELEMENT REFERENCES
    // ======================
    const elements = {
        hamburger: document.getElementById('hamburger'),
        mobileMenu: document.getElementById('mobileMenu'),
        overlay: document.getElementById('mobileMenuOverlay'),
        navLogo: document.querySelector('.nav-logo'),
        body: document.body
    };
    
    // ======================
    // 4. CORE FUNCTIONS
    // ======================
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        if (!elements.hamburger || !elements.mobileMenu || !elements.overlay) return;
        
        isMobileMenuOpen = !isMobileMenuOpen;
        
        elements.hamburger.classList.toggle(CONFIG.activeClass);
        elements.mobileMenu.classList.toggle(CONFIG.activeClass);
        elements.overlay.classList.toggle(CONFIG.activeClass);
        
        // Toggle body scroll
        elements.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
        
        // Add/remove escape key listener
        if (isMobileMenuOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        } else {
            document.removeEventListener('keydown', handleEscapeKey);
        }
        
        console.log(`📱 Mobile menu ${isMobileMenuOpen ? 'opened' : 'closed'}`);
    }
    
    // Close mobile menu
    function closeMobileMenu() {
        if (!elements.hamburger || !elements.mobileMenu || !elements.overlay) return;
        
        isMobileMenuOpen = false;
        elements.hamburger.classList.remove(CONFIG.activeClass);
        elements.mobileMenu.classList.remove(CONFIG.activeClass);
        elements.overlay.classList.remove(CONFIG.activeClass);
        elements.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
    }
    
    // Handle escape key
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    }
    
    // Navigate to page
    function navigateTo(pageKey) {
        console.log(`📍 Navigating to: ${pageKey}`);
        closeMobileMenu();
        
        const pageUrl = CONFIG.pages[pageKey];
        if (pageUrl) {
            setTimeout(() => {
                window.location.href = pageUrl;
            }, CONFIG.animationSpeed);
        } else {
            console.error(`Page "${pageKey}" not found`);
            window.location.href = 'index.html';
        }
    }
    
    // Highlight active page
    function highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Desktop nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            const pageAttr = item.getAttribute('data-page');
            if (pageAttr && currentPage.includes(CONFIG.pages[pageAttr])) {
                item.classList.add(CONFIG.activeClass);
            } else {
                item.classList.remove(CONFIG.activeClass);
            }
        });
        
        // Mobile nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const pageAttr = item.getAttribute('data-page');
            if (pageAttr && currentPage.includes(CONFIG.pages[pageAttr])) {
                item.classList.add(CONFIG.activeClass);
            } else {
                item.classList.remove(CONFIG.activeClass);
            }
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Hamburger button
        if (elements.hamburger) {
            elements.hamburger.addEventListener('click', toggleMobileMenu);
            elements.hamburger.addEventListener('touchend', function(e) {
                e.preventDefault();
                toggleMobileMenu();
            }, { passive: false });
        }
        
        // Overlay close
        if (elements.overlay) {
            elements.overlay.addEventListener('click', closeMobileMenu);
            elements.overlay.addEventListener('touchend', function(e) {
                e.preventDefault();
                closeMobileMenu();
            }, { passive: false });
        }
        
        // Desktop navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', function() {
                const pageKey = this.getAttribute('data-page');
                navigateTo(pageKey);
            });
        });
        
        // Mobile navigation
        document.querySelectorAll('.mobile-nav-item[data-page]').forEach(item => {
            item.addEventListener('click', function() {
                const pageKey = this.getAttribute('data-page');
                navigateTo(pageKey);
            });
            
            // Touch support
            item.addEventListener('touchend', function(e) {
                e.preventDefault();
                const pageKey = this.getAttribute('data-page');
                navigateTo(pageKey);
            }, { passive: false });
        });
        
        // Logo click
        if (elements.navLogo) {
            elements.navLogo.addEventListener('click', () => navigateTo('home'));
        }
    }
    
    // Initialize navigation
    function initNavigation() {
        // Check if required elements exist
        if (!elements.hamburger || !elements.mobileMenu || !elements.overlay) {
            console.warn('⚠️ Navigation elements missing. Navigation disabled.');
            return;
        }
        
        setupEventListeners();
        highlightActivePage();
        
        // Handle browser back/forward
        window.addEventListener('popstate', highlightActivePage);
        
        console.log('✅ Navigation module initialized');
    }
    
    // ======================
    // 5. PUBLIC API
    // ======================
    window.SANJU = window.SANJU || {};
    window.SANJU.Navigation = {
        toggle: toggleMobileMenu,
        close: closeMobileMenu,
        navigate: navigateTo,
        refresh: highlightActivePage,
        isOpen: () => isMobileMenuOpen
    };
    
    // ======================
    // 6. INITIALIZE
    // ======================
    document.addEventListener('DOMContentLoaded', initNavigation);
    
})();
