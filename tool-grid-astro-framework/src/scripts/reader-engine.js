export function setupUI() {
  const urlInput = document.getElementById('url-input');
  const btnFetch = document.getElementById('btn-fetch');
  const statusBox = document.getElementById('status-box');
  
  const emptyState = document.getElementById('empty-state');
  const editorView = document.getElementById('editor-view');
  const articleTitleUI = document.getElementById('article-title');
  const markdownOutput = document.getElementById('markdown-output');
  
  const btnCopy = document.getElementById('btn-copy');
  const btnDownload = document.getElementById('btn-download');

  let currentTitle = "Document";

  const showStatus = (msg, type = 'info') => {
    statusBox.classList.remove('hidden');
    const colors = {
      'info': 'text-blue-400',
      'error': 'text-red-400',
      'success': 'text-green-400'
    };
    statusBox.textContent = '';
    const span = document.createElement('span');
    span.className = `${colors[type]} font-medium`;
    span.textContent = msg;
    statusBox.appendChild(span);
  };

  const getProxiedUrl = (url) => {
    // using corsproxy.io as requested for zero-cost client-side CORS bypass
    // fallback to allorigins if corsproxy is rate limited could be added later
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  if (btnFetch) {
    btnFetch.addEventListener('click', async () => {
      let targetUrl = urlInput.value.trim();
      if (!targetUrl) {
        showStatus("Please enter a valid URL.", "error");
        return;
      }
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      
      try {
        new URL(targetUrl); // Validate format
      } catch (e) {
        showStatus("Invalid URL format.", "error");
        return;
      }

      btnFetch.disabled = true;
      btnFetch.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Fetching...`;
      
      showStatus("Routing request through secure proxy...", "info");

      try {
        // 1. Fetch raw HTML via CORS proxy
        const response = await fetch(getProxiedUrl(targetUrl));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();

        showStatus("Parsing DOM and stripping trackers...", "info");

        // 2. Parse HTML string to DOM Document
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 3. Lazy load Readability
        const { Readability } = await import('@mozilla/readability');
        
        // Readability mutates the DOM, so clone it if we needed original
        const reader = new Readability(doc);
        const article = reader.parse();

        if (!article) {
          throw new Error("Readability failed to parse article content from this page.");
        }

        currentTitle = article.title || "Extracted_Document";
        articleTitleUI.textContent = currentTitle;

        showStatus("Converting to Markdown...", "info");

        // 4. Lazy load Turndown
        const TurndownService = (await import('turndown')).default;
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced'
        });

        // 5. Convert clean HTML to MD
        const markdownText = `# ${article.title}\n\n*Extracted from: ${targetUrl}*\n\n---\n\n${turndownService.turndown(article.content)}`;

        markdownOutput.value = markdownText;

        // Transition UI
        emptyState.classList.add('opacity-0');
        setTimeout(() => {
          emptyState.classList.add('hidden');
          editorView.classList.remove('hidden');
          setTimeout(() => editorView.classList.remove('opacity-0'), 10);
        }, 300);

        showStatus("Extraction complete!", "success");

      } catch (err) {
        console.error(err);
        showStatus(`Extraction failed: ${err.message}`, "error");
      } finally {
        btnFetch.disabled = false;
        btnFetch.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-hover:translate-y-[-2px] transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Extract Article`;
      }
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(markdownOutput.value);
      const orig = btnCopy.innerHTML;
      btnCopy.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied`;
      setTimeout(() => { btnCopy.innerHTML = orig; }, 2000);
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      const blob = new Blob([markdownOutput.value], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = currentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.href = url;
      link.setAttribute("download", `${safeTitle}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}
