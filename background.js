chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSidePanel" && sender.tab) {
    
    chrome.sidePanel.open({ windowId: sender.tab.windowId })
      .then(() => {
        chrome.storage.local.set({ 
          currentLookup: message.text, 
          currentContext: message.context 
        });
      })
      .catch((error) => console.error("SidePanel Direct Open Error:", error));
  }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await chrome.sidePanel.setOptions({
    tabId: activeInfo.tabId,
    enabled: false
  });
  
  await chrome.sidePanel.setOptions({
    tabId: activeInfo.tabId,
    enabled: true
  });
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "sidepanel.html",
    enabled: true
  });
  chrome.storage.local.set({ noteHistory: "" });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSidePanel" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    
    setTimeout(() => {
      chrome.storage.local.set({ 
        currentLookup: message.text, 
        currentContext: message.context 
      });
    }, 100);
  }
});