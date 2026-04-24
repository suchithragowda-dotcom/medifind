// ─── STATE ───────────────────────────────────────────────
let allResults = [];
let cart = { pharmacyId: null, pharmacyName: null, items: [] };

// ─── DOM REFS ─────────────────────────────────────────────
const searchInput     = document.getElementById('searchInput');
const resultsSection  = document.getElementById('resultsSection');
const featuresSection = document.getElementById('featuresSection');
const cardsGrid       = document.getElementById('cardsGrid');
const noResults       = document.getElementById('noResults');
const resultsTitle    = document.getElementById('resultsTitle');
const filterSelect    = document.getElementById('filterSelect');

// Enter key support
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

function quickSearch(name) {
  searchInput.value = name;
  doSearch();
}

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  resultsSection.style.display = 'block';
  featuresSection.style.display = 'none';
  filterSelect.value = 'all';
  showLoading();
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    allResults = await res.json();
    resultsTitle.textContent = `Results for "${query}"`;
    document.getElementById('resultsSubtitle').textContent =
      `${allResults.length} pharmacies found · Live availability`;
    renderCards(allResults);
  } catch (err) {
    cardsGrid.innerHTML = '<p style="color:red;">Error fetching results. Please try again.</p>';
  }
}

function applyFilter() {
  const filter = filterSelect.value;
  renderCards(filter === 'all' ? allResults : allResults.filter(r => r.status === filter));
}

function showLoading() {
  cardsGrid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <div class="skeleton" style="width:44px;height:44px;border-radius:12px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton" style="height:14px;width:70%;margin-bottom:8px;"></div>
          <div class="skeleton" style="height:11px;width:50%;"></div>
        </div>
      </div>
      <div class="skeleton" style="height:1px;margin:14px 0;"></div>
      <div class="skeleton" style="height:12px;width:80%;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:12px;width:60%;margin-bottom:18px;"></div>
      <div style="display:flex;gap:10px;">
        <div class="skeleton" style="height:38px;flex:1;border-radius:10px;"></div>
        <div class="skeleton" style="height:38px;width:80px;border-radius:10px;"></div>
      </div>
    </div>
  `).join('');
  noResults.style.display = 'none';
}

function renderCards(data) {
  if (data.length === 0) {
    cardsGrid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  cardsGrid.innerHTML = data.map((item, i) => {
    const statusLabel = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' }[item.status];
    const statusDot   = { in_stock: '●', low_stock: '◑', out_of_stock: '○' }[item.status];
    const qtyText     = item.quantity > 0 ? `${item.quantity} strips available` : 'Currently unavailable';
    const canOrder    = item.quantity > 0;

    return `
      <div class="pharmacy-card" style="animation-delay: ${i * 0.05}s">
        <div class="card-header">
          <div class="pharmacy-icon">🏥</div>
          <div class="pharmacy-info">
            <div class="pharmacy-name">${escHtml(item.pharmacy_name)}</div>
            <div class="pharmacy-location">📍 ${escHtml(item.location)}</div>
          </div>
          <div class="stock-badge ${item.status}">${statusDot} ${statusLabel}</div>
        </div>
        <div class="card-divider"></div>
        <div class="medicine-row">
          <div>
            <div class="medicine-name">💊 ${escHtml(item.medicine_name)}</div>
            <div class="medicine-qty" style="margin-top:4px;">${qtyText}</div>
            ${item.price ? `<div style="font-size:0.82rem;color:var(--primary);font-weight:600;margin-top:2px;">₹${item.price.toFixed(2)} / strip</div>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-primary" onclick="viewDetails(${item.pharmacy_id})">View Details</button>
          ${canOrder
            ? `<button class="btn-order" onclick='addToCart(${JSON.stringify(item)})'>🛒 Order</button>`
            : `<button class="btn-secondary" disabled style="opacity:0.4;cursor:not-allowed;">🛒 Order</button>`
          }
          <button class="btn-secondary btn-dir" onclick="getDirections('${escHtml(item.pharmacy_name)}, ${escHtml(item.location)}, Bangalore')">🗺</button>
        </div>
      </div>`;
  }).join('');
}

// ─── PHARMACY DETAIL MODAL ────────────────────────────────
async function viewDetails(pharmacyId) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  overlay.classList.add('open');
  content.innerHTML = `<div style="text-align:center;padding:40px 0;"><div style="font-size:2rem;">⏳</div><p style="margin-top:8px;color:#64748b;">Loading details...</p></div>`;

  try {
    const res  = await fetch(`/api/pharmacy/${pharmacyId}`);
    const data = await res.json();

    const stockRows = data.stock.map(s => {
      const st    = s.quantity > 10 ? 'in_stock' : s.quantity > 0 ? 'low_stock' : 'out_of_stock';
      const label = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' }[st];
      return `<tr>
        <td>${escHtml(s.medicine)}</td>
        <td>${escHtml(s.category)}</td>
        <td><span class="stock-badge ${st}" style="font-size:0.7rem;">${label}</span></td>
        <td style="text-align:right;">₹${(s.price||0).toFixed(2)}</td>
        <td style="text-align:right;">${s.quantity}</td>
      </tr>`;
    }).join('');

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ' ' + data.address)}`;

    content.innerHTML = `
      <div class="modal-pharmacy-name">${escHtml(data.name)}</div>
      <div class="modal-address">📍 ${escHtml(data.address)}</div>
      <div class="modal-hours" style="color:#00b07a;">🕐 ${escHtml(data.hours)}</div>
      <div class="modal-hours" style="margin-top:-14px;margin-bottom:20px;">📞 ${escHtml(data.phone)}</div>
      <h4 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:0.9rem;margin-bottom:10px;font-weight:700;">Stock Inventory</h4>
      <table class="modal-stock-table">
        <thead><tr><th>Medicine</th><th>Category</th><th>Status</th><th style="text-align:right;">Price</th><th style="text-align:right;">Qty</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
      <div class="modal-btns">
        <button class="modal-btn-primary" onclick="window.open('${mapsUrl}','_blank')">🗺 Get Directions</button>
        <button class="modal-btn-secondary" onclick="window.open('tel:${escHtml(data.phone)}')">📞 Call Store</button>
      </div>`;
  } catch {
    content.innerHTML = `<p style="color:red;text-align:center;">Failed to load details.</p>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function getDirections(place) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`, '_blank');
}

// ─── CART ─────────────────────────────────────────────────
function addToCart(item) {
  // If cart has items from a different pharmacy, warn
  if (cart.pharmacyId && cart.pharmacyId !== item.pharmacy_id) {
    if (!confirm(`Your cart has items from ${cart.pharmacyName}. Starting a new cart will remove them. Continue?`)) return;
    cart = { pharmacyId: null, pharmacyName: null, items: [] };
  }

  cart.pharmacyId   = item.pharmacy_id;
  cart.pharmacyName = item.pharmacy_name;

  const existing = cart.items.find(i => i.medicine_id === item.medicine_id);
  if (existing) {
    if (existing.quantity < item.quantity) {
      existing.quantity++;
    } else {
      alert('Max available quantity reached.');
      return;
    }
  } else {
    cart.items.push({
      medicine_id:   item.medicine_id,
      medicine_name: item.medicine_name,
      price:         item.price,
      quantity:      1,
      max_qty:       item.quantity
    });
  }

  updateCartBadge();
  openCart();
}

function updateCartBadge() {
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function openCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

function renderCartDrawer() {
  const pharmEl  = document.getElementById('cartPharmacy');
  const itemsEl  = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (cart.items.length === 0) {
    pharmEl.innerHTML  = '';
    itemsEl.innerHTML  = '<div style="text-align:center;padding:48px 24px;color:var(--text-muted);">🛒<br><br>Your cart is empty.<br>Search medicines to add them.</div>';
    footerEl.innerHTML = '';
    return;
  }

  pharmEl.innerHTML = `<div class="cart-pharmacy-name">🏥 ${escHtml(cart.pharmacyName)}</div>`;

  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

  itemsEl.innerHTML = cart.items.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">💊 ${escHtml(item.medicine_name)}</div>
        <div class="cart-item-price">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
      </div>
      <div class="cart-item-subtotal">₹${(item.price * item.quantity).toFixed(2)}</div>
      <button class="cart-remove" onclick="removeFromCart(${idx})">✕</button>
    </div>`).join('');

  footerEl.innerHTML = `
    <div class="cart-total">
      <span>Total</span>
      <span style="font-weight:800;font-size:1.1rem;">₹${total.toFixed(2)}</span>
    </div>
    <button class="btn-primary" style="width:100%;padding:14px;font-size:1rem;" onclick="openCheckout()">Proceed to Checkout →</button>`;
}

function changeQty(idx, delta) {
  const item = cart.items[idx];
  const newQty = item.quantity + delta;
  if (newQty < 1) { removeFromCart(idx); return; }
  if (newQty > item.max_qty) { alert('Max available stock reached.'); return; }
  item.quantity = newQty;
  renderCartDrawer();
  updateCartBadge();
}

function removeFromCart(idx) {
  cart.items.splice(idx, 1);
  if (cart.items.length === 0) cart = { pharmacyId: null, pharmacyName: null, items: [] };
  renderCartDrawer();
  updateCartBadge();
}

// ─── CHECKOUT ─────────────────────────────────────────────
function openCheckout() {
  closeCart();
  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemsSummary = cart.items.map(i =>
    `<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:6px 0;border-bottom:1px solid var(--border);">
      <span>💊 ${escHtml(i.medicine_name)} × ${i.quantity}</span>
      <span style="font-weight:600;">₹${(i.price*i.quantity).toFixed(2)}</span>
    </div>`).join('');

  document.getElementById('checkoutContent').innerHTML = `
    <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.3rem;font-weight:800;margin-bottom:4px;">Checkout</h2>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">🏥 ${escHtml(cart.pharmacyName)}</p>

    <div style="margin-bottom:20px;">${itemsSummary}
      <div style="display:flex;justify-content:space-between;font-size:0.95rem;padding:10px 0;font-weight:700;">
        <span>Total</span><span>₹${total.toFixed(2)}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;">
      <input id="coName" placeholder="Your name *" required
        style="padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.9rem;outline:none;">
      <input id="coPhone" placeholder="Phone number"
        style="padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.9rem;outline:none;">
      <input id="coAddr" placeholder="Delivery address (optional)"
        style="padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.9rem;outline:none;">
    </div>

    <div id="checkoutError" style="color:var(--danger);font-size:0.85rem;margin-top:10px;display:none;"></div>

    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="modal-btn-secondary" onclick="closeCheckout()" style="flex:1;">Back</button>
      <button class="modal-btn-primary" onclick="placeOrder()" style="flex:1;" id="placeBtn">Confirm Order</button>
    </div>`;

  document.getElementById('checkoutOverlay').classList.add('open');
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
}

async function placeOrder() {
  const name  = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const addr  = document.getElementById('coAddr').value.trim();
  const errEl = document.getElementById('checkoutError');

  if (!name) {
    errEl.textContent = 'Please enter your name.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const btn = document.getElementById('placeBtn');
  btn.disabled = true;
  btn.textContent = 'Placing...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name:    name,
        customer_phone:   phone,
        customer_address: addr,
        pharmacy_id:      cart.pharmacyId,
        items: cart.items.map(i => ({
          medicine_id:   i.medicine_id,
          medicine_name: i.medicine_name,
          quantity:      i.quantity,
          price:         i.price
        }))
      })
    });
    const data = await res.json();

    if (data.success) {
      cart = { pharmacyId: null, pharmacyName: null, items: [] };
      updateCartBadge();
      closeCheckout();
      showOrderSuccess(data.order_id, data.total);
    } else {
      errEl.textContent = data.error || 'Order failed. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Confirm Order';
    }
  } catch {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Confirm Order';
  }
}

function showOrderSuccess(orderId, total) {
  document.getElementById('checkoutContent').innerHTML = `
    <div style="text-align:center;padding:30px 0;">
      <div style="font-size:3.5rem;margin-bottom:16px;">🎉</div>
      <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:1.4rem;font-weight:800;margin-bottom:8px;">Order Confirmed!</h2>
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:6px;">Order #${orderId} has been placed.</p>
      <p style="font-weight:700;font-size:1.1rem;margin-bottom:24px;">Total: ₹${total.toFixed(2)}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="modal-btn-primary" onclick="window.location.href='/orders'" style="min-width:140px;">View Orders</button>
        <button class="modal-btn-secondary" onclick="closeCheckout()" style="min-width:120px;">Continue</button>
      </div>
    </div>`;
  document.getElementById('checkoutOverlay').classList.add('open');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
