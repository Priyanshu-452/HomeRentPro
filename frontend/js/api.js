// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — API Module
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

// ─── Token Management ───────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('homerent_token');
}

function setToken(token) {
  localStorage.setItem('homerent_token', token);
}

function removeToken() {
  localStorage.removeItem('homerent_token');
}

function getUser() {
  const data = localStorage.getItem('homerent_user');
  return data ? JSON.parse(data) : null;
}

function setUser(user) {
  localStorage.setItem('homerent_user', JSON.stringify(user));
}

function removeUser() {
  localStorage.removeItem('homerent_user');
}

function isLoggedIn() {
  return !!getToken();
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Generic Fetch Wrapper ──────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw { status: res.status, message: data.error || 'Something went wrong' };
    }
    return data;
  } catch (err) {
    if (err.status) throw err;
    console.error('API Error:', err);
    throw { status: 0, message: 'Cannot connect to server. Make sure backend is running.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiRegister(data) {
  const result = await apiFetch('/auth/register', { method: 'POST', body: data });
  setToken(result.token);
  setUser(result.user);
  return result;
}

async function apiLogin(data) {
  const result = await apiFetch('/auth/login', { method: 'POST', body: data });
  setToken(result.token);
  setUser(result.user);
  return result;
}

async function apiLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (e) { /* ignore */ }
  removeToken();
  removeUser();
}

async function apiGetMe() {
  return await apiFetch('/auth/me');
}

async function apiUpdateProfile(data) {
  const result = await apiFetch('/auth/update', { method: 'PUT', body: data });
  setUser(result);
  return result;
}

async function apiForgotPasswordVerify(data) {
  return await apiFetch('/auth/forgot-password/verify', { method: 'POST', body: data });
}

async function apiForgotPasswordReset(data) {
  return await apiFetch('/auth/forgot-password/reset', { method: 'POST', body: data });
}

async function apiGoogleAuth(data) {
  const result = await apiFetch('/auth/google', { method: 'POST', body: data });
  setToken(result.token);
  setUser(result.user);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOMS API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiGetRooms() {
  return await apiFetch('/rooms');
}

async function apiGetFeaturedRooms() {
  return await apiFetch('/rooms/featured');
}

async function apiGetRoom(id) {
  return await apiFetch(`/rooms/${id}`);
}

async function apiAddRoom(data) {
  return await apiFetch('/rooms', { method: 'POST', body: data });
}

async function apiUpdateRoom(id, data) {
  return await apiFetch(`/rooms/${id}`, { method: 'PUT', body: data });
}

async function apiDeleteRoom(id) {
  return await apiFetch(`/rooms/${id}`, { method: 'DELETE' });
}

async function apiGetUserRooms(userId) {
  return await apiFetch(`/rooms/user/${userId}`);
}

async function apiSearchRooms(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  return await apiFetch(`/search?${query.toString()}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiCreateBooking(data) {
  return await apiFetch('/bookings', { method: 'POST', body: data });
}

async function apiGetTenantBookings() {
  return await apiFetch('/bookings/tenant');
}

async function apiGetOwnerBookings() {
  return await apiFetch('/bookings/owner');
}

async function apiUpdateBookingStatus(bookingId, status) {
  return await apiFetch(`/bookings/${bookingId}/status`, { method: 'PUT', body: { status } });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REVIEWS API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiGetReviews(roomId) {
  return await apiFetch(`/reviews/${roomId}`);
}

async function apiAddReview(data) {
  return await apiFetch('/reviews', { method: 'POST', body: data });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FAVORITES API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiGetFavorites() {
  return await apiFetch('/favorites');
}

async function apiCheckFavorite(roomId) {
  return await apiFetch(`/favorites/check/${roomId}`);
}

async function apiToggleFavorite(roomId) {
  return await apiFetch('/favorites/toggle', { method: 'POST', body: { roomId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MESSAGES API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiSendMessage(data) {
  return await apiFetch('/messages', { method: 'POST', body: data });
}

async function apiGetConversations() {
  return await apiFetch('/messages/conversations');
}

async function apiGetThread(userId) {
  return await apiFetch(`/messages/thread/${userId}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiGetDashboardStats() {
  return await apiFetch('/dashboard/stats');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTACT API
// ═══════════════════════════════════════════════════════════════════════════════

async function apiSubmitContact(data) {
  return await apiFetch('/contact', { method: 'POST', body: data });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function renderStars(rating, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    if (i <= Math.floor(rating)) {
      html += '<i class="fas fa-star"></i>';
    } else if (i - rating < 1 && i - rating > 0) {
      html += '<i class="fas fa-star-half-alt"></i>';
    } else {
      html += '<i class="far fa-star"></i>';
    }
  }
  return html;
}

function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// ─── Toast Notification System ──────────────────────────────────────────────
function showToast(type, title, message, duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
