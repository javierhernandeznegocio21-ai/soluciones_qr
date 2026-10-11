/* ==========================================================================
   QR Flow - Core Application Logic with Direct SMTP Email Dispatch
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Safe Event Listener helper to prevent any Uncaught TypeError if any element is absent
  function safeOn(el, event, handler, options) {
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener(event, handler, options);
    }
  }

  // --- State Variables ---
  let parsedCsvRows = [];
  let generatedQrCodes = []; // Array of { data, dataUrl, filename, email, name, empId, emailSent, emailError }
  let batchCancelled = false;
  let isSendingBatchEmails = false;
  
  // Activity and Error Logging State
  let emailActivityLogs = []; // Array of { id, timestamp, fullTime, type: 'error' | 'success', name, email, empId, error, suggestion, endpoint }
  let activeLogsFilter = 'all';

  // Gallery Pagination State
  let galleryCurrentPage = 1;
  const galleryItemsPerPage = 24;

  // Server & Template State
  let serverConfig = null;
  let emailTemplateHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-top: 5px solid #4f46e5; }
    h2 { color: #1e293b; margin-top: 0; font-size: 22px; }
    p { color: #475569; font-size: 15px; line-height: 1.6; }
    .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: bold; padding: 6px 12px; border-radius: 6px; font-size: 14px; margin-bottom: 15px; }
    .qr-box { text-align: center; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px dashed #cbd5e1; }
    .qr-box img { max-width: 220px; height: auto; display: block; margin: 0 auto; }
    .btn-reserve { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 0; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>¡Hola, Colaborador {nombre}!</h2>    
    <p>Te compartimos tu código QR personal e intransferible para el uso del servicio de comedor del corporativo de Montes Urales.</p> 
    <p>Te recomendamos guardarlo y presentarlo cada vez que hagas uso del servicio.</p>
    <p>Nos da mucho gusto recibirte y ofrecerte alimentos de calidad y una excelente atención.</p>
    
    <p style="text-align: center;">
        <a href="https://comedor.gilou.com.mx/public/reservar" target="_blank" class="btn-reserve">
            <span>Hacer Reserva</span>
        </a>
    </p>

    <div class="badge">Empleado No. {num_empleado}</div>        
    <div class="qr-box">      
        <img src="cid:qr_image" alt="Código QR">      
        <p style="font-size: 13px; color: #64748b; margin-top: 10px;">Escanea este código en las terminales de lectura.</p>    
    </div>        
    <p>Por favor conserva este mensaje o guarda la imagen adjunta en tu dispositivo móvil.</p>    
    <div class="footer">Este es un correo automático, por favor no respondas a este mensaje.</div>  
  </div>
</body>
</html>`;

  // --- DOM Elements ---
  const htmlElement = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Status Badge & Server Modal Elements
  const smtpStatusBtn = document.getElementById('smtp-status-btn');
  const smtpStatusText = document.getElementById('smtp-status-text');
  const serverInfoModal = document.getElementById('server-info-modal');
  const btnCloseServerModal = document.getElementById('btn-close-server-modal');
  const btnCloseServerInfo = document.getElementById('btn-close-server-info');
  const btnRetryServerConn = document.getElementById('btn-retry-server-conn');
  const btnCopyServerCmd = document.getElementById('btn-copy-server-cmd');
  const serverActiveView = document.getElementById('server-status-active-view');
  const serverInactiveView = document.getElementById('server-status-inactive-view');
  const infoServerHost = document.getElementById('info-server-host');
  const infoServerUser = document.getElementById('info-server-user');
  const infoServerSender = document.getElementById('info-server-sender');
  const infoServerDelay = document.getElementById('info-server-delay');
  const infoServerMode = document.getElementById('info-server-mode');

  // Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Accordions
  const advSettingsToggle = document.getElementById('adv-settings-toggle');
  const advSettingsContent = document.getElementById('adv-settings-content');
  const batchAdvToggle = document.getElementById('batch-adv-toggle');
  const batchAdvContent = document.getElementById('batch-adv-content');
  const singleMailToggle = document.getElementById('single-mail-toggle');
  const singleMailContent = document.getElementById('single-mail-content');

  // Color & Range Pickers Sync
  const colorDark = document.getElementById('color-dark');
  const colorDarkHex = document.getElementById('color-dark-hex');
  const colorLight = document.getElementById('color-light');
  const colorLightHex = document.getElementById('color-light-hex');
  const qrMarginRange = document.getElementById('qr-margin');
  const qrMarginVal = document.getElementById('margin-val');

  const batchColorDark = document.getElementById('batch-color-dark');
  const batchColorDarkHex = document.getElementById('batch-color-dark-hex');
  const batchColorLight = document.getElementById('batch-color-light');
  const batchColorLightHex = document.getElementById('batch-color-light-hex');
  const batchQrMarginRange = document.getElementById('batch-qr-margin');
  const batchQrMarginVal = document.getElementById('batch-margin-val');

  // Single QR Components
  const singleInput = document.getElementById('single-input');
  const charCounter = document.getElementById('char-count');
  const singleQrCanvas = document.getElementById('single-qr-canvas');
  const singlePlaceholder = document.getElementById('single-placeholder');
  const singleActions = document.getElementById('single-actions');
  const qrEccSelect = document.getElementById('qr-ecc');
  const qrSizeSelect = document.getElementById('qr-size');
  
  // Single Email Inputs & Buttons
  const singleEmpName = document.getElementById('single-emp-name');
  const singleEmpId = document.getElementById('single-emp-id');
  const singleEmpEmail = document.getElementById('single-emp-email');
  const btnCopyQr = document.getElementById('btn-copy-qr');
  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnPreviewEmail = document.getElementById('btn-preview-email');
  const btnSingleSendEmail = document.getElementById('btn-single-send-email');
  const singleAutoSend = document.getElementById('single-auto-send');

  // Batch QR Components (CSV)
  const dropZone = document.getElementById('drop-zone');
  const csvFileInput = document.getElementById('csv-file-input');
  const mappingCard = document.getElementById('mapping-card');
  const fileInfoText = document.getElementById('file-info-text');
  const btnResetCsv = document.getElementById('btn-reset-csv');
  const csvPreviewContainer = document.getElementById('csv-preview-container');
  const csvPreviewThead = document.getElementById('csv-preview-thead');
  const csvPreviewTbody = document.getElementById('csv-preview-tbody');
  const csvPreviewBadge = document.getElementById('csv-preview-badge');
  
  // CSV Column Selectors
  const csvColData = document.getElementById('csv-col-data');
  const csvColFilename = document.getElementById('csv-col-filename');
  const csvColEmail = document.getElementById('csv-col-email');
  const csvColName = document.getElementById('csv-col-name');
  const csvColEmpid = document.getElementById('csv-col-empid');
  const batchQrEccSelect = document.getElementById('batch-qr-ecc');

  // Batch Email Options
  const batchEnableEmail = document.getElementById('batch-enable-email');
  const batchEmailDetails = document.getElementById('batch-email-details');
  const batchEmailDelay = document.getElementById('batch-email-delay');
  
  const btnProcessCsv = document.getElementById('btn-process-csv');
  const progressCard = document.getElementById('progress-card');
  const progressCount = document.getElementById('progress-count');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressEta = document.getElementById('progress-eta');
  const btnCancelBatch = document.getElementById('btn-cancel-batch');

  // Batch Results Components
  const batchResultsCard = document.getElementById('batch-results-card');
  const statTotalProcessed = document.getElementById('stat-total-processed');
  const statSuccessCount = document.getElementById('stat-success-count');
  const statSkippedCount = document.getElementById('stat-skipped-count');
  const statEmailsSent = document.getElementById('stat-emails-sent');
  const statEmailsFailed = document.getElementById('stat-emails-failed');
  
  const qrGalleryContainer = document.getElementById('qr-gallery-container');
  const galleryPagination = document.getElementById('gallery-pagination');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const paginationText = document.getElementById('pagination-text');
  
  const btnDownloadZip = document.getElementById('btn-download-zip');
  const btnPrintLabels = document.getElementById('btn-print-labels');
  const btnBatchSendEmails = document.getElementById('btn-batch-send-emails');
  const btnExportEmailLog = document.getElementById('btn-export-email-log');

  // Print Modal Components
  const printConfigModal = document.getElementById('print-config-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelPrint = document.getElementById('btn-cancel-print');
  const btnExecutePrint = document.getElementById('btn-execute-print');
  const printLayoutSelect = document.getElementById('print-layout-select');
  const printLabelTitle = document.getElementById('print-label-title');
  const printShowText = document.getElementById('print-show-text');
  const printSheetContainer = document.getElementById('print-sheet-container');

  // Email Preview Modal Components
  const emailPreviewModal = document.getElementById('email-preview-modal');
  const btnCloseEmailPreview = document.getElementById('btn-close-email-preview');
  const btnCancelEmailPreview = document.getElementById('btn-cancel-email-preview');
  const btnSendFromPreview = document.getElementById('btn-send-from-preview');
  const previewFrom = document.getElementById('preview-from');
  const previewTo = document.getElementById('preview-to');
  const previewSubject = document.getElementById('preview-subject');
  const previewHtmlContainer = document.getElementById('preview-html-container');

  // Logs & Diagnostics Modal Components
  const btnOpenLogs = document.getElementById('btn-open-logs');
  const logErrorBadge = document.getElementById('log-error-badge');
  const btnViewLogsGallery = document.getElementById('btn-view-logs-gallery');
  const galleryErrorCount = document.getElementById('gallery-error-count');
  const emailLogsModal = document.getElementById('email-logs-modal');
  const btnCloseLogsModal = document.getElementById('btn-close-logs-modal');
  const btnCloseLogsModalFooter = document.getElementById('btn-close-logs-modal-footer');
  const tabBtnClientLogs = document.getElementById('tab-btn-client-logs');
  const tabBtnServerLogs = document.getElementById('tab-btn-server-logs');
  const clientLogsView = document.getElementById('client-logs-view');
  const serverLogsView = document.getElementById('server-logs-view');
  const sessionLogCount = document.getElementById('session-log-count');
  const countAllLogs = document.getElementById('count-all-logs');
  const countErrLogs = document.getElementById('count-err-logs');
  const countOkLogs = document.getElementById('count-ok-logs');
  const logsContainer = document.getElementById('logs-container');
  const serverLogsContent = document.getElementById('server-logs-content');
  const btnCopyClientLogs = document.getElementById('btn-copy-client-logs');
  const btnDownloadClientLogs = document.getElementById('btn-download-client-logs');
  const btnClearClientLogs = document.getElementById('btn-clear-client-logs');
  const btnRefreshServerLogs = document.getElementById('btn-refresh-server-logs');
  const btnCopyServerLogs = document.getElementById('btn-copy-server-logs');

  // --- Theme Toggle Management ---
  const savedTheme = localStorage.getItem('qr-flow-theme') || 'dark';
  if (htmlElement) htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  safeOn(themeToggleBtn, 'click', () => {
    const currentTheme = htmlElement ? htmlElement.getAttribute('data-theme') : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    if (htmlElement) htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('qr-flow-theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('i');
    if (!icon) return;
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      themeToggleBtn.setAttribute('title', 'Cambiar a Modo Claro');
    } else {
      icon.className = 'fa-solid fa-moon';
      themeToggleBtn.setAttribute('title', 'Cambiar a Modo Oscuro');
    }
  }

  // --- Tab Navigation Management ---
  if (navTabs) {
    navTabs.forEach(tab => {
      safeOn(tab, 'click', () => {
        const targetTab = tab.getAttribute('data-tab');
        navTabs.forEach(t => t.classList.remove('active'));
        if (tabPanels) tabPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetEl = document.getElementById(targetTab);
        if (targetEl) targetEl.classList.add('active');
      });
    });
  }

  // --- Accordion Toggles ---
  setupAccordion(advSettingsToggle, advSettingsContent);
  setupAccordion(batchAdvToggle, batchAdvContent);
  if (singleMailToggle && singleMailContent) {
    setupAccordion(singleMailToggle, singleMailContent);
  }

  function setupAccordion(toggle, content) {
    if (!toggle || !content) return;
    safeOn(toggle, 'click', () => {
      toggle.classList.toggle('active');
      content.classList.toggle('show');
    });
  }

  // --- Sync Color Input with Hex Textbox & Range Sliders ---
  function syncColorPicker(picker, textbox) {
    if (!picker || !textbox) return;
    safeOn(picker, 'input', () => {
      textbox.value = picker.value.toUpperCase();
      triggerSingleQrRender();
    });
    safeOn(textbox, 'input', () => {
      if (/^#[0-9A-F]{6}$/i.test(textbox.value)) {
        picker.value = textbox.value;
        triggerSingleQrRender();
      }
    });
  }

  syncColorPicker(colorDark, colorDarkHex);
  syncColorPicker(colorLight, colorLightHex);
  syncColorPicker(batchColorDark, batchColorDarkHex);
  syncColorPicker(batchColorLight, batchColorLightHex);

  safeOn(qrMarginRange, 'input', () => {
    if (qrMarginVal && qrMarginRange) qrMarginVal.textContent = `${qrMarginRange.value}px`;
    triggerSingleQrRender();
  });

  safeOn(batchQrMarginRange, 'input', () => {
    if (batchQrMarginVal && batchQrMarginRange) batchQrMarginVal.textContent = `${batchQrMarginRange.value}px`;
  });

  // --- Backend PHP SMTP Endpoint Management ---
  const emailEndpointUrl = 'send_email.php';

  async function detectServer() {
    if (smtpStatusBtn) smtpStatusBtn.className = 'smtp-status-badge status-checking';
    if (smtpStatusText) smtpStatusText.textContent = 'Verificando...';

    try {
      const phpRes = await fetch('send_email.php?action=status', { method: 'GET' });
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        if (phpData.status === 'ready' || phpData.smtp_server) {
          serverConfig = phpData;

          if (smtpStatusBtn) {
            smtpStatusBtn.className = 'smtp-status-badge status-connected';
            const userDisplay = phpData.smtp_user ? ` (${phpData.smtp_user})` : '';
            if (smtpStatusText) smtpStatusText.textContent = `SMTP Activo${userDisplay}`;
            smtpStatusBtn.setAttribute('title', `Conectado a ${phpData.smtp_server}:${phpData.smtp_port} vía PHP (Hostinger)`);
          }

          loadEmailTemplate();
          return true;
        }
      }
    } catch (e) {
      // Servidor PHP no accesible en este momento
    }

    serverConfig = null;
    if (smtpStatusBtn) {
      smtpStatusBtn.className = 'smtp-status-badge status-disconnected';
      if (smtpStatusText) smtpStatusText.textContent = 'Servicio no detectado';
      smtpStatusBtn.setAttribute('title', 'Sube send_email.php y config/smtp_config.json a tu servidor web.');
    }
    return false;
  }

  async function loadEmailTemplate() {
    try {
      const res = await fetch('send_email.php?action=template');
      if (res.ok) {
        const data = await res.json();
        if (data.body_html) {
          emailTemplateHtml = data.body_html;
        }
      }
    } catch (e) {
      console.warn('Plantilla por defecto en uso:', e);
    }
  }

  // Initialize server connection check
  detectServer();

  // Status Badge Modal click
  safeOn(smtpStatusBtn, 'click', () => {
    updateServerModalView();
    if (serverInfoModal) serverInfoModal.style.display = 'flex';
  });

  function updateServerModalView() {
    if (serverConfig) {
      if (serverActiveView) serverActiveView.style.display = 'block';
      if (serverInactiveView) serverInactiveView.style.display = 'none';
      if (infoServerHost) infoServerHost.textContent = `${serverConfig.smtp_server}:${serverConfig.smtp_port}`;
      if (infoServerUser) infoServerUser.textContent = serverConfig.smtp_user || 'No configurado';
      if (infoServerSender) infoServerSender.textContent = serverConfig.sender_name || 'Sistema de Acceso / Comedor';
      if (infoServerDelay) infoServerDelay.textContent = `${serverConfig.send_delay_seconds || 15} segundos`;
      if (infoServerMode) {
        infoServerMode.textContent = 'PHP en Servidor Web (Hostinger / cPanel)';
      }
    } else {
      if (serverActiveView) serverActiveView.style.display = 'none';
      if (serverInactiveView) serverInactiveView.style.display = 'block';
    }
  }

  function closeServerModal() {
    if (serverInfoModal) serverInfoModal.style.display = 'none';
  }

  safeOn(btnCloseServerModal, 'click', closeServerModal);
  safeOn(btnCloseServerInfo, 'click', closeServerModal);
  safeOn(serverInfoModal, 'click', (e) => {
    if (e.target === serverInfoModal) closeServerModal();
  });

  safeOn(btnRetryServerConn, 'click', async () => {
    if (!btnRetryServerConn) return;
    btnRetryServerConn.disabled = true;
    btnRetryServerConn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    const ok = await detectServer();
    updateServerModalView();
    btnRetryServerConn.disabled = false;
    btnRetryServerConn.innerHTML = '<i class="fa-solid fa-rotate"></i> Verificar Estado';
    if (ok) {
      showNotification('¡Servicio SMTP PHP detectado y listo!', 'success');
    } else {
      showNotification('No se detecta send_email.php. Asegúrate de tener send_email.php y config/smtp_config.json en tu servidor web.', 'warning');
    }
  });

  // --- Single QR Code Generation ---
  let singleQrDebounceTimeout;

  safeOn(singleInput, 'input', () => {
    if (charCounter && singleInput) charCounter.textContent = singleInput.value.length;
    // Auto-fill employee ID if user inputs an ID number
    const text = singleInput ? singleInput.value.trim() : '';
    if (/^\d{3,10}$/.test(text) && singleEmpId && !singleEmpId.value) {
      singleEmpId.value = text;
    }
    triggerSingleQrRender();
  });

  safeOn(qrEccSelect, 'change', triggerSingleQrRender);
  safeOn(qrSizeSelect, 'change', triggerSingleQrRender);

  function triggerSingleQrRender() {
    clearTimeout(singleQrDebounceTimeout);
    singleQrDebounceTimeout = setTimeout(renderSingleQr, 150);
  }

  function renderSingleQr() {
    const text = singleInput.value.trim();
    
    if (!text) {
      singleQrCanvas.style.display = 'none';
      singlePlaceholder.style.display = 'flex';
      singleActions.style.opacity = '0.5';
      singleActions.style.pointerEvents = 'none';
      return;
    }

    const size = parseInt(qrSizeSelect.value, 10);
    const margin = parseInt(qrMarginRange.value, 10);
    const darkColor = colorDarkHex.value;
    const lightColor = colorLightHex.value;
    const ecc = qrEccSelect.value;

    QRCode.toCanvas(singleQrCanvas, text, {
      width: size,
      margin: margin,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: ecc
    }, (error) => {
      if (error) {
        console.error(error);
        return;
      }
      singlePlaceholder.style.display = 'none';
      singleQrCanvas.style.display = 'block';
      singleActions.style.opacity = '1';
      singleActions.style.pointerEvents = 'auto';

      if (singleAutoSend && singleAutoSend.checked) {
        checkAutoSendSingle();
      }
    });
  }

  let singleAutoSendTimeout;
  function checkAutoSendSingle() {
    clearTimeout(singleAutoSendTimeout);
    singleAutoSendTimeout = setTimeout(() => {
      const email = singleEmpEmail ? singleEmpEmail.value.trim() : '';
      if (email && email.includes('@')) {
        btnSingleSendEmail.click();
      }
    }, 900);
  }

  if (singleEmpEmail) {
    singleEmpEmail.addEventListener('input', () => {
      if (singleAutoSend && singleAutoSend.checked) {
        checkAutoSendSingle();
      }
    });
  }

  // Copy Single QR to Clipboard
  safeOn(btnCopyQr, 'click', async () => {
    try {
      singleQrCanvas.toBlob(async (blob) => {
        if (!blob) {
          showNotification('Error al crear la imagen', 'error');
          return;
        }
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        showBtnFeedback(btnCopyQr, '<i class="fa-solid fa-check"></i> ¡Copiado!');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showNotification('Tu navegador no soporta el copiado directo de imágenes', 'error');
    }
  });

  // Download Single QR as PNG
  safeOn(btnDownloadPng, 'click', () => {
    const empId = singleEmpId ? singleEmpId.value.trim() : '';
    const text = singleInput ? singleInput.value.trim().substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
    const filename = `${empId || text || 'codigo'}.png`;
    
    if (singleQrCanvas) {
      const dataUrl = singleQrCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    }
  });

  // --- Email Body Formatter ---
  function formatEmailBody(rawTemplate, { nombre, num_empleado, correo, qrDataUrl }) {
    let html = rawTemplate;
    const empName = nombre || `Empleado #${num_empleado || ''}`;
    const empId = num_empleado || '';
    const empMail = correo || '';

    html = html.replace(/\{nombre\}/g, escapeHtml(empName));
    html = html.replace(/\{num_empleado\}/g, escapeHtml(empId));
    html = html.replace(/\{correo\}/g, escapeHtml(empMail));
    
    // Replace inline CID image for preview with base64 data URL
    if (qrDataUrl) {
      html = html.replace(/src=["']cid:qr_image["']/g, `src="${qrDataUrl}"`);
    }
    return html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Single QR Email Preview Modal ---
  safeOn(btnPreviewEmail, 'click', () => {
    const text = singleInput ? singleInput.value.trim() : '';
    if (!text) {
      showNotification('Genera primero un código QR para previsualizar el correo.', 'warning');
      return;
    }

    const nombre = (singleEmpName && singleEmpName.value.trim()) || 'Colaborador';
    const num_empleado = (singleEmpId && singleEmpId.value.trim()) || text;
    const correo = (singleEmpEmail && singleEmpEmail.value.trim()) || 'colaborador@multiva.com.mx';
    const qrDataUrl = singleQrCanvas ? singleQrCanvas.toDataURL('image/png') : '';

    // Update modal meta
    if (previewFrom) {
      previewFrom.textContent = serverConfig 
        ? `${serverConfig.sender_name} <${serverConfig.smtp_user}>` 
        : 'Sistema de Acceso / Comedor <no-reply@gilou.com.mx>';
    }
    if (previewTo) previewTo.textContent = `${nombre} <${correo}>`;
    if (previewSubject) previewSubject.textContent = `Tu Código QR de Acceso - ${nombre}`;

    // Render HTML card inside preview container
    const formattedHtml = formatEmailBody(emailTemplateHtml, {
      nombre,
      num_empleado,
      correo,
      qrDataUrl
    });

    if (previewHtmlContainer) previewHtmlContainer.innerHTML = formattedHtml;
    if (emailPreviewModal) emailPreviewModal.style.display = 'flex';
  });

  function closeEmailPreview() {
    if (emailPreviewModal) emailPreviewModal.style.display = 'none';
  }

  safeOn(btnCloseEmailPreview, 'click', closeEmailPreview);
  safeOn(btnCancelEmailPreview, 'click', closeEmailPreview);
  safeOn(emailPreviewModal, 'click', (e) => {
    if (e.target === emailPreviewModal) closeEmailPreview();
  });

  // --- Activity and Error Logging Helpers ---
  function recordEmailLog({ type, name, email, empId, error, suggestion, endpoint }) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString(),
      fullTime: new Date().toLocaleString(),
      type: type || 'error',
      name: name || `Empleado #${empId || ''}`,
      email: email || '',
      empId: empId || '',
      error: error || '',
      suggestion: suggestion || '',
      endpoint: endpoint || 'PHP-SMTP'
    };

    emailActivityLogs.unshift(entry);

    if (emailActivityLogs.length > 200) {
      emailActivityLogs.pop();
    }

    updateLogCounters();
    renderLogsList();

    if (entry.type === 'error') {
      console.group(`❌ [QR-Flow] Error enviando correo a ${entry.name} <${entry.email}>`);
      console.error(`Empleado: #${entry.empId}`);
      console.error(`Error SMTP:`, entry.error);
      if (entry.suggestion) {
        console.warn(`💡 Sugerencia para corregir:`, entry.suggestion);
      }
      console.table([{
        "Fecha/Hora": entry.fullTime,
        "Colaborador": entry.name,
        "Empleado #": entry.empId,
        "Correo": entry.email,
        "Error": entry.error,
        "Sugerencia": entry.suggestion
      }]);
      console.groupEnd();
    } else {
      console.log(`%c[QR-Flow ✓ Correo Enviado] ${entry.name} <${entry.email}> (${entry.timestamp})`, 'color: #10b981; font-weight: bold;');
    }
  }

  function updateLogCounters() {
    const errorCount = emailActivityLogs.filter(l => l.type === 'error').length;
    const okCount = emailActivityLogs.filter(l => l.type === 'success').length;
    const totalCount = emailActivityLogs.length;

    if (logErrorBadge) {
      if (errorCount > 0) {
        logErrorBadge.textContent = errorCount;
        logErrorBadge.style.display = 'inline-block';
      } else {
        logErrorBadge.style.display = 'none';
      }
    }

    if (galleryErrorCount) {
      galleryErrorCount.textContent = errorCount;
    }

    if (sessionLogCount) sessionLogCount.textContent = totalCount;
    if (countAllLogs) countAllLogs.textContent = totalCount;
    if (countErrLogs) countErrLogs.textContent = errorCount;
    if (countOkLogs) countOkLogs.textContent = okCount;
  }

  function renderLogsList() {
    if (!logsContainer) return;
    const filtered = emailActivityLogs.filter(l => {
      if (activeLogsFilter === 'all') return true;
      return l.type === activeLogsFilter;
    });

    if (filtered.length === 0) {
      logsContainer.innerHTML = '<div class="empty-logs"><i class="fa-solid fa-inbox" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem; display: block;"></i>No hay eventos para mostrar con el filtro seleccionado.</div>';
      return;
    }

    logsContainer.innerHTML = filtered.map(item => {
      const isErr = item.type === 'error';
      return `
        <div class="log-entry-card ${isErr ? 'is-error' : 'is-success'}">
          <div class="log-header">
            <span class="log-badge ${isErr ? 'error' : 'success'}">${isErr ? 'FALLÓ' : 'ENVIADO'}</span>
            <span class="log-time">${item.fullTime}</span>
          </div>
          <div class="log-recipient">
            ${escapeHtml(item.name || 'Sin nombre')}
            <small>&lt;${escapeHtml(item.email)}&gt; &bull; Emp #${escapeHtml(item.empId)}</small>
          </div>
          ${isErr ? `
            <div class="log-error-desc"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(item.error)}</div>
            ${item.suggestion ? `<div class="log-suggestion"><i class="fa-solid fa-lightbulb"></i> <span><strong>Sugerencia de corrección:</strong> ${escapeHtml(item.suggestion)}</span></div>` : ''}
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async function fetchServerLogs() {
    if (!serverLogsContent) return;
    serverLogsContent.textContent = 'Consultando logs del servidor...';

    try {
      const res = await fetch('send_email.php?action=logs');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      
      let out = `=== REPORTE DE ERRORES DEL SERVIDOR (${data.timestamp || new Date().toLocaleString()}) ===\n\n`;
      if (data.error_logs && data.error_logs.trim()) {
        out += data.error_logs;
      } else {
        out += "No se registran errores recientes en email_errors.log.\n";
      }

      out += `\n\n=== ACTIVIDAD GENERAL RECIENTE (send_qr_emails.log) ===\n\n`;
      if (data.general_logs && data.general_logs.trim()) {
        out += data.general_logs;
      } else {
        out += "No se registra actividad reciente.\n";
      }

      serverLogsContent.textContent = out;
    } catch (e) {
      serverLogsContent.textContent = `No se pudo obtener logs del servidor (send_email.php?action=logs): ${e.message}\n\nAsegúrate de que send_email.php esté en tu servidor web junto con index.html.`;
    }
  }

  function openLogsModal() {
    updateLogCounters();
    renderLogsList();
    if (emailLogsModal) emailLogsModal.style.display = 'flex';
  }

  function closeLogsModal() {
    if (emailLogsModal) emailLogsModal.style.display = 'none';
  }

  // --- Dispatch Email via PHP Script ---
  async function sendEmailViaApi({ num_empleado, nombre, correo, qr_data_url, filename }) {
    const payload = {
      num_empleado: num_empleado || '0000',
      nombre: nombre || `Empleado #${num_empleado}`,
      correo: correo,
      qr_data_url: qr_data_url,
      filename: filename || `${num_empleado}.png`
    };

    let response;
    try {
      response = await fetch('send_email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      const errorObj = new Error(`Error al conectar con send_email.php: ${netErr.message}`);
      errorObj.suggestion = 'Verifica que tu servidor web esté activo y que send_email.php esté en la misma carpeta.';
      throw errorObj;
    }

    let result;
    try {
      result = await response.json();
    } catch (parseErr) {
      const rawText = await response.text().catch(() => '');
      const errorObj = new Error(`Respuesta no válida del servidor HTTP ${response.status}: ${rawText.substring(0, 150)}`);
      errorObj.suggestion = 'Revisa que PHP esté habilitado en el hosting y que send_email.php no tenga errores de sintaxis.';
      throw errorObj;
    }

    if (!response.ok || !result.success) {
      const err = new Error(result.error || `Error del servidor SMTP (${response.status})`);
      err.suggestion = result.suggestion || 'Revisa las credenciales de correo en config/smtp_config.json y el log email_errors.log.';
      err.details = result.details || result;
      throw err;
    }

    return result;
  }

  // --- Single QR Send Email Handler ---
  safeOn(btnSingleSendEmail, 'click', async () => {
    const text = singleInput ? singleInput.value.trim() : '';
    if (!text) {
      showNotification('Genera un código QR antes de enviar.', 'warning');
      return;
    }

    const correo = singleEmpEmail ? singleEmpEmail.value.trim() : '';
    if (!correo || !correo.includes('@')) {
      showNotification('Ingresa un correo electrónico de destinatario válido.', 'warning');
      if (singleEmpEmail) singleEmpEmail.focus();
      return;
    }

    const empIdVal = (singleEmpId && singleEmpId.value.trim()) || text;
    const nombre = (singleEmpName && singleEmpName.value.trim()) || `Empleado #${empIdVal}`;
    const num_empleado = empIdVal;
    const qrDataUrl = singleQrCanvas ? singleQrCanvas.toDataURL('image/png') : '';

    const originalHtml = btnSingleSendEmail.innerHTML;
    btnSingleSendEmail.disabled = true;
    btnSingleSendEmail.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      await sendEmailViaApi({
        num_empleado,
        nombre,
        correo,
        qr_data_url: qrDataUrl,
        filename: `${num_empleado}.png`
      });

      recordEmailLog({
        type: 'success',
        name: nombre,
        email: correo,
        empId: num_empleado
      });

      showNotification(`¡Correo enviado con éxito a ${nombre} (${correo})!`, 'success');
      showBtnFeedback(btnSingleSendEmail, '<i class="fa-solid fa-circle-check"></i> ¡Enviado!');
    } catch (err) {
      recordEmailLog({
        type: 'error',
        name: nombre,
        email: correo,
        empId: num_empleado,
        error: err.message,
        suggestion: err.suggestion
      });

      showNotification(`Error al enviar: ${err.message}`, 'error');
      if (err.suggestion) {
        setTimeout(() => {
          showNotification(`💡 Sugerencia: ${err.suggestion}`, 'warning');
        }, 1200);
      }

      btnSingleSendEmail.disabled = false;
      btnSingleSendEmail.innerHTML = originalHtml;
    }
  });

  // Send from inside Preview Modal
  safeOn(btnSendFromPreview, 'click', async () => {
    closeEmailPreview();
    if (btnSingleSendEmail) btnSingleSendEmail.click();
  });

  // --- Batch QR Generation (CSV) ---
  
  // Drag & Drop Setup
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleCsvFile(dt.files[0]);
      }
    });
  }

  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);

  // File input change listener (triggered when user selects a file via native label click)
  safeOn(csvFileInput, 'change', () => {
    if (csvFileInput && csvFileInput.files && csvFileInput.files.length > 0) {
      handleCsvFile(csvFileInput.files[0]);
    }
  });

  // Toggle batch email options panel visibility
  if (batchEnableEmail && batchEmailDetails) {
    safeOn(batchEnableEmail, 'change', () => {
      batchEmailDetails.style.display = batchEnableEmail.checked ? 'flex' : 'none';
    });
  }

  // --- Parser Nativo de CSV independiente de librerías externas ---
  function parseCsvString(rawText) {
    // 1. Quitar BOM si existe
    let text = rawText.replace(/^\uFEFF/, '').trim();
    if (!text) {
      return { columns: [], rows: [], delimiter: ',' };
    }
    
    // 2. Normalizar y dividir por líneas
    const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { columns: [], rows: [], delimiter: ',' };
    }

    // 3. Detectar delimitador de la cabecera (soporta coma, punto y coma, tabulador o pipe)
    const headerLine = lines[0];
    const candidateDelims = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let maxCount = -1;

    candidateDelims.forEach(d => {
      let count = 0;
      let inQ = false;
      for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        if (char === '"' || char === "'") inQ = !inQ;
        else if (char === d && !inQ) count++;
      }
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    });

    // 4. Tokenizador que respeta comillas
    function tokenizeLine(line, delim) {
      const tokens = [];
      let cur = '';
      let inQuotes = false;
      let quoteChar = '"';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (!inQuotes && (char === '"' || char === "'")) {
          inQuotes = true;
          quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
          if (i + 1 < line.length && line[i + 1] === quoteChar) {
            cur += char;
            i++;
          } else {
            inQuotes = false;
          }
        } else if (!inQuotes && char === delim) {
          tokens.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      tokens.push(cur.trim());
      return tokens;
    }

    // 5. Extraer celdas de la primera línea
    const rawHeaders = tokenizeLine(headerLine, bestDelimiter);
    
    // Detección inteligente si el archivo empieza directamente con datos (sin encabezados)
    const firstCellIsNumber = /^\d+$/.test(rawHeaders[0]);
    const anyCellHasEmail = rawHeaders.some(c => c && c.includes('@'));
    const isHeaderless = firstCellIsNumber || anyCellHasEmail;

    let columns = [];
    let startLine = 1;

    if (isHeaderless && rawHeaders.length >= 3) {
      columns = ['num_empleado', 'nombre', 'correo'];
      startLine = 0; // La primera fila ya es un colaborador
    } else {
      columns = rawHeaders
        .map(h => h.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
      startLine = 1;
    }

    // 6. Extraer filas
    const rows = [];
    for (let i = startLine; i < lines.length; i++) {
      const tokens = tokenizeLine(lines[i], bestDelimiter);
      if (tokens.every(t => t === '')) continue; // omitir vacíos

      const rowObj = {};
      columns.forEach((col, idx) => {
        let val = tokens[idx] !== undefined ? tokens[idx] : '';
        val = val.replace(/^["']|["']$/g, '').trim();
        rowObj[col] = val;
      });
      rows.push(rowObj);
    }

    return { columns, rows, delimiter: bestDelimiter };
  }

  // Función para normalizar y buscar nombres de columna (num_empleado, nombre, correo)
  function matchColumn(columns, expectedList) {
    const normalizeStr = (s) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    // Paso 1: Coincidencia exacta
    for (const exp of expectedList) {
      const target = normalizeStr(exp);
      const exact = columns.find(c => normalizeStr(c) === target);
      if (exact) return exact;
    }

    // Paso 2: Coincidencia por subcadena
    for (const exp of expectedList) {
      const target = normalizeStr(exp);
      const partial = columns.find(c => normalizeStr(c).includes(target) || target.includes(normalizeStr(c)));
      if (partial) return partial;
    }

    return '';
  }

  // CSV Parsing Principal
  function handleCsvFile(file) {
    if (!file) return;

    const fileName = file.name || 'archivo.csv';
    const fileNameLower = fileName.toLowerCase();

    // Aviso amigable si se arrastra un archivo de Excel directamente
    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      showNotification('Has seleccionado un archivo Excel (.xlsx/.xls). Por favor, guárdalo o expórtalo como formato CSV (.csv) antes de subirlo.', 'warning');
      if (csvFileInput) csvFileInput.value = '';
      return;
    }

    // Leer el archivo localmente con FileReader nativo
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const text = e.target.result;
        if (!text || !text.trim()) {
          showNotification('El archivo CSV seleccionado está vacío.', 'error');
          return;
        }
        processCsvContent(text, fileName, file.size);
      } catch (err) {
        console.error('Error al procesar CSV:', err);
        showNotification('Error al leer el archivo CSV: ' + err.message, 'error');
      } finally {
        if (csvFileInput) csvFileInput.value = '';
      }
    };

    reader.onerror = function() {
      showNotification('No se pudo leer el archivo seleccionado desde el disco.', 'error');
      if (csvFileInput) csvFileInput.value = '';
    };

    reader.readAsText(file, 'utf-8');
  }

  function processCsvContent(rawText, fileName, fileSize) {
    const { columns, rows, delimiter } = parseCsvString(rawText);

    if (rows.length === 0) {
      showNotification('El archivo CSV está vacío o solo contiene la fila de encabezados.', 'error');
      return;
    }

    if (columns.length === 0) {
      showNotification('No se detectaron columnas válidas en el archivo CSV.', 'error');
      return;
    }

    parsedCsvRows = rows;

    // Poblar los selects
    populateDropdown(csvColData, columns);
    populateDropdown(csvColFilename, columns, true, '-- Usar número de empleado --');
    populateDropdown(csvColEmail, columns, true, '-- Sin envío de correo --');
    populateDropdown(csvColName, columns, true, '-- Usar nombre genérico --');
    populateDropdown(csvColEmpid, columns, true, '-- Igual al contenido QR --');

    // Detección específica de las 3 columnas: num_empleado, nombre, correo
    let colEmpleado = matchColumn(columns, [
      'num_empleado', 'numero_empleado', 'no_empleado', 'num_emp', 'empleado', 'id_empleado', 'codigo', 'id'
    ]);
    let colNombre = matchColumn(columns, [
      'nombre', 'nombre_completo', 'empleado_nombre', 'colaborador', 'name'
    ]);
    let colCorreo = matchColumn(columns, [
      'correo', 'correo_electronico', 'email', 'mail', 'correo_empleado'
    ]);

    // Si el archivo tiene 3 columnas y alguna no tuvo coincidencia por nombre exacto, asignar por orden posicional:
    // Col 0 -> num_empleado (QR/ID), Col 1 -> nombre, Col 2 -> correo
    if (columns.length === 3) {
      if (!colEmpleado) colEmpleado = columns[0];
      if (!colNombre) colNombre = columns[1];
      if (!colCorreo) colCorreo = columns[2];
    }

    // Asignar automáticamente los valores a los selectores
    if (colEmpleado) {
      csvColData.value = colEmpleado;
      csvColFilename.value = colEmpleado;
      csvColEmpid.value = colEmpleado;
    } else {
      csvColData.value = columns[0];
    }

    if (colNombre) {
      csvColName.value = colNombre;
    }

    if (colCorreo) {
      csvColEmail.value = colCorreo;
      if (batchEnableEmail) batchEnableEmail.checked = true;
      if (batchEmailDetails) batchEmailDetails.style.display = 'flex';
    }

    // Renderizar Vista Previa de Filas en la tarjeta
    renderCsvPreview(columns, rows, colEmpleado, colNombre, colCorreo);

    // Actualizar texto de información del archivo
    const delimLabel = delimiter === ';' ? 'punto y coma (;)' : delimiter === '\t' ? 'tabulador' : 'coma (,)';
    fileInfoText.innerHTML = `<i class="fa-solid fa-file-csv"></i> <strong>${fileName}</strong> (${formatBytes(fileSize)} &bull; ${rows.length} filas &bull; separador: ${delimLabel})`;

    dropZone.style.display = 'none';
    mappingCard.style.display = 'block';
    batchResultsCard.style.display = 'none';

    // Validación de las 3 columnas
    if (colEmpleado && colNombre && colCorreo) {
      showNotification(`✓ Archivo válido: Se detectaron las 3 columnas (num_empleado, nombre, correo) con ${rows.length} empleados.`, 'success');
    } else {
      const missing = [];
      if (!colEmpleado) missing.push('num_empleado');
      if (!colNombre) missing.push('nombre');
      if (!colCorreo) missing.push('correo');
      showNotification(`Archivo cargado (${rows.length} filas). Sugerencia: no se encontraron las columnas: ${missing.join(', ')}. Verifica la asignación en los selectores.`, 'warning');
    }
  }

  function renderCsvPreview(columns, rows, colEmp, colNom, colMail) {
    if (!csvPreviewContainer || !csvPreviewThead || !csvPreviewTbody) return;

    // Cabecera
    csvPreviewThead.innerHTML = `
      <tr>
        ${columns.map(col => {
          let badge = '';
          if (col === colEmp) badge = ' <span style="color: var(--primary); font-size: 0.72rem;">(QR / ID)</span>';
          else if (col === colNom) badge = ' <span style="color: var(--success, #10b981); font-size: 0.72rem;">(Nombre)</span>';
          else if (col === colMail) badge = ' <span style="color: #6366f1; font-size: 0.72rem;">(Correo)</span>';
          return `<th>${col}${badge}</th>`;
        }).join('')}
      </tr>
    `;

    // Primeras 4 filas
    const previewRows = rows.slice(0, 4);
    csvPreviewTbody.innerHTML = previewRows.map(row => `
      <tr>
        ${columns.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}
      </tr>
    `).join('');

    if (csvPreviewBadge) {
      csvPreviewBadge.textContent = `${columns.length} columnas • ${rows.length} filas`;
    }

    csvPreviewContainer.style.display = 'block';
  }

  function populateDropdown(selectElement, items, hasOptional = false, optionalText = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '';
    
    if (hasOptional) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = optionalText || '-- Opcional --';
      selectElement.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Selecciona una columna...';
      selectElement.appendChild(opt);
    }

    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      selectElement.appendChild(opt);
    });
  }

  // Reset CSV state
  safeOn(btnResetCsv, 'click', () => {
    parsedCsvRows = [];
    if (csvFileInput) csvFileInput.value = '';
    if (csvPreviewContainer) csvPreviewContainer.style.display = 'none';
    if (mappingCard) mappingCard.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
    if (batchResultsCard) batchResultsCard.style.display = 'none';
  });

  // Batch generation and email dispatch process
  safeOn(btnProcessCsv, 'click', async () => {
    const dataCol = csvColData.value;
    const nameCol = csvColFilename.value;
    const emailCol = csvColEmail.value;
    const empNameCol = csvColName.value;
    const empIdCol = csvColEmpid.value;
    const shouldSendEmail = batchEnableEmail.checked && !!emailCol;
    const sendDelaySec = parseFloat(batchEmailDelay.value) || 15;

    if (!dataCol) {
      showNotification('Debes seleccionar la columna que contiene los datos del código QR.', 'warning');
      return;
    }

    // If auto-send email is checked, verify server connection first
    if (shouldSendEmail && !serverConfig) {
      const isConnected = await detectServer();
      if (!isConnected) {
        showNotification('No se detecta send_email.php. Asegúrate de haber subido send_email.php y config/smtp_config.json a tu servidor web.', 'warning');
        updateServerModalView();
        if (serverInfoModal) serverInfoModal.style.display = 'flex';
        return;
      }
    }

    // Setup UI
    mappingCard.style.display = 'none';
    progressCard.style.display = 'block';
    batchResultsCard.style.display = 'none';
    
    batchCancelled = false;
    generatedQrCodes = [];

    const total = parsedCsvRows.length;
    let success = 0;
    let skipped = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    const ecc = batchQrEccSelect.value;
    const margin = parseInt(batchQrMarginRange.value, 10);
    const darkColor = batchColorDarkHex.value;
    const lightColor = batchColorLightHex.value;

    const startTime = Date.now();

    for (let j = 0; j < total; j++) {
      if (batchCancelled) break;

      const row = parsedCsvRows[j];
      const rawData = row[dataCol];

      if (rawData === undefined || rawData === null || rawData.toString().trim() === '') {
        skipped++;
        continue;
      }

      const dataText = rawData.toString().trim();
      
      // Filename definition
      let fileName = `qr_${j + 1}`;
      if (nameCol && row[nameCol]) {
        fileName = row[nameCol].toString().trim().replace(/[^a-z0-9_\-\(\)]/gi, '_');
      }

      // Colaborador Info
      const empName = empNameCol && row[empNameCol] ? row[empNameCol].toString().trim() : '';
      const empId = empIdCol && row[empIdCol] ? row[empIdCol].toString().trim() : dataText;
      const recipientEmail = emailCol && row[emailCol] ? row[emailCol].toString().trim() : '';

      try {
        // Generate QR code canvas data URL
        const dataUrl = await generateQrDataUrl(dataText, {
          errorCorrectionLevel: ecc,
          margin: margin,
          width: 512,
          color: {
            dark: darkColor,
            light: lightColor
          }
        });

        const itemObj = {
          globalIndex: generatedQrCodes.length,
          data: dataText,
          dataUrl: dataUrl,
          filename: fileName,
          name: empName,
          empId: empId,
          email: recipientEmail,
          emailSent: false,
          emailError: null
        };

        // If email sending enabled for this item
        if (shouldSendEmail && recipientEmail && recipientEmail.includes('@')) {
          progressCount.textContent = `Generando y Enviando [${j + 1}/${total}]: ${empName || recipientEmail}`;
          try {
            await sendEmailViaApi({
              num_empleado: empId,
              nombre: empName,
              correo: recipientEmail,
              qr_data_url: dataUrl,
              filename: `${empId || fileName}.png`
            });
            itemObj.emailSent = true;
            emailsSent++;
            recordEmailLog({
              type: 'success',
              name: empName,
              email: recipientEmail,
              empId: empId
            });
          } catch (err) {
            itemObj.emailSent = false;
            itemObj.emailError = err.message;
            emailsFailed++;
            recordEmailLog({
              type: 'error',
              name: empName,
              email: recipientEmail,
              empId: empId,
              error: err.message,
              suggestion: err.suggestion
            });
          }
        }

        generatedQrCodes.push(itemObj);
        success++;

        // Update progress bar
        const currentProgress = j + 1;
        const percent = Math.round((currentProgress / total) * 100);
        progressPercent.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;

        // Wait delay if email sent and more items remain
        if (shouldSendEmail && itemObj.emailSent && j < total - 1 && sendDelaySec > 0) {
          for (let s = Math.round(sendDelaySec); s > 0; s--) {
            if (batchCancelled) break;
            progressEta.textContent = `Pausa de ${s}s antes del siguiente correo (para no saturar SMTP)...`;
            await delay(1000);
          }
        } else {
          progressEta.textContent = `Procesando elemento ${currentProgress} de ${total}...`;
        }

      } catch (err) {
        console.error(`Error generando QR en fila ${j}:`, err);
        skipped++;
      }

      await delayFrame();
    }

    progressCard.style.display = 'none';

    if (batchCancelled) {
      showNotification('Procesamiento cancelado por el usuario.', 'info');
      mappingCard.style.display = 'block';
    } else {
      let finalMsg = `¡Procesamiento finalizado! ${success} códigos QR generados.`;
      if (shouldSendEmail) {
        finalMsg += ` ${emailsSent} correos enviados con éxito.`;
      }
      showNotification(finalMsg, 'success');
      
      // Update stats dashboard
      statTotalProcessed.textContent = total;
      statSuccessCount.textContent = success;
      statSkippedCount.textContent = skipped;
      statEmailsSent.textContent = emailsSent;
      statEmailsFailed.textContent = emailsFailed;

      // Show Results
      batchResultsCard.style.display = 'block';
      galleryCurrentPage = 1;
      renderGallery();
    }
  });

  // Cancel Batch Process
  safeOn(btnCancelBatch, 'click', () => {
    batchCancelled = true;
  });

  // QR Generator helper promise wrapper
  function generateQrDataUrl(text, options) {
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(text, options, (err, url) => {
        if (err) reject(err);
        else resolve(url);
      });
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function delayFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  // --- Results Gallery Pagination & Rendering ---
  function renderGallery() {
    qrGalleryContainer.innerHTML = '';

    const totalItems = generatedQrCodes.length;
    if (totalItems === 0) {
      qrGalleryContainer.innerHTML = '<div class="no-results-msg"><p>No hay códigos generados para mostrar.</p></div>';
      galleryPagination.style.display = 'none';
      return;
    }

    galleryPagination.style.display = 'flex';
    const totalPages = Math.ceil(totalItems / galleryItemsPerPage);

    if (galleryCurrentPage > totalPages) galleryCurrentPage = totalPages;
    if (galleryCurrentPage < 1) galleryCurrentPage = 1;

    const startIdx = (galleryCurrentPage - 1) * galleryItemsPerPage;
    const endIdx = Math.min(startIdx + galleryItemsPerPage, totalItems);
    const pageItems = generatedQrCodes.slice(startIdx, endIdx);

    paginationText.textContent = `Página ${galleryCurrentPage} de ${totalPages}`;
    btnPrevPage.disabled = galleryCurrentPage === 1;
    btnNextPage.disabled = galleryCurrentPage === totalPages;

    pageItems.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'gallery-item';
      
      let badgeHtml = '';
      if (item.email) {
        if (item.emailSent) {
          badgeHtml = '<span class="gallery-item-email-badge badge-sent"><i class="fa-solid fa-circle-check"></i> Enviado</span>';
        } else if (item.emailError) {
          badgeHtml = `<span class="gallery-item-email-badge badge-failed" title="${escapeHtml(item.emailError)}"><i class="fa-solid fa-circle-xmark"></i> Fallido</span>`;
        } else {
          badgeHtml = '<span class="gallery-item-email-badge badge-pending"><i class="fa-solid fa-clock"></i> Pendiente</span>';
        }
      }

      itemEl.innerHTML = `
        <div class="gallery-item-qr-box">
          <img src="${item.dataUrl}" alt="QR: ${item.filename}">
        </div>
        <div class="gallery-item-label">${item.empId || item.filename}</div>
        ${item.name ? `<div style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">${escapeHtml(item.name)}</div>` : ''}
        ${badgeHtml}
        
        <div class="gallery-item-actions">
          ${item.email ? `
            <button class="btn-card-action btn-send-single-card" data-idx="${item.globalIndex}" title="Enviar o reenviar correo a este empleado">
              <i class="fa-solid fa-paper-plane"></i> ${item.emailSent ? 'Reenviar' : 'Enviar'}
            </button>
          ` : ''}
        </div>

        <div class="gallery-item-tooltip">
          <strong>Empleado:</strong> ${escapeHtml(item.name || 'N/A')}<br>
          <strong>No. Empleado:</strong> ${escapeHtml(item.empId || item.filename)}<br>
          <strong>Correo:</strong> ${escapeHtml(item.email || 'Sin correo')}<br>
          <strong>Contenido QR:</strong> ${item.data.substring(0, 80)}${item.data.length > 80 ? '...' : ''}
        </div>
      `;

      // Attach single card send button handler
      const sendBtn = itemEl.querySelector('.btn-send-single-card');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => handleSingleCardSend(item, sendBtn));
      }

      qrGalleryContainer.appendChild(itemEl);
    });
  }

  // Handle single card email send from gallery
  async function handleSingleCardSend(item, button) {
    if (!item.email) {
      showNotification('Este elemento no tiene correo electrónico asignado.', 'warning');
      return;
    }

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      await sendEmailViaApi({
        num_empleado: item.empId || item.filename,
        nombre: item.name || `Empleado #${item.empId || item.filename}`,
        correo: item.email,
        qr_data_url: item.dataUrl,
        filename: `${item.empId || item.filename}.png`
      });

      item.emailSent = true;
      item.emailError = null;
      recordEmailLog({
        type: 'success',
        name: item.name || item.empId,
        email: item.email,
        empId: item.empId
      });
      showNotification(`Correo enviado a ${item.name || item.email}`, 'success');
      updateResultsEmailStats();
      renderGallery();
    } catch (err) {
      item.emailSent = false;
      item.emailError = err.message;
      recordEmailLog({
        type: 'error',
        name: item.name || item.empId,
        email: item.email,
        empId: item.empId,
        error: err.message,
        suggestion: err.suggestion
      });
      showNotification(`Error enviando a ${item.email}: ${err.message}`, 'error');
      button.disabled = false;
      button.innerHTML = originalHtml;
      renderGallery();
    }
  }

  function updateResultsEmailStats() {
    let sent = 0;
    let failed = 0;
    generatedQrCodes.forEach(it => {
      if (it.email) {
        if (it.emailSent) sent++;
        else failed++;
      }
    });
    statEmailsSent.textContent = sent;
    statEmailsFailed.textContent = failed;
  }

  safeOn(btnPrevPage, 'click', () => {
    if (galleryCurrentPage > 1) {
      galleryCurrentPage--;
      renderGallery();
    }
  });

  safeOn(btnNextPage, 'click', () => {
    const totalPages = Math.ceil(generatedQrCodes.length / galleryItemsPerPage);
    if (galleryCurrentPage < totalPages) {
      galleryCurrentPage++;
      renderGallery();
    }
  });

  // --- Batch Send Emails to All in Gallery ---
  safeOn(btnBatchSendEmails, 'click', async () => {
    if (isSendingBatchEmails) return;

    const itemsToSend = generatedQrCodes.filter(it => it.email && it.email.includes('@'));
    if (itemsToSend.length === 0) {
      showNotification('No hay elementos con correo electrónico válido para enviar.', 'warning');
      return;
    }

    // Check server first
    if (!serverConfig) {
      const isConnected = await detectServer();
      if (!isConnected) {
        showNotification('No se detecta send_email.php. Asegúrate de haber subido send_email.php y config/smtp_config.json a tu servidor web.', 'warning');
        updateServerModalView();
        if (serverInfoModal) serverInfoModal.style.display = 'flex';
        return;
      }
    }

    isSendingBatchEmails = true;
    const originalBtnHtml = btnBatchSendEmails.innerHTML;
    btnBatchSendEmails.disabled = true;

    const sendDelaySec = parseFloat(batchEmailDelay ? batchEmailDelay.value : 15) || 15;
    let sentCount = 0;
    let errorCount = 0;

    showNotification(`Iniciando envío masivo a ${itemsToSend.length} destinatarios...`, 'info');

    for (let i = 0; i < itemsToSend.length; i++) {
      const item = itemsToSend[i];
      btnBatchSendEmails.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando [${i + 1}/${itemsToSend.length}]...`;

      try {
        await sendEmailViaApi({
          num_empleado: item.empId || item.filename,
          nombre: item.name || `Empleado #${item.empId || item.filename}`,
          correo: item.email,
          qr_data_url: item.dataUrl,
          filename: `${item.empId || item.filename}.png`
        });
        item.emailSent = true;
        item.emailError = null;
        sentCount++;
        recordEmailLog({
          type: 'success',
          name: item.name || item.empId,
          email: item.email,
          empId: item.empId
        });
      } catch (err) {
        item.emailSent = false;
        item.emailError = err.message;
        errorCount++;
        recordEmailLog({
          type: 'error',
          name: item.name || item.empId,
          email: item.email,
          empId: item.empId,
          error: err.message,
          suggestion: err.suggestion
        });
      }

      updateResultsEmailStats();
      renderGallery();

      // Pause delay if more emails remain
      if (i < itemsToSend.length - 1 && sendDelaySec > 0) {
        for (let s = Math.round(sendDelaySec); s > 0; s--) {
          btnBatchSendEmails.innerHTML = `<i class="fa-solid fa-clock"></i> Pausa ${s}s [${i + 1}/${itemsToSend.length}]`;
          await delay(1000);
        }
      }
    }

    isSendingBatchEmails = false;
    btnBatchSendEmails.disabled = false;
    btnBatchSendEmails.innerHTML = originalBtnHtml;

    showNotification(`Envío finalizado: ${sentCount} exitosos, ${errorCount} fallidos.`, sentCount > 0 ? 'success' : 'error');
  });

  // --- Export Email Dispatch CSV Report ---
  safeOn(btnExportEmailLog, 'click', () => {
    if (generatedQrCodes.length === 0) {
      showNotification('No hay datos generados para exportar.', 'warning');
      return;
    }

    const rows = [
      ['num_empleado', 'nombre', 'correo', 'estatus_correo', 'error', 'fecha_registro']
    ];

    const now = new Date().toISOString();
    generatedQrCodes.forEach(item => {
      let status = 'SIN_CORREO';
      if (item.email) {
        status = item.emailSent ? 'ENVIADO' : (item.emailError ? 'ERROR' : 'PENDIENTE');
      }
      rows.push([
        item.empId || item.filename,
        item.name || '',
        item.email || '',
        status,
        item.emailError || '',
        now
      ]);
    });

    const csvContent = rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_');
    saveAs(blob, `${timestamp}_reporte_envios.csv`);
    showNotification('Reporte CSV descargado con éxito.', 'success');
  });

  // --- Download Zip ---
  safeOn(btnDownloadZip, 'click', async () => {
    if (generatedQrCodes.length === 0) {
      showNotification('No hay códigos generados para comprimir.', 'warning');
      return;
    }

    const originalBtnHtml = btnDownloadZip.innerHTML;
    btnDownloadZip.disabled = true;
    btnDownloadZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando ZIP...';

    try {
      const zip = new JSZip();
      
      generatedQrCodes.forEach(item => {
        const base64Data = item.dataUrl.split(',')[1];
        const cleanName = item.empId || item.filename;
        zip.file(`${cleanName}.png`, base64Data, { base64: true });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `lote_qr_${Date.now()}.zip`);
    } catch (err) {
      console.error(err);
      showNotification('Ocurrió un error al compilar el archivo ZIP.', 'error');
    } finally {
      btnDownloadZip.disabled = false;
      btnDownloadZip.innerHTML = originalBtnHtml;
    }
  });

  // --- Printing Labels Management ---
  safeOn(btnPrintLabels, 'click', () => {
    if (generatedQrCodes.length === 0) {
      showNotification('No hay códigos para imprimir.', 'warning');
      return;
    }
    if (printLabelTitle) printLabelTitle.value = '';
    if (printConfigModal) printConfigModal.style.display = 'flex';
  });

  function closeModal() {
    if (printConfigModal) printConfigModal.style.display = 'none';
  }

  safeOn(btnCloseModal, 'click', closeModal);
  safeOn(btnCancelPrint, 'click', closeModal);
  safeOn(printConfigModal, 'click', (e) => {
    if (e.target === printConfigModal) closeModal();
  });

  // Build Print Sheets and Execute Printing
  safeOn(btnExecutePrint, 'click', () => {
    closeModal();
    
    const layout = printLayoutSelect.value;
    const titleVal = printLabelTitle.value.trim();
    const showTextVal = printShowText.value === 'yes';

    let cols = 4, rows = 10;
    if (layout === '3x8') { cols = 3; rows = 8; }
    else if (layout === '2x5') { cols = 2; rows = 5; }
    else if (layout === '1x1') { cols = 1; rows = 1; }

    const labelsPerPage = cols * rows;
    printSheetContainer.innerHTML = '';

    const totalLabels = generatedQrCodes.length;
    const totalPages = Math.ceil(totalLabels / labelsPerPage);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageEl = document.createElement('div');
      pageEl.className = 'print-page';
      
      if (layout === '1x1') {
        pageEl.style.width = '100mm';
        pageEl.style.height = '100mm';
        pageEl.style.padding = '5mm';
        pageEl.style.gridTemplateColumns = '1fr';
        pageEl.style.gridTemplateRows = '1fr';
      } else {
        pageEl.style.width = '210mm';
        pageEl.style.height = '297mm';
        pageEl.style.padding = '10mm 8mm';
        pageEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        pageEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        pageEl.style.gridGap = '3mm 2mm';
      }

      const startIdx = pageIdx * labelsPerPage;
      for (let cellIdx = 0; cellIdx < labelsPerPage; cellIdx++) {
        const itemIdx = startIdx + cellIdx;
        const cellEl = document.createElement('div');

        if (itemIdx < totalLabels) {
          const item = generatedQrCodes[itemIdx];
          cellEl.className = 'print-label';
          
          let qrSizePx = '100px';
          if (layout === '3x8') qrSizePx = '110px';
          else if (layout === '2x5') qrSizePx = '170px';
          else if (layout === '1x1') qrSizePx = '250px';

          const labelText = item.name ? `${item.empId || item.filename} - ${item.name}` : (item.empId || item.filename);

          cellEl.innerHTML = `
            ${titleVal ? `<div class="print-label-title">${titleVal}</div>` : ''}
            <div class="print-label-qr" style="width: ${qrSizePx}; height: ${qrSizePx};">
              <img src="${item.dataUrl}" alt="QR">
            </div>
            ${showTextVal ? `<div class="print-label-text">${labelText}</div>` : ''}
          `;
        } else {
          cellEl.className = 'print-label-empty';
          cellEl.style.visibility = 'hidden';
        }

        pageEl.appendChild(cellEl);
      }

      printSheetContainer.appendChild(pageEl);
    }

    setTimeout(() => {
      window.print();
    }, 250);
  });

  // --- Email Logs Modal Listeners ---
  safeOn(btnOpenLogs, 'click', openLogsModal);
  safeOn(btnViewLogsGallery, 'click', openLogsModal);
  safeOn(btnCloseLogsModal, 'click', closeLogsModal);
  safeOn(btnCloseLogsModalFooter, 'click', closeLogsModal);
  safeOn(emailLogsModal, 'click', (e) => {
    if (e.target === emailLogsModal) closeLogsModal();
  });

  safeOn(tabBtnClientLogs, 'click', () => {
    if (tabBtnClientLogs) tabBtnClientLogs.classList.add('active');
    if (tabBtnServerLogs) tabBtnServerLogs.classList.remove('active');
    if (clientLogsView) clientLogsView.style.display = 'block';
    if (serverLogsView) serverLogsView.style.display = 'none';
    renderLogsList();
  });

  safeOn(tabBtnServerLogs, 'click', () => {
    if (tabBtnServerLogs) tabBtnServerLogs.classList.add('active');
    if (tabBtnClientLogs) tabBtnClientLogs.classList.remove('active');
    if (serverLogsView) serverLogsView.style.display = 'block';
    if (clientLogsView) clientLogsView.style.display = 'none';
    fetchServerLogs();
  });

  // Filter buttons inside logs modal
  if (emailLogsModal) {
    const filterBtns = emailLogsModal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      safeOn(btn, 'click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLogsFilter = btn.getAttribute('data-filter') || 'all';
        renderLogsList();
      });
    });
  }

  // Copy client session logs
  safeOn(btnCopyClientLogs, 'click', async () => {
    if (emailActivityLogs.length === 0) {
      showNotification('No hay logs para copiar.', 'info');
      return;
    }
    const text = emailActivityLogs.map(l => 
      `[${l.fullTime}] [${l.type.toUpperCase()}] Empleado #${l.empId} - ${l.name} <${l.email}>\n` +
      (l.error ? `  Error: ${l.error}\n` : '') +
      (l.suggestion ? `  Sugerencia: ${l.suggestion}\n` : '')
    ).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showBtnFeedback(btnCopyClientLogs, '<i class="fa-solid fa-check"></i> Copiado');
      showNotification('Logs de sesión copiados al portapapeles', 'info');
    } catch (e) {
      console.error(e);
    }
  });

  // Download client session logs as .txt file
  safeOn(btnDownloadClientLogs, 'click', () => {
    if (emailActivityLogs.length === 0) {
      showNotification('No hay logs para descargar.', 'info');
      return;
    }
    const text = emailActivityLogs.map(l => 
      `================================================================================\n` +
      `FECHA/HORA: ${l.fullTime}\n` +
      `ESTATUS: ${l.type.toUpperCase()}\n` +
      `COLABORADOR: ${l.name} (Empleado #${l.empId})\n` +
      `CORREO: ${l.email}\n` +
      (l.error ? `ERROR: ${l.error}\n` : '') +
      (l.suggestion ? `SUGERENCIA: ${l.suggestion}\n` : '')
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_');
    saveAs(blob, `reporte_errores_envio_${timestamp}.txt`);
    showNotification('Archivo de logs descargado.', 'success');
  });

  // Clear client session logs
  safeOn(btnClearClientLogs, 'click', () => {
    emailActivityLogs = [];
    updateLogCounters();
    renderLogsList();
    showNotification('Registro de sesión vaciado.', 'info');
  });

  // Refresh server logs
  safeOn(btnRefreshServerLogs, 'click', () => {
    fetchServerLogs();
  });

  // Copy server logs
  safeOn(btnCopyServerLogs, 'click', async () => {
    if (!serverLogsContent) return;
    try {
      await navigator.clipboard.writeText(serverLogsContent.textContent);
      showBtnFeedback(btnCopyServerLogs, '<i class="fa-solid fa-check"></i> Copiado');
      showNotification('Logs del servidor copiados al portapapeles', 'info');
    } catch (e) {
      console.error(e);
    }
  });

  // --- Utility Helper Functions ---
  function showNotification(message, type = 'info') {
    const notifyEl = document.createElement('div');
    notifyEl.className = `notification-toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    else if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    else if (type === 'error') iconClass = 'fa-circle-xmark';

    notifyEl.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(notifyEl);

    setTimeout(() => {
      notifyEl.classList.add('toast-fadeout');
      notifyEl.addEventListener('transitionend', () => notifyEl.remove());
    }, 4500);
  }

  function showBtnFeedback(button, tempHtml, delayMs = 2000) {
    const originalHtml = button.innerHTML;
    button.innerHTML = tempHtml;
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalHtml;
      button.disabled = false;
    }, delayMs);
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

});
