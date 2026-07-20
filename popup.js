class PopupManager {
  constructor() {
    this.profiles = {};
    this.hotkeys = {};
    this.settings = {};
    this.activeProfileId = null;
    this.currentUrl = null;
    this.targetTabId = null; // To store tab ID from URL
    // Global error handlers to surface popup errors in the UI
    window.addEventListener("error", (e) => {
      try {
        console.error("Popup error:", e.error || e.message || e);
        this.showPopupError(e.error || e.message || e);
      } catch (err) {
        console.error("Error in popup error handler:", err);
      }
    });

    window.addEventListener("unhandledrejection", (e) => {
      try {
        console.error("Unhandled rejection:", e.reason || e);
        this.showPopupError(e.reason || e);
      } catch (err) {
        console.error("Error in unhandledrejection handler:", err);
      }
    });
    this.init();
  }

  async init() {
    // Check for URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const tabId = urlParams.get('tabId');

    if (tabId) {
      this.targetTabId = parseInt(tabId, 10);
    }

    await this.loadData();
    await this.getCurrentTabUrl();
    this.applyLocalization();
    this.render();
    this.setupEventListeners();
    this.loadVersion();
    this.showCloudLoginBanner();
    
    if (view === 'autofill') {
      this.showAutofillView();
    } else {
      this.showMainView(); // Ensure main view is shown by default
    }
  }

  async getCurrentTabUrl() {
    try {
      let currentTab;
      if (this.targetTabId) {
        currentTab = await chrome.tabs.get(this.targetTabId);
      } else {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        currentTab = tab;
      }
      if (currentTab) {
        this.currentUrl = currentTab.url;
      }
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
      const match = UrlRuleMatcher.findBestMatchingProfile(
        Object.values(this.profiles),
        this.currentUrl
      );

      if (match && match.profileId) {
        if (match.profileId !== this.activeProfileId) {
          this.activeProfileId = match.profileId;
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
            const matches = currentProfile.urlRules.some(
              (rule) => UrlRuleMatcher.matchRule(this.currentUrl, rule).matches
            );
            if (matches) {
              this.showUrlMatchInfo(true);
            }
          }
        }
      } else {
        this.showUrlMatchInfo(false);
      }
    } catch (e) {
      console.error("Error auto-selecting profile by URL:", e);
    }
  }

  matchesUrlRule(urlToTest, rule) {
    return UrlRuleMatcher.matchRule(urlToTest, rule).matches;
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
          const matches = profile.urlRules.some((rule) => {
            return UrlRuleMatcher.matchRule(this.currentUrl, rule).matches;
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
    statusDiv.className = `status ${type}`;
    if (type === "info") {
      // show spinner + message
      statusDiv.innerHTML = `<div class="spinner" aria-hidden="true"></div><span>${message}</span>`;
      statusDiv.style.display = "flex";
    } else {
      statusDiv.textContent = message;
      statusDiv.style.display = "block";
    }

    setTimeout(() => {
      statusDiv.style.display = "none";
      // clear innerHTML for info
      if (type === "info") statusDiv.innerHTML = "";
    }, duration);
  }

  showPopupError(err) {
    try {
      const msg = (err && err.message) || String(err);
      this.showStatus(msg, "error", 10000);
    } catch (e) {}
  }

  setWorkingState(isWorking, message = "") {
    // Disable/enable main action buttons during work
    const ids = ["fillForm", "captureForm"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !!isWorking;
    });

    if (isWorking) {
      // show persistent info status (long duration)
      this.showStatus(
        message || chrome.i18n.getMessage("working") || "Working...",
        "info",
        60000
      );
    } else {
      // hide any info status immediately
      const statusDiv = document.getElementById("status");
      if (statusDiv) {
        statusDiv.style.display = "none";
        statusDiv.innerHTML = "";
        statusDiv.className = "status";
      }
    }
  }

  loadVersion() {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version;
    const versionText = chrome.i18n.getMessage("versionText", [version]);
    document.getElementById("versionText").textContent =
      versionText || `v${version}`;
  }

  showCloudLoginBanner() {
    // Show cloud login banner if user is not logged in
    if (typeof firebaseAuth !== 'undefined') {
      const isLoggedIn = firebaseAuth.isAuthenticated();
      const banner = document.getElementById('cloudLoginBanner');
      if (banner) {
        if (!isLoggedIn) {
          banner.style.display = 'block';
        } else {
          banner.style.display = 'none';
        }
      }
    }
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
      // If an active profile is selected and exists, fill immediately.
      if (this.activeProfileId && this.profiles && this.profiles[this.activeProfileId]) {
        await this.confirmAutofill(this.activeProfileId);
      } else {
        // Open the autofill view to let user choose a profile
        this.showAutofillView();
      }
    });

    // Capture form button
    document
      .getElementById("captureForm")
      .addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab || !tab.id) {
          this.showStatus(
            chrome.i18n.getMessage("noActiveTab") ||
              "No active tab found or cannot access the active tab",
            "error"
          );
          return;
        }

        const tabUrl = tab.url || "";
        if (!/^https?:\/\//.test(tabUrl) && !/^file:\/\//.test(tabUrl)) {
          this.showStatus(
            chrome.i18n.getMessage("unsupportedPage") ||
              "Cannot access this page. Try a regular http(s) webpage.",
            "error"
          );
          return;
        }

        // indicate working state
        this.setWorkingState(
          true,
          chrome.i18n.getMessage("capturing") || "Capturing form..."
        );

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "captureForm",
          },
          async (response) => {
            // clear working state when callback runs
            this.setWorkingState(false);

            if (chrome.runtime.lastError) {
              this.showStatus(chrome.runtime.lastError.message, "error");
              return;
            }

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

    // Visual Capture button
    const visualCaptureBtn = document.getElementById("visualCapture");
    if (visualCaptureBtn) {
      visualCaptureBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab || !tab.id) {
          this.showStatus(
            chrome.i18n.getMessage("noActiveTab") ||
              "No active tab found or cannot access the active tab",
            "error"
          );
          return;
        }

        const tabUrl = tab.url || "";
        if (!/^https?:\/\//.test(tabUrl) && !/^file:\/\//.test(tabUrl)) {
          this.showStatus(
            chrome.i18n.getMessage("unsupportedPage") ||
              "Cannot access this page. Try a regular http(s) webpage.",
            "error"
          );
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "startVisualCapture",
          },
          (response) => {
            if (chrome.runtime.lastError) {
              this.showStatus(chrome.runtime.lastError.message, "error");
              return;
            }
            window.close();
          }
        );
      });
    }

    // Manage profiles button
    document.getElementById("manageProfiles").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    // Settings button
    document.getElementById("options").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    // Cloud Login button
    const cloudLoginBtn = document.getElementById("popupCloudLogin");
    if (cloudLoginBtn) {
      cloudLoginBtn.addEventListener("click", () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL('login.html'),
          active: true
        });
        window.close();
      });
    }

    // Cancel autofill button
    document.getElementById("cancelAutofill").addEventListener("click", () => {
      this.showMainView();
    });

    const search = document.getElementById("autofillSearch");
    if (search) {
      search.addEventListener("input", (e) => {
        this.populateAutofillList(e.target.value || "");
      });
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          // if only one visible profile, autofill it
          const first = document.querySelector("#autofillProfileList .profile-item");
          if (first) {
            this.confirmAutofill(first.dataset.profileId);
          }
        }
      });
    }
  }

  showMainView() {
    document.getElementById("main-container").classList.remove("hidden");
    document.getElementById("autofill-container").classList.add("hidden");
  }

  showAutofillView() {
    document.getElementById("main-container").classList.add("hidden");
    document.getElementById("autofill-container").classList.remove("hidden");
    this.populateAutofillList();
    const search = document.getElementById("autofillSearch");
    if (search) {
      search.focus();
      search.select();
    }
  }

  populateAutofillList(filter = "") {
    const container = document.getElementById("autofillProfileList");
    if (!container) return;
    container.innerHTML = "";

    const profiles = Object.values(this.profiles || {});
    const q = this.normalizeText(filter || "").toLowerCase().trim();

    if (profiles.length === 0) {
      container.innerHTML = `<div style="padding:12px;color:#666;font-style:italic;">${chrome.i18n.getMessage("noProfilesMessage") || 'No profiles available'}</div>`;
      return;
    }

    let matchCount = 0;
    profiles.forEach((profile) => {
      const nameNorm = this.normalizeText(profile.name || "").toLowerCase();
      // fuzzy-ish match: substring of normalized text
      if (q && !nameNorm.includes(q)) return;

      const item = document.createElement("div");
      item.className = "profile-item";
      item.style.padding = "8px";
      item.style.borderBottom = "1px solid #eee";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.dataset.profileId = profile.id;
      item.tabIndex = 0;

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "8px";

      const color = document.createElement("div");
      color.style.width = "12px";
      color.style.height = "12px";
      color.style.borderRadius = "3px";
      color.style.background = profile.color || "#4285f4";

      const name = document.createElement("div");
      // highlight matched substring
      const lower = profile.name.toLowerCase();
      if (q) {
        const idx = lower.indexOf(q);
        if (idx !== -1) {
          const before = profile.name.slice(0, idx);
          const match = profile.name.slice(idx, idx + q.length);
          const after = profile.name.slice(idx + q.length);
          name.innerHTML = `${this.escapeHtml(before)}<mark>${this.escapeHtml(match)}</mark>${this.escapeHtml(after)}`;
        } else {
          name.textContent = profile.name;
        }
      } else {
        name.textContent = profile.name;
      }
      name.style.fontWeight = "500";

      left.appendChild(color);
      left.appendChild(name);

      // Insert hotkey display between name and Fill button
      let hotkeyDisplay = null;
      if (this.hotkeys && this.hotkeys[profile.id]) {
        hotkeyDisplay = document.createElement("div");
        hotkeyDisplay.className = "profile-hotkey-display";
        hotkeyDisplay.style.marginLeft = "10px";
        hotkeyDisplay.style.fontSize = "12px";
        hotkeyDisplay.style.color = "#1a73e8";
        hotkeyDisplay.style.background = "#e8f0fe";
        hotkeyDisplay.style.borderRadius = "4px";
        hotkeyDisplay.style.padding = "2px 6px";
        hotkeyDisplay.style.fontWeight = "bold";
        hotkeyDisplay.textContent = this.formatHotkey(this.hotkeys[profile.id]);
        left.appendChild(hotkeyDisplay);
      }

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "8px";
      right.style.alignItems = "center";

      const count = document.createElement("div");
      count.style.fontSize = "12px";
      count.style.color = "#666";
      count.textContent = `${(profile.fields || []).length} fields`;

      const fillBtn = document.createElement("button");
      fillBtn.className = "autofill-btn";
      fillBtn.textContent = chrome.i18n.getMessage("fillButton") || "Fill";
      fillBtn.title = chrome.i18n.getMessage("fillButtonTitle") || `Fill with ${profile.name}`;
      fillBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        this.confirmAutofill(profile.id);
      });

      item.appendChild(left);
      right.appendChild(count);
      right.appendChild(fillBtn);
      item.appendChild(right);

      item.addEventListener("click", (e) => {
        // mark selection
        container.querySelectorAll(".selected").forEach((el) =>
          el.classList.remove("selected")
        );
        item.classList.add("selected");
        item.focus();
      });

      item.addEventListener("dblclick", () => {
        const id = item.dataset.profileId;
        this.confirmAutofill(id);
      });

      container.appendChild(item);
      matchCount++;
    });

    if (matchCount === 0) {
      const noResults = document.createElement("div");
      noResults.className = "no-results";
      noResults.style.padding = "12px";
      noResults.style.textAlign = "center";
      noResults.innerHTML = `
        <div style="color:#666;margin-bottom:10px;">${chrome.i18n.getMessage("noResults") || 'No profiles match your search.'}</div>
        <button id="createFromNoResults" class="secondary">${chrome.i18n.getMessage("createProfileButton") || 'Create New Profile'}</button>
      `;
      container.appendChild(noResults);

      const btn = document.getElementById("createFromNoResults");
      if (btn) {
        btn.addEventListener("click", () => {
          this.showMainView();
          try {
            chrome.runtime.openOptionsPage();
          } catch (e) {
            window.open(chrome.runtime.getURL("options.html"), "_blank");
          }
        });
      }
    }

    // reset selected index
    container.dataset.selectedIndex = -1;
  }

  // Normalize to remove diacritics and collapse whitespace for fuzzy matching
  normalizeText(str) {
    if (!str) return "";
    try {
      return String(str)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim();
    } catch (e) {
      // fallback if Unicode property escapes not supported
      return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async confirmAutofill(profileId) {
    const selectedEl = document.querySelector(
      "#autofillProfileList .selected"
    );
    const idToUse = profileId || (selectedEl && selectedEl.dataset.profileId) || this.activeProfileId;

    if (!idToUse) {
      this.showStatus(
        chrome.i18n.getMessage("profileRequired") ||
          "Please select a profile first",
        "error"
      );
      return;
    }
    
    // Use targetTabId if available (from command), otherwise query for active tab (from popup)
    if (this.targetTabId) {
      this.sendMessageToTab(this.targetTabId, idToUse);
    } else {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            this.sendMessageToTab(tab.id, idToUse);
        } else {
             this.showStatus(chrome.i18n.getMessage("noActiveTab") || "No active tab found.", "error");
        }
      } catch(e) {
          this.showStatus(e.message, "error");
      }
    }
  }

  async sendMessageToTab(tabId, profileId) {
     try {
        const tab = await chrome.tabs.get(tabId);
        const tabUrl = tab.url || "";
        if (!/^https?:\/\//.test(tabUrl) && !/^file:\/\//.test(tabUrl)) {
            this.showStatus(
                chrome.i18n.getMessage("unsupportedPage") || "Cannot access this page.",
                "error"
            );
            return;
        }

        this.setWorkingState(true);

        chrome.tabs.sendMessage(
            tabId,
            { action: "fillForm", profileId: profileId },
            (response) => {
                this.setWorkingState(false);
                
                // Close the popup window after action, only if it was opened by command
                if (this.targetTabId) {
                  setTimeout(() => window.close(), 100);
                } else {
                  // For regular popups, go back to main view
                  this.showMainView();
                }

                if (chrome.runtime.lastError) {
                    this.showStatus(chrome.runtime.lastError.message, "error");
                    return;
                }

                if (response && response.success) {
                    const message =
                    chrome.i18n.getMessage("filledCountMessage", [response.filledCount]) ||
                    `Filled ${response.filledCount} fields!`;
                    this.showStatus(message);
                } else {
                    const errorMsg = response?.error || chrome.i18n.getMessage("noFieldsFound") || "No form fields found";
                    this.showStatus(errorMsg, "error");
                }
            }
        );
    } catch (e) {
      this.setWorkingState(false);
      this.showStatus(e.message || "Autofill failed", "error");
    }
  }
}

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  const popupManager = new PopupManager();
  window.popupManager = popupManager;
});
