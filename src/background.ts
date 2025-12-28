// Background script for Wordie extension

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  console.log("🔧 Wordie [Background]: onInstalled event triggered");
  
  // 清除旧菜单（防止重复）
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.error("❌ Wordie [Background]: Error removing menus:", chrome.runtime.lastError);
    } else {
      console.log("✅ Wordie [Background]: Old menus removed");
    }

    // 划词翻译
    chrome.contextMenus.create({
      id: "wordie-translate",
      title: "Wordie 划词翻译",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
         console.error("❌ Wordie [Background]: Failed to create selection menu:", chrome.runtime.lastError);
      } else {
         console.log("✅ Wordie [Background]: Selection menu created");
      }
    });
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("🖱️ Wordie: 右键菜单被点击", { menuItemId: info.menuItemId });

  if (!tab?.id) return;

  if (info.menuItemId === "wordie-translate" && info.selectionText) {
    console.log("📤 Wordie: 发送翻译请求到content script", { tabId: tab.id, text: info.selectionText });

    // 将选中的文本和页面URL发送到content script
    chrome.tabs.sendMessage(tab.id, {
      action: "translateSelection",
      text: info.selectionText,
      pageUrl: info.pageUrl
    }).catch(err => {
      console.error("❌ Wordie: 发送消息失败:", err);
    });
  }
});
