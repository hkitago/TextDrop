import { getCurrentLangLabelString } from './localization.js';

browser.runtime.onInstalled.addListener(async () => {
  const tabs = await browser.tabs.query({});

  for (const tab of tabs) {
    if (tab.url.startsWith('http') || tab.url.startsWith('https')) {
      await browser.tabs.reload(tab.id);
    }
  }
});

const isMacOS = () => {
  const isPlatformMac = navigator.platform.toLowerCase().indexOf('mac') !== -1;

  const isUserAgentMac = /Mac/.test(navigator.userAgent) &&
                         !/iPhone/.test(navigator.userAgent) &&
                         !/iPad/.test(navigator.userAgent);

  return (isPlatformMac || isUserAgentMac) && !('ontouchend' in document);
};

const contentLabelStrings = {
  'contentConfirm': `${getCurrentLangLabelString('contentConfirm')}`,
  'onError': `${getCurrentLangLabelString('onError')}`
};

// Main action
browser.action.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, {
    action: 'saveSelectedText',
    name: `${getCurrentLangLabelString('contextMenu')}`,
    labelStrings: contentLabelStrings
  });
});

// ContextMenu for macOS
if (isMacOS()) {
  browser.contextMenus.create({
    id: 'selectionTextDrop',
    title: `${getCurrentLangLabelString('contextMenu')}`,
    contexts: ['selection']
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'selectionTextDrop' && info.selectionText) {
      browser.tabs.sendMessage(tab.id, {
        action: 'saveSelectedText',
        name: `${getCurrentLangLabelString('contextMenu')}`,
        labelStrings: contentLabelStrings
      });
    }
  });
}

browser.runtime.onMessage.addListener(async (request) => {
  if (request.action === 'createBlobTab') {
    const contentText = request.text;
    const encoding = request.encoding || 'UTF-8';
    const fileName = request.filename || `${getCurrentLangLabelString('contextMenu')}`;

    let blob;
    try {
      if (typeof contentText === 'string') {
        const encoder = new TextEncoder();
        const utf8Array = encoder.encode(contentText);
        blob = new Blob([utf8Array], { type: 'text/plain;charset=UTF-8' });
      } else if (contentText instanceof ArrayBuffer || contentText instanceof Uint8Array) {
        blob = new Blob([contentText], { type: `text/plain;charset=${encoding.toUpperCase()}` });
      } else {
        blob = new Blob([String(contentText)], { type: 'text/plain;charset=UTF-8' });
      }
    } catch (error) {
      blob = new Blob([contentText], { type: 'text/plain' });
    }

    const url = URL.createObjectURL(blob);
    const safeURL = browser.runtime.getURL(
      `download.html?u=${encodeURIComponent(url)}&n=${encodeURIComponent(fileName)}`
    );

    browser.tabs.create({ url: safeURL }).catch((error) => {
      console.error('Failed to create tab:', error);
      URL.revokeObjectURL(url);
    });
  }
});
