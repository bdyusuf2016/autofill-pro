// Welcome Page Logic
// Displays after successful login with developer info and stats

class WelcomeManager {
  constructor() {
    this.setupEventListeners();
    this.loadStats();
    this.loadVersion();
    this.loadLocalization();
  }

  setupEventListeners() {
    document.getElementById('closeBtn').addEventListener('click', () => this.closeWindow());
    document.getElementById('settingsBtn').addEventListener('click', () => this.goToSettings());
  }

  async loadStats() {
    try {
      const data = await chrome.storage.local.get(['profiles', 'hotkeys', 'settings']);

      // Count profiles
      const profiles = data.profiles || {};
      const profileCount = Object.keys(profiles).length;
      document.getElementById('profileCount').textContent = profileCount;

      // Count hotkeys
      const hotkeys = data.hotkeys || {};
      const hotkeyCount = Object.keys(hotkeys).length;
      document.getElementById('hotkeyCount').textContent = hotkeyCount;

      // Count URL rules
      let urlRuleCount = 0;
      for (const profile of Object.values(profiles)) {
        if (profile.urlRules && Array.isArray(profile.urlRules)) {
          urlRuleCount += profile.urlRules.length;
        }
      }
      document.getElementById('ruleCount').textContent = urlRuleCount;

      console.log('Stats loaded:', { profileCount, hotkeyCount, urlRuleCount });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  loadVersion() {
    try {
      const manifest = chrome.runtime.getManifest();
      const version = manifest.version;
      document.getElementById('versionNumber').textContent = version;
    } catch (error) {
      console.error('Error loading version:', error);
    }
  }

  loadLocalization() {
    // Apply localization to all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });

    // Apply to button data-i18n attributes
    document.querySelectorAll('button[data-i18n]').forEach(button => {
      const key = button.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        button.textContent = message;
      }
    });
  }

  closeWindow() {
    // Try to close the window
    if (window.close()) {
      return;
    }

    // If window.close() doesn't work, go back
    window.history.back();
  }

  goToSettings() {
    // Open options page
    chrome.runtime.openOptionsPage();

    // Also close this window
    setTimeout(() => {
      window.close();
    }, 500);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Welcome page loaded');
  new WelcomeManager();
});
