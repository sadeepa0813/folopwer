/**
 * ════════════════════════════════════════════════════════════════
 * 3D STORE - COMPLETE ADMIN PANEL (FIXED VERSION)
 * Working version with all bugs fixed
 * ════════════════════════════════════════════════════════════════
 */

// Global state
let currentFilter = 'all';
let deleteTarget = null;
let editTarget = null;
let allOrders = [];
let allProducts = [];
let allCustomers = [];
let selectedOrders = new Set();

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Panel Loading...');
    
    // Setup mobile menu event listeners
    setupMobileMenu();
    
    // Wait for Supabase client
    await waitForSupabase();
    
    // Check authentication
    await checkAuth();
    
    // Load initial data
    await loadInitialData();
    
    console.log('✅ Admin Panel Ready!');
});

// Wait for Supabase client
async function waitForSupabase() {
    return new Promise((resolve) => {
        const checkClient = () => {
            if (window.supabaseClient) {
                console.log('✅ Supabase client found');
                resolve(true);
                return;
            }
            
            console.log('⏳ Waiting for Supabase client...');
            setTimeout(checkClient, 500);
        };
        
        checkClient();
    });
}

// Check authentication
async function checkAuth() {
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Auth error:', error);
            redirectToLogin();
            return false;
        }
        
        if (!session) {
            console.log('❌ No active session');
            redirectToLogin();
            return false;
        }
        
        console.log('✅ Authenticated as:', session.user.email);
        document.getElementById('adminEmail').textContent = session.user.email;
        document.getElementById('lastLogin').textContent = 'Last login: ' + new Date().toLocaleString();
        
        return true;
        
    } catch (error) {
        console.error('Auth check error:', error);
        redirectToLogin();
        return false;
    }
}

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadDashboardStats(),
            loadProducts(),
            loadOrders(),
            loadCustomers(),
            loadNotificationHistory()
        ]);
        
        // Setup real-time
        setupRealtime();
        
        // Request notification permission
        setTimeout(() => {
            requestNotificationPermission();
        }, 2000); // Wait 2 seconds before asking
        
    } catch (error) {
        console.error('Initial data load error:', error);
        showToast('Failed to load data', 'error');
    }
}

function redirectToLogin() {
    setTimeout(() => {
        window.location.href = 'admin-login.html';
    }, 1500);
}

// ==================== NAVIGATION ====================
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Remove active from all mobile nav items
    document.querySelectorAll('.mobile-nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Activate corresponding nav item
        const navItems = document.querySelectorAll('.nav-item');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        const sectionMap = {
            'dashboard': 0,
            'products': 1,
            'orders': 2,
            'customers': 3
        };
        
        if (sectionMap[sectionId] !== undefined) {
            if (navItems[sectionMap[sectionId]]) {
                navItems[sectionMap[sectionId]].classList.add('active');
            }
            if (mobileNavItems[sectionMap[sectionId]]) {
                mobileNavItems[sectionMap[sectionId]].classList.add('active');
            }
        }
        
        // Load data for section
        if (sectionId === 'dashboard') {
            loadDashboardStats();
        } else if (sectionId === 'products') {
            loadProducts();
        } else if (sectionId === 'orders') {
            loadOrders();
        } else if (sectionId === 'customers') {
            loadCustomers();
        }
    }
    
    // Close mobile menu if open
    closeMobileMenu();
}

// ==================== DASHBOARD ====================
async function loadDashboardStats() {
    try {
        console.log('📊 Loading dashboard stats...');
        
        // Get counts in parallel
        const [productsRes, ordersRes, pendingRes] = await Promise.all([
            window.supabaseClient.from('products').select('*', { count: 'exact', head: true }),
            window.supabaseClient.from('orders').select('*', { count: 'exact', head: true }),
            window.supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
        ]);
        
        // Calculate revenue
        const { data: revenueData } = await window.supabaseClient
            .from('orders')
            .select('total')
            .eq('status', 'Confirmed');
        
        const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
        
        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: todayOrders } = await window.supabaseClient
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        const { data: todayRevenueData } = await window.supabaseClient
            .from('orders')
            .select('total')
            .eq('status', 'Confirmed')
            .gte('created_at', today.toISOString());
        
        const todayRevenue = todayRevenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
        
        // Stock info
        const { data: products } = await window.supabaseClient
            .from('products')
            .select('stock');
        
        let inStock = 0, outOfStock = 0, lowStock = 0;
        if (products) {
            products.forEach(p => {
                const stock = p.stock || 0;
                if (stock > 10) inStock++;
                else if (stock === 0) outOfStock++;
                else if (stock <= 10) lowStock++;
            });
        }
        
        // Update UI
        document.getElementById('totalProducts').textContent = productsRes.count || 0;
        document.getElementById('totalOrders').textContent = ordersRes.count || 0;
        document.getElementById('pendingOrders').textContent = pendingRes.count || 0;
        document.getElementById('totalRevenue').textContent = `Rs. ${totalRevenue.toLocaleString()}`;
        document.getElementById('todayOrders').textContent = `Today: ${todayOrders || 0}`;
        document.getElementById('todayRevenue').textContent = `Today: Rs. ${todayRevenue.toLocaleString()}`;
        document.getElementById('stockInfo').textContent = `${inStock} in stock, ${lowStock} low, ${outOfStock} out`;
        
        // Update pending badges
        updatePendingBadge(pendingRes.count || 0);
        
        // Load recent orders
        await loadRecentOrders();
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
    }
}

function updatePendingBadge(count) {
    const desktopBadge = document.getElementById('pendingBadge');
    const mobileBadge = document.getElementById('mobilePendingBadge');
    
    if (desktopBadge) {
        desktopBadge.textContent = count;
        desktopBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    if (mobileBadge) {
        mobileBadge.textContent = count;
        mobileBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

async function loadRecentOrders() {
    try {
        const { data: orders } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        const container = document.getElementById('recentOrdersTable');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-title">No Orders Yet</div>
                    <div class="empty-state-message">When customers place orders, they'll appear here</div>
                </div>
            `;
            return;
        }
        
        const html = orders.map(order => `
            <tr onclick="viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})" style="cursor: pointer;">
                <td>
                    <div class="tracking-id" onclick="copyTrackingId('${order.tracking_id}', event)">
                        <span class="mono" style="font-size: 0.9rem;">${order.tracking_id}</span>
                        <button class="copy-btn" title="Copy Tracking ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
                <td><strong>${order.customer_name}</strong></td>
                <td>
                    <a href="tel:${order.phone_number}" class="customer-phone-link" onclick="event.stopPropagation()">
                        ${order.phone_number}
                    </a>
                </td>
                <td class="mono"><strong>Rs. ${order.total.toLocaleString()}</strong></td>
                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
            </tr>
        `).join('');
        
        container.innerHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${html}</tbody>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Recent orders error:', error);
    }
}

// ==================== PRODUCT MANAGEMENT ====================
async function loadProducts() {
    try {
        console.log('📦 Loading products...');
        
        const { data: products, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allProducts = products || [];
        displayProducts(allProducts);
        
        console.log(`✅ Loaded ${products.length} products`);
        
    } catch (error) {
        console.error('❌ Products error:', error);
        showToast('Failed to load products', 'error');
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsTableContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">No Products Found</div>
                <div class="empty-state-message">Add your first product to get started</div>
                <button class="btn-3d btn-primary" onclick="showAddProductForm()" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Add First Product
                </button>
            </div>
        `;
        return;
    }
    
    const html = products.map(product => `
        <tr>
            <td>
                <img src="${product.image_url || 'https://via.placeholder.com/60'}" 
                     alt="${product.name}"
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px;"
                     onerror="this.src='https://via.placeholder.com/60'">
            </td>
            <td>
                <strong style="color: var(--primary);">${product.name}</strong>
                <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 3px;">
                    ${product.description ? product.description.substring(0, 50) + '...' : 'No description'}
                </div>
                ${(product.stock || 0) <= 5 && (product.stock || 0) > 0 ? 
                    '<div style="color: var(--warning); font-size: 0.8rem; margin-top: 5px;">⚠️ Low stock warning</div>' : ''}
            </td>
            <td class="mono" style="font-weight: 700; color: var(--success);">
                Rs. ${(product.price || 0).toLocaleString()}
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" 
                           class="stock-input" 
                           value="${product.stock || 0}" 
                           min="0"
                           onchange="updateStock(${product.id}, this.value)"
                           style="${(product.stock || 0) === 0 ? 'border-color: var(--danger); background: rgba(239, 68, 68, 0.1);' : ''}">
                    <span class="stock-badge ${getStockClass(product.stock || 0)}">
                        <i class="fas fa-${getStockIcon(product.stock || 0)}"></i>
                        ${getStockText(product.stock || 0)}
                    </span>
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-3d btn-primary btn-small" 
                            onclick='openEditProductModal(${JSON.stringify(product).replace(/'/g, "&#39;")})'
                            title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-3d btn-danger btn-small" 
                            onclick="openDeleteModal('product', ${product.id}, '${product.name.replace(/'/g, "\\'")}')"
                            title="Delete Product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        </div>
    `;
}

function getStockClass(stock) {
    if (stock === 0) return 'stock-out';
    if (stock <= 5) return 'stock-low';
    return 'stock-in';
}

function getStockIcon(stock) {
    if (stock === 0) return 'times-circle';
    if (stock <= 5) return 'exclamation-circle';
    return 'check-circle';
}

function getStockText(stock) {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 5) return `Low (${stock})`;
    return `In Stock (${stock})`;
}

async function updateStock(productId, newStock) {
    const stock = parseInt(newStock);
    
    if (isNaN(stock) || stock < 0) {
        showToast('❌ Invalid stock quantity', 'error');
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ 
                stock: stock,
                status: stock > 0 ? 'in_stock' : 'out_of_stock',
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        showToast('✅ Stock updated successfully', 'success');
        
        // Update local data
        const productIndex = allProducts.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            allProducts[productIndex].stock = stock;
            allProducts[productIndex].status = stock > 0 ? 'in_stock' : 'out_of_stock';
        }
        
        // Refresh display
        displayProducts(allProducts);
        
    } catch (error) {
        console.error('❌ Stock update error:', error);
        showToast('❌ Failed to update stock', 'error');
    }
}

// ==================== ADD PRODUCT ====================
function showAddProductForm() {
    document.getElementById('addProductFormContainer').style.display = 'block';
    window.scrollTo({ 
        top: document.getElementById('addProductFormContainer').offsetTop - 100, 
        behavior: 'smooth' 
    });
}

function hideAddProductForm() {
    document.getElementById('addProductFormContainer').style.display = 'none';
    document.getElementById('addProductForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('fileName').textContent = 'No file chosen';
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    
    if (file) {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('❌ Image must be less than 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            showToast('❌ Only JPEG, PNG and WebP images allowed', 'error');
            event.target.value = '';
            return;
        }
        
        fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <div style="position: relative;">
                    <img src="${e.target.result}" 
                         alt="Preview" 
                         style="max-width: 100%; max-height: 250px; border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.3);">
                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 6px; font-size: 0.85rem;">
                        Preview
                    </div>
                </div>
            `;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleAddProduct(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    try {
        const productData = {
            name: form.name.value.trim(),
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value) || 0,
            description: form.description.value.trim()
        };
        
        if (!productData.name || productData.name.length < 2) {
            throw new Error('Product name is required (min 2 characters)');
        }
        
        if (!productData.price || productData.price <= 0) {
            throw new Error('Price must be greater than 0');
        }
        
        if (productData.stock < 0) {
            throw new Error('Stock cannot be negative');
        }
        
        const imageFile = document.getElementById('productImage').files[0];
        if (!imageFile) {
            throw new Error('Please select a product image');
        }
        
        console.log('📤 Starting product upload...');
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `product_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('product-images')
            .upload(fileName, imageFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);
        
        const { data, error } = await window.supabaseClient
            .from('products')
            .insert([{
                name: productData.name,
                price: productData.price,
                stock: productData.stock,
                description: productData.description,
                image_url: publicUrl,
                status: productData.stock > 0 ? 'in_stock' : 'out_of_stock',
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (error) throw error;
        
        showToast('✅ Product added successfully!', 'success');
        hideAddProductForm();
        await loadProducts();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Add product error:', error);
        showToast('❌ ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Product';
    }
}

// ==================== EDIT PRODUCT ====================
function openEditProductModal(product) {
    editTarget = product;
    const modal = document.getElementById('editProductModal');
    const modalBody = document.getElementById('editProductModalBody');
    
    modalBody.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--primary);">
            <i class="fas fa-edit"></i> Edit Product
        </h3>
        <form id="editProductForm" onsubmit="handleEditProduct(event)">
            <div class="form-group">
                <label>Product Name *</label>
                <input type="text" name="name" value="${product.name}" required>
            </div>
            
            <div class="form-group">
                <label>Price (Rs.) *</label>
                <input type="number" name="price" value="${product.price}" step="0.01" required>
            </div>
            
            <div class="form-group">
                <label>Stock Quantity *</label>
                <input type="number" name="stock" value="${product.stock || 0}" min="0" required>
            </div>
            
            <div class="form-group">
                <label>Description *</label>
                <textarea name="description" rows="3" required>${product.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Current Image</label>
                <img src="${product.image_url}" 
                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px; display: block; margin-bottom: 10px;">
                <label>Change Image (Optional)</label>
                <input type="file" id="editProductImage" accept="image/*" onchange="previewEditImage(event)">
                <div id="editImagePreview" class="hidden" style="margin-top: 10px;"></div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn-3d btn-secondary" onclick="closeEditProductModal()" style="flex: 1;">
                    Cancel
                </button>
                <button type="submit" class="btn-3d btn-primary" style="flex: 1;" id="editProductSubmitBtn">
                    Update Product
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('open');
}

function previewEditImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('editImagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" 
                     alt="Preview" 
                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px;">
            `;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleEditProduct(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('editProductSubmitBtn') || form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const name = form.name.value.trim();
        const price = parseFloat(form.price.value);
        const stock = parseInt(form.stock.value) || 0;
        const description = form.description.value.trim();
        const imageFile = document.getElementById('editProductImage').files[0];
        
        let imageUrl = editTarget.image_url;
        let deleteOldImage = false;
        
        // Upload new image if selected
        if (imageFile) {
            console.log('📤 Uploading new image...');
            
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `product_${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                .from('product-images')
                .upload(fileName, imageFile);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            imageUrl = publicUrl;
            deleteOldImage = true;
        }
        
        // Update product
        const { error } = await window.supabaseClient
            .from('products')
            .update({
                name: name,
                price: price,
                stock: stock,
                description: description,
                image_url: imageUrl,
                status: stock > 0 ? 'in_stock' : 'out_of_stock',
                updated_at: new Date().toISOString()
            })
            .eq('id', editTarget.id);
        
        if (error) throw error;
        
        // Delete old image if new one uploaded
        if (deleteOldImage && editTarget.image_url) {
            try {
                const oldFileName = editTarget.image_url.split('/').pop();
                await window.supabaseClient.storage
                    .from('product-images')
                    .remove([oldFileName]);
            } catch (err) {
                console.log('Could not delete old image:', err);
            }
        }
        
        showToast('✅ Product updated successfully!', 'success');
        closeEditProductModal();
        
        // Reload products
        await loadProducts();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Edit product error:', error);
        showToast('❌ Failed to update product: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Update Product';
    }
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('open');
    editTarget = null;
}

// ==================== ORDER MANAGEMENT ====================
async function loadOrders() {
    try {
        console.log('🛒 Loading orders...');
        
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = orders || [];
        displayOrders(allOrders);
        
        console.log(`✅ Loaded ${orders.length} orders`);
        
    } catch (error) {
        console.error('❌ Orders error:', error);
        showToast('Failed to load orders', 'error');
    }
}

function displayOrders(orders) {
    let filteredOrders = orders;
    
    // Apply current filter
    if (currentFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredOrders = orders.filter(o => new Date(o.created_at) >= today);
    } else if (currentFilter === 'this_week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (currentFilter !== 'all') {
        filteredOrders = orders.filter(o => o.status === currentFilter);
    }
    
    const container = document.getElementById('ordersTableContainer');
    
    if (!filteredOrders || filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">No Orders Found</div>
                <div class="empty-state-message">
                    ${currentFilter === 'today' ? 'No orders today' : 
                      currentFilter === 'this_week' ? 'No orders this week' : 
                      currentFilter === 'Pending' ? 'No pending orders' :
                      currentFilter === 'Confirmed' ? 'No confirmed orders' :
                      currentFilter === 'Cancelled' ? 'No cancelled orders' :
                      'No orders to display'}
                </div>
            </div>
        `;
        return;
    }
    
    const html = filteredOrders.map(order => {
        const isSelected = selectedOrders.has(order.tracking_id);
        return `
            <tr class="${isSelected ? 'selected-order' : ''}" onclick="handleOrderRowClick('${order.tracking_id}', event)">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" 
                               ${isSelected ? 'checked' : ''}
                               onclick="toggleOrderSelection('${order.tracking_id}'); event.stopPropagation()"
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <div class="tracking-id" onclick="copyTrackingId('${order.tracking_id}', event)">
                            <span class="mono" style="font-size: 0.9rem;">${order.tracking_id}</span>
                            <button class="copy-btn" title="Copy Tracking ID">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>${order.customer_name}</strong>
                    <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 3px;">
                        ${order.address ? order.address.substring(0, 30) + '...' : 'No address'}
                    </div>
                </td>
                <td>
                    <a href="tel:${order.phone_number}" class="customer-phone-link" onclick="event.stopPropagation()">
                        <i class="fas fa-phone"></i> ${order.phone_number}
                    </a>
                </td>
                <td>
                    <strong>${order.product_name}</strong>
                    <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 3px;">
                        Qty: ${order.quantity}
                    </div>
                </td>
                <td class="mono" style="font-weight: 700; color: var(--success);">
                    Rs. ${order.total.toLocaleString()}
                </td>
                <td>
                    <span class="status-badge status-${order.status.toLowerCase()}">
                        <i class="fas fa-${getStatusIcon(order.status)}"></i>
                        ${order.status}
                    </span>
                </td>
                <td style="font-size: 0.9rem; opacity: 0.8;">
                    ${new Date(order.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                    ${isToday(order.created_at) ? '<span class="today-badge">Today</span>' : ''}
                </td>
                <td>
                    <div class="order-actions">
                        <button class="order-action-btn view-btn" 
                                onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")}); event.stopPropagation()' 
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${order.status !== 'Confirmed' ? `
                            <button class="order-action-btn confirm-btn" 
                                    onclick="updateOrderStatus('${order.tracking_id}', 'Confirmed'); event.stopPropagation()"
                                    title="Confirm Order">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${order.status !== 'Cancelled' ? `
                            <button class="order-action-btn cancel-btn" 
                                    onclick="updateOrderStatus('${order.tracking_id}', 'Cancelled'); event.stopPropagation()"
                                    title="Cancel Order">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th style="width: 220px;">Selection & Tracking ID</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Product</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        </div>
    `;
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        const allFilteredSelected = filteredOrders.length > 0 && 
            filteredOrders.every(order => selectedOrders.has(order.tracking_id));
        selectAllCheckbox.checked = allFilteredSelected;
    }
    
    // Show/hide quick confirm button
    const quickConfirmBtn = document.getElementById('quickConfirmBtn');
    if (quickConfirmBtn) {
        quickConfirmBtn.style.display = selectedOrders.size > 0 ? 'flex' : 'none';
        quickConfirmBtn.innerHTML = `<i class="fas fa-check"></i> <span style="font-size: 0.8rem; margin-left: 5px;">${selectedOrders.size}</span>`;
    }
}

function getStatusIcon(status) {
    switch(status) {
        case 'Pending': return 'clock';
        case 'Confirmed': return 'check-circle';
        case 'Cancelled': return 'times-circle';
        default: return 'question-circle';
    }
}

function filterOrders(status) {
    currentFilter = status;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedBtn = event?.target?.closest?.('.filter-btn');
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    displayOrders(allOrders);
}

function searchOrders() {
    const query = document.getElementById('orderSearch').value.toLowerCase();
    const filtered = allOrders.filter(o => 
        o.customer_name.toLowerCase().includes(query) ||
        o.phone_number.includes(query) ||
        o.tracking_id.toLowerCase().includes(query) ||
        o.product_name.toLowerCase().includes(query)
    );
    displayOrders(filtered);
}

function searchProducts() {
    const query = document.getElementById('productSearch').value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
    displayProducts(filtered);
}

async function updateOrderStatus(trackingId, newStatus) {
    const action = newStatus === 'Confirmed' ? 'confirm' : 'cancel';
    
    if (!confirm(`Are you sure you want to ${action} this order?`)) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('tracking_id', trackingId);
        
        if (error) throw error;
        
        showToast(`✅ Order ${newStatus.toLowerCase()}!`, 'success');
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.tracking_id === trackingId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
            allOrders[orderIndex].updated_at = new Date().toISOString();
        }
        
        // Remove from selection if selected
        if (selectedOrders.has(trackingId)) {
            selectedOrders.delete(trackingId);
            updateSelectedCount();
        }
        
        // Refresh display
        displayOrders(allOrders);
        await loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Order update error:', error);
        showToast('❌ Failed to update order', 'error');
    }
}

// ==================== ORDER SELECTION & BULK ACTIONS ====================
function toggleOrderSelection(trackingId) {
    if (selectedOrders.has(trackingId)) {
        selectedOrders.delete(trackingId);
    } else {
        selectedOrders.add(trackingId);
    }
    updateSelectedCount();
    displayOrders(allOrders);
}

function handleOrderRowClick(trackingId, event) {
    // Only handle row click if not clicking on checkbox or action button
    if (event.target.type === 'checkbox' || 
        event.target.closest('button') || 
        event.target.closest('.tracking-id') ||
        event.target.closest('.order-actions')) {
        return;
    }
    
    // Otherwise view order details
    const order = allOrders.find(o => o.tracking_id === trackingId);
    if (order) {
        viewOrderDetails(order);
    }
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const isChecked = !checkbox.checked;
    checkbox.checked = isChecked;
    
    // Get filtered orders based on current filter
    let filteredOrders = allOrders;
    if (currentFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredOrders = allOrders.filter(o => new Date(o.created_at) >= today);
    } else if (currentFilter === 'this_week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredOrders = allOrders.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (currentFilter !== 'all') {
        filteredOrders = allOrders.filter(o => o.status === currentFilter);
    }
    
    if (isChecked) {
        // Add all filtered orders to selection
        filteredOrders.forEach(order => {
            selectedOrders.add(order.tracking_id);
        });
    } else {
        // Remove all filtered orders from selection
        filteredOrders.forEach(order => {
            selectedOrders.delete(order.tracking_id);
        });
    }
    
    updateSelectedCount();
    displayOrders(allOrders);
}

function clearSelection() {
    selectedOrders.clear();
    updateSelectedCount();
    
    // Uncheck select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    
    // Hide quick confirm button
    const quickConfirmBtn = document.getElementById('quickConfirmBtn');
    if (quickConfirmBtn) {
        quickConfirmBtn.style.display = 'none';
    }
    
    displayOrders(allOrders);
    showToast('Selection cleared', 'info');
}

function updateSelectedCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.innerHTML = `<i class="fas fa-check-square"></i> ${selectedOrders.size} order(s) selected`;
        
        // Update quick confirm button
        const quickConfirmBtn = document.getElementById('quickConfirmBtn');
        if (quickConfirmBtn) {
            quickConfirmBtn.style.display = selectedOrders.size > 0 ? 'flex' : 'none';
            quickConfirmBtn.innerHTML = `<i class="fas fa-check"></i> <span style="font-size: 0.8rem; margin-left: 5px;">${selectedOrders.size}</span>`;
        }
    }
}

async function applyBulkAction() {
    const bulkAction = document.getElementById('bulkAction');
    const actionValue = bulkAction ? bulkAction.value : '';
    
    if (!actionValue) {
        showToast('Please select a bulk action', 'warning');
        return;
    }
    
    if (selectedOrders.size === 0) {
        showToast('No orders selected', 'warning');
        return;
    }
    
    const actionMap = {
        'confirm': { 
            status: 'Confirmed', 
            message: 'confirm',
            confirmText: 'Are you sure you want to confirm these orders?'
        },
        'cancel': { 
            status: 'Cancelled', 
            message: 'cancel',
            confirmText: 'Are you sure you want to cancel these orders?'
        }
    };
    
    const action = actionMap[actionValue];
    if (!action) return;
    
    if (!confirm(`${action.confirmText}\n\nThis will affect ${selectedOrders.size} order(s).`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        // Show loading
        showToast(`Processing ${selectedOrders.size} order(s)...`, 'info');
        
        // Process each selected order
        for (const trackingId of selectedOrders) {
            try {
                const { error } = await window.supabaseClient
                    .from('orders')
                    .update({ 
                        status: action.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('tracking_id', trackingId);
                
                if (error) throw error;
                
                // Update local data
                const orderIndex = allOrders.findIndex(o => o.tracking_id === trackingId);
                if (orderIndex !== -1) {
                    allOrders[orderIndex].status = action.status;
                    allOrders[orderIndex].updated_at = new Date().toISOString();
                }
                
                successCount++;
            } catch (error) {
                console.error(`Failed to update order ${trackingId}:`, error);
                failCount++;
            }
        }
        
        // Show result
        if (successCount > 0) {
            showToast(`✅ ${action.message}ed ${successCount} order(s) successfully`, 'success');
            displayOrders(allOrders);
            await loadDashboardStats();
        }
        
        if (failCount > 0) {
            showToast(`❌ Failed to ${action.message} ${failCount} order(s)`, 'error');
        }
        
        // Clear selection
        clearSelection();
        
        // Reset bulk action dropdown
        if (bulkAction) {
            bulkAction.value = '';
        }
        
    } catch (error) {
        console.error('Bulk action error:', error);
        showToast('Failed to perform bulk action', 'error');
    }
}

function quickConfirmAll() {
    if (selectedOrders.size === 0) {
        showToast('No orders selected', 'warning');
        return;
    }
    
    const bulkAction = document.getElementById('bulkAction');
    if (bulkAction) {
        bulkAction.value = 'confirm';
    }
    applyBulkAction();
}

// ==================== TRACKING ID COPY ====================
function copyTrackingId(trackingId, event) {
    if (event) event.stopPropagation();
    
    navigator.clipboard.writeText(trackingId)
        .then(() => {
            showToast('📋 Tracking ID copied to clipboard!', 'success');
            
            // Visual feedback
            const copyBtn = event ? event.target.closest('.tracking-id') : null;
            if (copyBtn) {
                copyBtn.style.color = 'var(--success)';
                setTimeout(() => {
                    copyBtn.style.color = '';
                }, 1000);
            }
        })
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('❌ Failed to copy', 'error');
        });
}

// ==================== VIEW ORDER DETAILS ====================
function viewOrderDetails(order) {
    const modal = document.getElementById('orderDetailsModal');
    const modalBody = document.getElementById('orderDetailsModalBody');
    
    modalBody.innerHTML = `
        <h3 style="margin-bottom: 25px; color: var(--primary); display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-receipt"></i> Order Details
        </h3>
        
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05)); 
                  border: 1px solid rgba(16, 185, 129, 0.2); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Tracking ID</p>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <p class="mono" style="font-weight: 700; color: var(--accent); font-size: 1.1rem;">${order.tracking_id}</p>
                        <button class="btn-3d btn-small btn-secondary" onclick="copyTrackingId('${order.tracking_id}')" style="padding: 6px 12px;">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Status</p>
                    <span class="status-badge status-${order.status.toLowerCase()}" style="font-size: 0.9rem; padding: 8px 16px;">
                        <i class="fas fa-${getStatusIcon(order.status)}"></i>
                        ${order.status}
                    </span>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Customer Name</p>
                    <p style="font-weight: 700; font-size: 1.1rem;">${order.customer_name}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Phone Number</p>
                    <p style="font-weight: 700; font-size: 1.1rem;">
                        <a href="tel:${order.phone_number}" style="color: var(--accent); text-decoration: none;">
                            <i class="fas fa-phone"></i> ${order.phone_number}
                        </a>
                    </p>
                </div>
            </div>
            
            ${order.address ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Delivery Address</p>
                    <p style="font-size: 1rem;">${order.address}</p>
                </div>
            ` : ''}
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(129, 140, 248, 0.05)); 
                  border: 1px solid rgba(99, 102, 241, 0.2); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
            <h4 style="margin-bottom: 20px; color: var(--primary); display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-box"></i> Product Information
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Product Name</p>
                    <p style="font-weight: 700; font-size: 1.1rem;">${order.product_name}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Quantity</p>
                    <p style="font-weight: 700; font-size: 1.1rem; color: var(--accent);">${order.quantity}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Unit Price</p>
                    <p class="mono" style="font-weight: 700; font-size: 1.1rem;">Rs. ${order.price.toLocaleString()}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Total Amount</p>
                    <p class="mono" style="font-weight: 800; font-size: 1.3rem; color: var(--success);">
                        Rs. ${order.total.toLocaleString()}
                    </p>
                </div>
            </div>
            
            ${order.requirements ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Special Requirements</p>
                    <p style="font-size: 1rem; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px;">${order.requirements}</p>
                </div>
            ` : ''}
        </div>
        
        <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Order Placed</p>
                    <p style="font-weight: 600;">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Order ID</p>
                    <p class="mono" style="font-weight: 600; font-size: 0.9rem;">${order.id}</p>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            ${order.status === 'Pending' ? `
                <button class="btn-3d btn-success" onclick="updateOrderStatus('${order.tracking_id}', 'Confirmed'); closeOrderDetailsModal()" style="flex: 1; min-width: 150px;">
                    <i class="fas fa-check"></i> Confirm Order
                </button>
            ` : ''}
            ${order.status !== 'Cancelled' ? `
                <button class="btn-3d btn-danger" onclick="updateOrderStatus('${order.tracking_id}', 'Cancelled'); closeOrderDetailsModal()" style="flex: 1; min-width: 150px;">
                    <i class="fas fa-times"></i> Cancel Order
                </button>
            ` : ''}
            <button class="btn-3d btn-secondary" onclick="closeOrderDetailsModal()" style="flex: 1; min-width: 150px;">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.remove('open');
}

// ==================== CUSTOMER MANAGEMENT ====================
async function loadCustomers() {
    try {
        console.log('👥 Loading customers...');
        
        // Get banned customers first
        const { data: bannedCustomers, error: bannedError } = await window.supabaseClient
            .from('banned_customers')
            .select('*');
        
        if (bannedError) console.error('Could not load banned customers:', bannedError);
        
        const bannedPhones = new Set((bannedCustomers || []).map(c => c.phone_number));
        
        // Get customers from orders
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*');
        
        if (error) throw error;
        
        // Extract unique customers from orders
        const uniqueCustomers = {};
        orders.forEach(order => {
            const key = `${order.phone_number}-${order.customer_name}`;
            if (!uniqueCustomers[key]) {
                uniqueCustomers[key] = {
                    name: order.customer_name,
                    phone: order.phone_number,
                    orderCount: 1,
                    totalSpent: order.total,
                    lastOrder: order.created_at,
                    banned: bannedPhones.has(order.phone_number)
                };
            } else {
                uniqueCustomers[key].orderCount++;
                uniqueCustomers[key].totalSpent += order.total;
                if (new Date(order.created_at) > new Date(uniqueCustomers[key].lastOrder)) {
                    uniqueCustomers[key].lastOrder = order.created_at;
                }
            }
        });
        
        allCustomers = Object.values(uniqueCustomers);
        displayCustomers(allCustomers);
        
        console.log(`✅ Loaded ${allCustomers.length} customers`);
        
    } catch (error) {
        console.error('❌ Customers error:', error);
        showToast('Failed to load customers', 'error');
    }
}

function displayCustomers(customers) {
    const container = document.getElementById('customersTableContainer');
    
    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-title">No Customers Found</div>
                <div class="empty-state-message">Customers will appear here after they place orders</div>
            </div>
        `;
        return;
    }
    
    // Sort by last order date (newest first)
    customers.sort((a, b) => new Date(b.lastOrder) - new Date(a.lastOrder));
    
    const html = customers.map(customer => {
        const isBanned = customer.banned || false;
        return `
        <tr style="${isBanned ? 'opacity: 0.5; background: rgba(239, 68, 68, 0.1);' : ''}">
            <td>
                <strong>${customer.name}</strong>
                ${isBanned ? '<span class="status-badge status-cancelled" style="margin-left: 8px; font-size: 0.75rem;"><i class="fas fa-ban"></i> Banned</span>' : ''}
            </td>
            <td>
                <a href="tel:${customer.phone}" class="customer-phone-link">
                    <i class="fas fa-phone"></i> ${customer.phone}
                </a>
            </td>
            <td class="mono" style="font-weight: 700; color: var(--primary);">
                ${customer.orderCount}
            </td>
            <td class="mono" style="font-weight: 700; color: var(--success);">
                Rs. ${customer.totalSpent.toLocaleString()}
            </td>
            <td style="font-size: 0.9rem; opacity: 0.8;">
                ${new Date(customer.lastOrder).toLocaleDateString()}
            </td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-3d btn-primary btn-small" 
                            onclick="viewCustomerDetails(${JSON.stringify(customer).replace(/'/g, "&#39;")})"
                            title="View Customer">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${isBanned ? `
                        <button class="btn-3d btn-success btn-small" 
                                onclick="toggleCustomerBan('${customer.phone}', false)"
                                title="Unban Customer">
                            <i class="fas fa-check"></i> Unban
                        </button>
                    ` : `
                        <button class="btn-3d btn-danger btn-small" 
                                onclick="toggleCustomerBan('${customer.phone}', true)"
                                title="Ban Customer">
                            <i class="fas fa-ban"></i> Ban
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `}).join('');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Last Order</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        </div>
    `;
}

function searchCustomers() {
    const query = document.getElementById('customerSearch').value.toLowerCase();
    const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query)
    );
    displayCustomers(filtered);
}

function viewCustomerDetails(customer) {
    const modal = document.getElementById('customerDetailsModal');
    const modalBody = document.getElementById('customerDetailsModalBody');
    
    // Get customer's orders
    const customerOrders = allOrders.filter(o => 
        o.phone_number === customer.phone && o.customer_name === customer.name
    );
    
    modalBody.innerHTML = `
        <h3 style="margin-bottom: 25px; color: var(--primary); display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-user"></i> Customer Details
        </h3>
        
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05)); 
                  border: 1px solid rgba(16, 185, 129, 0.2); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Customer Name</p>
                    <p style="font-weight: 700; font-size: 1.2rem;">${customer.name}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Phone Number</p>
                    <p style="font-weight: 700; font-size: 1.2rem;">
                        <a href="tel:${customer.phone}" style="color: var(--accent); text-decoration: none;">
                            <i class="fas fa-phone"></i> ${customer.phone}
                        </a>
                    </p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Total Orders</p>
                    <p class="mono" style="font-weight: 800; font-size: 1.5rem; color: var(--primary);">${customer.orderCount}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 8px;">Total Spent</p>
                    <p class="mono" style="font-weight: 800; font-size: 1.5rem; color: var(--success);">
                        Rs. ${customer.totalSpent.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 25px;">
            <h4 style="margin-bottom: 15px; color: var(--primary);">
                <i class="fas fa-history"></i> Order History
            </h4>
            ${customerOrders.length > 0 ? `
                <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Product</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customerOrders.map(order => `
                                <tr onclick="viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})" style="cursor: pointer;">
                                    <td class="mono" style="font-size: 0.85rem;">${order.tracking_id}</td>
                                    <td>${order.product_name}</td>
                                    <td class="mono">Rs. ${order.total.toLocaleString()}</td>
                                    <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                                    <td style="font-size: 0.85rem;">${new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div style="text-align: center; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <p style="opacity: 0.7;">No order history found</p>
                </div>
            `}
        </div>
        
        <div style="display: flex; gap: 15px;">
            <button class="btn-3d btn-primary" onclick="showSection('orders'); filterOrders('all'); document.getElementById('orderSearch').value = '${customer.phone}'; searchOrders(); closeCustomerDetailsModal();" style="flex: 1;">
                <i class="fas fa-search"></i> View All Orders
            </button>
            <button class="btn-3d btn-secondary" onclick="closeCustomerDetailsModal()" style="flex: 1;">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

function closeCustomerDetailsModal() {
    document.getElementById('customerDetailsModal').classList.remove('open');
}

// Toggle customer ban status
async function toggleCustomerBan(phoneNumber, shouldBan) {
    const action = shouldBan ? 'ban' : 'unban';
    
    if (!confirm(`Are you sure you want to ${action} this customer (${phoneNumber})?`)) {
        return;
    }
    
    try {
        if (shouldBan) {
            // Add to banned_customers table
            const { error } = await window.supabaseClient
                .from('banned_customers')
                .insert({
                    phone_number: phoneNumber,
                    banned_at: new Date().toISOString()
                });
            
            if (error) {
                // Check if already banned
                if (error.code === '23505') { // Unique constraint violation
                    showToast('Customer is already banned', 'warning');
                    return;
                }
                throw error;
            }
            
            showToast('✅ Customer banned successfully', 'success');
        } else {
            // Remove from banned_customers table
            const { error } = await window.supabaseClient
                .from('banned_customers')
                .delete()
                .eq('phone_number', phoneNumber);
            
            if (error) throw error;
            
            showToast('✅ Customer unbanned successfully', 'success');
        }
        
        // Reload customers to update UI
        await loadCustomers();
        
    } catch (error) {
        console.error('❌ Toggle ban error:', error);
        showToast(`❌ Failed to ${action} customer: ` + error.message, 'error');
    }
}

// ==================== DELETE FUNCTIONALITY ====================
function openDeleteModal(type, id, name) {
    deleteTarget = { type, id, name };
    document.getElementById('deleteMessage').textContent = 
        `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    deleteTarget = null;
}

async function confirmDelete() {
    if (!deleteTarget) return;
    
    try {
        if (deleteTarget.type === 'product') {
            // Get product info first
            const { data: product } = await window.supabaseClient
                .from('products')
                .select('image_url')
                .eq('id', deleteTarget.id)
                .single();
            
            // Delete product from database
            const { error } = await window.supabaseClient
                .from('products')
                .delete()
                .eq('id', deleteTarget.id);
            
            if (error) throw error;
            
            // Delete image from storage if exists
            if (product && product.image_url) {
                try {
                    const fileName = product.image_url.split('/').pop();
                    await window.supabaseClient.storage
                        .from('product-images')
                        .remove([fileName]);
                } catch (storageError) {
                    console.log('Could not delete image:', storageError);
                }
            }
            
            showToast('✅ Product deleted successfully!', 'success');
            
            // Remove from local array
            allProducts = allProducts.filter(p => p.id !== deleteTarget.id);
            displayProducts(allProducts);
            
            // Update dashboard
            await loadDashboardStats();
        }
        
        closeDeleteModal();
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        showToast('❌ Failed to delete item', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function isToday(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    
    toast.textContent = message;
    toast.className = 'show';
    
    // Remove any existing type classes
    toast.classList.remove('success', 'error', 'warning');
    
    // Add type class
    if (type === 'success') {
        toast.classList.add('success');
        toast.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(52, 211, 153, 0.9))';
        toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (type === 'error') {
        toast.classList.add('error');
        toast.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(248, 113, 113, 0.9))';
        toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
    } else if (type === 'warning') {
        toast.classList.add('warning');
        toast.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(251, 191, 36, 0.9))';
        toast.style.border = '1px solid rgba(245, 158, 11, 0.3)';
    } else {
        toast.style.background = 'rgba(30, 41, 59, 0.95)';
        toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    }
    
    setTimeout(() => {
        toast.className = '';
    }, 4000);
}

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await window.supabaseClient.auth.signOut();
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
}

// ==================== FILTER PRODUCTS ====================
function filterProducts(filter) {
    let filtered = allProducts;
    
    switch(filter) {
        case 'in_stock':
            filtered = allProducts.filter(p => (p.stock || 0) > 0);
            break;
        case 'out_of_stock':
            filtered = allProducts.filter(p => (p.stock || 0) === 0);
            break;
        case 'low_stock':
            filtered = allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
            break;
    }
    
    displayProducts(filtered);
    
    // Update active filter chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    const clickedChip = document.querySelector(`.filter-chip[onclick*="${filter}"]`);
    if (clickedChip) {
        clickedChip.classList.add('active');
    }
}

// ==================== QUICK ACTIONS ====================
function showOutOfStock() {
    showSection('products');
    
    setTimeout(() => {
        const outOfStockProducts = allProducts.filter(p => (p.stock || 0) === 0);
        displayProducts(outOfStockProducts);
        
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        
        const outOfStockChip = document.querySelector('.filter-chip[onclick*="out_of_stock"]');
        if (outOfStockChip) {
            outOfStockChip.classList.add('active');
        }
        
        document.getElementById('productSearch').value = '';
        
        showToast(`Showing ${outOfStockProducts.length} out of stock products`, 'info');
    }, 100);
}

// ==================== EXPORT ORDERS ====================
async function exportOrders() {
    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!orders || orders.length === 0) {
            showToast('No orders to export', 'warning');
            return;
        }
        
        const csvData = convertToCSV(orders);
        downloadCSV(csvData, `orders_export_${Date.now()}.csv`);
        
        showToast(`✅ Exported ${orders.length} orders`, 'success');
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Failed to export orders', 'error');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = [
        'Tracking ID',
        'Customer Name',
        'Phone Number',
        'Product',
        'Quantity',
        'Unit Price',
        'Total',
        'Status',
        'Order Date',
        'Address',
        'Requirements'
    ];
    
    const rows = data.map(order => [
        order.tracking_id,
        order.customer_name,
        order.phone_number,
        order.product_name,
        order.quantity,
        order.price,
        order.total,
        order.status,
        new Date(order.created_at).toLocaleString(),
        order.address || '',
        order.requirements || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => 
            row.map(cell => 
                `"${String(cell).replace(/"/g, '""')}"`
            ).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// ==================== REAL-TIME UPDATES ====================
function setupRealtime() {
    if (!window.supabaseClient) return;
    
    // Subscribe to products changes
    window.supabaseClient
        .channel('products-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' },
            (payload) => {
                console.log('Product change detected:', payload.eventType);
                loadProducts();
                loadDashboardStats();
            }
        )
        .subscribe();
    
    // Subscribe to orders changes with notifications
    window.supabaseClient
        .channel('orders-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' },
            async (payload) => {
                console.log('Order change detected:', payload.eventType);
                
                // Show notification for new orders
                if (payload.eventType === 'INSERT') {
                    const newOrder = payload.new;
                    showOrderNotification(newOrder);
                    playNotificationSound();
                }
                
                // Reload data
                await loadOrders();
                await loadDashboardStats();
            }
        )
        .subscribe();
    
    console.log('✅ Real-time subscriptions active');
}

// ==================== NOTIFICATION FUNCTIONS ====================
let allNotifications = [];

function showOrderNotification(order) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-icon">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <div class="notification-title">
                🎉 New Order Received!
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-body">
            <div class="notification-detail">
                <i class="fas fa-user"></i>
                <strong>${order.customer_name}</strong>
            </div>
            <div class="notification-detail">
                <i class="fas fa-box"></i>
                ${order.product_name} × ${order.quantity}
            </div>
            <div class="notification-detail">
                <i class="fas fa-money-bill-wave"></i>
                Rs. ${order.total.toLocaleString()}
            </div>
            <div class="notification-detail">
                <i class="fas fa-barcode"></i>
                <span class="mono" style="font-size: 0.85rem;">${order.tracking_id}</span>
            </div>
        </div>
        <div class="notification-actions">
            <button class="notification-btn view-btn" onclick="viewOrderFromNotification('${order.tracking_id}'); this.closest('.order-notification').remove();">
                <i class="fas fa-eye"></i> View Order
            </button>
            <button class="notification-btn confirm-btn" onclick="confirmOrderFromNotification('${order.tracking_id}'); this.closest('.order-notification').remove();">
                <i class="fas fa-check"></i> Confirm
            </button>
        </div>
    `;
    
    // Add to notification container
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
    
    // Update notification history
    loadNotificationHistory();
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received! 🛒', {
            body: `${order.customer_name} ordered ${order.product_name}\nTotal: Rs. ${order.total.toLocaleString()}`,
            icon: '🛒',
            badge: '🛒',
            tag: order.tracking_id,
            requireInteraction: false
        });
    }
}

// Toggle notification history panel
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationHistoryPanel');
    const isOpen = panel.classList.contains('open');
    
    if (isOpen) {
        panel.classList.remove('open');
    } else {
        panel.classList.add('open');
        loadNotificationHistory();
    }
}

// Load notification history
async function loadNotificationHistory() {
    try {
        const { data: notifications, error } = await window.supabaseClient
            .from('notification_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        allNotifications = notifications || [];
        displayNotificationHistory(allNotifications);
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

// Display notification history
function displayNotificationHistory(notifications) {
    const container = document.getElementById('notificationPanelBody');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="notification-panel-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    const html = notifications.map(notif => {
        const timeAgo = getTimeAgo(notif.created_at);
        const unreadClass = !notif.is_read ? 'unread' : '';
        
        return `
            <div class="notification-history-item ${unreadClass}" onclick="viewNotificationOrder('${notif.tracking_id}', ${notif.id})">
                <div class="notification-item-header">
                    <div class="notification-item-customer">
                        <i class="fas fa-user-circle"></i> ${notif.customer_name}
                    </div>
                    <div class="notification-item-time">${timeAgo}</div>
                </div>
                <div class="notification-item-details">
                    <i class="fas fa-box"></i> ${notif.product_name} × ${notif.quantity}
                </div>
                <div class="notification-item-footer">
                    <div class="notification-item-tracking">
                        #${notif.tracking_id}
                    </div>
                    <div class="notification-item-total">
                        Rs. ${Number(notif.total).toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Update notification badge count
function updateNotificationBadge() {
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// View order from notification
function viewNotificationOrder(trackingId, notificationId) {
    // Mark as read
    markNotificationAsRead(notificationId);
    
    // Close panel
    toggleNotificationPanel();
    
    // Show order
    viewOrderFromNotification(trackingId);
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await window.supabaseClient
            .from('notification_history')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        // Update local data
        const index = allNotifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            allNotifications[index].is_read = true;
            allNotifications[index].read_at = new Date().toISOString();
        }
        
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
    try {
        const { error } = await window.supabaseClient
            .from('notification_history')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('is_read', false);
        
        if (error) throw error;
        
        // Update local data
        allNotifications.forEach(n => {
            if (!n.is_read) {
                n.is_read = true;
                n.read_at = new Date().toISOString();
            }
        });
        
        displayNotificationHistory(allNotifications);
        updateNotificationBadge();
        showToast('All notifications marked as read', 'success');
        
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        showToast('Failed to update notifications', 'error');
    }
}

// Get time ago string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// Play notification sound
function playNotificationSound() {
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set sound properties
        oscillator.frequency.value = 800; // Frequency in Hz
        oscillator.type = 'sine';
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // Play sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Could not play notification sound:', error);
    }
}

// View order from notification
function viewOrderFromNotification(trackingId) {
    showSection('orders');
    setTimeout(() => {
        const order = allOrders.find(o => o.tracking_id === trackingId);
        if (order) {
            viewOrderDetails(order);
        }
    }, 300);
}

// Confirm order from notification
async function confirmOrderFromNotification(trackingId) {
    try {
        await updateOrderStatus(trackingId, 'Confirmed');
        showToast('✅ Order confirmed!', 'success');
    } catch (error) {
        console.error('Failed to confirm order:', error);
        showToast('❌ Failed to confirm order', 'error');
    }
}

// Request notification permission on load
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                showToast('Notifications enabled! You will be notified of new orders.', 'success');
            } else {
                console.log('❌ Notification permission denied');
            }
        } catch (error) {
            console.error('Notification permission error:', error);
        }
    }
}

// ==================== MOBILE MENU FUNCTIONS ====================
function setupMobileMenu() {
    // Setup mobile menu click handlers
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const text = this.textContent || this.innerText;
            let sectionId = 'dashboard';
            
            if (text.includes('Dashboard')) sectionId = 'dashboard';
            else if (text.includes('Products')) sectionId = 'products';
            else if (text.includes('Orders')) sectionId = 'orders';
            else if (text.includes('Customers')) sectionId = 'customers';
            
            showSection(sectionId);
            closeMobileMenu();
        });
    });
}

function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Toggle body scroll
    document.body.style.overflow = hamburger.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    hamburger.classList.remove('active');
    mobileNav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mobileNav = document.querySelector('.mobile-nav');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (mobileNav && mobileNav.classList.contains('active') && 
        !mobileNav.contains(event.target) && 
        !hamburger.contains(event.target)) {
        closeMobileMenu();
    }
});

// Handle escape key to close mobile menu
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});

console.log('✅ Admin.js loaded successfully');
