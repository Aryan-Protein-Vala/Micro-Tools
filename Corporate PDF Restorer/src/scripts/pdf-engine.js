/**
 * NLP engine to restore broken PDF text.
 */

export function initRestorer() {
  const rawInput = document.getElementById('raw-input');
  const cleanOutput = document.getElementById('clean-output');
  const btnCopy = document.getElementById('btn-copy');

  const optHyphen = document.getElementById('opt-hyphen');
  const optLines = document.getElementById('opt-lines');
  const optSpaces = document.getElementById('opt-spaces');

  function processText() {
    let text = rawInput.value;
    if (!text) {
      cleanOutput.value = '';
      return;
    }

    // 1. Temporarily protect double line breaks (paragraphs)
    // Replace \n\n or \r\n\r\n with a unique token
    const PARAGRAPH_TOKEN = '___PARAGRAPH_BREAK___';
    text = text.replace(/(?:\r?\n){2,}/g, PARAGRAPH_TOKEN);

    // 2. Fix Hyphenated words at the end of a line (e.g., "busi-\nness")
    if (optHyphen.checked) {
      // Matches a word character, a hyphen, optional spaces, a newline, and then more word characters
      text = text.replace(/([a-zA-Z]+)-\s*\r?\n\s*([a-zA-Z]+)/g, '$1$2');
    }

    // 3. Remove single line breaks within paragraphs
    if (optLines.checked) {
      // Replace any remaining single newline with a space
      text = text.replace(/\r?\n/g, ' ');
    }

    // 4. Fix double spaces
    if (optSpaces.checked) {
      text = text.replace(/[ \t]{2,}/g, ' ');
    }

    // 5. Restore paragraphs
    text = text.replace(new RegExp(PARAGRAPH_TOKEN, 'g'), '\n\n');

    cleanOutput.value = text.trim();
  }

  // React instantly to input or toggle changes
  rawInput.addEventListener('input', processText);
  optHyphen.addEventListener('change', processText);
  optLines.addEventListener('change', processText);
  optSpaces.addEventListener('change', processText);

  // Copy functionality
  btnCopy.addEventListener('click', () => {
    const textToCopy = cleanOutput.value;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success-deep"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => btnCopy.innerHTML = originalText, 2000);
  });
}
