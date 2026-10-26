// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Dashboard Page
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
  loadDashboard();
});

async function loadDashboard() {
  try {
    const [stats, bookings, rooms] = await Promise.all([
      apiGetDashboardStats(),
      apiGetOwnerBookings(),
      apiGetUserRooms(getUser().id)
    ]);

    renderStats(stats);
    renderMyRooms(rooms);
    renderBookingRequests(bookings);
  } catch (err) {
    showToast('error', 'Error', 'Failed to load dashboard data.');
    console.error(err);
  }
}

function renderStats(stats) {
  const container = document.getElementById('statsGrid');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon purple"><i class="fas fa-home"></i></div>
      <div class="stat-card-value">${stats.totalRooms}</div>
      <div class="stat-card-label">Total Rooms</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon green"><i class="fas fa-calendar-check"></i></div>
      <div class="stat-card-value">${stats.approvedBookings}</div>
      <div class="stat-card-label">Active Bookings</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon orange"><i class="fas fa-clock"></i></div>
      <div class="stat-card-value">${Array.isArray(stats.pendingBookings) ? stats.pendingBookings.length : stats.pendingBookings}</div>
      <div class="stat-card-label">Pending Requests</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon blue"><i class="fas fa-star"></i></div>
      <div class="stat-card-value">${stats.avgRating}</div>
      <div class="stat-card-label">Avg. Rating</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon green"><i class="fas fa-rupee-sign"></i></div>
      <div class="stat-card-value">${formatPrice(stats.monthlyRevenue)}</div>
      <div class="stat-card-label">Monthly Revenue</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon purple"><i class="fas fa-eye"></i></div>
      <div class="stat-card-value">${stats.totalViews}</div>
      <div class="stat-card-label">Total Views</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon orange"><i class="fas fa-comments"></i></div>
      <div class="stat-card-value">${stats.totalReviews}</div>
      <div class="stat-card-label">Reviews</div>
    </div>
    <div class="stat-card" data-aos="fade-up">
      <div class="stat-card-icon blue"><i class="fas fa-envelope"></i></div>
      <div class="stat-card-value">${stats.unreadMessages}</div>
      <div class="stat-card-label">Unread Messages</div>
    </div>
  `;

  initAOS();
}

function renderMyRooms(rooms) {
  const container = document.getElementById('myRoomsList');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><h3>No Rooms Listed</h3><p>Start listing your properties!</p><a href="add-room.html" class="btn btn-primary">Add Room</a></div>';
    return;
  }

  container.innerHTML = rooms.map(room => `
    <div class="booking-card">
      <div class="booking-card-room">
        <img src="${room.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'}"
             alt="${room.name}"
             onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
        <div class="booking-card-room-info">
          <h4>${room.name}</h4>
          <p>${room.location} · ${room.bhk} BHK · ${room.area} Sq.Ft.</p>
        </div>
      </div>
      <div class="booking-card-meta">
        <span><i class="fas fa-rupee-sign"></i> ${formatPrice(room.price)}/mo</span>
        <span><i class="fas fa-eye"></i> ${room.views || 0} views</span>
        <span><i class="fas fa-star"></i> ${room.avgRating || 0} (${room.reviewCount || 0})</span>
      </div>
      <div class="booking-card-actions">
        <a href="room-details.html?id=${room.id}" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i> View</a>
        <button class="btn btn-danger btn-sm" onclick="dashDeleteRoom('${room.id}')"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  `).join('');
}

function renderBookingRequests(bookings) {
  const container = document.getElementById('bookingRequests');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:20px">No booking requests yet.</p>';
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="booking-card">
      <div class="booking-card-header">
        <h4>${b.roomName}</h4>
        <span class="status-badge status-${b.status}">${b.status}</span>
      </div>
      <div class="booking-card-meta">
        <span><i class="fas fa-user"></i> ${b.tenantName}</span>
        <span><i class="fas fa-envelope"></i> ${b.tenantEmail}</span>
        <span><i class="fas fa-calendar"></i> Move-in: ${formatDate(b.moveInDate) || 'Not specified'}</span>
        <span><i class="fas fa-clock"></i> ${b.duration || 'Not specified'}</span>
      </div>
      ${b.message ? `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;font-style:italic;">"${b.message}"</p>` : ''}
      ${b.status === 'pending' ? `
        <div class="booking-card-actions">
          <button class="btn btn-success btn-sm" onclick="updateBooking('${b.id}', 'approved')"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" onclick="updateBooking('${b.id}', 'rejected')"><i class="fas fa-times"></i> Reject</button>
        </div>
      ` : ''}
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px">${timeAgo(b.createdAt)}</div>
    </div>
  `).join('');
}

async function updateBooking(bookingId, status) {
  try {
    await apiUpdateBookingStatus(bookingId, status);
    showToast('success', 'Updated', `Booking ${status} successfully.`);
    loadDashboard();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

async function dashDeleteRoom(roomId) {
  if (!confirm('Delete this room? This will also remove all bookings and reviews for this room.')) return;
  try {
    await apiDeleteRoom(roomId);
    showToast('success', 'Deleted', 'Room removed successfully.');
    loadDashboard();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}
