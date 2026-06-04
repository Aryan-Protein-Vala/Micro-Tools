import Papa from 'papaparse';

/**
 * Flattens a nested JSON object into a single-depth object with dot-notated keys.
 */
function flattenObject(ob) {
  const result = {};
  
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    
    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        result[i + '.' + x] = flatObject[x];
      }
    } else {
      result[i] = ob[i];
    }
  }
  return result;
}

export function initVisualizer() {
  const btnVisualize = document.getElementById('btn-visualize');
  const inputEl = document.getElementById('json-input');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const tableContainer = document.getElementById('table-container');
  const tableHeadRow = document.getElementById('table-head-row');
  const tableBody = document.getElementById('table-body');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const rowCountEl = document.getElementById('row-count');

  let currentData = [];

  btnVisualize.addEventListener('click', () => {
    const rawVal = inputEl.value.trim();
    if (!rawVal) {
      showError("Please enter some JSON data.");
      return;
    }

    const originalText = btnVisualize.textContent;
    btnVisualize.textContent = "Processing...";
    btnVisualize.disabled = true;

    // Use a small timeout to allow the browser to paint the "Processing..." text
    setTimeout(() => {
      try {
        const parsed = JSON.parse(rawVal);
        
        // Ensure it's an array for table rendering
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        
        if (dataArray.length === 0) {
          showError("The JSON array is empty.");
          return;
        }

        // Flatten each object in the array
        currentData = dataArray.map(obj => flattenObject(obj));
        
        renderTable(currentData);
        hideError();
        tableContainer.classList.remove('hidden');
        tableContainer.classList.add('flex');
      } catch (e) {
        showError("Invalid JSON: " + e.message);
        tableContainer.classList.add('hidden');
        tableContainer.classList.remove('flex');
      } finally {
        btnVisualize.textContent = originalText;
        btnVisualize.disabled = false;
      }
    }, 50);
  });

  btnExportCsv.addEventListener('click', () => {
    if (!currentData || currentData.length === 0) return;
    
    const csv = Papa.unparse(currentData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "flattened_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.classList.remove('hidden');
    errorContainer.classList.add('flex');
  }

  function hideError() {
    errorContainer.classList.add('hidden');
    errorContainer.classList.remove('flex');
  }

  function renderTable(data) {
    // Collect all unique keys for headers
    const headers = new Set();
    data.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    
    const headerArray = Array.from(headers);

    // Render Headers
    tableHeadRow.innerHTML = '';
    headerArray.forEach(header => {
      const th = document.createElement('th');
      th.className = "px-4 py-3 font-mono text-xs font-medium text-mute uppercase tracking-wider whitespace-nowrap";
      th.textContent = header;
      tableHeadRow.appendChild(th);
    });

    // Render Body (limit to 100 rows for browser performance)
    tableBody.innerHTML = '';
    const renderLimit = Math.min(data.length, 100);
    
    if (data.length > renderLimit) {
      rowCountEl.textContent = `Showing ${renderLimit} of ${data.length} rows (Export CSV for all data)`;
    } else {
      rowCountEl.textContent = `Showing ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;
    }
    
    for (let i = 0; i < renderLimit; i++) {
      const row = data[i];
      const tr = document.createElement('tr');
      tr.className = "hover:bg-canvas-soft-2 transition-colors";
      
      headerArray.forEach(header => {
        const td = document.createElement('td');
        td.className = "px-4 py-3 text-sm text-body whitespace-nowrap overflow-hidden text-ellipsis max-w-xs";
        
        let cellValue = row[header];
        if (cellValue === null) cellValue = 'null';
        else if (cellValue === undefined) cellValue = '';
        else if (typeof cellValue === 'object') cellValue = JSON.stringify(cellValue);
        else cellValue = String(cellValue);
        
        td.textContent = cellValue;
        tr.appendChild(td);
      });
      
      tableBody.appendChild(tr);
    }
  }
}
