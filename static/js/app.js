let allResults = [];

const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const featuresSection = document.getElementById('featuresSection');
const cardsGrid = document.getElementById('cardsGrid');
const noResults = document.getElementById('noResults');
const resultsTitle = document.getElementById('resultsTitle');
const filterSelect = document.getElementById('filterSelect');

// Enter key support
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

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
    document.getElementById('resultsSubtitle').textContent = `${allResults.length} pharmacies found · Live availability`;

    renderCards(allResults);
  } catch (err) {
    console.error(err);
    cardsGrid.innerHTML = '<p style="color:red;">Error fetching results. Please try again.</p>';
  }
}

function applyFilter() {
  const filter = filterSelect.value;
  if (filter === 'all') {
    renderCards(allResults);
  } else {
    renderCards(allResults.filter(r => r.status === filter));
  }
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
        <div class="skeleton" style="height:38px;width:48px;border-radius:10px;"></div>
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
    const statusDot = { in_stock: '●', low_stock: '◑', out_of_stock: '○' }[item.status];
    const qtyText = item.quantity > 0 ? `${item.quantity} strips available` : 'Currently unavailable';

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
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-primary" onclick="viewDetails(${item.pharmacy_id})">View Details</button>
          <button class="btn-secondary" onclick="getDirections('${escHtml(item.pharmacy_name)}, ${escHtml(item.location)}, Bangalore')">
            🗺 Directions
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function viewDetails(pharmacyId) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  overlay.classList.add('open');
  content.innerHTML = `<div style="text-align:center;padding:40px 0;"><div style="font-size:2rem;">⏳</div><p style="margin-top:8px;color:#64748b;">Loading details...</p></div>`;

  try {
    const res = await fetch(`/api/pharmacy/${pharmacyId}`);
    const data = await res.json();

    const stockRows = data.stock.map(s => {
      const st = s.quantity > 10 ? 'in_stock' : s.quantity > 0 ? 'low_stock' : 'out_of_stock';
      const label = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' }[st];
      return `
        <tr>
          <td>${escHtml(s.medicine)}</td>
          <td>${escHtml(s.category)}</td>
          <td><span class="stock-badge ${st}" style="font-size:0.7rem;">${label}</span></td>
          <td style="text-align:right;">${s.quantity}</td>
        </tr>
      `;
    }).join('');

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ' ' + data.address)}`;

    content.innerHTML = `
      <div class="modal-pharmacy-name">${escHtml(data.name)}</div>
      <div class="modal-address">📍 ${escHtml(data.address)}</div>
      <div class="modal-hours" style="color:${data.hours.includes('Closes') ? '#00b07a' : '#64748b'};">🕐 ${escHtml(data.hours)}</div>
      <div class="modal-hours" style="margin-top:-14px;margin-bottom:20px;">📞 ${escHtml(data.phone)}</div>

      <h4 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:0.9rem;margin-bottom:10px;font-weight:700;">Stock Inventory</h4>
      <table class="modal-stock-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Category</th>
            <th>Status</th>
            <th style="text-align:right;">Qty</th>
          </tr>
        </thead>
        <tbody>${stockRows}</tbody>
      </table>

      <div class="modal-btns">
        <button class="modal-btn-primary" onclick="window.open('${mapsUrl}','_blank')">🗺 Get Directions</button>
        <button class="modal-btn-secondary" onclick="window.open('tel:${escHtml(data.phone)}')">📞 Call Store</button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:red;text-align:center;">Failed to load details.</p>`;
  }
}

function getDirections(place) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  window.open(url, '_blank');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
