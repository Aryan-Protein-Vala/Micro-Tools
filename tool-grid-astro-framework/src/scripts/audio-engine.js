import lamejs from 'lamejs';

export function setupUI() {
  const dropzone = document.getElementById('audio-dropzone');
  const fileInput = document.getElementById('audio-file-input');
  const previewContainer = document.getElementById('preview-container');
  const audioPreview = document.getElementById('audio-preview');
  
  const bitrateSelect = document.getElementById('bitrate-select');
  const btnProcess = document.getElementById('btn-process');
  const btnReset = document.getElementById('btn-reset');
  const btnDownload = document.getElementById('btn-download');
  const statusText = document.getElementById('audio-status');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressContainer = document.getElementById('progress-container');

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
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      alert("Please upload a valid audio or video file to extract audio.");
      return;
    }
    currentFile = file;
    const url = URL.createObjectURL(file);
    if (audioPreview) {
      audioPreview.src = url;
      dropzone?.classList.add('hidden');
      previewContainer?.classList.remove('hidden');
      if (btnProcess) btnProcess.removeAttribute('disabled');
    }
  }

  btnProcess?.addEventListener('click', async () => {
    if (!currentFile) return;
    
    btnProcess.disabled = true;
    btnProcess.textContent = "Converting to MP3...";
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (statusText) {
      statusText.textContent = "Decoding audio data...";
      statusText.classList.remove('hidden', 'text-red-500', 'text-green-500');
    }

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      if (statusText) statusText.textContent = "Encoding to MP3...";

      const bitrate = parseInt(bitrateSelect?.value || '128');
      
      // We encode using LameJS. LameJS expects 16-bit PCM.
      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
      const mp3Data = [];
      
      // Get channel data
      const left = audioBuffer.getChannelData(0);
      const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

      const sampleBlockSize = 1152;
      const length = left.length;
      
      // Conversion from Float32 to Int16
      for (let i = 0; i < length; i += sampleBlockSize) {
        const leftChunk = new Int16Array(sampleBlockSize);
        const rightChunk = new Int16Array(sampleBlockSize);
        
        for (let j = 0; j < sampleBlockSize && i + j < length; j++) {
          let l = left[i + j] * 32767.5;
          let r = right[i + j] * 32767.5;
          leftChunk[j] = Math.max(-32768, Math.min(32767, l));
          rightChunk[j] = Math.max(-32768, Math.min(32767, r));
        }

        let mp3buf;
        if (channels === 2) {
          mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        } else {
          mp3buf = mp3encoder.encodeBuffer(leftChunk);
        }

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        // Update progress occasionally
        if (i % (sampleBlockSize * 100) === 0 && progressBarFill) {
          const pct = Math.round((i / length) * 100);
          progressBarFill.style.width = `${pct}%`;
        }
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
      
      const blob = new Blob(mp3Data, { type: 'audio/mp3' });
      resultBlobURL = URL.createObjectURL(blob);
      
      if (progressBarFill) progressBarFill.style.width = `100%`;
      if (statusText) {
        statusText.textContent = "Conversion Complete!";
        statusText.classList.add('text-green-500');
      }

      if (btnDownload) {
        btnDownload.href = resultBlobURL;
        btnDownload.download = `${currentFile.name.replace(/\\.[^/.]+$/, "")}_converted.mp3`;
        btnDownload.classList.remove('hidden');
        btnDownload.classList.add('flex');
      }
      
      // Update preview to play the new mp3
      if (audioPreview) {
        audioPreview.src = resultBlobURL;
      }

    } catch (e) {
      console.error(e);
      if (statusText) {
        statusText.textContent = "Error converting audio.";
        statusText.classList.add('text-red-500');
      }
    } finally {
      btnProcess.disabled = false;
      btnProcess.textContent = "Convert to MP3";
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
    if (audioPreview) audioPreview.src = '';
    if (statusText) statusText.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    if (btnProcess) btnProcess.disabled = true;
    if (progressBarFill) progressBarFill.style.width = '0%';
  });
}
