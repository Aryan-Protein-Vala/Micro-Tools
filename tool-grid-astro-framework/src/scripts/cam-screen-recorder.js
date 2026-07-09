let mediaRecorder = null;
let recordedChunks = [];
let timerInterval = null;
let startTime = null;
let animationFrameId = null;

let screenStream = null;
let camStream = null;

let screenVideo = document.createElement('video');
screenVideo.muted = true;
screenVideo.playsInline = true;

let camVideo = document.createElement('video');
camVideo.muted = true;
camVideo.playsInline = true;

export function setupUI() {
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnNew = document.getElementById('btn-new');
  const btnDownload = document.getElementById('btn-download');
  
  const videoWrapper = document.getElementById('video-wrapper');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const recordingIndicator = document.getElementById('recording-indicator');
  const recordingTimer = document.getElementById('recording-timer');
  const resultPanel = document.getElementById('result-panel');
  
  // The interactive preview elements
  const screenPreview = document.getElementById('screen-preview');
  const camPreviewWrapper = document.getElementById('cam-preview-wrapper');
  const camPreview = document.getElementById('cam-preview');
  
  // Controls
  const recordMic = document.getElementById('record-mic');
  const recordCam = document.getElementById('record-cam');

  // Dragging state for the webcam PiP
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  
  // Percentages relative to the wrapper size (to map to canvas properly)
  let camPosX = 0.8; // 80% from left
  let camPosY = 0.8; // 80% from top
  let camRadiusPct = 0.1; // 10% of width/height (approx)

  if (!btnStart || !btnStop) return;

  // Set up dragging on the cam wrapper
  if (camPreviewWrapper) {
    camPreviewWrapper.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = camPreviewWrapper.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const parentRect = videoWrapper.getBoundingClientRect();
      
      let newLeft = e.clientX - parentRect.left - dragOffsetX;
      let newTop = e.clientY - parentRect.top - dragOffsetY;
      
      // Boundary checks
      const rect = camPreviewWrapper.getBoundingClientRect();
      newLeft = Math.max(0, Math.min(newLeft, parentRect.width - rect.width));
      newTop = Math.max(0, Math.min(newTop, parentRect.height - rect.height));

      // Update DOM
      camPreviewWrapper.style.left = `${newLeft}px`;
      camPreviewWrapper.style.top = `${newTop}px`;
      
      // Update normalized positions for canvas renderer
      camPosX = (newLeft + rect.width / 2) / parentRect.width;
      camPosY = (newTop + rect.height / 2) / parentRect.height;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  btnStart.addEventListener('click', async () => {
    try {
      // 1. Get Screen Stream
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
        audio: true // System audio
      });

      screenVideo.srcObject = screenStream;
      await screenVideo.play();

      let audioTracks = [];
      if (screenStream.getAudioTracks().length > 0) {
        audioTracks.push(screenStream.getAudioTracks()[0]);
      }

      // 2. Get Webcam/Mic Stream
      if (recordCam?.checked || recordMic?.checked) {
        try {
          const constraints = {
            video: recordCam?.checked ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
            audio: recordMic?.checked ? true : false
          };
          camStream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (recordCam?.checked) {
            camVideo.srcObject = camStream;
            await camVideo.play();
          }

          if (recordMic?.checked && camStream.getAudioTracks().length > 0) {
            audioTracks.push(camStream.getAudioTracks()[0]);
          }
        } catch (_) {
          console.warn("Could not get webcam/mic permissions");
        }
      }

      // 3. Set up DOM previews
      if (screenPreview) {
        screenPreview.srcObject = screenStream;
        screenPreview.classList.remove('hidden');
      }
      
      if (camPreview && recordCam?.checked) {
        camPreview.srcObject = camStream;
        camPreviewWrapper.classList.remove('hidden');
        // Initial normalized pos
        const pRect = videoWrapper.getBoundingClientRect();
        const cRect = camPreviewWrapper.getBoundingClientRect();
        camPosX = (camPreviewWrapper.offsetLeft + cRect.width / 2) / pRect.width;
        camPosY = (camPreviewWrapper.offsetTop + cRect.height / 2) / pRect.height;
      }

      if (previewPlaceholder) previewPlaceholder.classList.add('hidden');

      // 4. Set up Canvas Compositor
      const canvas = document.createElement('canvas');
      const cw = screenVideo.videoWidth || 1920;
      const ch = screenVideo.videoHeight || 1080;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');

      const drawLoop = () => {
        // Draw screen
        ctx.drawImage(screenVideo, 0, 0, cw, ch);

        // Draw webcam PiP
        if (recordCam?.checked && camVideo.readyState >= 2) {
          const camW = camVideo.videoWidth;
          const camH = camVideo.videoHeight;
          const aspect = camW / camH;
          
          // Radius based on 12% of canvas height (so it scales nicely)
          const radius = ch * 0.12; 
          const centerX = cw * camPosX;
          const centerY = ch * camPosY;

          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          
          // Source rect from webcam to maintain aspect ratio covering the circle
          let sx = 0, sy = 0, sw = camW, sh = camH;
          if (aspect > 1) { // Landscape cam
            sw = camH; // Crop width to match height
            sx = (camW - sw) / 2;
          } else { // Portrait cam
            sh = camW;
            sy = (camH - sh) / 2;
          }
          
          ctx.drawImage(camVideo, sx, sy, sw, sh, centerX - radius, centerY - radius, radius * 2, radius * 2);
          ctx.restore();

          // Draw ring around webcam
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();
        }

        animationFrameId = requestAnimationFrame(drawLoop);
      };
      
      drawLoop();

      // 5. Initialize MediaRecorder with mixed streams
      const canvasStream = canvas.captureStream(60);
      
      // Combine Audio
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      audioTracks.forEach(track => {
        const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
        source.connect(dest);
      });
      
      const mixedTracks = [...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      const combinedStream = new MediaStream(mixedTracks);

      recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';

      mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        clearInterval(timerInterval);
        cancelAnimationFrame(animationFrameId);
        audioCtx.close();

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Hide previews and show result
        if (screenPreview) screenPreview.classList.add('hidden');
        if (camPreviewWrapper) camPreviewWrapper.classList.add('hidden');
        
        // Use screen preview element for playback
        if (screenPreview) {
          screenPreview.srcObject = null;
          screenPreview.src = url;
          screenPreview.controls = true;
          screenPreview.classList.remove('hidden');
        }

        if (btnDownload) {
          btnDownload.href = url;
          btnDownload.download = `loom-alternative-record-${Date.now()}.webm`;
        }

        if (resultPanel) resultPanel.classList.remove('hidden');
        if (recordingIndicator) recordingIndicator.classList.add('hidden');

        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');

        // Stop all tracks
        stopAllStreams();
      };

      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
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
    if (screenPreview) {
      screenPreview.src = '';
      screenPreview.srcObject = null;
      screenPreview.controls = false;
      screenPreview.classList.add('hidden');
    }
    if (previewPlaceholder) previewPlaceholder.classList.remove('hidden');
    if (resultPanel) resultPanel.classList.add('hidden');
    if (recordingTimer) recordingTimer.textContent = '00:00';
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
  });
}

function stopAllStreams() {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }
}
