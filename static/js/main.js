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

  // PWA Install Button
  const installAppBtn      = document.getElementById('installAppBtn');

  // Keep-Alive refs
  const keepAliveDot       = document.getElementById('keepAliveDot');
  const keepAliveBadge     = document.getElementById('keepAliveBadge');
  const keepAliveLatency   = document.getElementById('keepAliveLatency');
  const keepAliveUrlInput  = document.getElementById('keepAliveUrlInput');
  const saveKeepAliveUrlBtn= document.getElementById('saveKeepAliveUrlBtn');
  const pingNowBtn         = document.getElementById('pingNowBtn');
  const autoPingToggle     = document.getElementById('autoPingToggle');
  const lastPingTimeText   = document.getElementById('lastPingTimeText');
  const pingLogsList       = document.getElementById('pingLogsList');
  const clearLogsBtn       = document.getElementById('clearLogsBtn');

  // ── PWA Service Worker Registration ───────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.error('PWA Service Worker registration failed:', err));
    });
  }

  // ── PWA Install Prompt Handler ────────────────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) installAppBtn.classList.remove('hidden');
  });

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User installed the PWA application');
      }
      deferredPrompt = null;
      installAppBtn.classList.add('hidden');
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    if (installAppBtn) installAppBtn.classList.add('hidden');
  });

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
    const metaThemeColor = document.getElementById('metaThemeColor');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
    }
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

  // ── Render Instance Keep-Alive Awakening System ───────────
  let keepAliveIntervalId = null;

  // Initialize saved live URL from localStorage or current window origin
  const savedLiveUrl = localStorage.getItem('live_url') || window.location.origin;
  if (keepAliveUrlInput) {
    keepAliveUrlInput.value = savedLiveUrl;
  }

  // Fetch backend keep-alive state on launch
  initKeepAlive();

  async function initKeepAlive() {
    try {
      const res = await fetch('/api/keep-alive');
      if (res.ok) {
        const data = await res.json();
        if (data.live_url && keepAliveUrlInput) {
          keepAliveUrlInput.value = data.live_url;
          localStorage.setItem('live_url', data.live_url);
        } else {
          // Sync frontend origin to backend
          updateBackendLiveUrl(savedLiveUrl);
        }
        if (data.logs && data.logs.length > 0) {
          renderLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server keep-alive status:', err);
    }
    // Run an initial ping check
    pingLiveLink();
    startKeepAliveLoop();
  }

  async function updateBackendLiveUrl(url) {
    try {
      await fetch('/api/keep-alive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_url', live_url: url })
      });
    } catch (err) {
      console.error('Failed to update backend live URL:', err);
    }
  }

  async function pingLiveLink() {
    const targetUrl = (keepAliveUrlInput ? keepAliveUrlInput.value.trim() : '') || window.location.origin;
    const pingEndpoint = targetUrl.rstrip ? targetUrl.rstrip('/') + '/ping' : targetUrl.replace(/\/+$/, '') + '/ping';

    // Update UI to pinging state
    setAwakeStatus('pinging', 'Pinging…');

    const startTs = performance.now();
    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await fetch('/ping?cachebust=' + Date.now());
      const endTs = performance.now();
      const latencyMs = Math.round(endTs - startTs);

      if (res.ok) {
        setAwakeStatus('awake', '🟢 Server Awake', latencyMs);
        addLogEntry({
          time: timeStr,
          status: res.status + ' OK',
          latency_ms: latencyMs,
          success: true,
          url: pingEndpoint
        });
      } else {
        setAwakeStatus('error', '🔴 Status ' + res.status, latencyMs);
        addLogEntry({
          time: timeStr,
          status: 'HTTP ' + res.status,
          latency_ms: latencyMs,
          success: false,
          url: pingEndpoint
        });
      }
    } catch (err) {
      const endTs = performance.now();
      const latencyMs = Math.round(endTs - startTs);
      setAwakeStatus('error', '🔴 Offline / Error', latencyMs);
      addLogEntry({
        time: timeStr,
        status: err.message || 'Network Failure',
        latency_ms: latencyMs,
        success: false,
        url: pingEndpoint
      });
    }
  }

  function setAwakeStatus(state, badgeText, latencyMs) {
    if (keepAliveBadge) keepAliveBadge.textContent = badgeText;
    if (keepAliveLatency && latencyMs !== undefined) keepAliveLatency.textContent = latencyMs + ' ms';
    if (lastPingTimeText) lastPingTimeText.textContent = 'Last ping callback: ' + new Date().toLocaleTimeString();

    if (keepAliveDot) {
      keepAliveDot.className = 'status-indicator-dot ';
      if (state === 'awake') keepAliveDot.classList.add('pulse-green');
      else if (state === 'pinging') keepAliveDot.classList.add('pulse-amber');
      else keepAliveDot.classList.add('pulse-red');
    }
  }

  function addLogEntry(entry) {
    if (!pingLogsList) return;
    const item = document.createElement('div');
    item.className = 'log-item ' + (entry.success ? 'log-success' : 'log-error');
    item.innerHTML = `
      <span class="log-time">${entry.time}</span>
      <span class="log-status">${entry.status}</span>
      <span class="log-latency">${entry.latency_ms}ms</span>
      <span class="log-url">${entry.url}</span>
    `;
    pingLogsList.insertBefore(item, pingLogsList.firstChild);

    // Keep max 15 log items in UI
    while (pingLogsList.children.length > 15) {
      pingLogsList.removeChild(pingLogsList.lastChild);
    }
  }

  function renderLogs(logs) {
    if (!pingLogsList) return;
    pingLogsList.innerHTML = '';
    logs.forEach(log => {
      addLogEntry({
        time: log.time,
        status: log.success ? (log.status + ' OK') : log.status,
        latency_ms: log.latency_ms,
        success: log.success,
        url: log.url
      });
    });
  }

  function startKeepAliveLoop() {
    if (keepAliveIntervalId) clearInterval(keepAliveIntervalId);
    if (autoPingToggle && autoPingToggle.checked) {
      // Ping every 5 minutes (300,000 ms) to keep Render service awake
      keepAliveIntervalId = setInterval(() => {
        pingLiveLink();
      }, 300000);
    }
  }

  if (saveKeepAliveUrlBtn) {
    saveKeepAliveUrlBtn.addEventListener('click', () => {
      const url = keepAliveUrlInput ? keepAliveUrlInput.value.trim() : '';
      if (url) {
        localStorage.setItem('live_url', url);
        updateBackendLiveUrl(url);
        pingLiveLink();
      }
    });
  }

  if (pingNowBtn) {
    pingNowBtn.addEventListener('click', () => {
      pingLiveLink();
    });
  }

  if (autoPingToggle) {
    autoPingToggle.addEventListener('change', () => {
      startKeepAliveLoop();
    });
  }

  if (clearLogsBtn && pingLogsList) {
    clearLogsBtn.addEventListener('click', () => {
      pingLogsList.innerHTML = '<div class="log-item log-info">Logs cleared.</div>';
    });
  }

})();


