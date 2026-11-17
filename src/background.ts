// DeLab Service Worker

import type { CommentThread } from './comment-store';
import {
  buildRecordValues,
  buildTestValues,
  checkConfigForSync,
  normalizeConfig,
  postRecords,
  readConfig,
  validateConfig,
  type WecomConfig,
  type WecomReportContext,
  type WecomSyncResult,
} from './wecom-sync';

// --- 视口尺寸模拟（chrome.debugger + CDP，等价于 DevTools 设备工具栏） ---

type ViewportState = { width: number; height: number };

/** 视口状态按标签页存 session storage，Service Worker 重启后仍能恢复 UI */
const viewportKey = (tabId: number) => `delab-viewport:${tabId}`;

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, num));
};

/** 附加调试器并设置视口；DevTools 已占用时报错，由调用方转成提示 */
async function setViewport(tabId: number, state: ViewportState, deviceScaleFactor: number) {
  const params = {
    width: state.width,
    height: state.height,
    deviceScaleFactor,
    mobile: false,
    screenWidth: state.width,
    screenHeight: state.height,
  };

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', params);
  } catch {
    // 首次使用，或 Service Worker 重启后调试会话已丢失：先附加再重试
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      // 已被本扩展附加时忽略；被 DevTools 占用时后面的 sendCommand 会继续报错
      if (!/already attached/i.test(message)) throw err;
    }
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', params);
  }

  await chrome.storage.session.set({ [viewportKey(tabId)]: state });
}

async function resetViewport(tabId: number) {
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride');
  } catch { /* 调试会话不存在或已被 DevTools 接管 */ }
  try {
    await chrome.debugger.detach({ tabId });
  } catch { /* ignore */ }
  await chrome.storage.session.remove(viewportKey(tabId));
}

// --- 设备预览工作区（独立标签页 + iframe 画布） ---

type WorkspaceInfo = { sourceTabId: number; width: number; height: number };
const WORKSPACE_STORE = 'delab-workspaces';

async function readWorkspaces(): Promise<Record<string, WorkspaceInfo>> {
  try {
    const result = await chrome.storage.session.get(WORKSPACE_STORE);
    return (result[WORKSPACE_STORE] as Record<string, WorkspaceInfo>) ?? {};
  } catch {
    return {};
  }
}

async function saveWorkspace(tabId: number, info: WorkspaceInfo) {
  const all = await readWorkspaces();
  all[String(tabId)] = info;
  await chrome.storage.session.set({ [WORKSPACE_STORE]: all });
}

async function takeWorkspace(tabId: number): Promise<WorkspaceInfo | null> {
  const all = await readWorkspaces();
  const info = all[String(tabId)] ?? null;
  if (info) {
    delete all[String(tabId)];
    await chrome.storage.session.set({ [WORKSPACE_STORE]: all });
  }
  return info;
}

/** 只对工作区标签页的 sub_frame 请求移除 X-Frame-Options / CSP，让 iframe 能加载 */
async function enableFramingBypass(tabId: number) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
    addRules: [{
      id: tabId,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        responseHeaders: [
          { header: 'x-frame-options', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
          { header: 'content-security-policy', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
        ],
      },
      condition: {
        tabIds: [tabId],
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
      },
    }],
  });
}

// 调试会话被外部断开（用户点提示条关闭、DevTools 接管等）时同步给页面
chrome.debugger.onDetach.addListener(source => {
  const tabId = source.tabId;
  if (tabId == null) return;
  void chrome.storage.session.remove(viewportKey(tabId));
  chrome.tabs.sendMessage(tabId, { type: 'VIEWPORT_STATE', state: null }).catch(() => {});
});

chrome.tabs.onRemoved.addListener(tabId => {
  void chrome.storage.session.remove(viewportKey(tabId));
  void (async () => {
    const info = await takeWorkspace(tabId);
    if (!info) return;
    try {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
    } catch { /* ignore */ }
  })();
});

// 页面发生真实跳转时，插件 UI 已不存在，顺手还原视口避免残留
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  void (async () => {
    const key = viewportKey(tabId);
    const stored: Record<string, unknown> = await chrome.storage.session.get(key).catch(() => ({}));
    if (stored[key]) await resetViewport(tabId);
  })();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'delab-inspect',
      title: 'Inspect Lab 设备预览',
      contexts: ['page'],
    });
  });
});

// 右键菜单：直接打开设备预览工作区
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'delab-inspect' && tab) {
    void openWorkspaceForTab(tab).catch(() => {});
  }
});

// 工具栏图标：直接打开设备预览工作区
chrome.action.onClicked.addListener((tab) => {
  void openWorkspaceForTab(tab).catch(() => {});
});

const WORKSPACE_SIZE_KEY = 'delab-workspace-size';

/** 读取上次使用的视口尺寸 */
async function readWorkspaceSize(): Promise<{ width: number; height: number }> {
  try {
    const stored = await chrome.storage.local.get(WORKSPACE_SIZE_KEY);
    const value = stored[WORKSPACE_SIZE_KEY] as { width?: number; height?: number } | undefined;
    return {
      width: clampInt(value?.width, 320, 3840, 375),
      height: clampInt(value?.height, 480, 2160, 812),
    };
  } catch {
    return { width: 375, height: 812 };
  }
}

async function openWorkspace(
  sourceTabId: number,
  url: string,
  width: number,
  height: number,
  openSettings = false
) {
  const workspaceUrl = chrome.runtime.getURL(
    `workspace.html?url=${encodeURIComponent(url)}&w=${width}&h=${height}&fit=1${openSettings ? '&settings=1' : ''}`
  );
  const tab = await chrome.tabs.create({ url: workspaceUrl, active: true, openerTabId: sourceTabId });
  if (tab.id != null) {
    await enableFramingBypass(tab.id);
    await saveWorkspace(tab.id, { sourceTabId, width, height });
  }
}

async function openWorkspaceForTab(tab: chrome.tabs.Tab, openSettings = false) {
  const tabId = tab.id;
  const url = tab.url ?? '';
  if (tabId == null || !/^https:\/\//.test(url)) return;
  const size = await readWorkspaceSize();
  await openWorkspace(tabId, url, size.width, size.height, openSettings);
}

// --- 企微智能表格单向上报 ---

/** 评论上报：已上报过的直接返回，避免清空后重建产生重复行 */
async function handleWecomSync(
  thread: CommentThread,
  context: WecomReportContext
): Promise<WecomSyncResult> {
  if (thread.reportedAt) {
    return { ok: true, recordId: thread.remoteRecordId ?? null, alreadySynced: true };
  }

  const config = await readConfig();
  const guard = checkConfigForSync(config);
  if (guard) return guard;

  const values = buildRecordValues(thread, context, config);
  if (!values) {
    return { ok: false, code: 'empty_comment', message: '评论内容为空，无法上报', retryable: false };
  }
  return postRecords(config, [values]);
}

/** 配置页测试：优先用未保存的草稿配置 */
async function handleWecomTest(draft?: WecomConfig): Promise<WecomSyncResult> {
  const config = draft ? normalizeConfig(draft) : await readConfig();
  if (!config.enabled) {
    return { ok: false, code: 'config_disabled', message: '请先开启企微同步', retryable: false };
  }
  const validation = validateConfig(config);
  if (!validation.ok) {
    return {
      ok: false,
      code: 'config_invalid',
      message: Object.values(validation.errors)[0] ?? '配置不完整',
      retryable: false,
    };
  }
  return postRecords(config, [buildTestValues(config)]);
}

// 消息路由
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 评论截图：抓当前标签页可视区，由 content script 负责裁剪
  if (message.type === 'CAPTURE_VIEWPORT') {
    const windowId = sender.tab?.windowId;
    if (windowId == null) {
      sendResponse({ dataUrl: null });
      return false;
    }
    chrome.tabs
      .captureVisibleTab(windowId, { format: 'jpeg', quality: 80 })
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(error => {
        console.warn('[Inspect Lab] captureVisibleTab 失败:', error);
        sendResponse({ dataUrl: null });
      });
    return true;
  }

  // --- 企微智能表格同步 ---
  if (message.type === 'OPEN_OPTIONS') {
    void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  // 页内评论弹层里点「打开插件设置」：直接打开工作区并落到企微设置
  if (message.type === 'OPEN_WECOM_SETTINGS') {
    const tab = sender.tab;
    if (tab) void openWorkspaceForTab(tab, true).catch(() => {});
    else void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'WECOM_SYNC_COMMENT' || message.type === 'WECOM_TEST') {
    void (async () => {
      try {
        const result = message.type === 'WECOM_TEST'
          ? await handleWecomTest(message.config as WecomConfig | undefined)
          : await handleWecomSync(
              message.thread as CommentThread,
              (message.context ?? {}) as WecomReportContext
            );
        sendResponse(result);
      } catch {
        sendResponse({
          ok: false,
          code: 'internal',
          message: '扩展后台处理失败，请重试',
          retryable: true,
        } satisfies WecomSyncResult);
      }
    })();
    return true;
  }

  // --- 设备预览工作区 ---
  if (message.type === 'WORKSPACE_FALLBACK') {
    const workspaceTabId = sender.tab?.id;
    if (workspaceTabId == null) {
      sendResponse({ ok: false });
      return false;
    }
    void (async () => {
      const info = await takeWorkspace(workspaceTabId);
      const width = clampInt(message.width, 320, 3840, info?.width ?? 375);
      const height = clampInt(message.height, 480, 2160, info?.height ?? 812);
      if (info) {
        // 原页面已经没有插件 UI，直接用调试器给源标签页设置视口
        await setViewport(info.sourceTabId, { width, height }, 1).catch(() => {});
      }
      try {
        await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [workspaceTabId] });
      } catch { /* ignore */ }
      await chrome.tabs.remove(workspaceTabId).catch(() => {});
      sendResponse({ ok: true });
    })();
    return true;
  }
});
