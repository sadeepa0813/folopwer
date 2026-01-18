/**
 * ════════════════════════════════════════════════════════════════
 * 3D STORE - COMPLETE ADMIN PANEL
 * Working version with all features
 * ════════════════════════════════════════════════════════════════
 */

// Global state
let currentFilter = 'all';
let deleteTarget = null;
let editTarget = null;
let allOrders = [];
let allProducts = [];
let selectedOrders = new Set();

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Panel Loading...');
    
    // Setup navigation
    setupNavigation();
    
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
            loadOrders()
        ]);
        
        // Setup real-time
        setupRealtime();
        
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
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active from all
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active to clicked
            this.classList.add('active');
            
            // Show section
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load data for section
        if (sectionId === 'dashboard') {
            loadDashboardStats();
        } else if (sectionId === 'products') {
            loadProducts();
        } else if (sectionId === 'orders') {
            loadOrders();
        }
    }
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
        document.getElementById('stockInfo').textContent = `${inStock} in stock, ${lowStock} low, ${outOfStock} out`;
        
        // Load recent orders
        await loadRecentOrders();
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
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
            container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">No orders yet</p>';
            return;
        }
        
        const html = orders.map(order => `
            <tr onclick="viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})" style="cursor: pointer;">
                <td class="mono" style="font-size: 0.85rem;">${order.tracking_id}</td>
                <td>${order.customer_name}</td>
                <td>
                    <a href="tel:${order.phone_number}" class="customer-phone-link" onclick="event.stopPropagation()">
                        ${order.phone_number}
                    </a>
                </td>
                <td class="mono">Rs. ${order.total.toLocaleString()}</td>
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
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                <h3 style="margin-bottom: 10px;">No Products Found</h3>
                <p style="opacity: 0.7; margin-bottom: 20px;">Add your first product to get started</p>
                <button class="btn-3d btn-primary" onclick="showAddProductForm()">
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
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='https://via.placeholder.com/60'">
            </td>
            <td>
                <strong>${product.name}</strong>
                ${(product.stock || 0) <= 5 && (product.stock || 0) > 0 ? 
                    '<br><small style="color: var(--warning); font-size: 0.8rem;">⚠️ Low stock</small>' : ''}
            </td>
            <td class="mono">Rs. ${(product.price || 0).toLocaleString()}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="number" 
                           class="stock-input" 
                           value="${product.stock || 0}" 
                           min="0"
                           onchange="updateStock(${product.id}, this.value)"
                           style="${(product.stock || 0) === 0 ? 'border-color: var(--danger);' : ''}">
                    <span class="stock-badge ${getStockClass(product.stock || 0)}">
                        ${getStockText(product.stock || 0)}
                    </span>
                </div>
            </td>
            <td style="max-width: 200px; font-size: 0.9rem; opacity: 0.8;">
                ${product.description || 'No description'}
            </td>
            <td>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
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
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Description</th>
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
        console.log(`📦 Updating stock for product ${productId} to ${stock}`);
        
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
        // Basic validation
        const maxSize = 5 * 1024 * 1024; // 5MB
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
                <img src="${e.target.result}" 
                     alt="Preview" 
                     style="max-width: 100%; max-height: 200px; border-radius: 10px;">
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
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    try {
        // Get form data
        const productData = {
            name: form.name.value.trim(),
            price: parseFloat(form.price.value),
            stock: parseInt(form.stock.value) || 0,
            description: form.description.value.trim()
        };
        
        // Basic validation
        if (!productData.name || productData.name.length < 2) {
            throw new Error('Product name is required (min 2 characters)');
        }
        
        if (!productData.price || productData.price <= 0) {
            throw new Error('Price must be greater than 0');
        }
        
        if (productData.stock < 0) {
            throw new Error('Stock cannot be negative');
        }
        
        // Get image file
        const imageFile = document.getElementById('productImage').files[0];
        if (!imageFile) {
            throw new Error('Please select a product image');
        }
        
        console.log('📤 Starting product upload...');
        
        // 1. Upload image to storage
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `product_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('product-images')
            .upload(fileName, imageFile);
        
        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload image: ' + uploadError.message);
        }
        
        console.log('✅ Image uploaded:', fileName);
        
        // 2. Get public URL
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);
        
        console.log('✅ Image URL:', publicUrl);
        
        // 3. Insert product into database
        console.log('📝 Creating product record...');
        
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
        
        if (error) {
            console.error('Database error:', error);
            
            // Try to delete uploaded image if product creation fails
            try {
                await window.supabaseClient.storage
                    .from('product-images')
                    .remove([fileName]);
            } catch (deleteError) {
                console.log('Could not delete uploaded image:', deleteError);
            }
            
            throw new Error('Failed to save product: ' + error.message);
        }
        
        console.log('✅ Product created successfully:', data);
        showToast('✅ Product added successfully!', 'success');
        
        // Reset form
        hideAddProductForm();
        
        // Reload products
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
        <h3 style="margin-bottom: 20px;">Edit Product</h3>
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
                <button type="submit" class="btn-3d btn-primary" style="flex: 1;">
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
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
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
                console.log('Could not delete old image');
            }
        }
        
        showToast('✅ Product updated successfully!', 'success');
        closeEditProductModal();
        
        // Reload products
        await loadProducts();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Edit product error:', error);
        showToast('❌ Failed to update product', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Product';
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
    } else if (currentFilter !== 'all') {
        filteredOrders = orders.filter(o => o.status === currentFilter);
    }
    
    const container = document.getElementById('ordersTableContainer');
    
    if (!filteredOrders || filteredOrders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                <h3 style="margin-bottom: 10px;">No Orders Found</h3>
                <p style="opacity: 0.7;">${currentFilter === 'today' ? 'No orders today' : 'No orders to display'}</p>
            </div>
        `;
        return;
    }
    
    const html = filteredOrders.map(order => `
        <tr>
            <td class="mono" style="font-size: 0.85rem;">${order.tracking_id}</td>
            <td><strong>${order.customer_name}</strong></td>
            <td>
                <a href="tel:${order.phone_number}" class="customer-phone-link">
                    ${order.phone_number}
                </a>
            </td>
            <td>${order.product_name}</td>
            <td class="mono">${order.quantity}</td>
            <td class="mono"><strong style="color: var(--success);">Rs. ${order.total.toLocaleString()}</strong></td>
            <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
            <td style="font-size: 0.85rem; opacity: 0.7;">
                ${new Date(order.created_at).toLocaleDateString()}
                ${isToday(order.created_at) ? '<span class="today-badge">Today</span>' : ''}
            </td>
            <td>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="order-action-btn view-btn" 
                            onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})' 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'Pending' ? `
                        <button class="order-action-btn confirm-btn" 
                                onclick="updateOrderStatus('${order.tracking_id}', 'Confirmed')"
                                title="Confirm Order">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${order.status !== 'Cancelled' ? `
                        <button class="order-action-btn cancel-btn" 
                                onclick="updateOrderStatus('${order.tracking_id}', 'Cancelled')"
                                title="Cancel Order">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
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
                        <th>Product</th>
                        <th>Qty</th>
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
}

function filterOrders(status) {
    currentFilter = status;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedBtn = event.target.closest('.filter-btn');
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
        console.log(`🔄 Updating order ${trackingId} to ${newStatus}`);
        
        const { data, error } = await window.supabaseClient
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('tracking_id', trackingId);
        
        if (error) {
            console.error('Update error:', error);
            throw error;
        }
        
        console.log('✅ Order updated successfully');
        showToast(`✅ Order ${newStatus.toLowerCase()}!`, 'success');
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.tracking_id === trackingId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
            allOrders[orderIndex].updated_at = new Date().toISOString();
        }
        
        // Refresh display
        displayOrders(allOrders);
        await loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Order update error:', error);
        showToast('❌ Failed to update order', 'error');
    }
}

function viewOrderDetails(order) {
    const modal = document.getElementById('orderDetailsModal');
    const modalBody = document.getElementById('orderDetailsModalBody');
    
    modalBody.innerHTML = `
        <h3 style="margin-bottom: 20px; color: var(--primary);">Order Details</h3>
        
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Tracking ID</p>
                    <p class="mono" style="font-weight: 600; color: var(--accent);">${order.tracking_id}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Status</p>
                    <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Customer Name</p>
                    <p style="font-weight: 600;">${order.customer_name}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Phone Number</p>
                    <p class="mono" style="font-weight: 600;">
                        <a href="tel:${order.phone_number}" style="color: var(--accent); text-decoration: none;">
                            ${order.phone_number}
                        </a>
                    </p>
                </div>
            </div>
            
            ${order.address ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Delivery Address</p>
                    <p>${order.address}</p>
                </div>
            ` : ''}
        </div>
        
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: var(--primary);">Product Information</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Product</p>
                    <p style="font-weight: 600;">${order.product_name}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Quantity</p>
                    <p class="mono" style="font-weight: 600;">${order.quantity}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Unit Price</p>
                    <p class="mono" style="font-weight: 600;">Rs. ${order.price.toLocaleString()}</p>
                </div>
                <div>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Total Amount</p>
                    <p class="mono" style="font-weight: 700; font-size: 1.2rem; color: var(--success);">
                        Rs. ${order.total.toLocaleString()}
                    </p>
                </div>
            </div>
            
            ${order.requirements ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-bottom: 5px;">Special Requirements</p>
                    <p>${order.requirements}</p>
                </div>
            ` : ''}
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
            <p style="opacity: 0.7; font-size: 0.85rem;">
                Order placed: ${new Date(order.created_at).toLocaleString()}
            </p>
        </div>
        
        <div style="display: flex; gap: 10px;">
            ${order.status === 'Pending' ? `
                <button class="btn-3d btn-success" onclick="updateOrderStatus('${order.tracking_id}', 'Confirmed')" style="flex: 1;">
                    <i class="fas fa-check"></i> Confirm Order
                </button>
            ` : ''}
            ${order.status !== 'Cancelled' ? `
                <button class="btn-3d btn-danger" onclick="updateOrderStatus('${order.tracking_id}', 'Cancelled')" style="flex: 1;">
                    <i class="fas fa-times"></i> Cancel Order
                </button>
            ` : ''}
            <button class="btn-3d btn-secondary" onclick="closeOrderDetailsModal()" style="flex: 1;">
                Close
            </button>
        </div>
    `;
    
    modal.classList.add('open');
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.remove('open');
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
    
    if (type === 'success') {
        toast.classList.add('success');
    } else if (type === 'error') {
        toast.classList.add('error');
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
    
    // Subscribe to orders changes
    window.supabaseClient
        .channel('orders-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('Order change detected:', payload.eventType);
                loadOrders();
                loadDashboardStats();
            }
        )
        .subscribe();
}
// ==================== EXPORT FUNCTIONALITY ====================
async function exportOrders() {
    try {
        console.log('📤 Exporting orders...');
        
        // Get all orders
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!orders || orders.length === 0) {
            showToast('No orders to export', 'warning');
            return;
        }
        
        // Convert to CSV
        const csvData = convertToCSV(orders);
        
        // Create download link
        downloadCSV(csvData, `orders_export_${Date.now()}.csv`);
        
        showToast(`✅ Exported ${orders.length} orders`, 'success');
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Failed to export orders', 'error');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Define headers
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
    
    // Convert data to rows
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
    
    // Combine headers and rows
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
    // Create blob
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
}

// ==================== QUICK ACTION FUNCTIONS ====================
function showOutOfStock() {
    showSection('products');
    
    // Filter to show out of stock products
    setTimeout(() => {
        const outOfStockProducts = allProducts.filter(p => (p.stock || 0) === 0);
        displayProducts(outOfStockProducts);
        
        // Update search box
        document.getElementById('productSearch').value = '';
        
        showToast(`Showing ${outOfStockProducts.length} out of stock products`, 'info');
    }, 100);
}

// ==================== FILTER PRODUCTS BY STOCK ====================
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
    
    // Find and activate the clicked filter
    const clickedChip = document.querySelector(`.filter-chip[onclick*="${filter}"]`);
    if (clickedChip) {
        clickedChip.classList.add('active');
    }
}
console.log('✅ Admin.js loaded successfully');
