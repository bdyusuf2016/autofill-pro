// Service worker for background tasks
chrome.runtime.onInstalled.addListener(() => {
  console.log("AutoFill Pro extension installed");

  // Initialize default settings if not exists
  chrome.storage.local.get(["settings", "profiles"], (data) => {
    if (!data.settings) {
      chrome.storage.local.set({
        settings: {
          enableHotkeys: true,
          autoSwitchProfile: true,
          confirmOverwrite: true,
          version: "1.0",
        },
      });
    }

    if (!data.profiles) {
      chrome.storage.local.set({ profiles: {} });
    }
  });
});

// Handle commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // This opens the popup
    return;
  }
});

// Keep service worker alive
setInterval(() => {
  // Just to keep it alive
}, 1000 * 60 * 5); // 5 minutes
