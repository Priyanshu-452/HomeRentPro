// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Bookings Page
// ═══════════════════════════════════════════════════════════════════════════════

let allBookings = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  loadBookings();
});

async function loadBookings() {
  const container = document.getElementById('bookingsList');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Loading bookings...</p></div>';

  try {
    const user = getUser();
    allBookings = user.role === 'owner'
      ? await apiGetOwnerBookings()
      : await apiGetTenantBookings();

    filterBookings(activeFilter);
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Bookings</h3><p>' + err.message + '</p></div>';
  }
}

function filterBookings(status) {
  activeFilter = status;
  document.querySelectorAll('.tab-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === status);
  });

  const filtered = status === 'all' ? allBookings : allBookings.filter(b => b.status === status);
  renderBookings(filtered);
}

function renderBookings(bookings) {
  const container = document.getElementById('bookingsList');
  const user = getUser();
  const isOwner = user.role === 'owner';

  if (bookings.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No Bookings Found</h3><p>No bookings match the selected filter.</p></div>';
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="booking-card">
      <div class="booking-card-header">
        <span class="status-badge status-${b.status}">${b.status}</span>
        <span style="font-size:0.8rem;color:var(--text-muted)">${timeAgo(b.createdAt)}</span>
      </div>
      <div class="booking-card-room">
        <img src="${b.roomImage || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'}"
             alt="${b.roomName}"
             onerror="this.src='https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'">
        <div class="booking-card-room-info">
          <h4><a href="room-details.html?id=${b.roomId}">${b.roomName}</a></h4>
          <p>${formatPrice(b.roomPrice)}/month</p>
        </div>
      </div>
      <div class="booking-card-meta">
        <span><i class="fas fa-user"></i> ${isOwner ? b.tenantName : b.ownerName}</span>
        <span><i class="fas fa-calendar"></i> Move-in: ${formatDate(b.moveInDate) || 'Not specified'}</span>
        <span><i class="fas fa-clock"></i> ${b.duration || 'Not specified'}</span>
      </div>
      ${b.message ? `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;font-style:italic;">"${b.message}"</p>` : ''}
      <div class="booking-card-actions">
        <a href="room-details.html?id=${b.roomId}" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i> View Room</a>
        ${isOwner && b.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="updateBookingStatus('${b.id}', 'approved')"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" onclick="updateBookingStatus('${b.id}', 'rejected')"><i class="fas fa-times"></i> Reject</button>
        ` : ''}
        ${!isOwner && b.status === 'pending' ? `
          <button class="btn btn-danger btn-sm" onclick="updateBookingStatus('${b.id}', 'cancelled')"><i class="fas fa-times"></i> Cancel</button>
        ` : ''}
      </div>
    </div>
  `).join('');

  initAOS();
}

async function updateBookingStatus(bookingId, status) {
  const label = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'cancel';
  if (!confirm(`Are you sure you want to ${label} this booking?`)) return;

  try {
    await apiUpdateBookingStatus(bookingId, status);
    showToast('success', 'Updated', `Booking ${status} successfully.`);
    loadBookings();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}
