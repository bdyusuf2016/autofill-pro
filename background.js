// Service worker for background tasks
// Use alarms for periodic work instead of trying to keep the worker alive with setInterval.

// Import Firebase config, authentication, and synchronization modules
try {
  importScripts('firebase-config.js', 'safe-init.js', 'crypto-helper.js', 'firebase-auth.js', 'firebase-sync.js');
} catch (e) {
  console.error("Error importing Firebase scripts in background:", e);
}

// Safe wrapper for Supabase auth functions (only available in content scripts/popup/options)
const firebaseAuthWrapper = {
  isAuthenticated: () => {
    try {
      return typeof firebaseAuth !== 'undefined' && firebaseAuth.isAuthenticated();
    } catch (e) {
      return false;
    }
  },
  getCurrentUser: () => {
    try {
      return typeof firebaseAuth !== 'undefined' ? firebaseAuth.getCurrentUser() : null;
    } catch (e) {
      return null;
    }
  }
};

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("AutoFill Pro extension installed/updated");

  // Initialize default settings if not exists (use async style)
  try {
    const data = await chrome.storage.local.get(["settings", "profiles", "hasShownCloudLoginPrompt"]);

    if (!data.settings) {
      await chrome.storage.local.set({
        settings: {
          enableHotkeys: true,
          autoSwitchProfile: true,
          confirmOverwrite: true,
          version: "2.0",
        },
      });
    }

    if (!data.profiles) {
      await chrome.storage.local.set({ profiles: {} });
    }

    // Show cloud login prompt on update (version 2.0+)
    if (details.reason === 'update' && !data.hasShownCloudLoginPrompt) {
      console.log("Showing cloud login prompt for new version");
      try {
        chrome.tabs.create({
          url: chrome.runtime.getURL('login.html'),
          active: true
        });
        await chrome.storage.local.set({ hasShownCloudLoginPrompt: true });
      } catch (e) {
        console.warn("Could not open login tab:", e);
      }
    }

    // Create a periodic alarm for light maintenance work (fires roughly every 15 minutes)
    // Guard against environments where chrome.alarms is not available.
    try {
      if (chrome.alarms && chrome.alarms.create) {
        chrome.alarms.create("periodicMaintenance", { periodInMinutes: 15 });
      } else {
        console.warn("chrome.alarms API not available; skipping alarm creation");
      }
    } catch (e) {
      console.warn("Error creating alarm:", e);
    }
  } catch (e) {
    console.error("Error initializing storage:", e);
  }
});

// Listen for messages about sync status
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message && message.action === 'syncStarted') {
      console.log("Cloud sync started from content script");
    } else if (message && message.action === 'syncCompleted') {
      console.log("Cloud sync completed from content script");
    }
  } catch (err) {
    console.error('Error handling sync message in background:', err);
  }
});

// Handle commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "_execute_action") {
    // This opens the popup (handled by browser), no-op here
    return;
  }

  // Find the active tab in the last focused window to send messages to.
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (!tab) {
    console.error("AutoFill Pro: Could not find an active tab to work with.");
    return;
  }

  let viewToOpen = null;
  if (command === "open_autofill_list") {
    viewToOpen = "autofill";
  } else if (command === "select_profile_to_fill") {
    viewToOpen = "autofill";
  } else if (command === "fill_active_profile") {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "quickFill" });
    } catch (err) {
      console.error("AutoFill Pro: Failed to trigger active profile fill.", err);
    }
    return;
  }

  if (viewToOpen) {
    chrome.windows.create({
      url: chrome.runtime.getURL(`popup.html?view=${viewToOpen}&tabId=${tab.id}`),
      type: 'popup',
      width: 420,
      height: 600,
      focused: true
    });
  }
});

// Alarms listener for periodic tasks instead of setInterval
if (chrome.alarms && chrome.alarms.onAlarm && chrome.alarms.onAlarm.addListener) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm && alarm.name === "periodicMaintenance") {
      // Perform light maintenance tasks here, if needed.
      // Keep tasks short — alarms wake the service worker briefly.
      console.log("Periodic maintenance alarm fired");
      // Example: cleanup expired cache entries, telemetry, etc.
    }
  });
} else {
  console.warn("chrome.alarms.onAlarm is not available in this environment");
}

// Listen for messages from content script to open options page (e.g., after capture)
chrome.runtime.onMessage.addListener((message, sender) => {
  try {
    if (message && message.action === 'openOptionsFromContent') {
      // Prefer the dedicated API to open options page
      try {
        chrome.runtime.openOptionsPage();
      } catch (e) {
        // Fallback: open options.html in a new tab
        try {
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        } catch (err) {
          console.error('Failed to open options page:', err);
        }
      }
    }
  } catch (err) {
    console.error('Error handling runtime message in background:', err);
  }
});

// Listen for local storage changes to trigger auto-sync
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') return;

  // We only sync if profiles, hotkeys, or settings changed
  const hasSyncableChanges = changes.profiles || changes.hotkeys || changes.settings;
  if (!hasSyncableChanges) return;

  try {
    // Check if sync was initiated by syncFromCloud to avoid infinite loop
    const storageData = await chrome.storage.local.get('_syncSource');
    if (storageData._syncSource === 'cloud') {
      console.log("Background sync: Storage change detected from cloud pull, skipping upload loop");
      await chrome.storage.local.remove('_syncSource');
      return;
    }

    // Check if sync is enabled and user is logged in
    if (typeof firebaseSync !== 'undefined' && firebaseSync.isSyncActive()) {
      if (firebaseSync.getAutoSyncEnabled()) {
        console.log("Background sync: Syncable changes detected, auto-syncing to cloud...");
        const result = await firebaseSync.syncToCloud();
        if (result.success) {
          console.log("Background sync: Auto-synced successfully");
        } else {
          console.warn("Background sync: Auto-sync failed:", result.error);
        }
      }
    }
  } catch (err) {
    console.error("Background sync: Error in onChanged listener:", err);
  }
});


