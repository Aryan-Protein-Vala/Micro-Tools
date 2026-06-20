// Lazy load imagetracerjs inside the process function to prevent bundle bloat

export function setupUI() {
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const previewContainer = document.getElementById('preview-container');
  const originalPreview = document.getElementById('original-preview');
  const svgPreviewContainer = document.getElementById('svg-preview-container');
  
  const presetSelect = document.getElementById('preset-select');
  const btnProcess = document.getElementById('btn-process');
  const btnReset = document.getElementById('btn-reset');
  const btnDownload = document.getElementById('btn-download');

  let currentFile = null;
  let currentSvgString = null;

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
    currentFile = file;
    const url = URL.createObjectURL(file);
    if (originalPreview) {
      originalPreview.src = url;
      dropzone?.classList.add('hidden');
      previewContainer?.classList.remove('hidden');
      if (btnProcess) btnProcess.removeAttribute('disabled');
    }
  }

  btnProcess?.addEventListener('click', async () => {
    if (!currentFile || !originalPreview.src) return;
    
    btnProcess.disabled = true;
    btnProcess.textContent = "Tracing paths...";

    const preset = presetSelect?.value || 'default';
    
    try {
      const { default: ImageTracer } = await import('imagetracerjs');
      ImageTracer.imageToSVG(originalPreview.src, (svgStr) => {
        currentSvgString = svgStr;
        if (svgPreviewContainer) {
          svgPreviewContainer.innerHTML = svgStr;
          const svgEl = svgPreviewContainer.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = '100%';
            svgEl.style.objectFit = 'contain';
          }
        }
        
        btnProcess.disabled = false;
        btnProcess.textContent = "Vectorize Image";
        
        if (btnDownload) {
          btnDownload.classList.remove('hidden');
          btnDownload.classList.add('flex');
        }
      }, preset);
    } catch (e) {
      console.error(e);
      btnProcess.disabled = false;
      btnProcess.textContent = "Error Tracing";
    }
  });

  btnDownload?.addEventListener('click', () => {
    if (!currentSvgString) return;
    const blob = new Blob([currentSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vectorized_${currentFile.name.replace(/\\.[^/.]+$/, "")}.svg`;
    link.click();
  });

  btnReset?.addEventListener('click', () => {
    currentFile = null;
    currentSvgString = null;
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    previewContainer?.classList.add('hidden');
    btnDownload?.classList.add('hidden');
    if (originalPreview) originalPreview.src = '';
    if (svgPreviewContainer) svgPreviewContainer.innerHTML = '';
    if (btnProcess) btnProcess.disabled = true;
  });
}
