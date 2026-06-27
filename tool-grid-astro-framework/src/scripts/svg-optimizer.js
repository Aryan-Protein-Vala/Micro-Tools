import { optimize } from 'svgo/browser';
import JSZip from 'jszip';

export function setupUI() {
  const dropzone = document.getElementById('svg-dropzone');
  const fileInput = document.getElementById('svg-file-input');
  const settingsPanel = document.getElementById('settings-panel');
  const resultsArea = document.getElementById('results-area');
  const fileList = document.getElementById('file-list');
  const btnDownloadAll = document.getElementById('btn-download-all');
  const btnReset = document.getElementById('btn-reset');
  const optMultipass = document.getElementById('opt-multipass');
  const optPrecision = document.getElementById('opt-precision');

  const statsTotalFiles = document.getElementById('stats-total-files');
  const statsOriginal = document.getElementById('stats-original');
  const statsOptimized = document.getElementById('stats-optimized');
  const statsSaved = document.getElementById('stats-saved');

  if (!dropzone || !fileInput) return;

  let processedFiles = [];

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-accent', 'bg-accent/10');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-accent', 'bg-accent/10');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-accent', 'bg-accent/10');
    if (e.dataTransfer.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFiles(Array.from(e.target.files));
    }
  });

  btnReset?.addEventListener('click', () => {
    processedFiles = [];
    fileInput.value = '';
    dropzone.classList.remove('hidden');
    settingsPanel?.classList.add('hidden');
    resultsArea?.classList.add('hidden');
    if (fileList) fileList.innerHTML = '';
  });

  btnDownloadAll?.addEventListener('click', async () => {
    if (!processedFiles.length) return;
    const zip = new JSZip();
    processedFiles.forEach((f, i) => {
      // Avoid duplicate names if they exist
      const name = f.name.endsWith('.svg') ? f.name : `${f.name}.svg`;
      zip.file(name, f.optimizedData);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-svgs-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });

  async function handleFiles(files) {
    const svgFiles = files.filter(f => f.type === 'image/svg+xml' || f.name.endsWith('.svg'));
    if (svgFiles.length === 0) {
      alert("Please select valid SVG files.");
      return;
    }
    
    dropzone.classList.add('hidden');
    if (settingsPanel) settingsPanel.classList.remove('hidden');
    if (resultsArea) resultsArea.classList.remove('hidden');
    if (fileList) fileList.innerHTML = '';

    processedFiles = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    for (const file of svgFiles) {
      try {
        const text = await file.text();
        const originalSize = text.length;
        
        const floatPrecision = optPrecision?.checked ? 2 : 3;
        const multipass = optMultipass?.checked ?? true;

        const result = optimize(text, {
          multipass: multipass,
          floatPrecision: floatPrecision,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                },
              },
            },
            'removeDimensions',
          ],
        });

        const optimizedSize = result.data.length;
        
        processedFiles.push({
          name: file.name,
          originalSize,
          optimizedSize,
          optimizedData: result.data
        });

        totalOriginalSize += originalSize;
        totalOptimizedSize += optimizedSize;

        // Render card
        renderFileCard(file.name, originalSize, optimizedSize, result.data);

      } catch (err) {
        console.error(`Error optimizing ${file.name}:`, err);
      }
    }

    // Update global stats
    if (statsTotalFiles) statsTotalFiles.textContent = `${processedFiles.length} files processed`;
    if (statsOriginal) statsOriginal.textContent = formatBytes(totalOriginalSize);
    if (statsOptimized) statsOptimized.textContent = formatBytes(totalOptimizedSize);
    if (statsSaved) {
      const saved = totalOriginalSize - totalOptimizedSize;
      const pct = totalOriginalSize > 0 ? Math.round((saved / totalOriginalSize) * 100) : 0;
      statsSaved.textContent = `${pct}% saved`;
    }
  }

  function renderFileCard(name, originalSize, optimizedSize, svgContent) {
    if (!fileList) return;
    
    const savedBytes = originalSize - optimizedSize;
    const savedPct = Math.round((savedBytes / originalSize) * 100);
    
    const card = document.createElement('div');
    card.className = "flex items-center gap-4 p-4 border border-border rounded-lg bg-black/20";
    
    // Create preview by encoding SVG
    const encoded = encodeURIComponent(svgContent).replace(/'/g, '%27').replace(/"/g, '%22');
    const previewUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;

    const blobUrl = URL.createObjectURL(new Blob([svgContent], {type: 'image/svg+xml'}));

    card.innerHTML = `
      <div class="w-16 h-16 bg-white/5 rounded flex items-center justify-center p-2 shrink-0">
        <img src="${previewUrl}" class="max-w-full max-h-full object-contain" alt="Preview" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm truncate" title="${name}">${name}</h4>
        <div class="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <span class="line-through opacity-70">${formatBytes(originalSize)}</span>
          <span>&rarr;</span>
          <span class="font-medium text-foreground">${formatBytes(optimizedSize)}</span>
          <span class="text-green-500 font-medium">(-${savedPct}%)</span>
        </div>
      </div>
      <a href="${blobUrl}" download="opt_${name}" class="p-2 bg-accent/20 text-accent rounded hover:bg-accent hover:text-accent-foreground transition-colors shrink-0" title="Download">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
      </a>
    `;
    fileList.appendChild(card);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
