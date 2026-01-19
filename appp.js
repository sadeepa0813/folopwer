/**
 * සත්සර මල් පැළ - Customer Application
 * Version: 3.0.0 - Flower Plant Edition
 */

// Global state
let currentProduct = null;
let allProducts = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌺 සත්සර මල් පැළ: Initializing Flower Plant Store...');
    
    // Wait for supabase client to be ready
    const checkSupabase = () => {
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient && window.supabaseClient.from) {
            console.log('✅ Supabase client is ready');
            loadProducts();
            setupEventListeners();
        } else {
            console.log('⏳ Waiting for Supabase client...');
            setTimeout(checkSupabase, 500);
        }
    };
    
    checkSupabase();
});

// Setup event listeners
function setupEventListeners() {
    // Close modal on outside click
    window.addEventListener('click', function(event) {
        const orderModal = document.getElementById('orderModal');
        const successModal = document.getElementById('successModal');
        
        if (event.target === orderModal) {
            closeOrderModal();
        }
        if (event.target === successModal) {
            closeSuccessModal();
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeOrderModal();
            closeSuccessModal();
        }
    });
}

// Load flower plants from database
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    
    try {
        console.log('🌿 Loading flower plants from database...');
        
        // Show loading state
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top: 15px; opacity: 0.7;">Loading beautiful flower plants...</p>
            </div>
        `;
        
        // Check if supabase client is available
        if (!window.supabaseClient) {
            throw new Error('Database connection not established. Please refresh the page.');
        }
        
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('category', 'flower_plants') // Filter for flower plants
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }

        console.log(`✅ Loaded ${products?.length || 0} flower plants`);

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 4rem;">🌿</span>
                    <h3>No Flower Plants Available</h3>
                    <p>New flower plants arriving soon! Check back later or contact us for bulk orders.</p>
                    <button class="btn-3d btn-primary" onclick="window.location.href='contact.html'" style="margin-top: 20px;">
                        📞 Contact for Bulk Orders
                    </button>
                </div>
            `;
            return;
        }

        // Store products globally
        allProducts = products;

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
        console.error('❌ Error loading flower plants:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 4rem;">🌱</span>
                <h3>Flower Plants Coming Soon</h3>
                <p style="max-width: 500px; margin: 10px auto;">
                    We're preparing our flower plant collection. Please check back soon or contact us directly.
                </p>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn-3d btn-primary" onclick="location.reload()">
                        🔄 Refresh
                    </button>
                    <button class="btn-3d btn-secondary" onclick="window.location.href='contact.html'">
                        📞 Contact Us
                    </button>
                </div>
            </div>
        `;
    }
}

// Create Flower Plant Card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card-3d product-card';
    card.onclick = () => openOrderModal(product);
    
    // Ensure image URL is valid
    const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&h=300&q=80';
    
    // Stock status
    const stock = product.stock || 0;
    const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
    const stockClass = stock > 10 ? 'stock-in' : stock > 0 ? 'stock-low' : 'stock-out';
    
    card.innerHTML = `
        <div class="product-img-box">
            <img src="${imageUrl}" 
                 class="product-img" 
                 alt="${product.name}"
                 onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&h=300&q=80'">
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <span class="product-price mono">රු. ${product.price.toLocaleString()}</span>
            <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
                <span class="stock-badge ${stockClass}">${stockStatus}</span>
                ${stock > 0 ? `<span style="font-size: 0.85rem; opacity: 0.7;">Available: ${stock}</span>` : ''}
            </div>
            <p class="product-desc">${product.description || 'Premium quality flower plant'}</p>
            <div style="margin-top: 15px;">
                <button class="btn-3d btn-primary" onclick="event.stopPropagation(); openOrderModal(${JSON.stringify(product).replace(/'/g, "&#39;")})">
                    <i class="fas fa-shopping-cart"></i> Order Now
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Open Order Modal for Flower Plant
function openOrderModal(product) {
    currentProduct = product;
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('orderModalBody');
    
    const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w-200&h=200&q=80';
    const stock = product.stock || 0;
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; color: var(--primary);">
            <i class="fas fa-seedling"></i> Order Flower Plant
        </h2>
        
        <div style="display: flex; gap: 20px; margin-bottom: 30px; align-items: center; flex-wrap: wrap;">
            <img src="${imageUrl}" 
                 style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover;"
                 onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=200&h=200&q=80'">
            <div style="flex: 1; min-width: 200px;">
                <h3 style="color: var(--primary); font-size: 1.3rem; margin-bottom: 5px;">${product.name}</h3>
                <p class="mono" style="font-size: 1.1rem; color: var(--accent);">රු. ${product.price.toLocaleString()}</p>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                    <span class="stock-badge ${stock > 10 ? 'stock-in' : stock > 0 ? 'stock-low' : 'stock-out'}">
                        ${stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock'}
                    </span>
                    ${stock > 0 ? `<span style="font-size: 0.9rem; opacity: 0.7;">Available: ${stock} plants</span>` : ''}
                </div>
                <p style="opacity: 0.7; font-size: 0.9rem; margin-top: 5px;">${product.description || ''}</p>
            </div>
        </div>

        <form id="orderForm" onsubmit="handleOrderSubmit(event)">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
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
                </div>
            </div>
            
            <div class="form-group">
                <label>Delivery Address *</label>
                <textarea name="address" 
                          rows="2" 
                          required
                          placeholder="Enter your full delivery address with city"></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label>Quantity</label>
                    <select name="quantity" onchange="updateOrderTotal()">
                        ${Array.from({length: Math.min(stock, 20)}, (_, i) => i + 1)
                            .map(n => `<option value="${n}">${n} plant${n > 1 ? 's' : ''}</option>`).join('')}
                        ${stock === 0 ? '<option value="0" disabled>Out of Stock</option>' : ''}
                    </select>
                    <small style="opacity: 0.6; font-size: 0.85rem;">Maximum ${stock} plants available</small>
                </div>
                
                <div class="form-group">
                    <label>Payment Method</label>
                    <select name="paymentMethod">
                        <option value="cod">Cash on Delivery (COD)</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="card">Credit/Debit Card</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Special Instructions (Optional)</label>
                <textarea name="requirements" 
                          rows="3" 
                          placeholder="Any special care instructions? (e.g., pot type, soil preferences, delivery time)"></textarea>
            </div>

            <div style="margin: 25px 0; padding: 18px; background: rgba(0,0,0,0.3); border-radius: 12px; 
                        display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600; font-size: 1.05rem;">Total Amount:</span>
                <span class="mono" style="font-size: 1.6rem; color: var(--success); font-weight: 700;" id="orderTotal">
                    රු. ${product.price.toLocaleString()}
                </span>
            </div>

            <div style="display: flex; gap: 15px;">
                <button type="button" class="btn-3d btn-secondary" onclick="closeOrderModal()" style="flex: 1;">
                    Cancel
                </button>
                <button type="submit" class="btn-3d btn-primary" style="flex: 2;" ${stock === 0 ? 'disabled' : ''}>
                    ${stock === 0 ? 'Out of Stock' : 'Place Order 🌺'}
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('open');
    
    // Update quantity options based on stock
    if (stock === 0) {
        document.querySelector('button[type="submit"]').disabled = true;
    }
}

// Update Order Total
function updateOrderTotal() {
    if (!currentProduct) return;
    
    const form = document.getElementById('orderForm');
    if (!form) return;
    
    const quantity = parseInt(form.quantity.value) || 1;
    const total = currentProduct.price * quantity;
    document.getElementById('orderTotal').textContent = `රු. ${total.toLocaleString()}`;
}

// Generate Tracking ID for Flower Plants
function generateTrackingId(productId, customerName) {
    console.log('🔖 Generating tracking ID for flower plant...');
    
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
    
    // Format: FLOWER#PRODUCT_ID-RANDOM4-RANDOM3-INITIALS
    const trackingId = `FLOWER#${paddedProductId}-${random4}-${random3}-${customerInitials}`;
    
    console.log('✅ Tracking ID generated:', trackingId);
    return trackingId;
}

// Handle Order Submission
async function handleOrderSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Disable button
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    
    try {
        const customerName = form.customerName.value.trim();
        const phoneNumber = form.phoneNumber.value.trim();
        const address = form.address.value.trim();
        const quantity = parseInt(form.quantity.value) || 1;
        const requirements = form.requirements.value.trim();
        const paymentMethod = form.paymentMethod.value;
        
        // Check stock
        if (quantity > (currentProduct.stock || 0)) {
            throw new Error('Requested quantity exceeds available stock');
        }
        
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
            payment_method: paymentMethod,
            category: 'flower_plants',
            status: 'Pending'
        };

        console.log('📤 Submitting flower plant order:', orderData);

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

        console.log('✅ Flower plant order placed successfully:', data);

        // Close order modal
        closeOrderModal();
        
        // Show success modal
        showSuccessModal(orderData);

    } catch (error) {
        console.error('❌ Error placing order:', error);
        showToast('Failed to place order: ' + (error.message || 'Please try again'), 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Show Success Modal for Flower Plant Order
function showSuccessModal(order) {
    const modal = document.getElementById('successModal');
    const modalBody = document.getElementById('successModalBody');
    
    // Create WhatsApp message for flower plants
    const whatsappMsg = encodeURIComponent(
        `🌺 Flower Plant Order - සත්සර මල් පැළ\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Customer: ${order.customer_name}\n` +
        `📱 Phone: ${order.phone_number}\n` +
        `📍 Address: ${order.address}\n\n` +
        `🌿 Plant: ${order.product_name}\n` +
        `📦 Quantity: ${order.quantity} plant${order.quantity > 1 ? 's' : ''}\n` +
        `💰 Unit Price: රු. ${order.price.toLocaleString()}\n` +
        `💵 Total: රු. ${order.total.toLocaleString()}\n` +
        `💳 Payment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 
                     order.payment_method === 'bank' ? 'Bank Transfer' : 'Card'}\n\n` +
        `🔖 Tracking ID: ${order.tracking_id}\n` +
        (order.requirements ? `📝 Special Instructions: ${order.requirements}\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Please confirm my flower plant order. Thank you! 🌸`
    );

    const whatsappUrl = WHATSAPP_CONFIG.phoneNumber 
        ? `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${whatsappMsg}`
        : `https://wa.me/?text=${whatsappMsg}`;
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.5rem; color: white;">✓</div>
            <h2 style="color: var(--success); margin-bottom: 10px;">Order Placed Successfully!</h2>
            <p style="opacity: 0.8; margin-bottom: 25px;">ඔබේ මල් පැල ඇණවුම ලැබී ඇත. පහත ට්‍රැකින් අංකයෙන් ඔබේ ඇණවුම පරීක්ෂා කර ගත හැකිය.</p>
            
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: var(--success); font-weight: bold; margin-bottom: 10px;" 
                     onclick="copyTrackingId('${order.tracking_id}')" 
                     style="cursor: pointer;">
                    ${order.tracking_id}
                </div>
                <small style="opacity: 0.6; font-size: 0.85rem;">
                    👆 Click to copy tracking ID
                </small>
            </div>

            <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Flower Plant:</span>
                    <strong>${order.product_name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Quantity:</span>
                    <strong>${order.quantity} plant${order.quantity > 1 ? 's' : ''}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="opacity: 0.7;">Customer:</span>
                    <strong>${order.customer_name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <span style="opacity: 0.7;">Total Amount:</span>
                    <strong class="mono" style="color: var(--success); font-size: 1.2rem;">රු. ${order.total.toLocaleString()}</strong>
                </div>
            </div>
            
            <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.4); border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: left;">
                <p style="font-size: 0.95rem; line-height: 1.6; margin: 0;">
                    <strong style="color: var(--warning);">📱 Next Step:</strong><br>
                    Click the WhatsApp button below to send order confirmation. Our team will contact you shortly for delivery arrangements.
                </p>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <a href="${whatsappUrl}" 
                   target="_blank" 
                   class="btn-3d btn-success" 
                   style="flex: 1; text-decoration: none; text-align: center;">
                    <i class="fab fa-whatsapp"></i> WhatsApp Confirm
                </a>
                <button class="btn-3d btn-secondary" onclick="closeSuccessModal()" style="flex: 1;">
                    Close
                </button>
            </div>
            
            <button class="btn-3d btn-primary" onclick="window.location.href='track.html'" style="width: 100%;">
                <i class="fas fa-search"></i> Track Your Order
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

// Copy Tracking ID to Clipboard
function copyTrackingId(trackingId) {
    navigator.clipboard.writeText(trackingId).then(() => {
        showToast('✅ Tracking ID copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = trackingId;
        document.body.appendChild(textArea);
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
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.remove('open');
    }
    currentProduct = null;
}

// Close Success Modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('open');
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    
    toast.textContent = message;
    toast.className = 'show';
    
    if (type === 'success') {
        toast.style.background = 'rgba(16, 185, 129, 0.2)';
        toast.style.borderColor = '#10b981';
    } else if (type === 'error') {
        toast.style.background = 'rgba(239, 68, 68, 0.2)';
        toast.style.borderColor = '#ef4444';
    } else if (type === 'warning') {
        toast.style.background = 'rgba(245, 158, 11, 0.2)';
        toast.style.borderColor = '#f59e0b';
    }
    
    setTimeout(() => {
        toast.className = '';
    }, 3000);
}

// Search products
function searchProducts(query) {
    if (!query) {
        // Show all products
        const grid = document.querySelector('.product-grid');
        if (grid) {
            grid.innerHTML = '';
            allProducts.forEach(product => {
                const card = createProductCard(product);
                grid.appendChild(card);
            });
        }
        return;
    }
    
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    const container = document.getElementById('productsContainer');
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 4rem;">🔍</span>
                <h3>No Flower Plants Found</h3>
                <p>No flower plants found for "${query}"</p>
                <button class="btn-3d btn-secondary" onclick="searchProducts('')" style="margin-top: 20px;">
                    Show All Plants
                </button>
            </div>
        `;
    } else {
        const grid = document.createElement('div');
        grid.className = 'product-grid fade-in';
        
        filteredProducts.forEach(product => {
            const card = createProductCard(product);
            grid.appendChild(card);
        });
        
        container.innerHTML = '';
        container.appendChild(grid);
    }
}

// Make functions available globally
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.closeSuccessModal = closeSuccessModal;
window.showToast = showToast;
window.searchProducts = searchProducts;
window.copyTrackingId = copyTrackingId;
