// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Profile Page
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
  loadProfile();
});

function loadProfile() {
  const user = getUser();
  if (!user) return;

  document.getElementById('profileAvatar').textContent = getInitials(user.name);
  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileRole').textContent = user.role === 'owner' ? '🏠 Property Owner' : '🔑 Tenant';
  document.getElementById('profileJoined').textContent = `Joined ${formatDate(user.createdAt)}`;

  // Fill form
  document.getElementById('editName').value = user.name;
  document.getElementById('editPhone').value = user.phone || '';
  document.getElementById('editBio').value = user.bio || '';

  const profileForm = document.getElementById('profileForm');
  if (profileForm) profileForm.addEventListener('submit', handleUpdateProfile);

  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) passwordForm.addEventListener('submit', handleChangePassword);
}

async function handleUpdateProfile(e) {
  e.preventDefault();

  try {
    const data = {
      name: document.getElementById('editName').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      bio: document.getElementById('editBio').value.trim(),
    };

    await apiUpdateProfile(data);
    showToast('success', 'Profile Updated', 'Your profile has been updated successfully.');

    // Refresh display
    const user = getUser();
    document.getElementById('profileAvatar').textContent = getInitials(user.name);
    document.getElementById('profileName').textContent = user.name;
    updateNavAuth();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}

async function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword.length < 6) {
    showToast('warning', 'Weak Password', 'Password must be at least 6 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('error', 'Mismatch', 'New passwords do not match.');
    return;
  }

  try {
    await apiUpdateProfile({ currentPassword, newPassword });
    showToast('success', 'Password Changed', 'Your password has been updated.');
    document.getElementById('passwordForm').reset();
  } catch (err) {
    showToast('error', 'Error', err.message);
  }
}
