// Main Application Shell
// Tab navigation, UI management, and integration of all modules

(function() {
  'use strict';

  // ==================== DOM References ====================
  const $ = function(s) { return document.querySelector(s); };
  const $$ = function(s) { return document.querySelectorAll(s); };

  // Tabs
  const tabButtons = {};
  const tabPanels = {};

  // Translate tab
  let translateImgSource = null;
  let translateImgTarget = null;
  let translateFileInput = null;
  let translateDropZone = null;
  let translateBtn = null;
  let translateShowChk = null;
  let translateContainer = null;
  let translateOverlay = null;
  let translateBoxes = [];
  let translateScale = 1.0;
  let translateOriginalDataURL = null;

  // Scan tab
  let scanVideo = null;
  let scanCanvas = null;
  let scanStream = null;
  let scanActive = false;
  let scanCameras = [];
  let scanCurrentCamera = null;
  let scanRegion = null;
  let scanResults = null;
  let scanFileInput = null;

  // Settings tab
  let settingsForm = null;

  // Shared
  let statusMask = null;
  let statusText = null;
  let textModal = null;

  // ==================== Initialization ====================

  function init() {
    // Cache DOM
    cacheDOMElements();
    // Set up tabs
    setupTabs();
    // Set up Translate tab
    setupTranslateTab();
    // Set up Scan tab
    setupScanTab();
    // Set up Settings tab
    setupSettingsTab();
    // Set up text modal
    setupTextModal();
    // Set up status mask
    setupStatusMask();
    // Apply UI language
    applyI18n();

    // Show translate tab by default
    switchTab('translate');
  }

  function cacheDOMElements() {
    // Tab buttons
    ['translate', 'scan', 'settings'].forEach(function(id) {
      tabButtons[id] = $('#tab-' + id);
    });
    // Tab panels
    ['translate', 'scan', 'settings'].forEach(function(id) {
      tabPanels[id] = $('#panel-' + id);
    });

    // Translate
    translateImgSource = $('#img-source');
    translateImgTarget = $('#img-target');
    translateFileInput = $('#translate-file-input');
    translateDropZone = $('#translate-drop-zone');
    translateBtn = $('#btn-translate');
    translateShowChk = $('#chk-show-translated');
    translateContainer = $('#translate-image-container');
    translateOverlay = $('#translate-text-overlay');

    // Scan
    scanVideo = $('#scan-video');
    scanCanvas = $('#scan-canvas');
    scanResults = $('#scan-results');
    scanFileInput = $('#scan-file-input');

    // Settings
    settingsForm = $('#settings-form');

    // Shared
    statusMask = $('#status-mask');
    statusText = $('#status-text');
    textModal = $('#text-modal');
  }

  // ==================== Tab Navigation ====================

  function setupTabs() {
    Object.keys(tabButtons).forEach(function(tabId) {
      tabButtons[tabId].addEventListener('click', function() {
        switchTab(tabId);
      });
    });
  }

  function switchTab(tabId) {
    // Update buttons
    Object.keys(tabButtons).forEach(function(id) {
      tabButtons[id].classList.toggle('active', id === tabId);
    });
    // Update panels
    Object.keys(tabPanels).forEach(function(id) {
      tabPanels[id].classList.toggle('hidden', id !== tabId);
    });
  }

  // ==================== Status Mask ====================

  function setupStatusMask() {
    // mask is created in HTML
  }

  function showStatus(msg) {
    if (statusMask) {
      statusMask.style.display = 'flex';
      if (statusText) statusText.textContent = msg;
    }
  }

  function hideStatus() {
    if (statusMask) {
      statusMask.style.display = 'none';
    }
  }

  // ==================== Text Modal ====================

  function setupTextModal() {
    if (!textModal) return;
    const closeBtn = textModal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        textModal.style.display = 'none';
      });
    }
    textModal.addEventListener('click', function(e) {
      if (e.target === textModal) {
        textModal.style.display = 'none';
      }
    });

    // TTS button
    const ttsBtn = textModal.querySelector('.modal-tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const sourceText = textModal.getAttribute('data-source-text') || '';
        const ttsVoice = Settings.get('tts');
        let voice;
        if (ttsVoice && typeof getVoiceByName === 'function') {
          voice = getVoiceByName(ttsVoice);
        }
        if (typeof speak === 'function') {
          speak(sourceText, voice);
        }
      });
    }

    // Copy button
    const copyBtn = textModal.querySelector('.modal-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const sourceText = textModal.getAttribute('data-source-text') || '';
        const targetText = textModal.getAttribute('data-target-text') || '';
        navigator.clipboard.writeText(sourceText + '\n' + targetText).then(function() {
          copyBtn.textContent = '✓';
          setTimeout(function() { copyBtn.textContent = t('scan_copy'); }, 1500);
        });
      });
    }
  }

  function showTextModal(sourceText, targetText, box) {
    if (!textModal) return;
    textModal.setAttribute('data-source-text', sourceText);
    textModal.setAttribute('data-target-text', targetText);
    const sourceEl = textModal.querySelector('.modal-source');
    const targetEl = textModal.querySelector('.modal-target');
    if (sourceEl) sourceEl.textContent = sourceText;
    if (targetEl) targetEl.textContent = targetText;
    textModal.style.display = 'flex';
  }

  // ==================== Translate Tab ====================

  function setupTranslateTab() {
    // File input
    if (translateFileInput) {
      translateFileInput.addEventListener('change', function() {
        if (translateFileInput.files.length > 0) {
          loadTranslateImage(translateFileInput.files[0]);
        }
      });
    }

    // Drop zone
    if (translateDropZone) {
      translateDropZone.addEventListener('click', function() {
        if (translateFileInput) translateFileInput.click();
      });

      translateDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        translateDropZone.classList.add('drag-over');
      });

      translateDropZone.addEventListener('dragleave', function() {
        translateDropZone.classList.remove('drag-over');
      });

      translateDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        translateDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          loadTranslateImage(e.dataTransfer.files[0]);
        }
      });
    }

    // Paste support
    document.addEventListener('paste', function(e) {
      if (tabPanels['translate'] && !tabPanels['translate'].classList.contains('hidden')) {
        if (e.clipboardData.files.length > 0) {
          e.preventDefault();
          loadTranslateImage(e.clipboardData.files[0]);
        }
      }
    });

    // Translate button
    if (translateBtn) {
      translateBtn.addEventListener('click', doTranslate);
    }

    // Show translated checkbox
    if (translateShowChk) {
      translateShowChk.addEventListener('change', function() {
        toggleTranslatedView(translateShowChk.checked);
      });
    }

    // Text box click handler
    if (translateContainer) {
      translateContainer.addEventListener('textbox-click', function(e) {
        const box = e.detail.box;
        const sourceText = box.text || box.source || '';
        const targetText = box.target || '';
        showTextModal(sourceText, targetText, box);
      });
    }

    // Target image load handler
    if (translateImgTarget) {
      translateImgTarget.addEventListener('load', function() {
        if (translateBoxes.length > 0 && translateImgTarget.src !== translateImgSource.src) {
          // ImageTrans returned a translated image with boxes
          Render.createTextOverlay(translateContainer, translateBoxes, translateImgTarget, translateScale);
          if (translateShowChk) translateShowChk.checked = true;
          toggleTranslatedView(true);
        }
      });
    }
  }

  function loadTranslateImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      translateOriginalDataURL = e.target.result;
      if (translateImgSource) {
        translateImgSource.src = e.target.result;
        translateImgSource.style.display = '';
      }
      if (translateImgTarget) {
        translateImgTarget.style.display = 'none';
      }
      // Clear overlay
      if (translateOverlay) {
        translateOverlay.innerHTML = '';
      }
      translateBoxes = [];
      translateScale = 1.0;
      // Hide drop zone
      if (translateDropZone) translateDropZone.classList.add('hidden');
    };
    reader.onerror = function() {
      alert('Failed to load image.');
    };
    reader.readAsDataURL(file);
  }

  async function doTranslate() {
    if (!translateImgSource || !translateImgSource.src || translateImgSource.src === window.location.href) {
      alert('Please load an image first.');
      return;
    }

    showStatus(t('translating'));
    translateBtn.disabled = true;

    try {
      const img = translateImgSource;
      const dataURL = Render.imageToDataURL(img, 'image/webp', 0.8);

      // Compress if needed
      let finalDataURL = dataURL;
      if (img.naturalWidth > 1500) {
        const compressed = Render.compressImage(img, 1500);
        finalDataURL = compressed.dataURL;
        translateScale = 1500 / img.naturalWidth;
      }

      // Validate language pair
      const sourceLang = Settings.get('sourceLang');
      const targetLang = Settings.get('targetLang');
      const translationMode = Settings.get('translationMode');
      const useOpenAI = Settings.get('useOpenAI');
      const serverURL = Settings.get('serverURL');

      if (useOpenAI && Settings.get('ocrMethod') === 'paddleocr' && sourceLang === 'auto') {
        alert(t('alert_set_langpair'));
        hideStatus();
        translateBtn.disabled = false;
        return;
      }
      if (translationMode === 'local' && (sourceLang === 'auto' || targetLang === 'auto')) {
        alert(t('alert_set_langpair'));
        hideStatus();
        translateBtn.disabled = false;
        return;
      }
      if (serverURL.indexOf('https://service.basiccat.org:51043') !== -1 &&
          (sourceLang === 'auto' || targetLang === 'auto') &&
          translationMode === 'imagetrans' && !useOpenAI) {
        alert(t('alert_set_langpair'));
        hideStatus();
        translateBtn.disabled = false;
        return;
      }

      const result = await Translate.translateImage(finalDataURL, {});

      if (result.noText) {
        alert(t('no_text'));
        hideStatus();
        translateBtn.disabled = false;
        return;
      }

      translateBoxes = result.boxes;

      if (result.translatedImage && !result.renderTextInFrontend) {
        // Server returned a rendered image
        if (translateImgTarget) {
          translateImgTarget.src = result.translatedImage;
        }
      } else if (result.boxes.length > 0) {
        // Render text on canvas
        const renderedDataURL = await Render.renderTranslatedImage(finalDataURL, result.boxes);
        if (translateImgTarget) {
          translateImgTarget.src = renderedDataURL;
        }
        if (translateImgSource) {
          translateImgSource.style.display = 'none';
        }
        if (translateImgTarget) {
          translateImgTarget.style.display = '';
        }
        // Create text overlay for click-to-inspect
        Render.createTextOverlay(translateContainer, result.boxes, translateImgTarget, translateScale);
        if (translateShowChk) translateShowChk.checked = true;
      }

    } catch (err) {
      console.error('Translation error:', err);
      if (err.message === 'LANGPAIR_REQUIRED') {
        alert(t('alert_set_langpair'));
      } else {
        alert(t('error_server') + ' ' + err.message);
      }
    }

    hideStatus();
    translateBtn.disabled = false;
  }

  function toggleTranslatedView(showTranslated) {
    if (!translateImgSource || !translateImgTarget) return;
    if (showTranslated) {
      if (translateImgTarget.src && translateImgTarget.src !== window.location.href) {
        translateImgSource.style.display = 'none';
        translateImgTarget.style.display = '';
        Render.showTextOverlay(translateContainer);
      }
    } else {
      translateImgSource.style.display = '';
      translateImgTarget.style.display = 'none';
      Render.hideTextOverlay(translateContainer);
    }
  }

  // ==================== Scan Tab ====================

  function setupScanTab() {
    // Camera start button
    const cameraStartBtn = $('#btn-camera-start');
    if (cameraStartBtn) {
      cameraStartBtn.addEventListener('click', function() {
        if (scanActive) {
          stopCamera();
        } else {
          startCamera();
        }
      });
    }

    // Camera switch button
    const cameraSwitchBtn = $('#btn-camera-switch');
    if (cameraSwitchBtn) {
      cameraSwitchBtn.addEventListener('click', switchCamera);
    }

    // Capture button
    const captureBtn = $('#btn-scan-capture');
    if (captureBtn) {
      captureBtn.addEventListener('click', doScanCapture);
    }

    // Gallery/file button
    const galleryBtn = $('#btn-scan-gallery');
    if (galleryBtn && scanFileInput) {
      galleryBtn.addEventListener('click', function() {
        scanFileInput.click();
      });
    }

    if (scanFileInput) {
      scanFileInput.addEventListener('change', function() {
        if (scanFileInput.files.length > 0) {
          loadScanImage(scanFileInput.files[0]);
        }
      });
    }

    // Region overlay click for dragging
    const regionOverlay = $('#scan-region-overlay');
    if (regionOverlay) {
      setupRegionDragging(regionOverlay);
    }

    // Initialize camera list
    initCameras();
  }

  async function initCameras() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      closeStream(stream);
      const devices = await navigator.mediaDevices.enumerateDevices();
      scanCameras = devices.filter(function(d) { return d.kind === 'videoinput'; });
      scanCurrentCamera = scanCameras.length > 0 ? scanCameras[scanCameras.length - 1] : null;
    } catch (e) {
      console.log('Camera permission denied or no camera available');
    }
  }

  async function startCamera() {
    if (!scanCurrentCamera) {
      try {
        await initCameras();
      } catch (e) {
        alert('No camera available.');
        return;
      }
    }
    if (!scanCurrentCamera) return;

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, deviceId: { exact: scanCurrentCamera.deviceId } },
        audio: false
      });
      if (scanVideo) {
        scanVideo.srcObject = scanStream;
        scanVideo.style.display = '';
      }
      scanActive = true;
      updateCameraUI();
      drawScanRegion();
    } catch (e) {
      console.error('Failed to start camera:', e);
      alert('Failed to start camera.');
    }
  }

  function stopCamera() {
    closeStream(scanStream);
    scanStream = null;
    scanActive = false;
    if (scanVideo) {
      scanVideo.srcObject = null;
      scanVideo.style.display = 'none';
    }
    updateCameraUI();
  }

  async function switchCamera() {
    if (scanCameras.length < 2) return;
    const currentIdx = scanCameras.indexOf(scanCurrentCamera);
    const nextIdx = (currentIdx + 1) % scanCameras.length;
    scanCurrentCamera = scanCameras[nextIdx];
    if (scanActive) {
      await stopCamera();
      await startCamera();
    }
  }

  function updateCameraUI() {
    const cameraStartBtn = $('#btn-camera-start');
    if (cameraStartBtn) {
      cameraStartBtn.textContent = scanActive ? t('camera_stop') : t('camera_start');
    }
    const cameraSwitchBtn = $('#btn-camera-switch');
    if (cameraSwitchBtn) {
      cameraSwitchBtn.style.display = scanCameras.length > 1 ? '' : 'none';
    }
    const captureBtn = $('#btn-scan-capture');
    if (captureBtn) {
      captureBtn.style.display = scanActive ? '' : 'none';
    }
    const regionOverlay = $('#scan-region-overlay');
    if (regionOverlay) {
      regionOverlay.style.display = scanActive ? '' : 'none';
    }
  }

  function drawScanRegion() {
    if (!scanVideo || !scanVideo.videoWidth) return;
    const region = Settings.get('region');
    const overlay = $('#scan-region');
    if (!overlay) return;
    const width = scanVideo.clientWidth;
    const height = scanVideo.clientHeight;
    if (!width || !height) return;
    const r = region || { left: 20, right: 80, top: 20, bottom: 60 };
    overlay.style.left = (r.left / 100 * width) + 'px';
    overlay.style.top = (r.top / 100 * height) + 'px';
    overlay.style.width = ((r.right - r.left) / 100 * width) + 'px';
    overlay.style.height = ((r.bottom - r.top) / 100 * height) + 'px';
    scanRegion = r;
  }

  function setupRegionDragging(overlayEl) {
    // Region dragging is handled by the scan-region element itself
    // (using the overlay's built-in drag behavior)
    let dragging = false, startX, startY, origLeft, origTop;

    const regionRect = $('#scan-region');
    if (!regionRect) return;

    regionRect.addEventListener('mousedown', function(e) {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = regionRect.offsetLeft;
      origTop = regionRect.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      regionRect.style.left = Math.max(0, origLeft + dx) + 'px';
      regionRect.style.top = Math.max(0, origTop + dy) + 'px';
    });

    document.addEventListener('mouseup', function() {
      if (dragging) {
        dragging = false;
        // Update region percentages
        const containerWidth = overlayEl.clientWidth;
        const containerHeight = overlayEl.clientHeight;
        if (containerWidth && containerHeight) {
          const left = regionRect.offsetLeft / containerWidth * 100;
          const top = regionRect.offsetTop / containerHeight * 100;
          const right = (regionRect.offsetLeft + regionRect.offsetWidth) / containerWidth * 100;
          const bottom = (regionRect.offsetTop + regionRect.offsetHeight) / containerHeight * 100;
          const newRegion = { left: Math.round(left), right: Math.round(right), top: Math.round(top), bottom: Math.round(bottom) };
          Settings.set('region', newRegion);
          scanRegion = newRegion;
        }
      }
    });
  }

  function loadScanImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataURL = e.target.result;
      doScanTranslate(dataURL);
    };
    reader.readAsDataURL(file);
  }

  function doScanCapture() {
    if (!scanVideo || !scanVideo.videoWidth) return;
    const region = scanRegion || Settings.get('region');
    const vw = scanVideo.videoWidth;
    const vh = scanVideo.videoHeight;
    const dw = scanVideo.clientWidth;
    const dh = scanVideo.clientHeight;

    const scaleX = vw / dw;
    const scaleY = vh / dh;

    const sx = region.left / 100 * dw * scaleX;
    const sy = region.top / 100 * dh * scaleY;
    const sw = (region.right - region.left) / 100 * dw * scaleX;
    const sh = (region.bottom - region.top) / 100 * dh * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(scanVideo, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    doScanTranslate(dataURL);
  }

  async function doScanTranslate(dataURL) {
    showStatus(t('translating'));

    try {
      const result = await Translate.translateRegion(dataURL, {});

      if (result.regionMap) {
        addScanResult(dataURL, result.regionMap);
        showScanResultModal(result.regionMap);
      }
    } catch (err) {
      console.error('Scan translation error:', err);
      alert(t('error_server') + ' ' + err.message);
    }

    hideStatus();
  }

  function addScanResult(dataURL, regionMap) {
    if (!scanResults) return;
    const container = document.createElement('div');
    container.className = 'scan-result';

    const img = document.createElement('img');
    img.src = dataURL;
    container.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.className = 'scan-result-text';
    let displayText = regionMap.source + '\n';
    const targets = regionMap.target || [];
    targets.forEach(function(t) {
      displayText += (t.engine || '') + ': ' + t.text + '\n';
    });
    textDiv.textContent = displayText;
    container.appendChild(textDiv);

    scanResults.insertBefore(container, scanResults.firstChild);
  }

  function showScanResultModal(regionMap) {
    const sourceText = regionMap.source || '';
    const targets = regionMap.target || [];
    let targetText = '';
    targets.forEach(function(t) {
      if (targetText) targetText += '\n';
      targetText += (t.engine ? t.engine + ': ' : '') + t.text;
    });
    showTextModal(sourceText, targetText);
  }

  // ==================== Settings Tab ====================

  function populateSelectOptions() {
    // Populate source/target language selects
    const sourceSelect = $('#setting-sourceLang');
    const targetSelect = $('#setting-targetLang');
    if (sourceSelect) {
      LANGUAGE_CODES.forEach(function(lang) {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        sourceSelect.appendChild(opt);
      });
    }
    if (targetSelect) {
      LANGUAGE_CODES.forEach(function(lang) {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        targetSelect.appendChild(opt);
      });
    }
  }

  function setupSettingsTab() {
    // Populate select options first
    populateSelectOptions();
    // Populate form with current settings
    populateSettingsForm();
    // Save button
    const saveBtn = $('#btn-settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    // Public server button
    const publicBtn = $('#btn-public-server');
    if (publicBtn) {
      publicBtn.addEventListener('click', function() {
        const urlInput = $('#setting-serverURL');
        if (urlInput) urlInput.value = 'https://service.basiccat.org:51043';
      });
    }
    // Local server button
    const localBtn = $('#btn-local-server');
    if (localBtn) {
      localBtn.addEventListener('click', function() {
        const urlInput = $('#setting-serverURL');
        if (urlInput) urlInput.value = 'https://local.basiccat.org:51043';
      });
    }
    // Check instances button
    const checkBtn = $('#btn-check-instances');
    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        const url = $('#setting-serverURL').value;
        if (url) {
          window.open(url + '/list', '_blank');
        } else {
          window.open('https://local.basiccat.org:51043/list', '_blank');
        }
      });
    }
    // OpenAI toggle
    const openaiChk = $('#setting-useOpenAI');
    if (openaiChk) {
      openaiChk.addEventListener('change', function() {
        const section = $('#openai-section');
        if (section) section.style.display = openaiChk.checked ? 'block' : 'none';
      });
    }
    // CSS preset buttons
    setupCSSPresets();
    // UI Language change
    const uiLangSelect = $('#setting-uiLanguage');
    if (uiLangSelect) {
      uiLangSelect.addEventListener('change', function() {
        Settings.set('uiLanguage', uiLangSelect.value);
        applyI18n();
      });
    }
  }

  function populateSettingsForm() {
    const fields = [
      'serverURL', 'displayName', 'password',
      'sourceLang', 'targetLang', 'translationMode', 'defaultPresetTranslation',
      'useOpenAI', 'openaiURL', 'openaiKey', 'openaiModel', 'openaiPrompt',
      'ocrMethod', 'useYOLODetection', 'useYOLOForJapanese',
      'xSpacing', 'ySpacing', 'renderTextCSS', 'renderTextInFrontend',
      'uiLanguage'
    ];

    fields.forEach(function(key) {
      const el = $('#setting-' + key);
      if (!el) return;
      const val = Settings.get(key);
      if (el.type === 'checkbox') {
        el.checked = val;
      } else if (el.tagName === 'SELECT') {
        setSelectValue(el, val);
      } else {
        el.value = val !== undefined && val !== null ? val : '';
      }
    });

    // Show/hide OpenAI section
    const openaiSection = $('#openai-section');
    if (openaiSection) {
      openaiSection.style.display = Settings.get('useOpenAI') ? 'block' : 'none';
    }
  }

  function saveSettings() {
    const data = {};
    const fields = [
      'serverURL', 'displayName', 'password',
      'sourceLang', 'targetLang', 'translationMode', 'defaultPresetTranslation',
      'useOpenAI', 'openaiURL', 'openaiKey', 'openaiModel', 'openaiPrompt',
      'ocrMethod', 'useYOLODetection', 'useYOLOForJapanese',
      'xSpacing', 'ySpacing', 'renderTextCSS', 'renderTextInFrontend',
      'uiLanguage'
    ];

    fields.forEach(function(key) {
      const el = $('#setting-' + key);
      if (!el) return;
      if (el.type === 'checkbox') {
        data[key] = el.checked;
      } else if (el.type === 'number') {
        data[key] = parseInt(el.value) || Settings.get(key);
      } else {
        data[key] = el.value;
      }
    });

    Settings.saveAll(data);
    alert(t('settings_saved'));
  }

  function setupCSSPresets() {
    const presets = {
      'css-default': 'text-align: center;\nborder-radius: 10%;',
      'css-center': 'text-align: center;',
      'css-center-bold': 'text-align: center;\nfont-weight: bold;',
      'css-rounded': 'text-align: center;\nborder-radius: 8px;',
      'css-uppercase': 'text-align: center;\ntext-transform: uppercase;',
      'css-rounded-uppercase': 'text-align: center;\nborder-radius: 8px;\ntext-transform: uppercase;'
    };

    Object.keys(presets).forEach(function(id) {
      const btn = $('#' + id);
      if (btn) {
        btn.addEventListener('click', function() {
          const el = $('#setting-renderTextCSS');
          if (el) el.value = presets[id];
        });
      }
    });
  }

  // ==================== I18N ====================

  function applyI18n() {
    const elements = document.querySelectorAll('[data-i18n]');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const key = el.getAttribute('data-i18n');
      if (key) {
        if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
          el.value = t(key);
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = t(key);
        } else {
          el.textContent = t(key);
        }
      }
    }
  }

  // ==================== Utility Functions ====================

  function closeStream(stream) {
    if (stream) {
      stream.getTracks().forEach(function(track) { track.stop(); });
    }
  }

  function setSelectValue(selectEl, value) {
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value) {
        selectEl.selectedIndex = i;
        return;
      }
    }
  }

  // ==================== Initialize ====================

  // Wait for DOM + TTS voices
  document.addEventListener('DOMContentLoaded', function() {
    init();
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

  // Window resize handler for scan region
  window.addEventListener('resize', function() {
    if (scanActive) {
      drawScanRegion();
    }
  });

  // TTS voice loading
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() {
      if (typeof loadVoices === 'function') loadVoices();
    };
  }
  if (typeof loadVoices === 'function') loadVoices();

})();
