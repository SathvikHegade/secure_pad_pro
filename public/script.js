// ============================================
// SECURENOTE - NOTE EDITOR
// ============================================

// State
let padId = '';
let currentPassword = '';
let saveTimeout = null;

// DOM Elements
const els = {
  authScreen: document.getElementById('authScreen'),
  mainContent: document.getElementById('mainContent'),
  authForm: document.getElementById('authForm'),
  authTitle: document.getElementById('authTitle'),
  authSubtitle: document.getElementById('authSubtitle'),
  passwordInput: document.getElementById('passwordInput'),
  authSubmit: document.getElementById('authSubmit'),
  authError: document.getElementById('authError'),
  padName: document.getElementById('padName'),
  editor: document.getElementById('editor'),
  saveStatus: document.getElementById('saveStatus'),
  fileInput: document.getElementById('fileInput'),
  uploadZone: document.getElementById('uploadZone'),
  filesList: document.getElementById('filesList'),
  fileCount: document.getElementById('fileCount'),
  summarizeBtn: document.getElementById('summarizeBtn'),
  summaryModal: document.getElementById('summaryModal'),
  summaryContent: document.getElementById('summaryContent'),
  closeSummary: document.getElementById('closeSummary'),
  previewModal: document.getElementById('previewModal'),
  previewTitle: document.getElementById('previewTitle'),
  previewBody: document.getElementById('previewBody'),
  closePreview: document.getElementById('closePreview'),
  infoBtn: document.getElementById('infoBtn'),
  infoModal: document.getElementById('infoModal'),
  closeInfo: document.getElementById('closeInfo')
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  padId = window.location.pathname.split('/').pop() || 'default';
  els.padName.textContent = padId;
  
  // Check for stored credentials from homepage
  const storedAuth = sessionStorage.getItem('padAuth');
  if (storedAuth) {
    try {
      const auth = JSON.parse(storedAuth);
      if (auth.urlName === padId && auth.password) {
        currentPassword = auth.password;
        sessionStorage.removeItem('padAuth'); // Clear after use
        await loadPad();
        showMainScreen();
        setupEventListeners();
        return;
      }
    } catch (e) {
      console.error('Failed to parse stored auth:', e);
    }
  }
  
  // Show password screen if no stored credentials
  setupAuthScreen();
  setupEventListeners();
  
  console.log('✓ SecureNote initialized');
}

function setupAuthScreen() {
  els.authTitle.textContent = '🔐 Enter Password';
  els.authSubtitle.textContent = 'This note is password protected';
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Auth
  els.authForm.addEventListener('submit', handleAuth);
  
  // Editor
  els.editor.addEventListener('input', handleEditorChange);
  
  // Files
  els.uploadZone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);
  els.uploadZone.addEventListener('dragover', handleDragOver);
  els.uploadZone.addEventListener('dragleave', handleDragLeave);
  els.uploadZone.addEventListener('drop', handleDrop);
  
  // Summarize
  els.summarizeBtn.addEventListener('click', handleSummarize);
  
  // Modals
  els.closeSummary.addEventListener('click', () => closeModal(els.summaryModal));
  els.closePreview.addEventListener('click', () => closeModal(els.previewModal));
  els.closeInfo.addEventListener('click', () => closeModal(els.infoModal));
  els.infoBtn.addEventListener('click', () => showModal(els.infoModal));
  
  // Click outside modal
  [els.summaryModal, els.previewModal, els.infoModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
  
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(els.summaryModal);
      closeModal(els.previewModal);
      closeModal(els.infoModal);
    }
  });
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleAuth(e) {
  e.preventDefault();
  
  const password = els.passwordInput.value.trim();
  
  // Validation
  if (!password || password.length < 4) {
    showError('Password must be at least 4 characters');
    return;
  }
  
  els.authSubmit.disabled = true;
  els.authSubmit.textContent = 'Verifying...';
  
  try {
    // Try to load pad with password
    currentPassword = password;
    const res = await fetch(`/api/pad/${padId}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    if (res.ok) {
      const data = await res.json();
      els.editor.value = data.content || '';
      renderFiles(data.files || []);
      showMainScreen();
    } else {
      const data = await res.json();
      showError(data.error || 'Incorrect password');
      els.authSubmit.disabled = false;
      els.authSubmit.textContent = 'Access Note';
    }
  } catch (error) {
    console.error('Auth error:', error);
    showError('Connection error. Please try again.');
    els.authSubmit.disabled = false;
    els.authSubmit.textContent = 'Access Note';
  }
}

function showError(message) {
  els.authError.textContent = message;
  els.authError.classList.remove('hidden');
  setTimeout(() => els.authError.classList.add('hidden'), 4000);
}

function showMainScreen() {
  els.authScreen.classList.add('hidden');
  els.mainContent.classList.remove('hidden');
}

// ============================================
// PAD OPERATIONS
// ============================================

async function loadPad() {
  try {
    const res = await fetch(`/api/pad/${padId}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: currentPassword })
    });
    
    const data = await res.json();
    els.editor.value = data.content || '';
    renderFiles(data.files || []);
  } catch (error) {
    console.error('Load error:', error);
  }
}

function handleEditorChange() {
  clearTimeout(saveTimeout);
  els.saveStatus.textContent = 'Typing...';
  els.saveStatus.style.background = '#feebc8';
  
  saveTimeout = setTimeout(savePad, 2000);
}

async function savePad() {
  try {
    const res = await fetch(`/api/pad/${padId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: currentPassword,
        content: els.editor.value
      })
    });
    
    if (res.ok) {
      els.saveStatus.textContent = 'Saved ✓';
      els.saveStatus.style.background = '#c6f6d5';
      setTimeout(() => {
        els.saveStatus.textContent = 'Saved';
        els.saveStatus.style.background = '';
      }, 2000);
    }
  } catch (error) {
    els.saveStatus.textContent = 'Save failed';
    els.saveStatus.style.background = '#fed7d7';
  }
}

// ============================================
// FILE OPERATIONS
// ============================================

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  els.uploadZone.classList.add('drag-over');
}

function handleDragLeave() {
  els.uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  els.uploadZone.classList.remove('drag-over');
  
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
}

async function uploadFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Maximum size is 10MB.');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', currentPassword);
  
  try {
    const res = await fetch(`/api/upload/${padId}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    if (data.success) {
      await loadPad();
    } else {
      const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Upload failed');
      console.error('Upload error:', errorMsg);
      alert(errorMsg);
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed: ' + error.message);
  }
}

function renderFiles(files) {
  els.fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
  
  if (files.length === 0) {
    els.filesList.innerHTML = '<p style="text-align:center;color:#a0aec0;padding:2rem">No files uploaded yet</p>';
    return;
  }
  
  els.filesList.innerHTML = files.map(file => `
    <div class="file-item">
      <div class="file-info-text">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div class="file-meta">
          ${formatSize(file.size)} • Uploaded ${formatDate(file.uploadedAt)} • 
          Expires ${formatDate(file.expiresAt)}
        </div>
      </div>
      <div class="file-actions">
        ${canPreview(file.name) ? `<button class="btn btn-secondary btn-sm" onclick="previewFile('${escapeHtml(file.filename)}', '${escapeHtml(file.name)}')">👁️ Preview</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="downloadFile('${escapeHtml(file.filename)}', '${escapeHtml(file.name)}')">⬇️ Download</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFile(${file.id}, '${escapeHtml(file.name)}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function canPreview(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth < 768;
}

async function previewFile(filename, originalName) {
  try {
    const url = `/api/file/${padId}/${filename}`;
    const ext = originalName.split('.').pop().toLowerCase();

    // For PDFs on mobile, open directly in new tab (mobile browsers handle PDFs better natively)
    if (ext === 'pdf' && isMobile()) {
      window.open(url, '_blank');
      return;
    }

    // Try to fetch the file first to catch errors and to avoid browser
    // content-disposition issues when embedding directly.
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Fallback: open in new tab for mobile or restricted contexts
      window.open(url, '_blank');
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    els.previewTitle.textContent = originalName;

    if (ext === 'pdf') {
      // Desktop: try iframe, with fallback link
      els.previewBody.innerHTML = `
        <iframe src="${blobUrl}" style="width:100%;height:70vh;border:none"></iframe>
        <p style="text-align:center;margin-top:1rem;font-size:0.875rem;color:var(--text-light)">
          PDF not loading? <a href="${url}" target="_blank" style="color:var(--primary)">Open in new tab</a>
        </p>`;
    } else {
      els.previewBody.innerHTML = `<img src="${blobUrl}" style="max-width:100%;height:auto;display:block;margin:0 auto">`;
    }

    showModal(els.previewModal);

    // Revoke object URL when modal is closed
    const cleanup = () => {
      try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      els.closePreview.removeEventListener('click', cleanup);
    };
    els.closePreview.addEventListener('click', cleanup);
  } catch (error) {
    console.error('Preview error:', error);
    // Last resort: try opening in new tab
    const url = `/api/file/${padId}/${filename}`;
    window.open(url, '_blank');
  }
}

async function downloadFile(filename, originalName) {
  try {
    const url = `/api/file/${padId}/${filename}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      // Fallback: try opening direct URL for download
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        // ignore
      }
      throw new Error(`Server returned ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch (e) {} }, 1000);
  } catch (error) {
    console.error('Download error:', error);
    alert('Download failed: ' + (error.message || 'Unknown error'));
  }
}

async function deleteFile(fileId, fileName) {
  if (!confirm(`Delete "${fileName}"?`)) {
    return;
  }
  
  try {
    const res = await fetch(`/api/file/${fileId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        padId: padId,
        password: currentPassword 
      })
    });
    
    const data = await res.json();
    if (data.success) {
      await loadPad(); // Reload to update file list
    } else {
      alert(data.error || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Delete failed: ' + error.message);
  }
}

// ============================================
// AI SUMMARIZATION
// ============================================

async function handleSummarize() {
  const text = els.editor.value.trim();
  
  if (!text || text.length < 50) {
    alert('Please write at least 50 characters to summarize');
    return;
  }
  
  showModal(els.summaryModal);
  els.summaryContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Generating AI summary with Google Gemini...</p></div>';
  
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        padId: padId,
        password: currentPassword, 
        content: text 
      })
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      displaySummary(data.summary, text);
    } else {
      els.summaryContent.innerHTML = `
        <div style="text-align:center;padding:2rem;">
          <p style="color:var(--danger);margin-bottom:1rem;">❌ ${escapeHtml(data.error || 'Summarization failed')}</p>
          <p style="color:var(--text-light);font-size:0.875rem;">
            ${data.error && data.error.includes('API key') ? 
              'The administrator needs to configure the Gemini API key in the .env file.' : 
              'Please try again later or check your connection.'}
          </p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Summarization error:', error);
    els.summaryContent.innerHTML = `
      <div style="text-align:center;padding:2rem;">
        <p style="color:var(--danger);margin-bottom:1rem;">❌ Connection error</p>
        <p style="color:var(--text-light);font-size:0.875rem;">Failed to connect to the server. Please try again.</p>
      </div>
    `;
  }
}

function displaySummary(summary, originalText) {
  const wordCount = originalText.split(/\s+/).length;
  const lineCount = originalText.split('\n').length;
  
  els.summaryContent.innerHTML = `
    <div class="summary-section">
      <h3>🤖 AI Summary</h3>
      <div style="background:var(--bg);padding:1rem;border-radius:0.5rem;border-left:4px solid var(--primary);">
        <p style="white-space:pre-wrap;line-height:1.6;">${escapeHtml(summary)}</p>
      </div>
    </div>
    
    <div class="summary-section">
      <h3>📊 Document Statistics</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;">
        <div style="background:var(--bg);padding:1rem;border-radius:0.5rem;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${wordCount}</div>
          <div style="font-size:0.875rem;color:var(--text-light);">Words</div>
        </div>
        <div style="background:var(--bg);padding:1rem;border-radius:0.5rem;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${lineCount}</div>
          <div style="font-size:0.875rem;color:var(--text-light);">Lines</div>
        </div>
        <div style="background:var(--bg);padding:1rem;border-radius:0.5rem;text-align:center;">
          <div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${originalText.length}</div>
          <div style="font-size:0.875rem;color:var(--text-light);">Characters</div>
        </div>
      </div>
    </div>
    
    <div class="summary-section">
      <p style="text-align:center;color:var(--text-light);font-size:0.875rem;">
        ✨ Powered by Google Gemini AI
      </p>
    </div>
  `;
}

// ============================================
// UTILITIES
// ============================================

function showModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}
// ============================================
// DARK MODE
// ============================================

function setupDarkMode() {
  const themeToggle = document.getElementById('themeToggle');
  
  // Check saved preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
  
  // Toggle theme
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  init();
  setupDarkMode();
});
