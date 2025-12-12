class PopupManager {
  constructor() {
    this.profiles = {};
    this.hotkeys = {};
    this.settings = {};
    this.activeProfileId = null;
    this.currentUrl = null;
    this.init();
  }

  async init() {
    await this.loadData();
    await this.getCurrentTabUrl();
    this.applyLocalization();
    this.render();
    this.setupEventListeners();
    this.loadVersion();
  }

  async getCurrentTabUrl() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentUrl = tab.url;
    } catch (e) {
      console.error("Error getting current tab URL:", e);
    }
  }

  applyLocalization() {
    // Apply i18n to all elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const message = chrome.i18n.getMessage(key);
      if (message) {
        if (
          element.tagName === "INPUT" ||
          element.tagName === "TEXTAREA" ||
          element.tagName === "SELECT"
        ) {
          element.placeholder = message;
        } else {
          element.textContent = message;
        }
      }
    });

    // Apply version
    const versionText = chrome.i18n.getMessage("versionText", ["1.0"]);
    if (versionText) {
      document.getElementById("versionText").textContent = versionText;
    }
  }

  async loadData() {
    const data = await chrome.storage.local.get([
      "profiles",
      "activeProfile",
      "hotkeys",
      "settings",
    ]);
    this.profiles = data.profiles || {};
    this.hotkeys = data.hotkeys || {};
    this.settings = data.settings || {
      enableHotkeys: true,
      autoSwitchProfile: true,
      confirmOverwrite: true,
      defaultMode: "overwrite",
    };
    this.activeProfileId = data.activeProfile || null;

    // Auto-select profile based on URL if setting is enabled
    if (this.settings.autoSwitchProfile && this.currentUrl) {
      await this.autoSelectProfileByUrl();
    }
  }

  async autoSelectProfileByUrl() {
    try {
      const url = new URL(this.currentUrl);
      const hostname = url.hostname;
      const pathname = url.pathname;

      // Find profiles that match current URL
      const matchingProfiles = Object.values(this.profiles).filter(
        (profile) => {
          if (!profile.urlRules || profile.urlRules.length === 0) return false;

          return profile.urlRules.some((rule) => {
            if (!rule.enabled) return false;

            try {
              const urlToTest = rule.includePath
                ? hostname + pathname
                : hostname;

              switch (rule.type) {
                case "exact":
                  return urlToTest === rule.pattern;
                case "contains":
                  return urlToTest.includes(rule.pattern);
                case "startsWith":
                  return urlToTest.startsWith(rule.pattern);
                case "endsWith":
                  return urlToTest.endsWith(rule.pattern);
                case "regex":
                  const regex = new RegExp(rule.pattern);
                  return regex.test(urlToTest);
                default:
                  return false;
              }
            } catch (e) {
              return false;
            }
          });
        }
      );

      if (matchingProfiles.length > 0) {
        // If multiple matches, use the first one or prioritize by exact match
        const exactMatch = matchingProfiles.find((profile) =>
          profile.urlRules.some((rule) => rule.type === "exact")
        );

        const newActiveProfileId = exactMatch
          ? exactMatch.id
          : matchingProfiles[0].id;

        if (newActiveProfileId !== this.activeProfileId) {
          this.activeProfileId = newActiveProfileId;
          await chrome.storage.local.set({
            activeProfile: this.activeProfileId,
          });

          // Show URL match info
          this.showUrlMatchInfo(true);
        } else if (this.activeProfileId) {
          // Check if current profile matches URL
          const currentProfile = this.profiles[this.activeProfileId];
          if (
            currentProfile &&
            currentProfile.urlRules &&
            currentProfile.urlRules.length > 0
          ) {
            const matches = currentProfile.urlRules.some((rule) => {
              const urlToTest = rule.includePath
                ? hostname + pathname
                : hostname;
              return this.matchesUrlRule(urlToTest, rule);
            });
            if (matches) {
              this.showUrlMatchInfo(true);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error auto-selecting profile by URL:", e);
    }
  }

  matchesUrlRule(urlToTest, rule) {
    if (!rule.enabled) return false;

    switch (rule.type) {
      case "exact":
        return urlToTest === rule.pattern;
      case "contains":
        return urlToTest.includes(rule.pattern);
      case "startsWith":
        return urlToTest.startsWith(rule.pattern);
      case "endsWith":
        return urlToTest.endsWith(rule.pattern);
      case "regex":
        try {
          const regex = new RegExp(rule.pattern);
          return regex.test(urlToTest);
        } catch (e) {
          return false;
        }
      default:
        return false;
    }
  }

  showUrlMatchInfo(show) {
    const infoDiv = document.getElementById("urlMatchInfo");
    if (show) {
      infoDiv.style.display = "flex";
    } else {
      infoDiv.style.display = "none";
    }
  }

  render() {
    this.renderProfileSelect();
    this.renderHotkeyList();
    this.renderActiveProfileHotkey();
  }

  renderProfileSelect() {
    const select = document.getElementById("profileSelect");
    const noProfileText =
      chrome.i18n.getMessage("noProfileSelected") || "No Profile Selected";

    select.innerHTML = `<option value="">${noProfileText}</option>`;

    Object.values(this.profiles).forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;

      // Add URL match indicator
      if (this.currentUrl && profile.urlRules && profile.urlRules.length > 0) {
        try {
          const url = new URL(this.currentUrl);
          const hostname = url.hostname;
          const pathname = url.pathname;

          const matches = profile.urlRules.some((rule) => {
            if (!rule.enabled) return false;
            const urlToTest = rule.includePath ? hostname + pathname : hostname;
            return this.matchesUrlRule(urlToTest, rule);
          });

          if (matches) {
            option.textContent += " 🌐";
          }
        } catch (e) {
          // Invalid URL, skip indicator
        }
      }

      if (profile.id === this.activeProfileId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  renderHotkeyList() {
    const container = document.getElementById("hotkeyList");
    const noHotkeysText =
      chrome.i18n.getMessage("noHotkeysAssigned") || "No hotkeys assigned";

    container.innerHTML = "";

    Object.values(this.profiles).forEach((profile) => {
      if (this.hotkeys[profile.id]) {
        const div = document.createElement("div");
        div.className = "hotkey-item";
        div.innerHTML = `
          <span class="hotkey-name">${profile.name}</span>
          <span class="hotkey-key">${this.formatHotkey(
            this.hotkeys[profile.id]
          )}</span>
        `;
        container.appendChild(div);
      }
    });

    if (container.children.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "hotkey-item";
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.color = "#999";
      emptyMsg.style.fontStyle = "italic";

      const message = document.createElement("span");
      message.textContent = noHotkeysText;
      emptyMsg.appendChild(message);

      container.appendChild(emptyMsg);
    }
  }

  renderActiveProfileHotkey() {
    const display = document.getElementById("profileHotkeyDisplay");
    if (this.activeProfileId && this.hotkeys[this.activeProfileId]) {
      display.textContent = this.formatHotkey(
        this.hotkeys[this.activeProfileId]
      );
      display.style.display = "block";
    } else {
      const noHotkeyText = chrome.i18n.getMessage("noHotkey") || "No Hotkey";
      display.textContent = noHotkeyText;
      display.style.display = "block";
    }
  }

  formatHotkey(hotkey) {
    if (!hotkey) return "";
    const parts = [];
    if (hotkey.ctrlKey) parts.push("Ctrl");
    if (hotkey.shiftKey) parts.push("Shift");
    if (hotkey.altKey) parts.push("Alt");

    // Format key name
    let keyName = hotkey.key.toUpperCase();
    if (keyName === " ") keyName = "Space";
    if (keyName === "CONTROL") keyName = "Ctrl";
    if (keyName === "SHIFT") keyName = "Shift";
    if (keyName === "ALT") keyName = "Alt";
    if (keyName === "META") keyName = "Cmd"; // For Mac

    parts.push(keyName);
    return parts.join(" + ");
  }

  showStatus(message, type = "success", duration = 3000) {
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    setTimeout(() => {
      statusDiv.style.display = "none";
    }, duration);
  }

  loadVersion() {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    const versionText = chrome.i18n.getMessage("versionText", [version]);
    document.getElementById("versionText").textContent =
      versionText || `v${version}`;
  }

  setupEventListeners() {
    // Profile selection
    document
      .getElementById("profileSelect")
      .addEventListener("change", async (e) => {
        this.activeProfileId = e.target.value;
        await chrome.storage.local.set({ activeProfile: this.activeProfileId });
        this.renderActiveProfileHotkey();
        this.showUrlMatchInfo(false);
        this.showStatus("Active profile updated");
      });

    // Fill form button
    document.getElementById("fillForm").addEventListener("click", async () => {
      if (!this.activeProfileId) {
        this.showStatus(
          chrome.i18n.getMessage("profileRequired") ||
            "Please select a profile first",
          "error"
        );
        return;
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "fillForm",
          profileId: this.activeProfileId,
        },
        (response) => {
          if (response && response.success) {
            const message =
              chrome.i18n.getMessage("filledCountMessage", [
                response.filledCount,
              ]) || `Filled ${response.filledCount} fields!`;
            this.showStatus(message);
          } else {
            const errorMsg =
              response?.error ||
              chrome.i18n.getMessage("noFieldsFound") ||
              "No form fields found";
            this.showStatus(errorMsg, "error");
          }
        }
      );
    });

    // Capture form button
    document
      .getElementById("captureForm")
      .addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "captureForm",
          },
          async (response) => {
            if (response && response.fields && response.fields.length > 0) {
              await chrome.storage.local.set({
                capturedFields: response.fields,
                captureUrl: tab.url,
              });

              chrome.runtime.openOptionsPage();
              window.close();
            } else {
              this.showStatus(
                chrome.i18n.getMessage("noFieldsFound") ||
                  "No form fields found",
                "error"
              );
            }
          }
        );
      });

    // Manage profiles button
    document.getElementById("manageProfiles").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    // Settings button
    document.getElementById("options").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    // Quick settings button
    document.getElementById("quickSettings").addEventListener("click", () => {
      this.openQuickSettings();
    });

    // Shortcut help button
    document.getElementById("shortcutHelp").addEventListener("click", () => {
      this.openShortcutHelp();
    });

    // Setup modal event listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    // Quick Settings Modal
    document
      .getElementById("closeQuickSettings")
      .addEventListener("click", () => {
        this.closeModal("quickSettingsModal");
      });

    document
      .getElementById("cancelQuickSettings")
      .addEventListener("click", () => {
        this.closeModal("quickSettingsModal");
      });

    document
      .getElementById("saveQuickSettings")
      .addEventListener("click", async () => {
        await this.saveQuickSettings();
        this.closeModal("quickSettingsModal");
      });

    // Shortcut Help Modal
    document
      .getElementById("closeShortcutHelp")
      .addEventListener("click", () => {
        this.closeModal("shortcutHelpModal");
      });

    document
      .getElementById("closeShortcutHelpBtn")
      .addEventListener("click", () => {
        this.closeModal("shortcutHelpModal");
      });

    // Close modals on outside click
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
  }

  openQuickSettings() {
    const modal = document.getElementById("quickSettingsModal");

    // Load current settings
    document.getElementById("popupEnableHotkeys").checked =
      this.settings.enableHotkeys !== false;
    document.getElementById("popupAutoSwitchProfile").checked =
      this.settings.autoSwitchProfile !== false;
    document.getElementById("popupConfirmOverwrite").checked =
      this.settings.confirmOverwrite !== false;
    document.getElementById("popupDefaultMode").value =
      this.settings.defaultMode || "overwrite";

    modal.style.display = "flex";
  }

  async saveQuickSettings() {
    this.settings = {
      enableHotkeys: document.getElementById("popupEnableHotkeys").checked,
      autoSwitchProfile: document.getElementById("popupAutoSwitchProfile")
        .checked,
      confirmOverwrite: document.getElementById("popupConfirmOverwrite")
        .checked,
      defaultMode: document.getElementById("popupDefaultMode").value,
    };

    await chrome.storage.local.set({ settings: this.settings });
    this.showStatus(
      chrome.i18n.getMessage("settingsSaved") || "Settings saved successfully"
    );
  }

  openShortcutHelp() {
    const modal = document.getElementById("shortcutHelpModal");
    const hotkeyHint = document.getElementById("profileHotkeysHint");

    // Load profile hotkeys
    let hotkeysHTML = "";
    Object.values(this.profiles).forEach((profile) => {
      if (this.hotkeys[profile.id]) {
        hotkeysHTML += `
          <div class="profile-hotkey-hint">
            <strong>${profile.name}:</strong> ${this.formatHotkey(
          this.hotkeys[profile.id]
        )}
          </div>
        `;
      }
    });

    if (hotkeysHTML) {
      hotkeyHint.innerHTML = hotkeysHTML;
    } else {
      hotkeyHint.innerHTML =
        "<em>" +
        (chrome.i18n.getMessage("noHotkeysAssigned") || "No hotkeys assigned") +
        "</em>";
    }

    modal.style.display = "flex";
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "none";
  }
}

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  const popupManager = new PopupManager();
  window.popupManager = popupManager;
});
