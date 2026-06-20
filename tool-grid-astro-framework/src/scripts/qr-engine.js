export function setupUI() {
  const tabGen = document.getElementById('tab-generator');
  const tabScan = document.getElementById('tab-scanner');
  const genView = document.getElementById('generator-view');
  const scanView = document.getElementById('scanner-view');
  
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const scannerWrapper = document.getElementById('scanner-wrapper');

  let activeTab = 'generator';

  const switchTab = (tab) => {
    if (tab === 'generator') {
      activeTab = 'generator';
      tabGen.classList.replace('bg-transparent', 'bg-white/10');
      tabGen.classList.replace('text-white/50', 'text-white');
      tabScan.classList.replace('bg-white/10', 'bg-transparent');
      tabScan.classList.replace('text-white', 'text-white/50');
      
      genView.classList.remove('hidden');
      setTimeout(() => genView.classList.remove('opacity-0'), 10);
      scanView.classList.add('opacity-0');
      setTimeout(() => scanView.classList.add('hidden'), 300);

      canvasWrapper.classList.remove('hidden');
      scannerWrapper.classList.add('hidden');
      
      stopScanner();
    } else {
      activeTab = 'scanner';
      tabScan.classList.replace('bg-transparent', 'bg-white/10');
      tabScan.classList.replace('text-white/50', 'text-white');
      tabGen.classList.replace('bg-white/10', 'bg-transparent');
      tabGen.classList.replace('text-white', 'text-white/50');

      scanView.classList.remove('hidden');
      setTimeout(() => scanView.classList.remove('opacity-0'), 10);
      genView.classList.add('opacity-0');
      setTimeout(() => genView.classList.add('hidden'), 300);

      canvasWrapper.classList.add('hidden');
      scannerWrapper.classList.remove('hidden');
    }
  };

  if(tabGen && tabScan) {
    tabGen.addEventListener('click', () => switchTab('generator'));
    tabScan.addEventListener('click', () => switchTab('scanner'));
  }

  // --- GENERATOR LOGIC ---
  const btnGenerate = document.getElementById('btn-generate');
  const qrInput = document.getElementById('qr-input');
  const colorDark = document.getElementById('color-dark');
  const colorLight = document.getElementById('color-light');
  const qrCanvas = document.getElementById('qr-canvas');
  const emptyState = document.getElementById('empty-state');
  const downloadOverlay = document.getElementById('download-overlay');
  const btnDownload = document.getElementById('btn-download');
  const btnReset = document.getElementById('btn-reset');

  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      const text = qrInput.value.trim();
      if (!text) {
        alert("Please enter text or a URL to encode.");
        return;
      }
      if (text.length > 2000) {
        alert("Input too long! QR Codes cannot effectively hold more than 2000 characters.");
        return;
      }

      btnGenerate.disabled = true;
      btnGenerate.textContent = "Generating...";

      try {
        const QRCode = (await import('qrcode')).default;
        
        await QRCode.toCanvas(qrCanvas, text, {
          width: 800, // High res
          margin: 2,
          color: {
            dark: colorDark.value,
            light: colorLight.value
          }
        });

        emptyState.classList.add('hidden');
        qrCanvas.classList.remove('hidden');
        
        downloadOverlay.classList.remove('hidden');
        setTimeout(() => downloadOverlay.classList.remove('opacity-0'), 10);
        
      } catch (err) {
        console.error(err);
        alert("Failed to generate QR code.");
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-hover:scale-110 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Generate QR Code`;
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      const url = qrCanvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = url;
      a.download = `toolgrid-qr-${Date.now()}.png`;
      a.click();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      downloadOverlay.classList.add('opacity-0');
      setTimeout(() => downloadOverlay.classList.add('hidden'), 300);
      qrCanvas.classList.add('hidden');
      emptyState.classList.remove('hidden');
      qrInput.value = '';
    });
  }

  // --- SCANNER LOGIC ---
  const btnStartCamera = document.getElementById('btn-start-camera');
  const btnStopCamera = document.getElementById('btn-stop-camera');
  const qrFile = document.getElementById('qr-file');
  const resultBox = document.getElementById('scanner-result-box');
  const scannerOutput = document.getElementById('scanner-output');
  const btnCopyResult = document.getElementById('btn-copy-result');

  let html5QrCode = null;

  const onScanSuccess = (decodedText) => {
    stopScanner();
    resultBox.classList.remove('hidden');
    scannerOutput.value = decodedText;
  };

  const stopScanner = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (e) {
        console.warn("Failed to stop scanner cleanly.", e);
      }
      html5QrCode = null;
    }
    btnStopCamera?.classList.add('hidden');
    btnStartCamera?.classList.remove('hidden');
  };

  if (btnStartCamera) {
    btnStartCamera.addEventListener('click', async () => {
      btnStartCamera.classList.add('hidden');
      btnStopCamera.classList.remove('hidden');
      resultBox.classList.add('hidden');

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode("qr-reader");
        
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          (err) => { /* ignore frame errors */ }
        );
      } catch (e) {
        console.error(e);
        alert("Could not start camera. Ensure permissions are granted.");
        stopScanner();
      }
    });
  }

  if (btnStopCamera) {
    btnStopCamera.addEventListener('click', stopScanner);
  }

  if (qrFile) {
    qrFile.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        stopScanner();
        const file = e.target.files[0];
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCodeFile = new Html5Qrcode("qr-reader");
          
          const result = await html5QrCodeFile.scanFile(file, true);
          onScanSuccess(result);
        } catch (err) {
          console.error(err);
          alert("Could not decode QR code from the image. Ensure the image is clear.");
        }
        e.target.value = ''; // Reset
      }
    });
  }

  if (btnCopyResult) {
    btnCopyResult.addEventListener('click', () => {
      navigator.clipboard.writeText(scannerOutput.value);
      const origText = btnCopyResult.textContent;
      btnCopyResult.textContent = "Copied!";
      setTimeout(() => btnCopyResult.textContent = origText, 2000);
    });
  }
}
