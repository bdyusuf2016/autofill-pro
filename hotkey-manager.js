class HotkeyManager {
  constructor() {
    this.hotkeys = new Map();
    this.enabled = true;
    this.init();
  }

  async init() {
    await this.loadHotkeys();
    this.setupGlobalListener();
  }

  async loadHotkeys() {
    const data = await chrome.storage.local.get(["hotkeys", "settings"]);
    this.hotkeys = new Map(Object.entries(data.hotkeys || {}));
    this.enabled = data.settings?.enableHotkeys !== false;
  }

  setupGlobalListener() {
    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "registerHotkey") {
        this.registerHotkey(request.profileId, request.hotkey);
        sendResponse({ success: true });
      } else if (request.action === "removeHotkey") {
        this.removeHotkey(request.profileId);
        sendResponse({ success: true });
      } else if (request.action === "getHotkeys") {
        sendResponse({ hotkeys: Object.fromEntries(this.hotkeys) });
      } else if (request.action === "toggleHotkeys") {
        this.enabled = request.enabled;
        sendResponse({ success: true });
      }
      return true;
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.hotkeys) {
        this.hotkeys = new Map(Object.entries(changes.hotkeys.newValue || {}));
      }
      if (area === "local" && changes.settings) {
        this.enabled = changes.settings.newValue?.enableHotkeys !== false;
      }
    });
  }

  registerHotkey(profileId, hotkey) {
    this.hotkeys.set(profileId, hotkey);
    this.saveHotkeys();
  }

  removeHotkey(profileId) {
    this.hotkeys.delete(profileId);
    this.saveHotkeys();
  }

  async saveHotkeys() {
    await chrome.storage.local.set({
      hotkeys: Object.fromEntries(this.hotkeys),
    });
  }

  checkConflict(hotkey) {
    for (const [profileId, existing] of this.hotkeys) {
      if (this.compareHotkeys(existing, hotkey)) {
        return { conflict: true, profileId };
      }
    }
    return { conflict: false };
  }

  compareHotkeys(hk1, hk2) {
    return (
      hk1.ctrlKey === hk2.ctrlKey &&
      hk1.shiftKey === hk2.shiftKey &&
      hk1.altKey === hk2.altKey &&
      hk1.key === hk2.key
    );
  }

  getHotkeyForProfile(profileId) {
    return this.hotkeys.get(profileId);
  }

  matchesHotkey(event, hotkey) {
    if (!this.enabled) return false;

    return (
      event.ctrlKey === hotkey.ctrlKey &&
      event.shiftKey === hotkey.shiftKey &&
      event.altKey === hotkey.altKey &&
      event.key.toLowerCase() === hotkey.key.toLowerCase()
    );
  }
}

// Initialize hotkey manager
if (typeof chrome !== "undefined" && chrome.runtime) {
  const hotkeyManager = new HotkeyManager();
}
