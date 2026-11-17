// DeLab Options — 企微智能表格同步配置页（壳层；内容复用插件内的 WecomSettings）

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeManager, SANS } from './theme';
import { injectFonts } from './fonts';
import { SunIcon, MoonIcon } from './components/Icon';
import { WecomSettings } from './components/WecomSettings';

const themeManager = new ThemeManager();
injectFonts();

function OptionsApp() {
  const [theme, setTheme] = useState(themeManager.getTheme());

  const toggleTheme = () => {
    themeManager.toggle();
    setTheme(themeManager.getTheme());
  };

  return (
    <div className="dl-ops">
      <style>{`
        html, body { margin: 0; min-height: 100%; }
        #root { min-height: 100%; }
        .dl-ops {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--delab-bg, #f5f5f6);
          color: var(--delab-text, #141416);
          font-family: ${SANS};
          font-size: 13px;
          -webkit-font-smoothing: antialiased;
        }
        .dl-ops * { box-sizing: border-box; }
        .dl-ops-top {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          height: 52px;
          padding: 0 20px;
          border-bottom: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          background: color-mix(in srgb, var(--delab-bg, #f5f5f6) 88%, transparent);
          backdrop-filter: blur(12px);
        }
        .dl-ops-logo {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: block;
        }
        .dl-ops-name {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .dl-ops-crumb {
          font-size: 11px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .dl-ops-theme {
          appearance: none;
          margin-left: auto;
          width: 42px;
          height: 28px;
          position: relative;
          padding: 0;
          border-radius: 999px;
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          background: var(--delab-field-bg, #ffffff);
          color: var(--delab-text-secondary, #57575e);
          cursor: pointer;
        }
        .dl-ops-theme span {
          position: absolute;
          top: 3px;
          left: ${theme === 'dark' ? '16px' : '4px'};
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--delab-bg, #f5f5f6);
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          box-shadow: 0 1px 2px rgba(0,0,0,0.18);
          transition: left 0.15s ease;
        }
        .dl-ops-main { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
      `}</style>

      <header className="dl-ops-top">
        <img className="dl-ops-logo" src={chrome.runtime.getURL('icons/icon-128.png')} alt="" />
        <span className="dl-ops-name">Inspect Lab</span>
        <span className="dl-ops-crumb">/ 企微同步设置</span>
        <button
          type="button"
          className="dl-ops-theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          <span>{theme === 'dark' ? <MoonIcon size={10} /> : <SunIcon size={10} />}</span>
        </button>
      </header>

      <main className="dl-ops-main">
        <WecomSettings />
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) createRoot(container).render(<OptionsApp />);
