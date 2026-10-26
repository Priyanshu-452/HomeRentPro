// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Favorites Page
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  loadFavorites();
});

async function loadFavorites() {
  const container = document.getElementById('favoritesList');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Loading favorites...</p></div>';

  try {
    const rooms = await apiGetFavorites();

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-heart"></i>
          <h3>No Favorites Yet</h3>
          <p>Save rooms you like to find them easily later.</p>
          <a href="index.html" class="btn btn-primary"><i class="fas fa-search"></i> Browse Rooms</a>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="rooms-grid">${rooms.map(room => createFavCardHTML(room)).join('')}</div>`;
    initAOS();
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>' + err.message + '</p></div>';
  }
}

function createFavCardHTML(room) {
  return `
    <div class="room-card room-card-animated">
      <div class="room-card-image">
        <img src="${room.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'}"
             alt="${room.name}" onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
        <div class="room-card-badges">
          <span class="badge badge-bhk">${room.bhk} BHK</span>
        </div>
        <button class="room-card-fav active" onclick="removeFav('${room.id}', this)" title="Remove from favorites">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${room.name}</h3>
        <div class="room-card-location"><i class="fas fa-map-marker-alt"></i> ${room.location}</div>
        <div class="room-card-area"><i class="fas fa-ruler-combined"></i> ${room.area} Sq. Ft.</div>
        <div class="room-card-rating">
          <span class="stars">${renderStars(room.avgRating || 0)}</span>
          <span class="rating-text">${room.avgRating || 0} (${room.reviewCount || 0})</span>
        </div>
        <div class="room-card-footer">
          <div class="room-card-price">${formatPrice(room.price)}<small>/mo</small></div>
          <a href="room-details.html?id=${room.id}" class="btn btn-primary btn-sm">View</a>
        </div>
      </div>
    </div>
  `;
}

async function removeFav(roomId, btn) {
  try {
    await apiToggleFavorite(roomId);
    showToast('info', 'Removed', 'Removed from favorites.');
    const card = btn.closest('.room-card');
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
    setTimeout(() => {
      card.remove();
      // Check if empty
      const grid = document.querySelector('.rooms-grid');
      if (grid && grid.children.length === 0) {
        loadFavorites();
      }
    }, 300);
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}
