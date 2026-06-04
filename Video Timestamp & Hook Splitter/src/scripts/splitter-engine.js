/**
 * Extracts viral hooks and generates YouTube timestamps from raw scripts.
 */

export function initSplitter() {
  const btnProcess = document.getElementById('btn-process');
  const inputEl = document.getElementById('script-input');
  const outputContainer = document.getElementById('output-container');
  const timestampsOutput = document.getElementById('timestamps-output');
  const hooksOutput = document.getElementById('hooks-output');
  const btnCopyTimestamps = document.getElementById('btn-copy-timestamps');
  const btnCopyHooks = document.getElementById('btn-copy-hooks');

  let currentTimestamps = "";
  let currentHooks = [];

  btnProcess.addEventListener('click', () => {
    const rawText = inputEl.value.trim();
    if (!rawText) return;

    const originalText = btnProcess.textContent;
    btnProcess.textContent = "Processing...";
    btnProcess.disabled = true;

    setTimeout(() => {
      try {
        processScript(rawText);
        
        // Render Timestamps
        timestampsOutput.textContent = currentTimestamps;

        // Render Hooks
        hooksOutput.innerHTML = '';
        if (currentHooks.length === 0) {
          hooksOutput.innerHTML = '<span class="text-mute text-sm">No clear hooks found. Try pasting a more engaging script!</span>';
        } else {
          currentHooks.forEach(hook => {
            const hookDiv = document.createElement('div');
            hookDiv.className = "p-3 bg-canvas border border-hairline rounded-minimal text-sm text-ink shadow-sm";
            hookDiv.textContent = hook;
            hooksOutput.appendChild(hookDiv);
          });
        }

        outputContainer.classList.remove('hidden');
      } finally {
        btnProcess.textContent = originalText;
        btnProcess.disabled = false;
      }
    }, 50);
  });

  // Format time (seconds) to MM:SS
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function processScript(text) {
    // 1. Generate Timestamps
    // Estimate 150 words per minute (2.5 words per second).
    const wordsPerSecond = 2.5;
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    
    let currentTime = 0;
    let timestampsList = [];
    
    // Always start at 00:00
    timestampsList.push("00:00 - Intro");
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const wordCount = p.split(/\s+/).length;
      const duration = wordCount / wordsPerSecond;
      
      currentTime += duration;
      
      // We don't want a chapter for every single paragraph. 
      // Create a chapter if the paragraph is substantial or every ~45 seconds.
      // We'll extract a title from the first sentence of the paragraph.
      if (duration > 15 || currentTime > 45 * timestampsList.length) {
        const firstSentence = p.split(/(?<=[.?!])\s+/)[0];
        // Clean up the chapter title
        let title = firstSentence.replace(/^[^a-zA-Z0-9]+/, '').trim();
        
        // Add timestamp if we haven't just added one very close to this time
        const formattedTime = formatTime(currentTime);
        timestampsList.push(`${formattedTime} - ${title}`);
      }
    }
    currentTimestamps = timestampsList.join('\n');

    // 2. Extract Hooks
    // Look for sentences that end in a question mark, or start with specific hook keywords.
    const hookKeywords = [
      "how to", "why you", "the secret", "stop doing", 
      "you won't believe", "here is", "here's", "the truth about"
    ];
    
    const sentences = text.match(/[^.?!]+[.?!]+/g) || [];
    currentHooks = [];
    
    sentences.forEach(sentence => {
      const s = sentence.trim();
      if (s.length < 15) return; // ignore very short artifacts
      
      const lower = s.toLowerCase();
      
      let isHook = false;
      // Questions are good hooks
      if (s.endsWith('?')) isHook = true;
      
      // Keyword matching
      for (const kw of hookKeywords) {
        if (lower.includes(kw)) {
          isHook = true;
          break;
        }
      }
      
      // Short punchy statements (between 15 and 50 chars)
      if (s.length <= 50 && !s.includes(',')) isHook = true;

      if (isHook && currentHooks.length < 10) {
        currentHooks.push(s);
      }
    });
  }

  // Copy functionality
  btnCopyTimestamps.addEventListener('click', () => {
    navigator.clipboard.writeText(currentTimestamps);
    const originalText = btnCopyTimestamps.innerHTML;
    btnCopyTimestamps.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success-deep"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => btnCopyTimestamps.innerHTML = originalText, 2000);
  });

  btnCopyHooks.addEventListener('click', () => {
    const hooksText = currentHooks.join('\n\n');
    navigator.clipboard.writeText(hooksText);
    const originalText = btnCopyHooks.innerHTML;
    btnCopyHooks.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success-deep"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => btnCopyHooks.innerHTML = originalText, 2000);
  });
}
