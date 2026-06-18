import { removeBackground } from '@imgly/background-removal';

export function setupUI() {
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const previewContainer = document.getElementById('preview-container');
  const originalPreview = document.getElementById('original-preview');
  const resultPreview = document.getElementById('result-preview');
  
  const btnRemove = document.getElementById('btn-remove-bg');
  const btnReset = document.getElementById('btn-reset');
  const btnDownload = document.getElementById('btn-download');
  const statusText = document.getElementById('bg-status');

  let currentFile = null;
  let resultBlobURL = null;

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
      if (btnRemove) {
        btnRemove.removeAttribute('disabled');
      }
    }
  }

  btnRemove?.addEventListener('click', async () => {
    if (!currentFile) return;
    
    btnRemove.disabled = true;
    btnRemove.textContent = "Processing (May take a moment)...";
    if (statusText) {
      statusText.textContent = "Loading WebGPU/WASM engine & processing...";
      statusText.classList.remove('hidden');
    }
    if (resultPreview) {
      resultPreview.classList.add('opacity-50', 'animate-pulse');
      resultPreview.src = originalPreview.src;
    }

    try {
      // Configuration to use public paths if necessary, but defaults work in modern bundlers
      const blob = await removeBackground(currentFile, {
        progress: (key, current, total) => {
          if (statusText) statusText.textContent = `Downloading AI models: ${key} (${Math.round((current/total)*100)}%)`;
        }
      });
      
      resultBlobURL = URL.createObjectURL(blob);
      if (resultPreview) {
        resultPreview.src = resultBlobURL;
        resultPreview.classList.remove('opacity-50', 'animate-pulse');
      }
      if (statusText) {
        statusText.textContent = "Background removed successfully!";
        statusText.classList.add('text-green-500');
      }
      
      if (btnDownload) {
        btnDownload.href = resultBlobURL;
        btnDownload.download = `nobg_${currentFile.name.replace(/\\.[^/.]+$/, "")}.png`;
        btnDownload.classList.remove('hidden');
        btnDownload.classList.add('flex');
      }
    } catch (e) {
      console.error(e);
      if (statusText) {
        statusText.textContent = "Error removing background. Check console.";
        statusText.classList.add('text-red-500');
      }
    } finally {
      btnRemove.disabled = false;
      btnRemove.textContent = "Remove Background";
    }
  });

  btnReset?.addEventListener('click', () => {
    currentFile = null;
    if (resultBlobURL) URL.revokeObjectURL(resultBlobURL);
    resultBlobURL = null;
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    previewContainer?.classList.add('hidden');
    btnDownload?.classList.add('hidden');
    if (originalPreview) originalPreview.src = '';
    if (resultPreview) resultPreview.src = '';
    if (statusText) {
      statusText.classList.add('hidden');
      statusText.className = 'text-sm font-mono text-center mb-4 text-muted-foreground';
    }
    if (btnRemove) btnRemove.disabled = true;
  });
}
