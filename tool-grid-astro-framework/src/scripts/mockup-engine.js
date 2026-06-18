export function setupUI() {
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const previewContainer = document.getElementById('preview-container');
  const canvas = document.getElementById('mockup-canvas');
  const ctx = canvas.getContext('2d');
  
  const deviceSelect = document.getElementById('device-select');
  const bgSelect = document.getElementById('bg-select');
  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');

  let currentImage = null;

  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-accent', 'bg-accent/10');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-accent', 'bg-accent/10');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-accent', 'bg-accent/10');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      dropzone?.classList.add('hidden');
      previewContainer?.classList.remove('hidden');
      if (btnExport) btnExport.removeAttribute('disabled');
      renderMockup();
    };
    img.src = url;
  }

  function renderMockup() {
    if (!currentImage || !ctx) return;
    
    // Set canvas high res
    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const device = deviceSelect?.value || 'laptop';
    const bg = bgSelect?.value || 'gradient';

    // Draw Background
    if (bg === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#4158D0');
      gradient.addColorStop(0.5, '#C850C0');
      gradient.addColorStop(1, '#FFCC70');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (bg === 'solid') {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);
    } else if (bg === 'transparent') {
      ctx.clearRect(0, 0, width, height);
    }

    ctx.save();
    
    // Draw Device Frame
    if (device === 'laptop') {
      const frameWidth = 1200;
      const frameHeight = 750;
      const x = (width - frameWidth) / 2;
      const y = (height - frameHeight) / 2 - 50;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      // Laptop Bezel
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.roundRect(x, y, frameWidth, frameHeight, 20);
      ctx.fill();

      // Clear Shadow
      ctx.shadowColor = 'transparent';
      
      // Laptop Screen area
      const screenX = x + 20;
      const screenY = y + 20;
      const screenW = frameWidth - 40;
      const screenH = frameHeight - 80;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(screenX, screenY, screenW, screenH);
      
      // Draw uploaded image
      const scale = Math.max(screenW / currentImage.width, screenH / currentImage.height);
      const drawW = currentImage.width * scale;
      const drawH = currentImage.height * scale;
      const drawX = screenX + (screenW - drawW) / 2;
      const drawY = screenY + (screenH - drawH) / 2;
      
      ctx.beginPath();
      ctx.rect(screenX, screenY, screenW, screenH);
      ctx.clip();
      ctx.drawImage(currentImage, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Draw bottom lip
      ctx.fillStyle = '#a0aab0';
      ctx.beginPath();
      ctx.roundRect(x - 40, y + frameHeight - 10, frameWidth + 80, 25, [10, 10, 20, 20]);
      ctx.fill();

      // Draw notch/camera
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.roundRect(x + frameWidth/2 - 50, y, 100, 20, [0, 0, 10, 10]);
      ctx.fill();
    } else if (device === 'phone') {
      const frameWidth = 400;
      const frameHeight = 800;
      const x = (width - frameWidth) / 2;
      const y = (height - frameHeight) / 2;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      // Phone Bezel
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.roundRect(x, y, frameWidth, frameHeight, 40);
      ctx.fill();

      // Clear Shadow
      ctx.shadowColor = 'transparent';
      
      // Phone Screen area
      const screenX = x + 15;
      const screenY = y + 15;
      const screenW = frameWidth - 30;
      const screenH = frameHeight - 30;
      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenW, screenH, 30);
      ctx.fill();
      
      // Draw uploaded image
      const scale = Math.max(screenW / currentImage.width, screenH / currentImage.height);
      const drawW = currentImage.width * scale;
      const drawH = currentImage.height * scale;
      const drawX = screenX + (screenW - drawW) / 2;
      const drawY = screenY + (screenH - drawH) / 2;
      
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenW, screenH, 30);
      ctx.clip();
      ctx.drawImage(currentImage, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Draw notch/island
      ctx.fillStyle = '#1e1e1e';
      ctx.beginPath();
      ctx.roundRect(x + frameWidth/2 - 60, y + 25, 120, 30, 15);
      ctx.fill();
    }
  }

  deviceSelect?.addEventListener('change', renderMockup);
  bgSelect?.addEventListener('change', renderMockup);

  btnExport?.addEventListener('click', () => {
    if (!canvas || !currentImage) return;
    const link = document.createElement('a');
    link.download = 'mockup-export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  btnReset?.addEventListener('click', () => {
    currentImage = null;
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    previewContainer?.classList.add('hidden');
    if (btnExport) btnExport.disabled = true;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
