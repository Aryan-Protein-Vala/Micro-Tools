import Tesseract from 'tesseract.js';

export function setupUI() {
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const previewContainer = document.getElementById('preview-container');
  const originalPreview = document.getElementById('original-preview');
  
  const btnProcess = document.getElementById('btn-process');
  const btnReset = document.getElementById('btn-reset');
  const btnCopy = document.getElementById('btn-copy');
  const statusText = document.getElementById('ocr-status');
  const outputText = document.getElementById('ocr-output');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressContainer = document.getElementById('progress-container');

  let currentFile = null;

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
      if (outputText) outputText.value = '';
    }
  }

  btnProcess?.addEventListener('click', async () => {
    if (!currentFile) return;
    
    btnProcess.disabled = true;
    btnProcess.textContent = "Extracting Text...";
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (statusText) {
      statusText.textContent = "Loading OCR Engine...";
      statusText.classList.remove('hidden', 'text-red-500', 'text-green-500');
    }
    if (originalPreview) originalPreview.classList.add('opacity-50');

    try {
      const result = await Tesseract.recognize(
        currentFile,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              if (progressBarFill) progressBarFill.style.width = `${Math.round(m.progress * 100)}%`;
              if (statusText) statusText.textContent = `Scanning: ${Math.round(m.progress * 100)}%`;
            } else {
              if (statusText) statusText.textContent = `Loading core: ${m.status}...`;
            }
          }
        }
      );
      
      if (outputText) {
        outputText.value = result.data.text;
      }
      if (statusText) {
        statusText.textContent = "Text extracted successfully!";
        statusText.classList.add('text-green-500');
      }
      if (btnCopy) {
        btnCopy.classList.remove('hidden');
        btnCopy.classList.add('flex');
      }
    } catch (e) {
      console.error(e);
      if (statusText) {
        statusText.textContent = "Error extracting text. Check console.";
        statusText.classList.add('text-red-500');
      }
    } finally {
      btnProcess.disabled = false;
      btnProcess.textContent = "Extract Text";
      if (originalPreview) originalPreview.classList.remove('opacity-50');
      if (progressContainer) progressContainer.classList.add('hidden');
    }
  });

  btnCopy?.addEventListener('click', () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText.value);
      const originalText = btnCopy.innerHTML;
      btnCopy.textContent = "Copied!";
      setTimeout(() => {
        btnCopy.innerHTML = originalText;
      }, 2000);
    }
  });

  btnReset?.addEventListener('click', () => {
    currentFile = null;
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    previewContainer?.classList.add('hidden');
    btnCopy?.classList.add('hidden');
    if (originalPreview) originalPreview.src = '';
    if (outputText) outputText.value = '';
    if (statusText) statusText.classList.add('hidden');
    if (btnProcess) btnProcess.disabled = true;
  });
}
