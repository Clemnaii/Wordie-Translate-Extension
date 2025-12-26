// Background script for Wordie extension

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  console.log("🔧 Wordie: 正在创建右键菜单...");
  chrome.contextMenus.create({
    id: "wordie-translate",
    title: "Wordie 翻译",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("❌ Wordie: 创建右键菜单失败:", chrome.runtime.lastError);
    } else {
      console.log("✅ Wordie: 右键菜单创建成功");
    }
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("🖱️ Wordie: 右键菜单被点击", { menuItemId: info.menuItemId, selectionText: info.selectionText });

  if (info.menuItemId === "wordie-translate" && info.selectionText && tab?.id) {
    console.log("📤 Wordie: 发送翻译请求到content script", { tabId: tab.id, text: info.selectionText });

    // 将选中的文本和页面URL发送到content script
    chrome.tabs.sendMessage(tab.id, {
      action: "translateSelection",
      text: info.selectionText,
      pageUrl: info.pageUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Wordie: 发送消息失败:", chrome.runtime.lastError);
      } else {
        console.log("✅ Wordie: 消息发送成功", response);
      }
    });
  }
});
