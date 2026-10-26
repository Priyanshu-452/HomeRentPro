// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Contact Page
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();

  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', handleContact);
});

async function handleContact(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto"></div>';
  btn.disabled = true;

  try {
    const data = {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      subject: document.getElementById('contactSubject').value.trim(),
      message: document.getElementById('contactMessage').value.trim(),
    };

    await apiSubmitContact(data);
    showToast('success', 'Message Sent! 📨', 'We will get back to you shortly.');
    e.target.reset();
  } catch (err) {
    showToast('error', 'Error', err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
