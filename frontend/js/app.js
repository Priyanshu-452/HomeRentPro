// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Main App Logic (index.html)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Navbar Scroll Effect & Theme Toggle ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  initAOS();
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem('homerent_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('homerent_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.nav-menu');
  const overlay = document.querySelector('.mobile-overlay');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

function updateNavAuth() {
  const authContainer = document.getElementById('navAuth');
  if (!authContainer) return;

  const user = getUser();
  if (user) {
    authContainer.innerHTML = `
      <div class="nav-dropdown">
        <div class="nav-user" onclick="toggleDropdown()">
          <div class="nav-user-avatar">${getInitials(user.name)}</div>
          <span class="nav-user-name">${user.name.split(' ')[0]}</span>
          <i class="fas fa-chevron-down" style="font-size:0.7rem;color:var(--text-muted)"></i>
        </div>
        <div class="nav-dropdown-menu" id="userDropdown">
          ${user.role === 'owner' ? '<a href="dashboard.html"><i class="fas fa-chart-line"></i> Dashboard</a>' : ''}
          <a href="profile.html"><i class="fas fa-user"></i> My Profile</a>
          <a href="bookings.html"><i class="fas fa-calendar-check"></i> My Bookings</a>
          <a href="favorites.html"><i class="fas fa-heart"></i> Favorites</a>
          <a href="messages.html"><i class="fas fa-envelope"></i> Messages</a>
          <a href="#" onclick="handleLogout(); return false;"><i class="fas fa-sign-out-alt"></i> Logout</a>
        </div>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm">Sign In</a>
      <a href="register.html" class="btn btn-primary btn-sm">Get Started</a>
    `;
  }
}

function toggleDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-dropdown')) {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('show');
  }
});

async function handleLogout() {
  await apiLogout();
  showToast('success', 'Logged Out', 'See you again soon!');
  setTimeout(() => window.location.href = 'index.html', 500);
}

// ─── Simple AOS (Animate On Scroll) ────────────────────────────────────────
// Persistent observer that works with dynamically-added elements
let _aosObserver = null;

function initAOS() {
  if (!_aosObserver) {
    _aosObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
        }
      });
    }, { threshold: 0.1 });
  }

  // Observe all [data-aos] elements that haven't been observed yet
  const elements = document.querySelectorAll('[data-aos]:not(.aos-observed)');
  elements.forEach(el => {
    el.classList.add('aos-observed');
    _aosObserver.observe(el);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOME PAGE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

let currentPage = 1;
let totalPages = 1;
let currentSort = 'newest';

async function loadFeaturedRooms() {
  const container = document.getElementById('featuredRooms');
  if (!container) return;

  container.innerHTML = renderSkeletons(3);

  try {
    const rooms = await apiGetFeaturedRooms();
    if (!rooms || rooms.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:40px">No featured rooms yet.</p>';
      return;
    }
    container.innerHTML = rooms.map(room => createRoomCardHTML(room)).join('');
    initAOS(); // Re-observe newly added room cards
  } catch (err) {
    container.innerHTML = '<p class="text-danger text-center" style="padding:40px">Failed to load featured rooms.</p>';
  }
}

async function loadRooms(page = 1) {
  const container = document.getElementById('roomsList');
  const noRooms = document.getElementById('noRooms');
  const paginationEl = document.getElementById('pagination');
  const resultsCount = document.getElementById('resultsCount');

  if (!container) return;

  // Always reset display so the container is visible for skeletons
  container.style.display = '';
  container.innerHTML = renderSkeletons(6);
  if (noRooms) noRooms.classList.add('hidden');

  try {
    const filters = getFilterValues();
    filters.sort = currentSort;
    filters.page = page;
    filters.per_page = 12;

    const result = await apiSearchRooms(filters);
    const rooms = result.rooms || result;
    totalPages = result.total_pages || 1;
    currentPage = result.page || 1;

    if (resultsCount) {
      resultsCount.innerHTML = `Showing <strong>${rooms.length}</strong> of <strong>${result.total || rooms.length}</strong> properties`;
    }

    if (!rooms || rooms.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      if (noRooms) noRooms.classList.remove('hidden');
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    container.style.display = '';
    container.innerHTML = rooms.map(room => createRoomCardHTML(room)).join('');
    initAOS(); // Re-observe newly added room cards

    if (paginationEl) {
      renderPagination(paginationEl, currentPage, totalPages);
    }
  } catch (err) {
    container.style.display = '';
    container.innerHTML = '<p class="text-danger text-center" style="padding:40px">Failed to load rooms. Is the backend running?</p>';
    console.error(err);
  }
}

function getFilterValues() {
  const filters = {};
  const loc = document.getElementById('filterLocation');
  const minP = document.getElementById('filterMinPrice');
  const maxP = document.getElementById('filterMaxPrice');
  const bhk = document.getElementById('filterBhk');
  const furn = document.getElementById('filterFurnishing');

  if (loc && loc.value) filters.location = loc.value;
  if (minP && minP.value) filters.min_price = minP.value;
  if (maxP && maxP.value) filters.max_price = maxP.value;
  if (bhk && bhk.value) filters.bhk = bhk.value;
  if (furn && furn.value) filters.furnishing = furn.value;

  return filters;
}

function applyFilters() {
  currentPage = 1;
  loadRooms(1);
}

function resetFilters() {
  ['filterLocation', 'filterMinPrice', 'filterMaxPrice', 'filterBhk', 'filterFurnishing'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  currentSort = 'newest';
  const sortEl = document.getElementById('sortSelect');
  if (sortEl) sortEl.value = 'newest';
  loadRooms(1);
}

function changeSort(value) {
  currentSort = value;
  loadRooms(1);
}

function goToPage(page) {
  if (page < 1 || page > totalPages) return;
  loadRooms(page);
  window.scrollTo({ top: document.querySelector('.rooms-section')?.offsetTop - 100, behavior: 'smooth' });
}

// ─── Room Card HTML ─────────────────────────────────────────────────────────
function createRoomCardHTML(room) {
  const stars = renderStars(room.avgRating || 0);
  const furnishLabel = room.furnishing ? room.furnishing.replace('-', ' ') : '';

  return `
    <div class="room-card room-card-animated">
      <div class="room-card-image">
        <img src="${room.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'}"
             alt="${room.name}"
             onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
        <div class="room-card-badges">
          <div>
            <span class="badge badge-bhk">${room.bhk} BHK</span>
            ${room.featured ? '<span class="badge badge-featured" style="margin-left:6px">★ Featured</span>' : ''}
          </div>
        </div>
        <button class="room-card-fav" onclick="toggleFav('${room.id}', this); event.stopPropagation();" title="Save to favorites">
          <i class="far fa-heart"></i>
        </button>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${room.name}</h3>
        <div class="room-card-location"><i class="fas fa-map-marker-alt"></i> ${room.location}</div>
        <div class="room-card-area"><i class="fas fa-ruler-combined"></i> ${room.area} Sq. Ft. ${furnishLabel ? '&nbsp;·&nbsp; <i class="fas fa-couch"></i> ' + furnishLabel : ''}</div>
        <p class="room-card-desc">${truncate(room.description, 90)}</p>
        <div class="room-card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-text">${room.avgRating || 0} (${room.reviewCount || 0})</span>
        </div>
        <div class="room-card-footer">
          <div class="room-card-price">${formatPrice(room.price)}<small>/mo</small></div>
          <a href="room-details.html?id=${room.id}" class="btn btn-primary btn-sm">View Details</a>
        </div>
      </div>
    </div>
  `;
}

// ─── Toggle Favorite ────────────────────────────────────────────────────────
async function toggleFav(roomId, btn) {
  if (!isLoggedIn()) {
    showToast('warning', 'Login Required', 'Please login to save favorites.');
    return;
  }

  try {
    const result = await apiToggleFavorite(roomId);
    const icon = btn.querySelector('i');
    if (result.isFavorite) {
      icon.className = 'fas fa-heart';
      btn.classList.add('active');
      showToast('success', 'Saved!', 'Added to your favorites.');
    } else {
      icon.className = 'far fa-heart';
      btn.classList.remove('active');
      showToast('info', 'Removed', 'Removed from favorites.');
    }
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

// ─── Pagination ─────────────────────────────────────────────────────────────
function renderPagination(container, current, total) {
  if (total <= 1) { container.innerHTML = ''; return; }

  let html = '';
  html += `<button ${current === 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})"><i class="fas fa-chevron-left"></i></button>`;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      html += `<button class="${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `<button ${current === total ? 'disabled' : ''} onclick="goToPage(${current + 1})"><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────
function renderSkeletons(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
    `;
  }
  return html;
}
