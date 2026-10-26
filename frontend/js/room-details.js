// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Room Details Page
// ═══════════════════════════════════════════════════════════════════════════════

let currentRoom = null;
let selectedRating = 0;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  loadRoomDetails();
});

async function loadRoomDetails() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('id');

  if (!roomId) {
    document.getElementById('roomDetails').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>No Room Selected</h3><p>Please select a room from the listings.</p><a href="index.html" class="btn btn-primary">Browse Rooms</a></div>';
    return;
  }

  const container = document.getElementById('roomDetails');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Loading room details...</p></div>';

  try {
    currentRoom = await apiGetRoom(roomId);
    renderRoomDetails(currentRoom);
    loadReviews(roomId);
    checkIfFavorite(roomId);
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Room Not Found</h3><p>This room may have been removed.</p><a href="index.html" class="btn btn-primary">Browse Rooms</a></div>';
  }
}

function renderRoomDetails(room) {
  const container = document.getElementById('roomDetails');
  const images = room.images && room.images.length > 0 ? room.images : [room.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'];
  const user = getUser();
  const isOwner = user && user.id === room.ownerId;

  container.innerHTML = `
    <div class="breadcrumb">
      <a href="index.html">Home</a>
      <i class="fas fa-chevron-right"></i>
      <a href="index.html">Rooms</a>
      <i class="fas fa-chevron-right"></i>
      <span>${room.name}</span>
    </div>

    <div class="room-detail-grid">
      <!-- Gallery -->
      <div class="room-gallery" data-aos="fade-right">
        <div class="gallery-main">
          <img id="galleryMainImg" src="${images[0]}" alt="${room.name}"
               onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
        </div>
        ${images.length > 1 ? `
          <div class="gallery-thumbs">
            ${images.map((img, i) => `
              <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="changeGalleryImage('${img}', this)">
                <img src="${img}" alt="Thumbnail ${i + 1}"
                     onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Info Panel -->
      <div data-aos="fade-left">
        <div class="room-info-panel">
          <div class="flex justify-between items-center mb-2">
            <div>
              <span class="badge badge-bhk">${room.bhk} BHK</span>
              ${room.furnishing ? `<span class="badge badge-furnishing" style="margin-left:6px">${room.furnishing.replace('-', ' ')}</span>` : ''}
            </div>
            <button id="favBtn" class="btn btn-ghost btn-icon" onclick="toggleRoomFav('${room.id}')" title="Save to favorites">
              <i class="far fa-heart" style="font-size:1.3rem"></i>
            </button>
          </div>

          <h1 class="room-info-title">${room.name}</h1>
          <div class="room-info-location"><i class="fas fa-map-marker-alt"></i> ${room.location}</div>

          <div class="room-info-price-row">
            <div class="room-info-price">${formatPrice(room.price)}<small>/month</small></div>
            <div class="room-card-rating">
              <span class="stars">${renderStars(room.avgRating || 0)}</span>
              <span class="rating-text">${room.avgRating || 0} (${room.reviewCount || 0} reviews)</span>
            </div>
          </div>

          <div class="room-info-meta">
            <div class="meta-item">
              <i class="fas fa-bed"></i>
              <span class="meta-value">${room.bhk} BHK</span>
              <span class="meta-label">Bedrooms</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-ruler-combined"></i>
              <span class="meta-value">${room.area}</span>
              <span class="meta-label">Sq. Ft.</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-eye"></i>
              <span class="meta-value">${room.views || 0}</span>
              <span class="meta-label">Views</span>
            </div>
          </div>

          ${room.amenities && room.amenities.length > 0 ? `
            <div class="amenities-section">
              <h4 style="margin-bottom:10px; font-weight:600;">Amenities</h4>
              <div class="amenities-grid">
                ${room.amenities.map(a => `<span class="amenity-tag"><i class="fas fa-check"></i> ${a}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="owner-card">
            <div class="owner-card-avatar">${getInitials(room.ownerName || 'Owner')}</div>
            <div class="owner-card-info">
              <h4>${room.ownerName || 'Property Owner'}</h4>
              <p>Listed on ${formatDate(room.createdAt)}</p>
            </div>
            ${!isOwner && isLoggedIn() ? `
              <button class="btn btn-outline btn-sm" onclick="openMessageOwner()"><i class="fas fa-comment-dots"></i></button>
            ` : ''}
          </div>

          ${!isOwner ? `
            <div class="flex gap-1 mt-2">
              ${room.contact ? `<a href="tel:${room.contact}" class="btn btn-success btn-sm" style="flex:1"><i class="fas fa-phone"></i> Call</a>` : ''}
              ${room.email ? `<a href="mailto:${room.email}" class="btn btn-secondary btn-sm" style="flex:1"><i class="fas fa-envelope"></i> Email</a>` : ''}
            </div>
          ` : `
            <div class="flex gap-1 mt-2">
              <a href="add-room.html?edit=${room.id}" class="btn btn-secondary btn-sm" style="flex:1"><i class="fas fa-edit"></i> Edit</a>
              <button class="btn btn-danger btn-sm" style="flex:1" onclick="deleteThisRoom('${room.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
          `}
        </div>

        <!-- Booking Form -->
        ${!isOwner ? `
          <div class="booking-form-card" data-aos="fade-up">
            <h3><i class="fas fa-calendar-check" style="color:var(--primary-light)"></i> Book This Room</h3>
            ${isLoggedIn() ? `
              <form id="bookingForm" onsubmit="handleBooking(event)">
                <div class="form-row">
                  <div class="form-group">
                    <label>Move-in Date</label>
                    <input type="date" id="moveInDate" required>
                  </div>
                  <div class="form-group">
                    <label>Duration</label>
                    <select id="duration" required>
                      <option value="">Select</option>
                      <option value="1 month">1 Month</option>
                      <option value="3 months">3 Months</option>
                      <option value="6 months">6 Months</option>
                      <option value="1 year">1 Year</option>
                      <option value="2+ years">2+ Years</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Message to Owner (Optional)</label>
                  <textarea id="bookingMessage" rows="3" placeholder="Introduce yourself and mention any requirements..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-paper-plane"></i> Send Booking Request</button>
              </form>
            ` : `
              <p class="text-muted text-center" style="padding:20px">
                <a href="login.html" class="btn btn-primary">Login to Book</a>
              </p>
            `}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Description Section -->
    <div class="detail-section" data-aos="fade-up">
      <h3>About This Property</h3>
      <p>${room.description}</p>
    </div>

    <!-- Reviews Section -->
    <div class="reviews-section" data-aos="fade-up">
      <h3 class="section-title" style="font-size:1.5rem">Reviews & Ratings</h3>
      <div id="reviewsSummary"></div>
      <div id="reviewsList"></div>
      ${isLoggedIn() && !isOwner ? `
        <div class="add-review-form" id="addReviewForm">
          <h3>Write a Review</h3>
          <div class="star-input" id="starInput">
            ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-star="${i}" onclick="selectStar(${i})"></i>`).join('')}
          </div>
          <div class="form-group">
            <textarea id="reviewComment" rows="3" placeholder="Share your experience with this property..."></textarea>
          </div>
          <button class="btn btn-primary" onclick="submitReview()"><i class="fas fa-paper-plane"></i> Submit Review</button>
        </div>
      ` : ''}
    </div>
  `;

  initAOS();
}

function changeGalleryImage(src, thumb) {
  document.getElementById('galleryMainImg').src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

async function checkIfFavorite(roomId) {
  if (!isLoggedIn()) return;
  try {
    const result = await apiCheckFavorite(roomId);
    if (result.isFavorite) {
      const btn = document.getElementById('favBtn');
      if (btn) {
        btn.querySelector('i').className = 'fas fa-heart';
        btn.style.color = 'var(--danger)';
      }
    }
  } catch (e) { /* ignore */ }
}

async function toggleRoomFav(roomId) {
  if (!isLoggedIn()) {
    showToast('warning', 'Login Required', 'Please login to save favorites.');
    return;
  }
  try {
    const result = await apiToggleFavorite(roomId);
    const btn = document.getElementById('favBtn');
    if (result.isFavorite) {
      btn.querySelector('i').className = 'fas fa-heart';
      btn.style.color = 'var(--danger)';
      showToast('success', 'Saved!', 'Added to your favorites.');
    } else {
      btn.querySelector('i').className = 'far fa-heart';
      btn.style.color = '';
      showToast('info', 'Removed', 'Removed from favorites.');
    }
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

// ─── Reviews ────────────────────────────────────────────────────────────────
async function loadReviews(roomId) {
  try {
    const reviews = await apiGetReviews(roomId);
    const summaryEl = document.getElementById('reviewsSummary');
    const listEl = document.getElementById('reviewsList');

    if (reviews.length === 0) {
      summaryEl.innerHTML = '';
      listEl.innerHTML = '<p class="text-muted text-center" style="padding:20px">No reviews yet. Be the first to review!</p>';
      return;
    }

    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

    summaryEl.innerHTML = `
      <div class="reviews-summary">
        <div class="reviews-avg">
          <div class="reviews-avg-number">${avg}</div>
          <div class="reviews-avg-stars">${renderStars(parseFloat(avg))}</div>
          <div class="reviews-avg-count">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    `;

    listEl.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div class="review-user">
            <div class="review-user-avatar">${getInitials(r.userName)}</div>
            <div>
              <div class="review-user-name">${r.userName}</div>
              <div class="review-date">${timeAgo(r.createdAt)}</div>
            </div>
          </div>
          <div class="review-stars">${renderStars(r.rating)}</div>
        </div>
        ${r.comment ? `<p class="review-text">${r.comment}</p>` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading reviews:', err);
  }
}

function selectStar(n) {
  selectedRating = n;
  document.querySelectorAll('#starInput i').forEach((star, idx) => {
    star.className = idx < n ? 'fas fa-star active' : 'far fa-star';
  });
}

async function submitReview() {
  if (selectedRating === 0) {
    showToast('warning', 'Rating Required', 'Please select a star rating.');
    return;
  }

  try {
    const comment = document.getElementById('reviewComment').value.trim();
    await apiAddReview({
      roomId: currentRoom.id,
      rating: selectedRating,
      comment: comment
    });
    showToast('success', 'Review Posted!', 'Thank you for your feedback.');
    loadReviews(currentRoom.id);

    // Reset form
    selectedRating = 0;
    document.querySelectorAll('#starInput i').forEach(s => s.className = 'far fa-star');
    document.getElementById('reviewComment').value = '';
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

// ─── Booking ────────────────────────────────────────────────────────────────
async function handleBooking(e) {
  e.preventDefault();

  try {
    const data = {
      roomId: currentRoom.id,
      moveInDate: document.getElementById('moveInDate').value,
      duration: document.getElementById('duration').value,
      message: document.getElementById('bookingMessage').value.trim()
    };

    await apiCreateBooking(data);
    showToast('success', 'Booking Sent! 🎉', 'Your booking request has been sent to the owner.');
    document.getElementById('bookingForm').reset();
  } catch (err) {
    showToast('error', 'Booking Failed', err.message);
  }
}

// ─── Delete Room ────────────────────────────────────────────────────────────
async function deleteThisRoom(roomId) {
  if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;

  try {
    await apiDeleteRoom(roomId);
    showToast('success', 'Deleted', 'Room has been removed.');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

// ─── Message Owner ──────────────────────────────────────────────────────────
function openMessageOwner() {
  if (!currentRoom) return;
  const msg = prompt(`Send a message to ${currentRoom.ownerName || 'the owner'}:`);
  if (msg && msg.trim()) {
    apiSendMessage({
      receiverId: currentRoom.ownerId,
      content: msg.trim(),
      roomId: currentRoom.id
    }).then(() => {
      showToast('success', 'Message Sent!', 'The owner will receive your message.');
    }).catch(err => {
      showToast('error', 'Error', err.message);
    });
  }
}
