// Extremely common stop words to filter out
const stopWords = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'are', 'is',
  'was', 'were', 'been', 'has', 'had', 'does', 'did', 'am', 'being', 'those', 'such',
  'why', 'very', 'much', 'more', 'too', 'many', 'own', 'same', 'should', 'might', 'must',
  'can\'t', 'won\'t', 'don\'t', 'didn\'t', 'isn\'t', 'aren\'t', 'doesn\'t', 'hasn\'t'
]);

export function setupUI() {
  const textInput = document.getElementById('text-input');
  const btnGenerate = document.getElementById('btn-generate');
  const themeSelect = document.getElementById('theme-select');
  
  const emptyState = document.getElementById('empty-state');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const cloudContainer = document.getElementById('cloud-container');
  const actionsBar = document.getElementById('actions-bar');
  
  const btnDownload = document.getElementById('btn-download');
  const btnShowTable = document.getElementById('btn-show-table');
  const modal = document.getElementById('data-modal');
  const modalContent = document.getElementById('data-modal-content');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const tableBody = document.getElementById('frequency-table-body');

  let currentCanvas = null;
  let wordFreqArray = [];

  const getThemeColor = (theme) => {
    return function(word, weight, fontSize, distance, theta) {
      if (theme === 'cyberpunk') {
        const colors = ['#ef4444', '#f97316', '#eab308', '#ffffff', '#dc2626'];
        return colors[Math.floor(Math.random() * colors.length)];
      } else if (theme === 'matrix') {
        const colors = ['#4ade80', '#22c55e', '#16a34a', '#86efac', '#15803d'];
        return colors[Math.floor(Math.random() * colors.length)];
      } else if (theme === 'ocean') {
        const colors = ['#38bdf8', '#0ea5e9', '#0284c7', '#7dd3fc', '#818cf8'];
        return colors[Math.floor(Math.random() * colors.length)];
      } else if (theme === 'monochrome') {
        const opacities = ['0.4', '0.6', '0.8', '1.0'];
        return `rgba(255, 255, 255, ${opacities[Math.floor(Math.random() * opacities.length)]})`;
      } else {
        // Random Vibrant
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 80%, 65%)`;
      }
    };
  };

  const processText = (text) => {
    // Basic tokenizer
    const words = text.toLowerCase()
      .replace(/[^\w\s\']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');

    const counts = {};
    let maxCount = 0;

    words.forEach(w => {
      // Clean quotes
      w = w.replace(/^'+|'+$/g, '');
      if (w.length < 2 || stopWords.has(w) || !isNaN(w)) return;
      
      counts[w] = (counts[w] || 0) + 1;
      if (counts[w] > maxCount) maxCount = counts[w];
    });

    // Convert to array of [word, size]
    // Filter out items that only appear once if the list is huge, to keep the canvas clean
    let arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    if (arr.length > 200) {
      arr = arr.slice(0, 200); // Take top 200 words max
    }

    wordFreqArray = arr;
    return arr;
  };

  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      const text = textInput.value;
      if (!text.trim()) {
        alert("Please enter some text.");
        return;
      }

      btnGenerate.disabled = true;
      btnGenerate.textContent = "Rendering...";

      try {
        const list = processText(text);
        if (list.length === 0) {
          alert("Not enough meaningful words found to generate a cloud.");
          return;
        }

        // Lazy load wordcloud2
        const WordCloud = (await import('wordcloud')).default;

        emptyState.classList.add('hidden');
        canvasWrapper.classList.remove('hidden');
        
        // Rebuild canvas to ensure it fits the container exactly without scaling blur
        cloudContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        const rect = cloudContainer.getBoundingClientRect();
        
        // High DPI setup for sharp export
        const scale = window.devicePixelRatio || 2;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        cloudContainer.appendChild(canvas);
        currentCanvas = canvas;

        const theme = themeSelect.value;
        const colorFn = getThemeColor(theme);

        // Calculate a good weightFactor based on the top word count and canvas height
        const topCount = list[0][1];
        const weightFactor = (canvas.height / 10) / topCount; 

        WordCloud(canvas, {
          list: list,
          gridSize: Math.round(16 * canvas.width / 1024),
          weightFactor: weightFactor < 2 ? 2 : weightFactor,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colorFn,
          backgroundColor: 'transparent',
          rotateRatio: 0.5,
          rotationSteps: 2,
          shrinkToFit: true,
          drawOutOfBound: false
        });

        // The library renders async, so wait a bit before showing actions
        setTimeout(() => {
          canvasWrapper.classList.remove('opacity-0');
          actionsBar.classList.remove('hidden');
          setTimeout(() => actionsBar.classList.remove('opacity-0'), 10);
        }, 500);

      } catch (err) {
        console.error(err);
        alert("An error occurred while generating the word cloud.");
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-hover:scale-110 transition-transform"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Render Word Cloud`;
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!currentCanvas) return;
      
      // WordCloud draws on a transparent canvas by default. 
      // To export as a nice image, we composite it over a dark background.
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = currentCanvas.width;
      exportCanvas.height = currentCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = '#111111'; // Match site bg
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      ctx.drawImage(currentCanvas, 0, 0);

      const url = exportCanvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = url;
      a.download = `toolgrid-wordcloud-${Date.now()}.png`;
      a.click();
    });
  }

  // --- Modal Logic ---
  const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));

  if (btnShowTable) {
    btnShowTable.addEventListener('click', () => {
      tableBody.innerHTML = '';
      wordFreqArray.forEach(([word, count]) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition-colors";
        tr.innerHTML = `
          <td class="py-3 px-6 text-white font-medium">${escapeHTML(word)}</td>
          <td class="py-3 px-6 text-white/70 text-right font-mono">${count}</td>
        `;
        tableBody.appendChild(tr);
      });
      
      modal.classList.remove('hidden');
      // small delay for transition
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
      }, 10);
    });
  }

  const closeModal = () => {
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}
