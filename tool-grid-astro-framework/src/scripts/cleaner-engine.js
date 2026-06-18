import Papa from 'papaparse';

// UI Elements
const dropzone = document.getElementById('csv-dropzone');
const fileInput = document.getElementById('csv-file-input');
const workspace = document.getElementById('cleaner-workspace');
const btnProcess = document.getElementById('btn-process');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');
const ruleDedupeCheckbox = document.getElementById('rule-dedupe');
const dedupeSelectorWrapper = document.getElementById('dedupe-selector-wrapper');
const dedupeColumnSelect = document.getElementById('dedupe-column');
const processingStats = document.getElementById('processing-stats');
const statRows = document.getElementById('stat-rows');
const statRemoved = document.getElementById('stat-removed');
const tableContainer = document.getElementById('table-container');
const tableEmptyState = document.getElementById('table-empty-state');
const previewTable = document.getElementById('preview-table');
const previewThead = document.getElementById('preview-thead');
const previewTbody = document.getElementById('preview-tbody');
const tableFooter = document.getElementById('table-footer');

// State
let originalData = [];
let originalHeaders = [];
let cleanedData = [];
let cleanedHeaders = [];
let currentFile = null;

// Initialize
if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });
}

// Checkbox logic for Dedupe selector visibility
if (ruleDedupeCheckbox && dedupeSelectorWrapper) {
  ruleDedupeCheckbox.addEventListener('change', (e) => {
    dedupeSelectorWrapper.style.display = e.target.checked ? 'block' : 'none';
  });
  // Trigger initial state
  dedupeSelectorWrapper.style.display = ruleDedupeCheckbox.checked ? 'block' : 'none';
}

function handleFile(file) {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    alert('Please upload a valid CSV file.');
    return;
  }
  
  currentFile = file;
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: false, // We will handle empty lines manually based on rules
    complete: function(results) {
      if (results.errors.length && results.data.length === 0) {
        alert('Error parsing CSV. Please check the file format.');
        return;
      }
      
      originalData = results.data;
      originalHeaders = results.meta.fields || [];
      
      // Switch UI to workspace
      dropzone.classList.add('hidden');
      workspace.classList.remove('hidden');
      
      // Populate dedupe column dropdown
      populateDedupeDropdown(originalHeaders);
      
      // Initial render empty state
      tableEmptyState.textContent = `Loaded ${originalData.length} rows. Select your rules and click "Apply Rules" to clean the data.`;
      tableEmptyState.classList.remove('hidden');
      previewTable.classList.add('hidden');
      tableFooter.classList.add('hidden');
      btnDownload.classList.add('hidden');
      processingStats.classList.add('hidden');
      
      // Auto process if needed, but we'll wait for user click to show preview
    }
  });
}

function populateDedupeDropdown(headers) {
  if (!dedupeColumnSelect) return;
  dedupeColumnSelect.innerHTML = '<option value="">Select a column...</option>';
  
  headers.forEach(h => {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = h;
    
    // Auto-select email if present
    if (h.toLowerCase().includes('email')) {
      option.selected = true;
    }
    
    dedupeColumnSelect.appendChild(option);
  });
}

// Processing Logic
if (btnProcess) {
  btnProcess.addEventListener('click', applyRules);
}

function applyRules() {
  if (!originalData.length) return;
  
  const rules = {
    trim: document.getElementById('rule-trim')?.checked,
    empty: document.getElementById('rule-empty')?.checked,
    titlecase: document.getElementById('rule-titlecase')?.checked,
    lowercaseEmail: document.getElementById('rule-lowercase-email')?.checked,
    dedupe: document.getElementById('rule-dedupe')?.checked,
    dedupeCol: document.getElementById('dedupe-column')?.value
  };

  btnProcess.textContent = "Processing...";
  
  // Use setTimeout to allow UI update before heavy processing
  setTimeout(() => {
    let processed = [...originalData];
    cleanedHeaders = [...originalHeaders];
    
    let initialCount = processed.length;

    // Rule: Drop Empty Rows
    if (rules.empty) {
      processed = processed.filter(row => {
        return Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '');
      });
    }

    // Identify Name and Email columns
    const nameCols = cleanedHeaders.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('name') || lower === 'first' || lower === 'last';
    });
    const emailCols = cleanedHeaders.filter(h => h.toLowerCase().includes('email'));

    // Row-level transformations
    processed = processed.map(row => {
      let newRow = { ...row };
      
      Object.keys(newRow).forEach(key => {
        if (newRow[key] === null || newRow[key] === undefined) {
          newRow[key] = '';
          return;
        }
        
        let val = newRow[key].toString();
        
        // Rule: Trim
        if (rules.trim) {
          val = val.trim();
        }
        
        // Rule: Title Case Names
        if (rules.titlecase && nameCols.includes(key)) {
          val = toTitleCase(val);
        }
        
        // Rule: Lowercase Emails
        if (rules.lowercaseEmail && emailCols.includes(key)) {
          val = val.toLowerCase();
        }
        
        newRow[key] = val;
      });
      
      return newRow;
    });

    // Rule: Deduplicate
    if (rules.dedupe && rules.dedupeCol) {
      const seen = new Set();
      processed = processed.filter(row => {
        const val = row[rules.dedupeCol];
        if (val === undefined || val === '') return true; // Don't dedupe empty values
        
        // Use lowercase for dedupe matching
        const matchVal = val.toString().toLowerCase().trim();
        
        if (seen.has(matchVal)) {
          return false;
        }
        seen.add(matchVal);
        return true;
      });
    }

    cleanedData = processed;
    const removedCount = initialCount - cleanedData.length;

    // Update UI
    statRows.textContent = `Rows: ${cleanedData.length}`;
    statRemoved.textContent = `Removed: ${removedCount}`;
    processingStats.classList.remove('hidden');
    
    renderTablePreview(cleanedData, cleanedHeaders);
    
    btnDownload.classList.remove('hidden');
    btnProcess.textContent = "Apply Rules";
  }, 50);
}

function toTitleCase(str) {
  return str.replace(
    /\\w\\S*/g,
    function(txt) {
      // Don't title case roman numerals or specific acronyms if we were getting complex,
      // but for CRM standard Title Case is fine.
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function renderTablePreview(data, headers) {
  if (data.length === 0) {
    tableEmptyState.textContent = "No data remains after applying rules.";
    tableEmptyState.classList.remove('hidden');
    previewTable.classList.add('hidden');
    tableFooter.classList.add('hidden');
    return;
  }

  tableEmptyState.classList.add('hidden');
  previewTable.classList.remove('hidden');
  
  // Render Head
  previewThead.innerHTML = '';
  const trHead = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    trHead.appendChild(th);
  });
  previewThead.appendChild(trHead);
  
  // Render Body (max 10 rows for preview)
  previewTbody.innerHTML = '';
  const previewData = data.slice(0, 10);
  
  previewData.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = row[h] || '';
      tr.appendChild(td);
    });
    previewTbody.appendChild(tr);
  });
  
  if (data.length > 10) {
    tableFooter.classList.remove('hidden');
  } else {
    tableFooter.classList.add('hidden');
  }
}

// Download
if (btnDownload) {
  btnDownload.addEventListener('click', () => {
    if (!cleanedData.length) return;
    
    const csv = Papa.unparse({
      fields: cleanedHeaders,
      data: cleanedData
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    
    const originalName = currentFile ? currentFile.name.replace('.csv', '') : 'data';
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${originalName}_cleaned.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Reset
if (btnReset) {
  btnReset.addEventListener('click', () => {
    originalData = [];
    originalHeaders = [];
    cleanedData = [];
    cleanedHeaders = [];
    currentFile = null;
    if (fileInput) fileInput.value = '';
    
    workspace.classList.add('hidden');
    dropzone.classList.remove('hidden');
  });
}
