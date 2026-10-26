// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Add Room Page Logic
// ═══════════════════════════════════════════════════════════════════════════════

let currentStep = 1;
const totalSteps = 3;
let selectedAmenities = [];

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  if (!isLoggedIn()) {
    showToast('warning', 'Login Required', 'Please login as an owner to add rooms.');
    setTimeout(() => window.location.href = 'login.html', 1000);
    return;
  }

  const user = getUser();
  if (user && user.role !== 'owner') {
    showToast('warning', 'Access Denied', 'Only property owners can add rooms.');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return;
  }

  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  initSteps();
  initAmenityCheckboxes();
  initImageUrls();

  const form = document.getElementById('addRoomForm');
  if (form) form.addEventListener('submit', handleAddRoom);
});

function initSteps() {
  updateStepUI();
}

function nextStep() {
  if (currentStep < totalSteps) {
    // Validate current step
    if (!validateStep(currentStep)) return;
    currentStep++;
    updateStepUI();
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepUI();
  }
}

function updateStepUI() {
  // Update step indicators
  document.querySelectorAll('.step-item').forEach((item, idx) => {
    item.classList.remove('active', 'completed');
    if (idx + 1 < currentStep) item.classList.add('completed');
    if (idx + 1 === currentStep) item.classList.add('active');
  });

  // Show/hide step content
  document.querySelectorAll('.step-content').forEach((content, idx) => {
    content.classList.toggle('active', idx + 1 === currentStep);
  });

  // Update buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  if (prevBtn) prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
  if (nextBtn) nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
  if (submitBtn) submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
}

function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('roomName').value.trim();
    const price = document.getElementById('price').value;
    const bhk = document.getElementById('bhk').value;
    const location = document.getElementById('location').value.trim();
    const area = document.getElementById('area').value;

    if (!name || !price || !bhk || !location || !area) {
      showToast('warning', 'Missing Fields', 'Please fill in all required fields.');
      return false;
    }
  }
  if (step === 2) {
    const desc = document.getElementById('description').value.trim();
    if (!desc) {
      showToast('warning', 'Missing Description', 'Please add a description for your property.');
      return false;
    }
  }
  return true;
}

function initAmenityCheckboxes() {
  document.querySelectorAll('.amenity-checkbox').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('selected');
      const value = item.dataset.amenity;
      if (item.classList.contains('selected')) {
        if (!selectedAmenities.includes(value)) selectedAmenities.push(value);
      } else {
        selectedAmenities = selectedAmenities.filter(a => a !== value);
      }
    });
  });
}

function initImageUrls() {
  const addBtn = document.getElementById('addImageUrl');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const list = document.getElementById('imageUrlsList');
      const row = document.createElement('div');
      row.className = 'image-url-row';
      row.innerHTML = `
        <input type="url" class="image-url-input" placeholder="https://example.com/image.jpg">
        <button type="button" class="btn btn-danger btn-icon btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
      `;
      list.appendChild(row);
    });
  }
}

async function handleAddRoom(e) {
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  const btn = document.getElementById('submitBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto"></div>';
  btn.disabled = true;

  try {
    // Collect image URLs
    const imageInputs = document.querySelectorAll('.image-url-input');
    const images = [];
    imageInputs.forEach(input => {
      if (input.value.trim()) images.push(input.value.trim());
    });

    const roomData = {
      name: document.getElementById('roomName').value.trim(),
      price: parseFloat(document.getElementById('price').value),
      bhk: parseInt(document.getElementById('bhk').value),
      location: document.getElementById('location').value.trim(),
      area: parseFloat(document.getElementById('area').value),
      description: document.getElementById('description').value.trim(),
      furnishing: document.getElementById('furnishing').value,
      amenities: selectedAmenities,
      contact: document.getElementById('contact')?.value.trim() || '',
      email: document.getElementById('email')?.value.trim() || '',
      image: images[0] || '',
      images: images,
    };

    await apiAddRoom(roomData);
    showToast('success', 'Room Added! 🎉', 'Your property has been listed successfully.');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch (err) {
    showToast('error', 'Failed', err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
