// Lazy load ffmpeg to prevent bundle bloat

let ffmpeg = null;
let isLoaded = false;
let currentFile = null;

export async function initFFmpeg() {
  if (isLoaded) return;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  ffmpeg = new FFmpeg();

  // Listen to progress
  ffmpeg.on('progress', ({ progress, time }) => {
    const progressEl = document.getElementById('compression-progress');
    const progressBar = document.getElementById('progress-bar-fill');
    if (progressEl && progressBar) {
      const pct = Math.round(progress * 100);
      progressEl.textContent = `Compressing... ${pct}%`;
      progressBar.style.width = `${pct}%`;
    }
  });

  ffmpeg.on('log', ({ message }) => {
    const logsEl = document.getElementById('ffmpeg-logs');
    if (logsEl) {
      logsEl.textContent += message + '\\n';
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  });

  const statusEl = document.getElementById('engine-status');
  if (statusEl) statusEl.textContent = "Loading engine...";

  try {
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm'
    });
    isLoaded = true;
    if (statusEl) {
      statusEl.textContent = "Engine Ready";
      statusEl.classList.remove('text-yellow-500');
      statusEl.classList.add('text-green-500');
    }
    document.getElementById('btn-compress')?.removeAttribute('disabled');
  } catch (e) {
    console.error(e);
    if (statusEl) {
      statusEl.textContent = "Engine Failed to Load";
      statusEl.classList.remove('text-yellow-500');
      statusEl.classList.add('text-red-500');
    }
  }
}

export function setupUI() {
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const previewContainer = document.getElementById('preview-container');
  const videoPreview = document.getElementById('video-preview');
  const btnCompress = document.getElementById('btn-compress');
  const btnReset = document.getElementById('btn-reset');
  const btnDownload = document.getElementById('btn-download');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityValue = document.getElementById('quality-value');

  // Trigger load immediately
  initFFmpeg();

  // Slider updates
  qualitySlider?.addEventListener('input', (e) => {
    if (qualityValue) {
      const val = parseInt(e.target.value);
      if (val < 23) qualityValue.textContent = "High Quality (Larger File)";
      else if (val > 30) qualityValue.textContent = "Low Quality (Smaller File)";
      else qualityValue.textContent = "Balanced Compression";
    }
  });

  // Dropzone
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
    if (!file.type.startsWith('video/')) {
      alert("Please upload a valid video file.");
      return;
    }
    currentFile = file;
    const url = URL.createObjectURL(file);
    if (videoPreview) {
      videoPreview.src = url;
      dropzone?.classList.add('hidden');
      previewContainer?.classList.remove('hidden');
    }
  }

  // Compress Action
  btnCompress?.addEventListener('click', async () => {
    if (!currentFile || !isLoaded) return;
    
    const crf = qualitySlider?.value || '28'; // 28 is a good default for compression
    
    // UI states
    btnCompress.disabled = true;
    btnCompress.textContent = "Processing...";
    document.getElementById('progress-container')?.classList.remove('hidden');
    document.getElementById('ffmpeg-logs-container')?.classList.remove('hidden');
    document.getElementById('ffmpeg-logs').textContent = '';
    btnDownload?.classList.add('hidden');

    try {
      // Write file to WASM memory
      const { fetchFile } = await import('@ffmpeg/util');
      await ffmpeg.writeFile('input.mp4', await fetchFile(currentFile));
      
      // Execute compression
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vcodec', 'libx264',
        '-crf', crf.toString(),
        '-preset', 'fast',
        'output.mp4'
      ]);

      // Read output
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      // Update preview
      if (videoPreview) {
        videoPreview.src = url;
      }

      // Enable download
      if (btnDownload) {
        btnDownload.href = url;
        btnDownload.download = `compressed_${currentFile.name}`;
        btnDownload.classList.remove('hidden');
        btnDownload.classList.add('flex');
      }

      document.getElementById('compression-progress').textContent = "Compression Complete!";
    } catch (e) {
      console.error(e);
      document.getElementById('compression-progress').textContent = "Error compressing video.";
    } finally {
      btnCompress.disabled = false;
      btnCompress.textContent = "Compress & Download";
    }
  });

  btnReset?.addEventListener('click', () => {
    currentFile = null;
    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    previewContainer?.classList.add('hidden');
    document.getElementById('progress-container')?.classList.add('hidden');
    document.getElementById('ffmpeg-logs-container')?.classList.add('hidden');
    btnDownload?.classList.add('hidden');
    if (videoPreview) videoPreview.src = '';
  });
}
