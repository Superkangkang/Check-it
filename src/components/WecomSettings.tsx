// DeLab WeCom Settings — 企微同步配置界面（扩展选项页 / 插件面板共用）

import { useEffect, useMemo, useRef, useState } from 'react';
import { MONO, SANS } from '../theme';
import { ChevronLeftIcon, CloudUploadIcon } from './Icon';
import {
  DEFAULT_WECOM_CONFIG,
  WECOM_FIELD_DEFS,
  maskWebhook,
  normalizeConfig,
  parseFieldMapText,
  readConfig,
  validateConfig,
  writeConfig,
  type WecomConfig,
  type WecomFieldKey,
  type WecomSyncResult,
} from '../wecom-sync';

type TestResult = { ok: boolean; title: string; detail?: string };

function formatClock(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export interface WecomSettingsProps {
  /** 嵌在插件面板里：紧凑排版，底部保存条随面板排列而不是固定到视口 */
  compact?: boolean;
  /** 紧凑模式下的返回（关闭设置回到原视图） */
  onBack?: () => void;
}

export function WecomSettings({ compact = false, onBack }: WecomSettingsProps) {
  const [config, setConfig] = useState<WecomConfig>(() => normalizeConfig(DEFAULT_WECOM_CONFIG));
  const [loaded, setLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validation = useMemo(() => validateConfig(config), [config]);

  const notify = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    void readConfig().then(stored => {
      setConfig(stored);
      setLoaded(true);
    });
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const update = <K extends keyof WecomConfig>(key: K, value: WecomConfig[K]) => {
    setTestResult(null);
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateField = (key: WecomFieldKey, value: string) => {
    setTestResult(null);
    setConfig(prev => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
  };

  /** 解析粘贴的字段列表，只覆盖匹配到的项，其余保留原值 */
  const applyFieldMap = () => {
    const result = parseFieldMapText(importText);
    if (result.error) {
      setImportResult({ tone: 'error', text: result.error });
      return;
    }

    const keys = Object.keys(result.matched) as WecomFieldKey[];
    if (!keys.length) {
      const hint = result.entryCount > 0
        ? `识别到 ${result.entryCount} 个 FIELD_ID，但没有字段名，无法匹配。请粘贴带 schema 的示例数据，或「字段名 + FIELD_ID」两列。`
        : '没有可匹配的字段，请检查粘贴内容';
      setImportResult({ tone: 'error', text: hint });
      return;
    }

    setTestResult(null);
    setConfig(prev => ({ ...prev, fields: { ...prev.fields, ...result.matched } }));

    if (result.unmatchedTitles.length) {
      const names = result.unmatchedTitles.slice(0, 6).join('、');
      const more = result.unmatchedTitles.length > 6 ? ' 等' : '';
      setImportResult({
        tone: 'warn',
        text: `已填充 ${keys.length} 项；未识别：${names}${more}。其余字段可手动补充。`,
      });
    } else {
      setImportResult({ tone: 'ok', text: `已填充 ${keys.length} 项，匹配到的字段都已关联。` });
    }
  };

  const status = !config.enabled
    ? { text: '已停用', tone: 'muted' as const }
    : testResult?.ok
      ? { text: '连接正常', tone: 'ok' as const }
      : validation.ok
        ? { text: savedAt ? '已保存' : '配置完整', tone: 'ok' as const }
        : { text: '配置未完成', tone: 'warn' as const };

  const save = async () => {
    setShowErrors(true);
    if (config.enabled && !validation.ok) {
      notify('请先修正标红的配置项');
      return;
    }
    setSaving(true);
    try {
      await writeConfig(config);
      setSavedAt(Date.now());
      notify('配置已保存');
    } catch {
      notify('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setShowErrors(true);
    setTestResult(null);
    if (!config.enabled) {
      notify('请先开启企微同步');
      return;
    }
    if (!validation.ok) {
      notify('请先修正标红的配置项');
      return;
    }
    setTesting(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'WECOM_TEST',
        config,
      }) as WecomSyncResult | undefined;

      if (!result) {
        setTestResult({ ok: false, title: '后台无响应', detail: '请重新加载扩展后再试' });
      } else if (result.ok) {
        setTestResult({
          ok: true,
          title: '测试记录已写入',
          detail: result.recordId ? `record_id: ${result.recordId}` : '企业微信未返回 record_id，可到表格里确认',
        });
      } else {
        setTestResult({
          ok: false,
          title: `写入失败（${result.code}）`,
          detail: `${result.message}${result.retryable ? ' · 可稍后重试' : ' · 请检查配置'}`,
        });
      }
    } catch {
      setTestResult({ ok: false, title: '发送失败', detail: '扩展后台无响应，请重新加载后再试' });
    } finally {
      setTesting(false);
    }
  };

  const fieldError = (key: WecomFieldKey) => (
    showErrors ? validation.errors[`field:${key}`] : undefined
  );

  const fieldInput = (key: WecomFieldKey, inputId?: string) => {
    const error = fieldError(key);
    return (
      <>
        <input
          className="dl-ws-input"
          id={inputId}
          value={config.fields[key] ?? ''}
          onChange={event => updateField(key, event.target.value)}
          placeholder="fldxxxxxxxx"
          spellCheck={false}
          style={{ fontFamily: MONO }}
          data-error={Boolean(error)}
        />
        {error && <div className="dl-ws-error">{error}</div>}
      </>
    );
  };

  return (
    <div className="dl-ws" data-compact={compact ? 'true' : 'false'}>
      <style>{`
        .dl-ws {
          color: var(--delab-text, #141416);
          font-family: ${SANS};
          font-size: 13px;
          -webkit-font-smoothing: antialiased;
        }
        .dl-ws * { box-sizing: border-box; }
        .dl-ws[data-compact='true'] {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .dl-ws-topbar {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          padding: 3px 8px 3px 4px;
          border-bottom: 1px solid var(--delab-border, rgba(0,0,0,0.08));
        }
        .dl-ws-back {
          appearance: none;
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--delab-text-secondary, #57575e);
          cursor: pointer;
        }
        .dl-ws-back:hover {
          background: var(--delab-row-hover, rgba(0,0,0,0.045));
          color: var(--delab-text, #141416);
        }
        .dl-ws-topbar-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dl-ws-hero {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 26px 20px 16px;
        }
        .dl-ws-hero h1 {
          margin: 0 0 6px;
          font-size: 22px;
          line-height: 1.3;
          letter-spacing: -0.02em;
        }
        .dl-ws-hero p {
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
          color: var(--delab-text-secondary, #57575e);
        }
        .dl-ws-body {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 20px 120px;
        }
        .dl-ws[data-compact='true'] .dl-ws-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          max-width: none;
          margin: 0;
          padding: 10px 10px 14px;
        }
        .dl-ws-card {
          margin-bottom: 14px;
          padding: 18px;
          border-radius: 12px;
          background: var(--delab-elevated, #ffffff);
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
        }
        .dl-ws[data-compact='true'] .dl-ws-card {
          margin-bottom: 10px;
          padding: 12px;
          border-radius: 10px;
        }
        .dl-ws-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .dl-ws-card-head h2 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .dl-ws[data-compact='true'] .dl-ws-card-head {
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .dl-ws-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-left: auto;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.7;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .dl-ws-chip::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: currentColor;
        }
        .dl-ws-chip[data-tone='ok'] {
          color: var(--delab-accent, #0eb668);
          background: var(--delab-accent-soft, rgba(14,182,104,0.14));
          border-color: var(--delab-accent-soft, rgba(14,182,104,0.24));
        }
        .dl-ws-chip[data-tone='warn'] {
          color: #b7791f;
          background: rgba(183,121,31,0.12);
          border-color: rgba(183,121,31,0.24);
        }
        .dl-ws-chip[data-tone='muted'] {
          color: var(--delab-text-tertiary, #8a8a90);
          background: var(--delab-sel, rgba(0,0,0,0.07));
        }
        .dl-ws-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-top: 1px solid var(--delab-border, rgba(0,0,0,0.08));
        }
        .dl-ws-row:first-of-type { border-top: none; padding-top: 0; }
        .dl-ws-label { font-size: 12px; font-weight: 600; }
        .dl-ws-desc {
          margin-top: 2px;
          font-size: 11px;
          line-height: 1.5;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .dl-ws-field { margin-bottom: 12px; }
        .dl-ws-field:last-child { margin-bottom: 0; }
        .dl-ws-input-wrap { position: relative; display: flex; gap: 6px; }
        .dl-ws-input {
          width: 100%;
          min-width: 0;
          height: 34px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid var(--delab-field-border, rgba(0,0,0,0.12));
          background: var(--delab-field-bg, #ffffff);
          color: var(--delab-text, #141416);
          font-family: ${MONO};
          font-size: 11px;
          outline: none;
          transition: border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .dl-ws-input:focus {
          border-color: var(--delab-accent, #0eb668);
          box-shadow: 0 0 0 3px var(--delab-accent-soft, rgba(14,182,104,0.14));
        }
        .dl-ws-input[data-error='true'] { border-color: var(--delab-danger, #e5484d); }
        .dl-ws-input::placeholder { color: var(--delab-text-tertiary, #8a8a90); }
        .dl-ws[data-compact='true'] .dl-ws-input { height: 30px; font-size: 10.5px; }
        .dl-ws-eye {
          appearance: none;
          flex: none;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid var(--delab-field-border, rgba(0,0,0,0.12));
          background: var(--delab-field-bg, #ffffff);
          color: var(--delab-text-secondary, #57575e);
          cursor: pointer;
        }
        .dl-ws-eye:hover { color: var(--delab-text, #141416); }
        .dl-ws-error {
          margin-top: 4px;
          font-size: 10.5px;
          line-height: 1.5;
          color: var(--delab-danger, #e5484d);
        }
        .dl-ws-hint {
          margin-top: 4px;
          font-size: 10.5px;
          line-height: 1.5;
          color: var(--delab-text-tertiary, #8a8a90);
          font-family: ${MONO};
          word-break: break-all;
        }
        .dl-ws-table { width: 100%; border-collapse: collapse; }
        .dl-ws-table th {
          padding: 0 0 8px;
          text-align: left;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .dl-ws-table th:last-child { width: 58%; }
        .dl-ws-table td {
          padding: 5px 0;
          vertical-align: top;
          border-top: 1px solid var(--delab-border, rgba(0,0,0,0.08));
        }
        .dl-ws-table tr:first-child td { border-top: none; }
        .dl-ws-field-name {
          font-size: 12px;
          font-weight: 600;
          padding-top: 9px;
        }
        .dl-ws[data-compact='true'] .dl-ws-field-name { padding-top: 0; }
        .dl-ws-required {
          margin-left: 5px;
          padding: 0 4px;
          border-radius: 3px;
          background: var(--delab-accent-soft, rgba(14,182,104,0.14));
          color: var(--delab-accent, #0eb668);
          font-size: 9px;
          font-weight: 600;
        }
        .dl-ws-field-type {
          padding-top: 10px;
          font-family: ${MONO};
          font-size: 10.5px;
          color: var(--delab-text-secondary, #57575e);
          white-space: nowrap;
        }
        .dl-ws[data-compact='true'] .dl-ws-field-type { padding-top: 1px; }
        .dl-ws-table .dl-ws-input { height: 30px; font-size: 10.5px; }
        .dl-ws-field-item {
          padding: 9px 0;
          border-top: 1px solid var(--delab-border, rgba(0,0,0,0.08));
        }
        .dl-ws-field-item:first-child { border-top: none; padding-top: 0; }
        .dl-ws-field-item-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .dl-ws-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .dl-ws-btn {
          appearance: none;
          height: 32px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid var(--delab-field-border, rgba(0,0,0,0.12));
          background: var(--delab-field-bg, #ffffff);
          color: var(--delab-text, #141416);
          font-family: ${SANS};
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .dl-ws-btn:hover { border-color: var(--delab-text-tertiary, #8a8a90); }
        .dl-ws-btn:disabled { opacity: 0.5; cursor: default; }
        .dl-ws-btn[data-primary='true'] {
          border-color: var(--delab-btn-bg, #141416);
          background: var(--delab-btn-bg, #141416);
          color: var(--delab-btn-text, #ffffff);
        }
        .dl-ws-btn[data-primary='true']:hover { opacity: 0.88; }
        .dl-ws-result {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.6;
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          background: var(--delab-bg, #f5f5f6);
        }
        .dl-ws-result[data-ok='true'] {
          border-color: var(--delab-accent-soft, rgba(14,182,104,0.24));
          background: var(--delab-accent-soft, rgba(14,182,104,0.1));
          color: var(--delab-accent, #0eb668);
        }
        .dl-ws-result[data-ok='false'] {
          border-color: rgba(229,72,77,0.28);
          background: rgba(229,72,77,0.08);
          color: var(--delab-danger, #e5484d);
        }
        .dl-ws-result b { display: block; margin-bottom: 2px; font-size: 11.5px; }
        .dl-ws-result span { font-family: ${MONO}; font-size: 10px; opacity: 0.9; word-break: break-all; }
        .dl-ws-switch {
          position: relative;
          width: 34px;
          height: 20px;
          flex: none;
          margin-top: 2px;
          cursor: pointer;
        }
        .dl-ws-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
        .dl-ws-switch span {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: var(--delab-sel, rgba(0,0,0,0.07));
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          transition: background 0.15s ease;
        }
        .dl-ws-switch span::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: var(--delab-elevated, #ffffff);
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .dl-ws-switch input:checked + span {
          background: var(--delab-accent, #0eb668);
          border-color: var(--delab-accent, #0eb668);
        }
        .dl-ws-switch input:checked + span::after {
          transform: translateX(14px);
          background: #ffffff;
        }
        .dl-ws-check {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex: none;
          margin-top: 2px;
          font-size: 12px;
          cursor: pointer;
          user-select: none;
        }
        .dl-ws-check input { accent-color: var(--delab-accent, #0eb668); }
        .dl-ws-import { margin-bottom: 12px; }
        .dl-ws-import-toggle {
          appearance: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--delab-accent, #0eb668);
          font-family: ${SANS};
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .dl-ws-import-toggle:hover { opacity: 0.8; }
        .dl-ws-import-body { margin-top: 8px; }
        .dl-ws-textarea {
          display: block;
          width: 100%;
          min-height: 96px;
          resize: vertical;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--delab-field-border, rgba(0,0,0,0.12));
          background: var(--delab-field-bg, #ffffff);
          color: var(--delab-text, #141416);
          font-family: ${MONO};
          font-size: 10.5px;
          line-height: 1.6;
          outline: none;
        }
        .dl-ws-textarea:focus {
          border-color: var(--delab-accent, #0eb668);
          box-shadow: 0 0 0 3px var(--delab-accent-soft, rgba(14,182,104,0.14));
        }
        .dl-ws-textarea::placeholder { color: var(--delab-text-tertiary, #8a8a90); }
        .dl-ws-import-actions { display: flex; gap: 6px; margin-top: 6px; }
        .dl-ws-import-actions .dl-ws-btn { height: 28px; padding: 0 10px; font-size: 11px; }
        .dl-ws-import-result {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 10.5px;
          line-height: 1.6;
          border: 1px solid var(--delab-border, rgba(0,0,0,0.08));
          background: var(--delab-bg, #f5f5f6);
          color: var(--delab-text-secondary, #57575e);
        }
        .dl-ws-import-result[data-tone='ok'] {
          border-color: var(--delab-accent-soft, rgba(14,182,104,0.24));
          background: var(--delab-accent-soft, rgba(14,182,104,0.1));
          color: var(--delab-accent, #0eb668);
        }
        .dl-ws-import-result[data-tone='warn'] {
          border-color: rgba(183,121,31,0.28);
          background: rgba(183,121,31,0.1);
          color: #b7791f;
        }
        .dl-ws-import-result[data-tone='error'] {
          border-color: rgba(229,72,77,0.28);
          background: rgba(229,72,77,0.08);
          color: var(--delab-danger, #e5484d);
        }
        .dl-ws-note {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--delab-bg, #f5f5f6);
          font-size: 11px;
          line-height: 1.7;
          color: var(--delab-text-secondary, #57575e);
        }
        .dl-ws-note ul { margin: 0; padding-left: 16px; }
        .dl-ws-note li + li { margin-top: 2px; }
        .dl-ws-inline-input { width: 180px; }
        .dl-ws[data-compact='true'] .dl-ws-inline-input { width: 132px; }
        .dl-ws-footer { flex-shrink: 0; border-top: 1px solid var(--delab-border, rgba(0,0,0,0.08)); }
        .dl-ws[data-compact='false'] .dl-ws-footer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 6;
          padding: 12px 20px;
          background: color-mix(in srgb, var(--delab-bg, #f5f5f6) 90%, transparent);
          backdrop-filter: blur(12px);
        }
        .dl-ws-footer-inner { display: flex; align-items: center; gap: 10px; }
        .dl-ws[data-compact='false'] .dl-ws-footer-inner {
          max-width: 760px;
          margin: 0 auto;
        }
        .dl-ws[data-compact='true'] .dl-ws-footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 10px 10px;
          background: var(--delab-bg, #f5f5f6);
        }
        .dl-ws-save-hint {
          margin-left: auto;
          font-size: 10.5px;
          color: var(--delab-text-tertiary, #8a8a90);
        }
        .dl-ws[data-compact='true'] .dl-ws-save-hint { margin-left: 0; text-align: center; }
        .dl-ws-toast {
          padding: 8px 14px;
          border-radius: 8px;
          background: var(--delab-glass-bg, rgba(23,23,24,0.94));
          color: var(--delab-glass-text, #ececee);
          border: 1px solid var(--delab-glass-border, rgba(255,255,255,0.12));
          font-size: 11px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 20;
        }
        .dl-ws[data-compact='false'] .dl-ws-toast {
          position: fixed;
          left: 50%;
          bottom: 76px;
          transform: translateX(-50%);
        }
        .dl-ws[data-compact='true'] .dl-ws-toast {
          position: absolute;
          left: 50%;
          bottom: 62px;
          transform: translateX(-50%);
        }
        @media (max-width: 560px) {
          .dl-ws-hero { padding: 20px 14px 14px; }
          .dl-ws-body { padding: 0 14px 112px; }
          .dl-ws-card { padding: 14px; }
          .dl-ws-table th:last-child { width: 52%; }
        }
      `}</style>

      {compact ? (
        <div className="dl-ws-topbar">
          <button
            type="button"
            className="dl-ws-back"
            onClick={onBack}
            title="返回"
            aria-label="返回"
          >
            <ChevronLeftIcon size={13} />
          </button>
          <span className="dl-ws-topbar-title">企微同步设置</span>
          <span className="dl-ws-chip" data-tone={status.tone}>{status.text}</span>
        </div>
      ) : (
        <div className="dl-ws-hero">
          <h1>同步到企业微信智能表格</h1>
          <p>
            在评论弹层或评论列表点「同步」，把这条评论作为一行记录写入下方配置的工作表。
            只写不读，失败可重试；已上报过的评论不会重复写入。
          </p>
        </div>
      )}

      <div className="dl-ws-body">
        <section className="dl-ws-card">
          <div className="dl-ws-card-head">
            <h2>连接</h2>
            {!compact && <span className="dl-ws-chip" data-tone={status.tone}>{status.text}</span>}
          </div>

          <div className="dl-ws-row">
            <div>
              <div className="dl-ws-label">启用企微同步</div>
              <div className="dl-ws-desc">关闭后评论上的同步入口会提示未开启，不会发出请求。</div>
            </div>
            <label className="dl-ws-switch" title="启用 / 停用">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={event => update('enabled', event.target.checked)}
              />
              <span />
            </label>
          </div>

          <div className="dl-ws-field">
            <div className="dl-ws-label" style={{ marginBottom: 6 }}>Webhook 地址</div>
            <div className="dl-ws-input-wrap">
              <input
                className="dl-ws-input"
                type={showSecret ? 'text' : 'password'}
                value={config.webhookUrl}
                onChange={event => update('webhookUrl', event.target.value)}
                placeholder="https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/webhook?key=..."
                spellCheck={false}
                autoComplete="off"
                data-error={showErrors && Boolean(validation.errors.webhookUrl)}
              />
              <button
                type="button"
                className="dl-ws-eye"
                title={showSecret ? '隐藏' : '显示完整地址'}
                onClick={() => setShowSecret(value => !value)}
              >
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                  strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 24C4 24 10 10 24 10C38 10 44 24 44 24C44 24 38 38 24 38C10 38 4 24 4 24Z" />
                  <circle cx="24" cy="24" r="5" />
                </svg>
              </button>
            </div>
            {showErrors && validation.errors.webhookUrl ? (
              <div className="dl-ws-error">{validation.errors.webhookUrl}</div>
            ) : (
              <div className="dl-ws-hint">
                {config.webhookUrl ? `当前：${maskWebhook(config.webhookUrl)}` : '从智能表格「接收外部数据」复制完整地址'}
              </div>
            )}
          </div>

          <div className="dl-ws-actions">
            <button type="button" className="dl-ws-btn" onClick={sendTest} disabled={testing}>
              <CloudUploadIcon size={13} />
              {testing ? '发送中…' : '发送测试记录'}
            </button>
            <span className="dl-ws-desc">使用当前表单内容，不必先保存</span>
          </div>

          {testResult && (
            <div className="dl-ws-result" data-ok={testResult.ok}>
              <b>{testResult.title}</b>
              {testResult.detail && <span>{testResult.detail}</span>}
            </div>
          )}
        </section>

        <section className="dl-ws-card">
          <div className="dl-ws-card-head">
            <h2>字段映射</h2>
            <span className="dl-ws-desc" style={{ marginTop: 0 }}>
              FIELD_ID 从智能表格「接收外部数据 → 示例数据」复制
            </span>
          </div>

          <div className="dl-ws-import">
            <button
              type="button"
              className="dl-ws-import-toggle"
              onClick={() => setImportOpen(open => !open)}
              aria-expanded={importOpen}
            >
              <svg width="9" height="9" viewBox="0 0 48 48" fill="none" stroke="currentColor"
                strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: importOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}
                aria-hidden="true">
                <path d="M18 10 32 24 18 38" />
              </svg>
              从字段列表自动填充
            </button>

            {importOpen && (
              <div className="dl-ws-import-body">
                <textarea
                  className="dl-ws-textarea"
                  value={importText}
                  onChange={event => {
                    setImportText(event.target.value);
                    setImportResult(null);
                  }}
                  placeholder={'支持粘贴：\n1. 企微示例数据（含 schema 字段名）\n2. 表格复制的两列：评论内容    f0e1ac\n3. {"fields":[{"field_id":"f0e1ac","field_title":"评论内容"}]}'}
                  spellCheck={false}
                />
                <div className="dl-ws-import-actions">
                  <button type="button" className="dl-ws-btn" data-primary="true" onClick={applyFieldMap}>
                    解析并填充
                  </button>
                  <button
                    type="button"
                    className="dl-ws-btn"
                    onClick={() => { setImportText(''); setImportResult(null); }}
                  >
                    清空
                  </button>
                </div>
                {importResult && (
                  <div className="dl-ws-import-result" data-tone={importResult.tone}>
                    {importResult.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {compact ? (
            <div>
              {WECOM_FIELD_DEFS.map(def => (
                <div className="dl-ws-field-item" key={def.key}>
                  <div className="dl-ws-field-item-head">
                    <span className="dl-ws-field-name">
                      {def.label}
                      {def.required && <span className="dl-ws-required">必填</span>}
                    </span>
                    <span className="dl-ws-field-type">{def.type}</span>
                  </div>
                  {def.hint && <div className="dl-ws-desc" style={{ marginTop: 0, marginBottom: 4 }}>{def.hint}</div>}
                  {fieldInput(def.key)}
                </div>
              ))}
            </div>
          ) : (
            <table className="dl-ws-table">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>表格类型</th>
                  <th>FIELD_ID</th>
                </tr>
              </thead>
              <tbody>
                {WECOM_FIELD_DEFS.map(def => (
                  <tr key={def.key}>
                    <td>
                      <div className="dl-ws-field-name">
                        {def.label}
                        {def.required && <span className="dl-ws-required">必填</span>}
                      </div>
                      {def.hint && <div className="dl-ws-desc">{def.hint}</div>}
                    </td>
                    <td><div className="dl-ws-field-type">{def.type}</div></td>
                    <td>{fieldInput(def.key)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="dl-ws-note">
            字段类型必须与表格一致：页面链接 → 链接；评论时间 → 日期（写入毫秒时间戳）；
            截图 → 图片；状态 → 单选。公式、自动编号、创建时间等字段无法写入。
          </div>
        </section>

        <section className="dl-ws-card">
          <div className="dl-ws-card-head"><h2>上报选项</h2></div>

          <div className="dl-ws-row">
            <div>
              <div className="dl-ws-label">包含截图</div>
              <div className="dl-ws-desc">把评论时的元素截图写入图片列，单条记录会变大。</div>
            </div>
            <label className="dl-ws-check">
              <input
                type="checkbox"
                checked={config.includeSnapshot}
                onChange={event => update('includeSnapshot', event.target.checked)}
              />
              开启
            </label>
          </div>

          <div className="dl-ws-row">
            <div>
              <div className="dl-ws-label">页面链接去除 query / hash</div>
              <div className="dl-ws-desc">避免把临时参数写进表格；默认开启。</div>
            </div>
            <label className="dl-ws-check">
              <input
                type="checkbox"
                checked={config.stripQuery}
                onChange={event => update('stripQuery', event.target.checked)}
              />
              开启
            </label>
          </div>

          <div className="dl-ws-row">
            <div>
              <div className="dl-ws-label">上报人</div>
              <div className="dl-ws-desc">可选。按企微成员姓名写入，留空则不写这一列。</div>
            </div>
            <input
              className="dl-ws-input dl-ws-inline-input"
              style={{ fontFamily: SANS }}
              value={config.reporter}
              onChange={event => update('reporter', event.target.value)}
              placeholder="例如：张三"
              maxLength={40}
            />
          </div>

          <div className="dl-ws-row">
            <div>
              <div className="dl-ws-label">请求超时</div>
              <div className="dl-ws-desc">3–30 秒。超时后可手动重试，重试前先确认表格里是否已写入。</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
              <input
                className="dl-ws-input"
                type="number"
                min={3}
                max={30}
                step={1}
                style={{ width: 76 }}
                value={Math.round(config.timeoutMs / 1000)}
                onChange={event => {
                  const seconds = Number(event.target.value);
                  if (Number.isFinite(seconds)) update('timeoutMs', seconds * 1000);
                }}
                onBlur={() => {
                  const seconds = Math.round(config.timeoutMs / 1000);
                  update('timeoutMs', Math.min(30, Math.max(3, seconds)) * 1000);
                }}
              />
              <span className="dl-ws-desc">秒</span>
            </div>
          </div>
        </section>

        <section className="dl-ws-card">
          <div className="dl-ws-card-head"><h2>安全与说明</h2></div>
          <div className="dl-ws-note" style={{ marginTop: 0 }}>
            <ul>
              <li>Webhook 地址等同该工作表的写权限，只保存在本机浏览器，不会上传或分享。</li>
              <li>如地址泄露，请到智能表格「接收外部数据」停用旧地址并重新生成。</li>
              <li>只做单向上报，插件不读取表格内容，也不回写处理状态。</li>
              <li>清除评论只做归档：上报记录保留，重建同一条评论也不会重复写行。</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="dl-ws-footer">
        <div className="dl-ws-footer-inner">
          <button
            type="button"
            className="dl-ws-btn"
            data-primary="true"
            onClick={save}
            disabled={saving || !loaded}
          >
            {saving ? '保存中…' : '保存配置'}
          </button>
          <span className="dl-ws-save-hint">
            {savedAt
              ? `上次保存 ${formatClock(savedAt)}`
              : loaded
                ? '配置只保存在本机扩展存储'
                : '正在读取配置…'}
          </span>
        </div>
      </div>

      {toast && <div className="dl-ws-toast">{toast}</div>}
    </div>
  );
}
