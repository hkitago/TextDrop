import { getCurrentLangLabelString } from './localization.js';

export const isMacOS = () => {
  const isPlatformMac = navigator.platform.toLowerCase().indexOf('mac') !== -1;

  const isUserAgentMac = /Mac/.test(navigator.userAgent) &&
                         !/iPhone/.test(navigator.userAgent) &&
                         !/iPad/.test(navigator.userAgent);

  return (isPlatformMac || isUserAgentMac) && !('ontouchend' in document);
};

// Main action
browser.action.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, {
    action: 'saveSelectedText',
    name: `${getCurrentLangLabelString('contextMenu')}`
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
        name: `${getCurrentLangLabelString('contextMenu')}`
      });
    }
  });
}
