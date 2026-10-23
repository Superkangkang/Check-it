// DeLab Font Loader — injects JetBrains Mono variable font

export function injectFonts() {
  const fontUrl = chrome.runtime.getURL('fonts/JetBrainsMono[wght].ttf');
  const italicUrl = chrome.runtime.getURL('fonts/JetBrainsMono-Italic[wght].ttf');

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'JetBrains Mono';
      src: url('${fontUrl}') format('truetype');
      font-weight: 100 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'JetBrains Mono';
      src: url('${italicUrl}') format('truetype');
      font-weight: 100 800;
      font-style: italic;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}
