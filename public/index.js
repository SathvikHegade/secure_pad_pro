// ============================================
// SECURENOTE - HOMEPAGE
// ============================================

// DOM Elements
const els = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  loginTab: document.getElementById('loginTab'),
  createTab: document.getElementById('createTab'),
  
  // Login Form
  loginForm: document.getElementById('loginForm'),
  loginUrlName: document.getElementById('loginUrlName'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  loginSubmit: document.getElementById('loginSubmit'),
  
  // Create Form
  createForm: document.getElementById('createForm'),
  createUrlName: document.getElementById('createUrlName'),
  createPassword: document.getElementById('createPassword'),
  confirmPassword: document.getElementById('confirmPassword'),
  createError: document.getElementById('createError'),
  createSubmit: document.getElementById('createSubmit'),
  urlAvailability: document.getElementById('urlAvailability'),
  passwordFields: document.getElementById('passwordFields'),
  privacyPrivate: document.getElementById('privacyPrivate'),
  privacyPublic: document.getElementById('privacyPublic'),
  retentionFields: document.getElementById('retentionFields'),
  retentionSelect: document.getElementById('retentionMinutes'),
  
  // Modals
  infoModal: document.getElementById('infoModal'),
  infoBtn: document.getElementById('infoBtn'),
  closeInfo: document.getElementById('closeInfo'),
  themeToggle: document.getElementById('themeToggle')
};

let checkUrlTimeout = null;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  setupEventListeners();
  setupDarkMode();
  togglePasswordFields(); // Initialize password field visibility
  console.log('✓ Homepage initialized');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Tab switching
  els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Forms
  els.loginForm.addEventListener('submit', handleLogin);
  els.createForm.addEventListener('submit', handleCreate);
  
  // URL availability check
  els.createUrlName.addEventListener('input', handleUrlInput);
  
  // Privacy selection toggle
  els.privacyPrivate.addEventListener('change', togglePasswordFields);
  els.privacyPublic.addEventListener('change', togglePasswordFields);
  
  // Modals
  els.infoBtn.addEventListener('click', () => showModal(els.infoModal));
  els.closeInfo.addEventListener('click', () => closeModal(els.infoModal));
  
  // Click outside modal
  els.infoModal.addEventListener('click', (e) => {
    if (e.target === els.infoModal) closeModal(els.infoModal);
  });
  
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal(els.infoModal);
  });
}

// ============================================
// TAB SWITCHING
// ============================================

function togglePasswordFields() {
  const isPrivate = els.privacyPrivate.checked;
  
  console.log('Toggle password fields - isPrivate:', isPrivate);
  
  if (isPrivate) {
    els.passwordFields.style.display = 'block';
    els.createPassword.required = true;
    els.confirmPassword.required = true;
    if (els.retentionFields) {
      els.retentionFields.style.display = 'none';
    }
  } else {
    els.passwordFields.style.display = 'none';
    els.createPassword.required = false;
    els.confirmPassword.required = false;
    // Clear password values when switching to public
    els.createPassword.value = '';
    els.confirmPassword.value = '';
    if (els.retentionFields) {
      els.retentionFields.style.display = 'block';
    }
  }
  
  // Clear any validation errors when toggling
  hideError(els.createError);
}

function switchTab(tab) {
  // Update buttons
  els.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Update cards
  els.loginTab.classList.toggle('active', tab === 'login');
  els.createTab.classList.toggle('active', tab === 'create');
  
  // Clear errors
  hideError(els.loginError);
  hideError(els.createError);
  hideError(els.urlAvailability);
  
  // Reset password fields visibility when switching to create tab
  if (tab === 'create') {
    togglePasswordFields();
  }
}

// ============================================
// LOGIN HANDLING
// ============================================

async function handleLogin(e) {
  e.preventDefault();
  
  const urlName = els.loginUrlName.value.trim();
  const password = els.loginPassword.value;
  
  // Validation
  if (!urlName || urlName.length < 3) {
    showError(els.loginError, 'URL name must be at least 3 characters');
    return;
  }
  
  // Password validation removed - backend will check if it's public
  
  // Disable submit button
  els.loginSubmit.disabled = true;
  els.loginSubmit.textContent = 'Verifying...';
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlName, password })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      // Store credentials in sessionStorage
      sessionStorage.setItem('padAuth', JSON.stringify({ urlName, password: password || '' }));
      
      // Redirect to pad
      window.location.href = `/pad/${urlName}`;
    } else {
      showError(els.loginError, data.error || 'Incorrect URL or password.');
      els.loginSubmit.disabled = false;
      els.loginSubmit.textContent = 'Access My Note';
    }
  } catch (error) {
    console.error('Login error:', error);
    showError(els.loginError, 'Connection error. Please try again.');
    els.loginSubmit.disabled = false;
    els.loginSubmit.textContent = 'Access My Note';
  }
}

// ============================================
// CREATE PAD HANDLING
// ============================================

function handleUrlInput() {
  clearTimeout(checkUrlTimeout);
  
  const urlName = els.createUrlName.value.trim();
  
  if (!urlName || urlName.length < 3) {
    hideError(els.urlAvailability);
    return;
  }
  
  // Validate format
  const regex = /^[a-zA-Z0-9_-]+$/;
  if (!regex.test(urlName)) {
    showError(els.urlAvailability, '❌ Invalid format. Use only letters, numbers, hyphens, and underscores', 'error');
    return;
  }
  
  // Show checking status
  showError(els.urlAvailability, '⏳ Checking availability...', 'info');
  
  // Debounce check
  checkUrlTimeout = setTimeout(() => checkUrlAvailability(urlName), 500);
}

async function checkUrlAvailability(urlName) {
  try {
    const res = await fetch(`/api/check-url/${urlName}`);
    const data = await res.json();
    
    if (data.available) {
      showError(els.urlAvailability, '✅ This URL is available!', 'success');
    } else {
      showError(els.urlAvailability, data.error || '❌ This URL name is already taken.', 'error');
    }
  } catch (error) {
    console.error('Check URL error:', error);
    hideError(els.urlAvailability);
  }
}

async function handleCreate(e) {
  e.preventDefault();
  
  const urlName = els.createUrlName.value.trim();
  const isPublic = els.privacyPublic.checked;
  const password = isPublic ? '' : els.createPassword.value;
  const confirmPass = isPublic ? '' : els.confirmPassword.value;
  const retentionMinutes = els.retentionSelect ? parseInt(els.retentionSelect.value, 10) || 1440 : 1440;
  
  // Validation
  if (!urlName || urlName.length < 3 || urlName.length > 50) {
    showError(els.createError, 'URL name must be 3-50 characters');
    return;
  }
  
  const regex = /^[a-zA-Z0-9_-]+$/;
  if (!regex.test(urlName)) {
    showError(els.createError, 'Invalid URL format. Use only letters, numbers, hyphens, and underscores');
    return;
  }
  
  // Only validate password for private notes
  if (!isPublic) {
    if (!password || password.length < 4) {
      showError(els.createError, 'Password must be at least 4 characters');
      return;
    }
    
    if (password !== confirmPass) {
      showError(els.createError, 'Passwords do not match');
      return;
    }
  }
  
  // Disable submit button
  els.createSubmit.disabled = true;
  els.createSubmit.textContent = 'Creating...';
  
  try {
    const res = await fetch('/api/create-pad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlName, password, isPublic, retentionMinutes })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      // Store credentials in sessionStorage
      sessionStorage.setItem('padAuth', JSON.stringify({ urlName, password }));
      
      // Redirect to pad
      window.location.href = `/pad/${urlName}`;
    } else {
      showError(els.createError, data.error || 'Failed to create note');
      els.createSubmit.disabled = false;
      els.createSubmit.textContent = 'Create My Note';
    }
  } catch (error) {
    console.error('Create error:', error);
    showError(els.createError, 'Connection error. Please try again.');
    els.createSubmit.disabled = false;
    els.createSubmit.textContent = 'Create My Note';
  }
}

// ============================================
// UTILITIES
// ============================================

function showError(element, message, type = 'error') {
  element.textContent = message;
  element.className = 'input-feedback ' + type;
  element.classList.remove('hidden');
}

function hideError(element) {
  element.classList.add('hidden');
}

function showModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// ============================================
// DARK MODE
// ============================================

function setupDarkMode() {
  // Check saved preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    els.themeToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  }
  
  // Toggle theme
  els.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    els.themeToggle.innerHTML = isDark 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', init);
