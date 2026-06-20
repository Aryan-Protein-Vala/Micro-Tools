export function setupUI() {
  const urlInput = document.getElementById('url-input');
  const btnExtract = document.getElementById('btn-extract');
  const stripUtmCheckbox = document.getElementById('strip-utm');
  
  const emptyState = document.getElementById('empty-state');
  const resultsView = document.getElementById('results-view');
  const urlList = document.getElementById('url-list');
  const urlCount = document.getElementById('url-count');
  
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnOpenAll = document.getElementById('btn-open-all');

  let extractedUrls = [];

  // Robust URL regex
  // Matches http://, https:// and www.
  const urlRegex = /(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  const extractUrls = (text) => {
    const matches = text.match(urlRegex) || [];
    // Ensure all start with http to be clickable
    let normalized = matches.map(u => u.startsWith('http') ? u : 'https://' + u);
    // Deduplicate
    return [...new Set(normalized)];
  };

  const cleanUtm = (urlStr) => {
    try {
      const url = new URL(urlStr);
      const params = new URLSearchParams(url.search);
      const keysToDelete = [];
      for (const key of params.keys()) {
        if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => params.delete(k));
      url.search = params.toString();
      return url.toString();
    } catch (e) {
      // If parsing fails (e.g. malformed), just return original
      return urlStr;
    }
  };

  const escapeHTML = (str) => {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag])
    );
  };

  const renderUrls = () => {
    urlList.innerHTML = '';
    
    if (extractedUrls.length === 0) {
      resultsView.classList.add('opacity-0');
      setTimeout(() => {
        resultsView.classList.add('hidden');
        emptyState.classList.remove('hidden');
        setTimeout(() => emptyState.classList.remove('opacity-0'), 10);
      }, 300);
      return;
    }

    urlCount.textContent = extractedUrls.length;

    extractedUrls.forEach((url, i) => {
      const safeUrl = escapeHTML(url);
      const item = document.createElement('div');
      item.className = 'flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg group hover:bg-white/10 transition-colors';
      item.innerHTML = `
        <span class="text-xs font-mono text-white/30 min-w-[20px]">${i + 1}.</span>
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-sm font-mono text-blue-400 hover:text-blue-300 truncate flex-1" title="${safeUrl}">
          ${safeUrl}
        </a>
        <button class="copy-single p-1.5 text-white/40 hover:text-white bg-black/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" data-url="${safeUrl}" title="Copy URL">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      `;
      urlList.appendChild(item);
    });

    emptyState.classList.add('opacity-0');
    setTimeout(() => {
      emptyState.classList.add('hidden');
      resultsView.classList.remove('hidden');
      setTimeout(() => resultsView.classList.remove('opacity-0'), 10);
    }, 300);

    // Bind individual copy buttons
    document.querySelectorAll('.copy-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const urlToCopy = e.currentTarget.getAttribute('data-url');
        navigator.clipboard.writeText(urlToCopy);
        const icon = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { e.currentTarget.innerHTML = icon; }, 1500);
      });
    });
  };

  if (btnExtract) {
    btnExtract.addEventListener('click', () => {
      const text = urlInput.value;
      if (!text.trim()) return;

      let urls = extractUrls(text);
      
      if (stripUtmCheckbox && stripUtmCheckbox.checked) {
        urls = urls.map(cleanUtm);
        // Deduplicate again after cleaning UTMs (as multiple UTM variants might resolve to same base URL)
        urls = [...new Set(urls)];
      }

      extractedUrls = urls;
      renderUrls();
    });
  }

  if (btnCopyAll) {
    btnCopyAll.addEventListener('click', () => {
      if (extractedUrls.length === 0) return;
      navigator.clipboard.writeText(extractedUrls.join('\n'));
      const orig = btnCopyAll.innerHTML;
      btnCopyAll.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => { btnCopyAll.innerHTML = orig; }, 2000);
    });
  }

  if (btnOpenAll) {
    btnOpenAll.addEventListener('click', () => {
      if (extractedUrls.length === 0) return;
      if (extractedUrls.length > 20) {
        const confirmOpen = confirm(`You are about to open ${extractedUrls.length} tabs at once. This might slow down your browser. Continue?`);
        if (!confirmOpen) return;
      }
      
      // Delaying window.open slightly to bypass some aggressive popup blockers
      extractedUrls.forEach((url, index) => {
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 50);
      });
    });
  }
}
