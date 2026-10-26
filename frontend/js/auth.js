// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Auth Module (Google OAuth only)
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (isLoggedIn()) {
    const user = getUser();
    if (user && user.role === 'owner') {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }
});
