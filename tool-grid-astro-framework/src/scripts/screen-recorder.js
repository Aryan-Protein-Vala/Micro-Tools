let mediaRecorder = null;
let recordedChunks = [];
let timerInterval = null;
let startTime = null;

export function setupUI() {
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnNew = document.getElementById('btn-new');
  const btnDownload = document.getElementById('btn-download');
  const videoPreview = document.getElementById('video-preview');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const recordingIndicator = document.getElementById('recording-indicator');
  const recordingTimer = document.getElementById('recording-timer');
  const resultPanel = document.getElementById('result-panel');
  const recordAudio = document.getElementById('record-audio');

  if (!btnStart || !btnStop) return;

  btnStart.addEventListener('click', async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true
      });

      let tracks = [...displayStream.getTracks()];

      if (recordAudio?.checked) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracks = tracks.concat(micStream.getAudioTracks());
        } catch (_) {
          // Mic permission denied — continue without it
        }
      }

      const combinedStream = new MediaStream(tracks);

      // Show live preview
      if (videoPreview && previewPlaceholder) {
        videoPreview.srcObject = combinedStream;
        videoPreview.classList.remove('hidden');
        previewPlaceholder.classList.add('hidden');
      }

      recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';

      mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        clearInterval(timerInterval);
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Switch to playback
        if (videoPreview) {
          videoPreview.srcObject = null;
          videoPreview.src = url;
          videoPreview.controls = true;
        }

        // Set download link
        if (btnDownload) {
          btnDownload.href = url;
          btnDownload.download = `screen-recording-${Date.now()}.webm`;
        }

        // Show result panel
        if (resultPanel) resultPanel.classList.remove('hidden');
        if (recordingIndicator) recordingIndicator.classList.add('hidden');

        // Restore buttons
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');

        // Stop all tracks
        tracks.forEach(t => t.stop());
      };

      // Handle user stopping share via browser native button
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      });

      mediaRecorder.start(100);

      // Timer
      startTime = Date.now();
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        if (recordingTimer) recordingTimer.textContent = `${m}:${s}`;
      }, 1000);

      // Update UI
      btnStart.classList.add('hidden');
      btnStop.classList.remove('hidden');
      if (recordingIndicator) recordingIndicator.classList.remove('hidden');
      if (resultPanel) resultPanel.classList.add('hidden');

    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        alert('Could not start recording: ' + err.message);
      }
    }
  });

  btnStop.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
  });

  btnNew?.addEventListener('click', () => {
    recordedChunks = [];
    if (videoPreview) {
      videoPreview.src = '';
      videoPreview.srcObject = null;
      videoPreview.controls = false;
      videoPreview.classList.add('hidden');
    }
    if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
    if (resultPanel) resultPanel.classList.add('hidden');
    if (recordingTimer) recordingTimer.textContent = '00:00';
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
  });
}
