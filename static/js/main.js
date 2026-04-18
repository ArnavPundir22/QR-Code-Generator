/* =========================================================
   QR Code Generator – main.js
   ========================================================= */

(function () {
  'use strict';

  // ── DOM refs ─────────────────────────────────────────────
  const form          = document.getElementById('qrForm');
  const modeInput     = document.getElementById('modeInput');
  const tabStandard   = document.getElementById('tab-standard');
  const tabLogo       = document.getElementById('tab-logo');
  const logoField     = document.getElementById('logoField');
  const logoInput     = document.getElementById('logoInput');
  const fileDrop      = document.getElementById('fileDrop');
  const fileDropText  = document.getElementById('fileDropText');
  const linkInput     = document.getElementById('linkInput');
  const linkError     = document.getElementById('linkError');
  const logoError     = document.getElementById('logoError');
  const fillColor     = document.getElementById('fillColor');
  const backColor     = document.getElementById('backColor');
  const fillColorValue= document.getElementById('fillColorValue');
  const backColorValue= document.getElementById('backColorValue');
  const boxSize       = document.getElementById('boxSize');
  const borderSize    = document.getElementById('borderSize');
  const boxSizeValue  = document.getElementById('boxSizeValue');
  const borderSizeValue = document.getElementById('borderSizeValue');
  const generateBtn   = document.getElementById('generateBtn');
  const generateBtnText = document.getElementById('generateBtnText');
  const downloadBtn   = document.getElementById('downloadBtn');
  const themeToggle   = document.getElementById('themeToggle');
  const themeIcon     = document.getElementById('themeIcon');
  const presetBtns    = document.querySelectorAll('.preset');

  // Shorten refs
  const shortenBtn      = document.getElementById('shortenBtn');
  const shortenBtnText  = document.getElementById('shortenBtnText');
  const shortenInfo     = document.getElementById('shortenInfo');

  // Logo preview refs
  const logoPreviewWrap   = document.getElementById('logoPreviewWrap');
  const logoPreview       = document.getElementById('logoPreview');
  const logoPreviewRemove = document.getElementById('logoPreviewRemove');

  // Preview panels
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewLoading     = document.getElementById('previewLoading');
  const previewError       = document.getElementById('previewError');
  const previewResult      = document.getElementById('previewResult');
  const errorMsg           = document.getElementById('errorMsg');
  const qrImage            = document.getElementById('qrImage');
  const qrCaption          = document.getElementById('qrCaption');

  // ── Theme toggle ─────────────────────────────────────────
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // ── Mode tabs ─────────────────────────────────────────────
  [tabStandard, tabLogo].forEach(tab => {
    tab.addEventListener('click', () => {
      [tabStandard, tabLogo].forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const mode = tab.dataset.mode;
      modeInput.value = mode;

      if (mode === 'logo') {
        logoField.classList.remove('hidden');
      } else {
        logoField.classList.add('hidden');
        clearLogoPreview();
        logoError.textContent = '';
      }
    });
  });

  // ── File drop zone ────────────────────────────────────────
  ['dragenter', 'dragover'].forEach(evt => {
    fileDrop.addEventListener(evt, e => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    fileDrop.addEventListener(evt, e => { e.preventDefault(); fileDrop.classList.remove('drag-over'); });
  });
  fileDrop.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length) {
      logoInput.files = files;
      showLogoPreview(files[0]);
      logoError.textContent = '';
    }
  });
  logoInput.addEventListener('change', () => {
    if (logoInput.files.length) {
      showLogoPreview(logoInput.files[0]);
      logoError.textContent = '';
    }
  });

  // ── Logo preview helpers ──────────────────────────────────
  function showLogoPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.src = e.target.result;
      fileDropText.textContent = file.name;
      logoPreviewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function clearLogoPreview() {
    logoInput.value = '';
    logoPreview.src = '';
    logoPreviewWrap.classList.add('hidden');
    fileDropText.textContent = 'Click or drag an image here';
  }

  logoPreviewRemove.addEventListener('click', (e) => {
    e.preventDefault();
    clearLogoPreview();
    logoError.textContent = '';
  });

  // ── URL Shortener ─────────────────────────────────────────
  shortenBtn.addEventListener('click', async () => {
    const url = linkInput.value.trim();
    if (!url) {
      linkError.textContent = 'Please enter a URL to shorten.';
      linkInput.focus();
      return;
    }
    linkError.textContent = '';
    shortenBtn.disabled = true;
    shortenBtnText.textContent = 'Shortening…';
    shortenInfo.classList.add('hidden');
    shortenInfo.classList.remove('shorten-info--error');

    try {
      const resp = await fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        shortenInfo.textContent = data.error || 'Could not shorten URL.';
        shortenInfo.classList.add('shorten-info--error');
      } else {
        linkInput.value = data.short_url;
        shortenInfo.textContent = '✓ URL shortened!';
      }
      shortenInfo.classList.remove('hidden');
    } catch (err) {
      shortenInfo.textContent = 'An error occurred while shortening the URL.';
      shortenInfo.classList.add('shorten-info--error');
      shortenInfo.classList.remove('hidden');
    } finally {
      shortenBtn.disabled = false;
      shortenBtnText.textContent = 'Shorten URL';
    }
  });

  // ── Colour pickers ────────────────────────────────────────
  fillColor.addEventListener('input', () => { fillColorValue.textContent = fillColor.value; });
  backColor.addEventListener('input', () => { backColorValue.textContent = backColor.value; });

  // ── Sliders ───────────────────────────────────────────────
  boxSize.addEventListener('input', () => {
    boxSizeValue.textContent = boxSize.value;
    boxSize.setAttribute('aria-valuenow', boxSize.value);
  });
  borderSize.addEventListener('input', () => {
    borderSizeValue.textContent = borderSize.value;
    borderSize.setAttribute('aria-valuenow', borderSize.value);
  });

  // ── Colour presets ────────────────────────────────────────
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fillColor.value = btn.dataset.fill;
      backColor.value = btn.dataset.back;
      fillColorValue.textContent = btn.dataset.fill;
      backColorValue.textContent = btn.dataset.back;
    });
  });

  // ── Form submission ───────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    showState('loading');
    generateBtn.disabled = true;
    generateBtnText.textContent = 'Generating…';

    const formData = new FormData(form);

    try {
      const response = await fetch('/generate', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok || data.error) {
        showState('error');
        errorMsg.textContent = data.error || 'An unexpected error occurred.';
        return;
      }

      const src = 'data:image/png;base64,' + data.image;
      qrImage.src = src;
      qrCaption.textContent = linkInput.value.trim();
      downloadBtn.classList.remove('hidden');
      downloadBtn.onclick = () => downloadImage(src);
      showState('result');

    } catch {
      showState('error');
      errorMsg.textContent = 'Could not reach the server. Please try again.';
    } finally {
      generateBtn.disabled = false;
      generateBtnText.textContent = 'Generate QR Code';
    }
  });

  // ── Validation ────────────────────────────────────────────
  function validate() {
    let valid = true;
    linkError.textContent = '';
    logoError.textContent = '';

    if (!linkInput.value.trim()) {
      linkError.textContent = 'Please enter a URL or text to encode.';
      linkInput.focus();
      valid = false;
    }

    if (modeInput.value === 'logo' && (!logoInput.files || logoInput.files.length === 0)) {
      logoError.textContent = 'Please upload a logo image.';
      valid = false;
    }

    return valid;
  }

  // ── Preview state machine ─────────────────────────────────
  function showState(state) {
    previewPlaceholder.classList.add('hidden');
    previewLoading.classList.add('hidden');
    previewError.classList.add('hidden');
    previewResult.classList.add('hidden');

    if (state === 'loading')     previewLoading.classList.remove('hidden');
    else if (state === 'error')  previewError.classList.remove('hidden');
    else if (state === 'result') previewResult.classList.remove('hidden');
    else                         previewPlaceholder.classList.remove('hidden');
  }

  // ── Download helper ───────────────────────────────────────
  function downloadImage(dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Live validation on input ──────────────────────────────
  linkInput.addEventListener('input', () => {
    if (linkInput.value.trim()) linkError.textContent = '';
  });

})();

