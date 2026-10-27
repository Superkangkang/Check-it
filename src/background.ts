// DeLab Service Worker

let activeTabId: number | null = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'delab-inspect',
      title: 'DeLab 检查元素',
      contexts: ['page'],
    });
  });
});

// 右键菜单
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'delab-inspect' && tab?.id) {
    startInspect(tab.id);
  }
});

// 工具栏图标
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    startInspect(tab.id);
  }
});

function startInspect(tabId: number) {
  if (activeTabId && activeTabId !== tabId) {
    sendToTab(activeTabId, { type: 'TOGGLE_INSPECT', active: false });
  }
  activeTabId = tabId;
  sendToTab(tabId, { type: 'TOGGLE_INSPECT', active: true });
}

function sendToTab(tabId: number, message: object) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js'],
    }).then(() => {
      chrome.tabs.sendMessage(tabId, message).catch(() => {});
    });
  });
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
      .catch(() => sendResponse({ dataUrl: null }));
    return true;
  }

  // Esc / 关闭退出
  if (message.type === 'INSPECT_MODE_CHANGED' && !message.active) {
    activeTabId = null;
  }
  if (message.type === 'EXIT_INSPECT') {
    const tabId = activeTabId || sender.tab?.id;
    if (tabId) {
      sendToTab(tabId, { type: 'TOGGLE_INSPECT', active: false });
      activeTabId = null;
    }
  }
});
