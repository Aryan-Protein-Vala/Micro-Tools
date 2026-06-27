import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export function setupUI() {
  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');
  const resultsArea = document.getElementById('results-area');
  const fileList = document.getElementById('file-list');
  const btnDownloadAll = document.getElementById('btn-download-all');
  const btnReset = document.getElementById('btn-reset');
  const statsTotalFiles = document.getElementById('stats-total-files');

  if (!dropzone || !fileInput) return;

  let sanitizedFiles = [];

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
    sanitizedFiles = [];
    fileInput.value = '';
    dropzone.classList.remove('hidden');
    resultsArea?.classList.add('hidden');
    if (fileList) fileList.innerHTML = '';
  });

  btnDownloadAll?.addEventListener('click', async () => {
    if (!sanitizedFiles.length) return;
    const zip = new JSZip();
    sanitizedFiles.forEach((f) => {
      const name = f.name.endsWith('.pdf') ? f.name : `${f.name}.pdf`;
      zip.file(name, f.data);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanitized-pdfs-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });

  async function handleFiles(files) {
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert("Please select valid PDF files.");
      return;
    }

    dropzone.classList.add('hidden');
    if (resultsArea) resultsArea.classList.remove('hidden');
    if (fileList) fileList.innerHTML = '';

    sanitizedFiles = [];

    for (const file of pdfFiles) {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);

        // Wipe standard metadata fields
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
        
        // Use epoch start to completely scrub timeline logs
        const epoch = new Date(0);
        pdfDoc.setCreationDate(epoch);
        pdfDoc.setModificationDate(epoch);

        const sanitizedBytes = await pdfDoc.save();

        sanitizedFiles.push({
          name: file.name,
          data: sanitizedBytes
        });

        renderFileCard(file.name, file.size, sanitizedBytes.length, sanitizedBytes);

      } catch (err) {
        console.error(`Error sanitizing ${file.name}:`, err);
        alert(`Failed to parse ${file.name}. It might be password protected or corrupted.`);
      }
    }

    if (statsTotalFiles) statsTotalFiles.textContent = `${sanitizedFiles.length} file(s) sanitized`;
  }

  function renderFileCard(name, originalSize, sanitizedSize, pdfContent) {
    if (!fileList) return;

    const card = document.createElement('div');
    card.className = "flex items-center gap-4 p-4 border border-border rounded-lg bg-black/20";

    const blobUrl = URL.createObjectURL(new Blob([pdfContent], { type: 'application/pdf' }));

    card.innerHTML = `
      <div class="w-12 h-12 bg-red-500/10 rounded flex items-center justify-center shrink-0 border border-red-500/25">
        <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm truncate" title="${name}">${name}</h4>
        <div class="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <span>Size: ${formatBytes(sanitizedSize)}</span>
          <span class="text-green-500 font-semibold">• Sanitized</span>
        </div>
      </div>
      <a href="${blobUrl}" download="clean_${name}" class="p-2 bg-accent/20 text-accent rounded hover:bg-accent hover:text-accent-foreground transition-colors shrink-0" title="Download">
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
