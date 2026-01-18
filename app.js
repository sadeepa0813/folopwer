/**
 * ════════════════════════════════════════════════════════════════
 * 3D STORE - CUSTOMER APP
 * Enhanced order system with complete tracking
 * ════════════════════════════════════════════════════════════════
 */

// Global state
let currentProduct = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 3D Store App Initializing...');
    console.log('📋 Config loaded:', SUPABASE_CONFIG.url ? 'Yes' : 'No');
    
    // Wait for supabase client to be ready
    const checkSupabase = () => {
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient && window.supabaseClient.from) {
            console.log('✅ Supabase client is ready');
            loadProducts();
        } else {
            console.log('⏳ Waiting for Supabase client...');
            setTimeout(checkSupabase, 200);
        }
    };
    
    checkSupabase();
});

// app.js - Updated loadProducts function
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    
    try {
        console.log('📦 Loading products from database...');
        console.log('🔗 Client available:', window.supabaseClient ? 'Yes' : 'No');
        
        // Show loading state
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top: 15px; opacity: 0.7;">Loading products...</p>
            </div>
        `;
        
        // Check if supabase client is available
        if (!window.supabaseClient) {
            throw new Error('Database connection not established. Please wait or refresh the page.');
        }
        
        // Add delay to ensure client is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error:', error);
            console.error('Error details:', error.message, error.code);
            
            // Check if it's a policy error
            if (error.code === '42501' || error.message.includes('permission')) {
                throw new Error('Database permissions not set. Please check Supabase policies.');
            }
            throw error;
        }

        console.log(`✅ Loaded ${products?.length || 0} products`);

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 4rem;">📭</span>
                    <h3>No Products Available</h3>
                    <p>Check back soon for exciting new products!</p>
                    <button class="btn-3d btn-primary" onclick="window.location.href='admin-login.html'" style="margin-top: 20px;">
                        👨‍💼 Go to Admin Panel
                    </button>
                </div>
            `;
            return;
        }

        // Create product grid
        const grid = document.createElement('div');
        grid.className = 'product-grid fade-in';
        
        products.forEach(product => {
            const card = createProductCard(product);
            grid.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(grid);

    } catch (error) {
        console.error('❌ Error loading products:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 4rem;">🔧</span>
                <h3>Setup Required</h3>
                <p style="max-width: 500px; margin: 10px auto;">
                    ${error.message || 'Database connection issue.'}
                </p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn-3d btn-primary" onclick="location.reload()">
                        🔄 Refresh
                    </button>
                    <button class="btn-3d btn-secondary" onclick="window.location.href='admin-login.html'">
                        👨‍💼 Admin Panel
                    </button>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.6; margin-top: 20px;">
                    If this persists, check your Supabase configuration and table policies.
                </p>
            </div>
        `;
    }
}

// Create Product Card Element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card-3d product-card';
    
    // Add both click and touch event handlers for better mobile support
    const handleInteraction = (e) => {
        e.preventDefault();
        openOrderModal(product);
    };
    
    card.onclick = handleInteraction;
    card.ontouchend = handleInteraction;
    
    // Ensure image URL is valid
    const imageUrl = product.image_url || 'https://via.placeholder.com/400x300?text=No+Image';
    
    card.innerHTML = `
        <div class="product-img-box">
            <img src="${imageUrl}" 
                 class="product-img" 
                 alt="${product.name}"
                 onerror="this.src='https://via.placeholder.com/400x300?text=Product+Image'">
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <span class="product-price mono">Rs. ${product.price.toLocaleString()}</span>
            <p class="product-desc">${product.description || 'Premium quality product'}</p>
        </div>
    `;
    
    return card;
}

// Open Order Modal
function openOrderModal(product) {
    currentProduct = product;
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');
    
    const imageUrl = product.image_url || 'https://via.placeholder.com/100';
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
            Complete Your Order
        </h2>
        
        <div style="display: flex; gap: 20px; margin-bottom: 30px; align-items: center; flex-wrap: wrap;">
            <img src="${imageUrl}" 
                 style="width: 100px; height: 100px; border-radius: 12px; object-fit: cover;"
                 onerror="this.src='https://via.placeholder.com/100'">
            <div style="flex: 1; min-width: 200px;">
                <h3 style="color: var(--primary); font-size: 1.3rem; margin-bottom: 5px;">${product.name}</h3>
                <p class="mono" style="font-size: 1.1rem; color: var(--accent);">Rs. ${product.price.toLocaleString()}</p>
                <p style="opacity: 0.7; font-size: 0.9rem; margin-top: 5px;">${product.description || ''}</p>
            </div>
        </div>

        <form id="orderForm" onsubmit="handleOrderSubmit(event)">
            <div class="form-group">
                <label>Your Name *</label>
                <input type="text" 
                       name="customerName" 
                       required 
                       placeholder="Enter your full name"
                       autocomplete="name">
            </div>
            
            <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" 
                       name="phoneNumber" 
                       required 
                       placeholder="07XXXXXXXX"
                       pattern="[0-9]{10}"
                       title="Please enter 10 digit phone number"
                       autocomplete="tel">
                <small style="opacity: 0.6; font-size: 0.85rem;">Format: 0771234567 (10 digits)</small>
            </div>
            
            <div class="form-group">
                <label>Delivery Address *</label>
                <textarea name="address" 
                          rows="2" 
                          required
                          placeholder="Enter your full delivery address with city"></textarea>
            </div>
            
            <div class="form-group">
                <label>Quantity</label>
                <select name="quantity" onchange="updateOrderTotal()">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Additional Requirements (Optional)</label>
                <textarea name="requirements" 
                          rows="3" 
                          placeholder="Any special requests? (e.g., gift wrapping, specific color, delivery time)"></textarea>
            </div>

            <div style="margin: 25px 0; padding: 18px; background: rgba(0,0,0,0.3); border-radius: 12px; 
                        display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600; font-size: 1.05rem;">Total Amount:</span>
                <span class="mono" style="font-size: 1.6rem; color: var(--success); font-weight: 700;" id="orderTotal">
                    Rs. ${product.price.toLocaleString()}
                </span>
            </div>

            <div style="display: flex; gap: 15px;">
                <button type="button" class="btn-3d btn-secondary" onclick="closeOrderModal()" style="flex: 1;">
                    Cancel
                </button>
                <button type="submit" class="btn-3d btn-primary" style="flex: 2;">
                    Place Order 🚀
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('open');
}

// Update Order Total
function updateOrderTotal() {
    const form = document.getElementById('orderForm');
    const quantity = parseInt(form.quantity.value);
    const total = currentProduct.price * quantity;
    document.getElementById('orderTotal').textContent = `Rs. ${total.toLocaleString()}`;
}

// Generate Enhanced Tracking ID
function generateTrackingId(productId, customerName) {
    console.log('🔖 Generating tracking ID...');
    
    // Get customer initials
    const customerInitials = customerName
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 3);
    
    // Generate random numbers
    const random4 = Math.floor(1000 + Math.random() * 9000);
    const random3 = Math.floor(100 + Math.random() * 900);
    
    // Product ID padded to 3 digits
    const paddedProductId = String(productId).padStart(3, '0');
    
    // Format: sanju#PRODUCT_ID-RANDOM4-RANDOM3-INITIALS
    const trackingId = `SANJU#${paddedProductId}-${random4}-${random3}-${customerInitials}`;
    
    console.log('✅ Tracking ID generated:', trackingId);
    return trackingId;
}

// Handle Order Submission
async function handleOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Placing Order...';
    
    try {
        const customerName = form.customerName.value.trim();
        const phoneNumber = form.phoneNumber.value.trim();
        const address = form.address.value.trim();
        const quantity = parseInt(form.quantity.value);
        const requirements = form.requirements.value.trim();
        
        // Generate tracking ID
        const trackingId = generateTrackingId(currentProduct.id, customerName);
        
        const orderData = {
            tracking_id: trackingId,
            customer_name: customerName,
            phone_number: phoneNumber,
            address: address,
            product_id: currentProduct.id,
            product_name: currentProduct.name,
            price: currentProduct.price,
            quantity: quantity,
            total: currentProduct.price * quantity,
            requirements: requirements || null,
            status: 'Pending'
        };

        console.log('📤 Submitting order:', orderData);

        // Insert order into Supabase
        const { data, error } = await window.supabaseClient
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) {
            console.error('❌ Order submission error:', error);
            throw error;
        }

        console.log('✅ Order placed successfully:', data);

        // Close order modal
        closeOrderModal();
        
        // Show success modal
        showSuccessModal(orderData);

    } catch (error) {
        console.error('❌ Error placing order:', error);
        showToast('Failed to place order: ' + (error.message || 'Please try again'), 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order 🚀';
    }
}

// Show Success Modal
function showSuccessModal(order) {
    const modal = document.getElementById('successModal');
    const modalBody = document.getElementById('successModalBody');
    
    // Create WhatsApp message
    const whatsappMsg = encodeURIComponent(
        `🛍️ New Order - SANJU STORE\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Customer: ${order.customer_name}\n` +
        `📱 Phone: ${order.phone_number}\n` +
        `📍 Address: ${order.address}\n\n` +
        `🏷️ Product: ${order.product_name}\n` +
        `📊 Quantity: ${order.quantity}\n` +
        `💰 Unit Price: Rs. ${order.price.toLocaleString()}\n` +
        `💵 Total: Rs. ${order.total.toLocaleString()}\n\n` +
        `🔖 Tracking ID: ${order.tracking_id}\n` +
        (order.requirements ? `📝 Requirements: ${order.requirements}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Please confirm my order. Thank you! 😊`
    );

    const whatsappUrl = WHATSAPP_CONFIG.phoneNumber 
        ? `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${whatsappMsg}`
        : `https://wa.me/?text=${whatsappMsg}`;
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div class="success-icon">✓</div>
            <h2 style="color: var(--success); margin-bottom: 10px;">Order Placed Successfully!</h2>
            <p style="opacity: 0.8; margin-bottom: 25px;">ඔබට පහත ඇති ටැකින් නම්බර් එකෙන් ඔබගේ ඔඩර් එක පරික්ශා කර ගත හැක.අනිවාරෙන් පහලට ගිහින් වට්සැප් බටන් එකක් ඇති එක කිලික් කරන්න</p>
            
            <div class="tracking-display mono" 
                 onclick="copyTrackingId('${order.tracking_id}')" 
                 ontouchend="copyTrackingId('${order.tracking_id}')"
                 style="cursor: pointer; -webkit-tap-highlight-color: rgba(99, 102, 241, 0.3);"
                 title="Click to copy">
                ${order.tracking_id}
            </div>
            <p style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 25px;">
                👆 Click to copy • මේ කොඩ් එක කොපි කරගන්න නිකන් කිලික් කරන්න
            </p>

            <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Product:</span>
                    <strong>${order.product_name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Quantity:</span>
                    <strong>${order.quantity}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Customer:</span>
                    <strong>${order.customer_name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <span style="opacity: 0.7;">Total Amount:</span>
                    <strong class="mono" style="color: var(--success); font-size: 1.2rem;">Rs. ${order.total.toLocaleString()}</strong>
                </div>
            </div>
            
            <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.4); border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: left;">
                <p style="font-size: 0.95rem; line-height: 1.6; margin: 0;">
                    <strong style="color: var(--warning);">📱 IMPORTANT - Next Step:</strong><br>
                    whatsapp බටන් එක කිලික් කරාම ඔයාව ඇඩ්මින් නම්බර් එකෙන් ඔපන් වෙයි එතන මැසෙජ් එකක් ටයිප් වෙලා තියනවා එක සෙන්ඩ් කරන්න එක හරියටම කරාට පස්සේ ඔයාට ඔඩර් එක ගැන කාගෙන් වත් අහන්න ඔනි නෑ ටැකින් නම්බර් එකෙන් ම ඔයාට ඒ ගැන බලාගන්න පුලුවන් 
                </p>
            </div>

            <a href="${whatsappUrl}" 
               target="_blank" 
               class="btn-3d btn-success" 
               style="width: 100%; text-decoration: none; margin-bottom: 15px; display: block; text-align: center;">
                💬 Contact via WhatsApp
            </a>

            <button class="btn-3d btn-secondary" onclick="closeSuccessModal()" style="width: 100%;">
                Close
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

// Copy Tracking ID to Clipboard
function copyTrackingId(trackingId) {
    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();
    
    navigator.clipboard.writeText(trackingId).then(() => {
        showToast('✅ Tracking ID copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = trackingId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('✅ Tracking ID copied!', 'success');
        } catch (err) {
            showToast('❌ Failed to copy. Please copy manually: ' + trackingId, 'error');
        }
        document.body.removeChild(textArea);
    });
}

// Close Order Modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
    currentProduct = null;
}

// Close Success Modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('open');
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = type === 'success' ? 'show success' : (type === 'error' ? 'show error' : 'show');
    setTimeout(() => {
        toast.className = '';
    }, 4000);
}

// Close modal on outside click
window.onclick = function(event) {
    const orderModal = document.getElementById('orderModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === orderModal) {
        closeOrderModal();
    }
    if (event.target === successModal) {
        closeSuccessModal();
    }
};
