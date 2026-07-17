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
  let scanResults = null;
  let scanFileInput = null;
  // Scan fullscreen overlay
  let scanFullscreen = null;
  let scanFSImage = null;
  let scanFSVideo = null;
  let scanSelectionBox = null;
  let scanStream = null;
  let scanCameras = [];
  let scanCurrentCamera = null;
  let scanCameraSelect = null;
  let scanRect = null;
  let scanHandles = [];
  let scanDragging = false;
  let scanResizing = false;
  let scanResizeCorner = null;
  let scanDragStartX = 0, scanDragStartY = 0;
  let scanDragOrigLeft = 0, scanDragOrigTop = 0;
  let scanResizeAnchorX = 0, scanResizeAnchorY = 0;
  let scanMode = 'camera'; // 'camera' or 'image'
  let scanFSImageData = null;

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
    scanResults = $('#scan-results');
    scanFileInput = $('#scan-file-input');
    scanFullscreen = $('#scan-fullscreen');
    scanFSImage = $('#scan-fs-image');
    scanFSVideo = $('#scan-fs-video');
    scanSelectionBox = $('#scan-selection-box');
    scanCameraSelect = $('#scan-fs-camera-select');

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
    // Open Camera button
    const cameraBtn = $('#btn-camera-start');
    if (cameraBtn) {
      cameraBtn.addEventListener('click', openScanCamera);
    }

    // Load Image button
    const galleryBtn = $('#btn-scan-gallery');
    if (galleryBtn && scanFileInput) {
      galleryBtn.addEventListener('click', function() { scanFileInput.click(); });
    }

    if (scanFileInput) {
      scanFileInput.addEventListener('change', function() {
        if (scanFileInput.files.length > 0) {
          openScanImage(scanFileInput.files[0]);
        }
      });
    }

    // Fullscreen: Close button
    const closeBtn = $('#scan-fs-close');
    if (closeBtn) closeBtn.addEventListener('click', closeScanFullscreen);

    // Fullscreen: Capture button
    const captureBtn = $('#scan-fs-capture');
    if (captureBtn) captureBtn.addEventListener('click', doScanCapture);

    // Fullscreen: ESC to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && scanFullscreen && scanFullscreen.classList.contains('active')) {
        closeScanFullscreen();
      }
    });

    // Initialize camera list
    initScanCameras();
  }

  async function initScanCameras() {
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

  // ==================== Scan: Fullscreen Overlay ====================

  async function openScanCamera() {
    scanMode = 'camera';
    // Get camera if needed
    if (!scanCurrentCamera) {
      await initScanCameras();
    }
    if (!scanCurrentCamera) {
      alert('No camera available.');
      return;
    }
    // Start stream
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, deviceId: { exact: scanCurrentCamera.deviceId } },
        audio: false
      });
      if (scanFSVideo) {
        scanFSVideo.srcObject = scanStream;
        scanFSVideo.style.display = '';
      }
      if (scanFSImage) scanFSImage.style.display = 'none';
    } catch (e) {
      console.error('Failed to start camera:', e);
      alert('Failed to start camera.');
      return;
    }

    showScanFullscreen();
    populateScanCameraSelect();
  }

  function openScanImage(file) {
    scanMode = 'image';
    const reader = new FileReader();
    reader.onload = function(e) {
      scanFSImageData = e.target.result;
      if (scanFSImage) {
        scanFSImage.src = e.target.result;
        scanFSImage.style.display = '';
      }
      if (scanFSVideo) scanFSVideo.style.display = 'none';
    };
    reader.readAsDataURL(file);
    showScanFullscreen();
    populateScanCameraSelect();
  }

  function showScanFullscreen() {
    if (!scanFullscreen) return;
    scanFullscreen.classList.add('active');
    // Init selection rectangle after a short delay (wait for video/image to render)
    setTimeout(function() {
      initScanSelection();
      addScanResizeHandles();
    }, 300);
  }

  function closeScanFullscreen() {
    if (!scanFullscreen) return;
    scanFullscreen.classList.remove('active');
    // Stop camera
    closeStream(scanStream);
    scanStream = null;
    if (scanFSVideo) { scanFSVideo.srcObject = null; scanFSVideo.style.display = 'none'; }
    if (scanFSImage) { scanFSImage.style.display = 'none'; scanFSImage.src = ''; }
    scanFSImageData = null;
    // Remove resize handles
    removeScanResizeHandles();
    // Remove selection box
    if (scanSelectionBox) scanSelectionBox.style.display = 'none';
    scanRect = null;
    // Reset buttons
    if (scanCameraSelect) scanCameraSelect.style.display = 'none';
  }

  async function switchScanCameraTo(deviceId) {
    if (scanMode !== 'camera') return;
    scanCurrentCamera = scanCameras.find(function(c) { return c.deviceId === deviceId; }) || scanCurrentCamera;
    closeStream(scanStream);
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, deviceId: { exact: scanCurrentCamera.deviceId } },
        audio: false
      });
      if (scanFSVideo) scanFSVideo.srcObject = scanStream;
    } catch (e) {
      console.error('Failed to switch camera:', e);
    }
  }

  function populateScanCameraSelect() {
    if (!scanCameraSelect) return;
    scanCameraSelect.innerHTML = '';
    if (scanMode === 'image' || scanCameras.length === 0) {
      scanCameraSelect.style.display = 'none';
      return;
    }
    scanCameras.forEach(function(cam, i) {
      const opt = document.createElement('option');
      opt.value = cam.deviceId;
      opt.textContent = cam.label || ('Camera ' + (i + 1));
      if (scanCurrentCamera && cam.deviceId === scanCurrentCamera.deviceId) {
        opt.selected = true;
      }
      scanCameraSelect.appendChild(opt);
    });
    scanCameraSelect.style.display = '';
    scanCameraSelect.disabled = scanCameras.length <= 1;
    // Change handler
    scanCameraSelect.onchange = function() {
      switchScanCameraTo(scanCameraSelect.value);
    };
  }

  // ==================== Scan: Selection Rectangle ====================

  function initScanSelection() {
    if (!scanSelectionBox) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const selW = Math.round(vw * 0.6);
    const selH = Math.round(vh * 0.6);
    const selL = Math.round((vw - selW) / 2);
    const selT = Math.round((vh - selH) / 2);

    scanRect = { left: selL, top: selT, width: selW, height: selH };
    applyScanRect(scanRect);
    scanSelectionBox.style.display = '';

    // Dragging setup
    setupScanSelectionDrag();
  }

  function applyScanRect(rect) {
    scanRect = rect;
    if (!scanSelectionBox) return;
    scanSelectionBox.style.left = rect.left + 'px';
    scanSelectionBox.style.top = rect.top + 'px';
    scanSelectionBox.style.width = rect.width + 'px';
    scanSelectionBox.style.height = rect.height + 'px';
    updateScanHandlePositions();
  }

  function setupScanSelectionDrag() {
    if (!scanSelectionBox) return;

    scanSelectionBox.onmousedown = function(e) {
      if (scanResizing) return;
      scanDragging = true;
      scanDragStartX = e.clientX;
      scanDragStartY = e.clientY;
      scanDragOrigLeft = scanRect.left;
      scanDragOrigTop = scanRect.top;
      e.preventDefault();
    };

    // Touch
    scanSelectionBox.ontouchstart = function(e) {
      if (scanResizing || e.touches.length !== 1) return;
      scanDragging = true;
      scanDragStartX = e.touches[0].clientX;
      scanDragStartY = e.touches[0].clientY;
      scanDragOrigLeft = scanRect.left;
      scanDragOrigTop = scanRect.top;
      e.preventDefault();
    };
  }

  // Global move/up handlers
  document.addEventListener('mousemove', function(e) {
    if (!scanDragging || !scanRect) return;
    const dx = e.clientX - scanDragStartX;
    const dy = e.clientY - scanDragStartY;
    const newLeft = Math.max(0, Math.min(window.innerWidth - scanRect.width, scanDragOrigLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - scanRect.height, scanDragOrigTop + dy));
    applyScanRect({ left: newLeft, top: newTop, width: scanRect.width, height: scanRect.height });
  });

  document.addEventListener('mouseup', function() {
    if (scanDragging) { scanDragging = false; }
    if (scanResizing) { scanResizing = false; scanResizeCorner = null; }
  });

  document.addEventListener('touchmove', function(e) {
    if (!scanDragging || !scanRect || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - scanDragStartX;
    const dy = e.touches[0].clientY - scanDragStartY;
    const newLeft = Math.max(0, Math.min(window.innerWidth - scanRect.width, scanDragOrigLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - scanRect.height, scanDragOrigTop + dy));
    applyScanRect({ left: newLeft, top: newTop, width: scanRect.width, height: scanRect.height });
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', function() {
    if (scanDragging) { scanDragging = false; }
    if (scanResizing) { scanResizing = false; scanResizeCorner = null; }
  });

  // ==================== Scan: Resize Handles ====================

  function addScanResizeHandles() {
    removeScanResizeHandles();
    if (!scanRect) return;
    const handleSize = window.innerWidth < 600 ? 16 : 12;
    const offset = handleSize / 2;
    const corners = [
      { id: 'nw', left: scanRect.left - offset, top: scanRect.top - offset, cursor: 'nwse-resize' },
      { id: 'ne', left: scanRect.left + scanRect.width - offset, top: scanRect.top - offset, cursor: 'nesw-resize' },
      { id: 'sw', left: scanRect.left - offset, top: scanRect.top + scanRect.height - offset, cursor: 'nesw-resize' },
      { id: 'se', left: scanRect.left + scanRect.width - offset, top: scanRect.top + scanRect.height - offset, cursor: 'nwse-resize' }
    ];

    corners.forEach(function(corner) {
      const h = document.createElement('div');
      h.className = 'scan-handle ' + corner.id;
      h.style.cssText =
        'position:fixed;z-index:9995;width:' + handleSize + 'px;height:' + handleSize + 'px;' +
        'background:#fff;border:1px solid #333;border-radius:2px;cursor:' + corner.cursor + ';' +
        'left:' + corner.left + 'px;top:' + corner.top + 'px;';
      h.setAttribute('data-corner', corner.id);
      h.addEventListener('mousedown', function(e) {
        e.stopPropagation(); e.preventDefault();
        startScanResize(corner.id, e.clientX, e.clientY);
      });
      h.addEventListener('touchstart', function(e) {
        e.stopPropagation(); e.preventDefault();
        if (e.touches.length === 1) {
          startScanResize(corner.id, e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });
      document.body.appendChild(h);
      scanHandles.push(h);
    });
  }

  function removeScanResizeHandles() {
    scanHandles.forEach(function(h) { h.remove(); });
    scanHandles = [];
  }

  function updateScanHandlePositions() {
    if (!scanRect) return;
    const handleSize = window.innerWidth < 600 ? 16 : 12;
    const offset = handleSize / 2;
    const corners = {
      nw: { left: scanRect.left - offset, top: scanRect.top - offset },
      ne: { left: scanRect.left + scanRect.width - offset, top: scanRect.top - offset },
      sw: { left: scanRect.left - offset, top: scanRect.top + scanRect.height - offset },
      se: { left: scanRect.left + scanRect.width - offset, top: scanRect.top + scanRect.height - offset }
    };

    scanHandles.forEach(function(h) {
      const id = h.getAttribute('data-corner');
      if (corners[id]) {
        h.style.left = corners[id].left + 'px';
        h.style.top = corners[id].top + 'px';
      }
    });
  }

  function startScanResize(corner, cx, cy) {
    scanResizing = true;
    scanResizeCorner = corner;
    // Anchor = opposite corner
    switch (corner) {
      case 'nw':
        scanResizeAnchorX = scanRect.left + scanRect.width;
        scanResizeAnchorY = scanRect.top + scanRect.height;
        break;
      case 'ne':
        scanResizeAnchorX = scanRect.left;
        scanResizeAnchorY = scanRect.top + scanRect.height;
        break;
      case 'sw':
        scanResizeAnchorX = scanRect.left + scanRect.width;
        scanResizeAnchorY = scanRect.top;
        break;
      case 'se':
        scanResizeAnchorX = scanRect.left;
        scanResizeAnchorY = scanRect.top;
        break;
    }
  }

  // Resize move handler (global)
  document.addEventListener('mousemove', function(e) {
    if (!scanResizing || !scanRect) return;
    if (e.target && scanHandles.indexOf(e.target) === -1 && e.target !== scanSelectionBox) return;
    resizeScanRect(e.clientX, e.clientY);
  });

  document.addEventListener('touchmove', function(e) {
    if (!scanResizing || !scanRect || e.touches.length !== 1) return;
    resizeScanRect(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });

  function resizeScanRect(cx, cy) {
    let newLeft = Math.min(scanResizeAnchorX, cx);
    let newTop = Math.min(scanResizeAnchorY, cy);
    let newWidth = Math.abs(cx - scanResizeAnchorX);
    let newHeight = Math.abs(cy - scanResizeAnchorY);

    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);
    if (newLeft + newWidth > window.innerWidth) newWidth = window.innerWidth - newLeft;
    if (newTop + newHeight > window.innerHeight) newHeight = window.innerHeight - newTop;
    if (newWidth < 20) { newWidth = 20; newLeft = cx > scanResizeAnchorX ? scanResizeAnchorX : scanResizeAnchorX - 20; }
    if (newHeight < 20) { newHeight = 20; newTop = cy > scanResizeAnchorY ? scanResizeAnchorY : scanResizeAnchorY - 20; }

    applyScanRect({ left: newLeft, top: newTop, width: newWidth, height: newHeight });
  }

  // ==================== Scan: Capture & Translate ====================

  function doScanCapture() {
    if (!scanRect) return;
    const rect = scanRect;

    let sourceW, sourceH, sourceEl;
    if (scanMode === 'camera' && scanFSVideo && scanFSVideo.videoWidth) {
      sourceW = scanFSVideo.videoWidth;
      sourceH = scanFSVideo.videoHeight;
      sourceEl = scanFSVideo;
    } else if (scanMode === 'image' && scanFSImage && scanFSImage.naturalWidth) {
      sourceW = scanFSImage.naturalWidth;
      sourceH = scanFSImage.naturalHeight;
      sourceEl = scanFSImage;
    } else {
      return;
    }

    // Calculate scale: the video/image is object-fit:contain within the fullscreen area
    const displayW = window.innerWidth;
    const displayH = window.innerHeight;
    const sourceAspect = sourceW / sourceH;
    const displayAspect = displayW / displayH;
    let renderW, renderH, offsetX, offsetY;

    if (sourceAspect > displayAspect) {
      renderH = displayH;
      renderW = renderH * sourceAspect;
      offsetX = (renderW - displayW) / 2;
      offsetY = 0;
    } else {
      renderW = displayW;
      renderH = renderW / sourceAspect;
      offsetX = 0;
      offsetY = (renderH - displayH) / 2;
    }

    const scaleX = sourceW / renderW;
    const scaleY = sourceH / renderH;

    let sx = (rect.left + offsetX) * scaleX;
    let sy = (rect.top + offsetY) * scaleY;
    let sw = rect.width * scaleX;
    let sh = rect.height * scaleY;

    // Clamp
    sx = Math.max(0, Math.min(sourceW - 1, sx));
    sy = Math.max(0, Math.min(sourceH - 1, sy));
    sw = Math.max(1, Math.min(sourceW - sx, sw));
    sh = Math.max(1, Math.min(sourceH - sy, sh));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceEl, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataURL = canvas.toDataURL('image/jpeg', 0.9);

    // Close fullscreen then translate
    closeScanFullscreen();
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

    // Click to show detail modal
    container.addEventListener('click', function() {
      showScanResultModal(regionMap);
    });

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
