class OptionsManager {
  constructor() {
    // Initialize properties
    this.profiles = {};
    this.hotkeys = {};
    this.settings = {};
    this.currentProfileId = null;
    this.currentHotkeyProfileId = null;
    this.capturedHotkey = null;
    this.hotkeyCaptureHandler = null;

    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.loadAllData = this.loadAllData.bind(this);
    this.saveAllData = this.saveAllData.bind(this);
    this.applyLocalization = this.applyLocalization.bind(this);
    this.setupTabs = this.setupTabs.bind(this);
    this.renderProfiles = this.renderProfiles.bind(this);
    this.renderHotkeyConfig = this.renderHotkeyConfig.bind(this);
    this.renderUrlRulesOverview = this.renderUrlRulesOverview.bind(this);
    this.loadSettings = this.loadSettings.bind(this);
    this.setupEventListeners = this.setupEventListeners.bind(this);
    this.checkForCapturedFields = this.checkForCapturedFields.bind(this);
    this.calculateStorage = this.calculateStorage.bind(this);
    this.showMessage = this.showMessage.bind(this);
    this.formatHotkey = this.formatHotkey.bind(this);
    this.openProfileModal = this.openProfileModal.bind(this);
    this.openUrlRulesModal = this.openUrlRulesModal.bind(this);
    this.openHotkeyModal = this.openHotkeyModal.bind(this);
    this.saveProfile = this.saveProfile.bind(this);
    this.saveUrlRules = this.saveUrlRules.bind(this);
    this.saveHotkey = this.saveHotkey.bind(this);
    this.saveSettings = this.saveSettings.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.setupHotkeyCapture = this.setupHotkeyCapture.bind(this);
    this.cleanupHotkeyCapture = this.cleanupHotkeyCapture.bind(this);
    this.duplicateProfile = this.duplicateProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.clearHotkey = this.clearHotkey.bind(this);
    this.backupNow = this.backupNow.bind(this);
    this.restoreBackup = this.restoreBackup.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
    this.testUrlRule = this.testUrlRule.bind(this);

    // Initialize
    this.init();
  }

  async init() {
    console.log("OptionsManager init started");
    try {
      await this.loadAllData();
      this.applyLocalization();
      this.setupTabs();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();
      this.loadSettings();
      this.setupEventListeners();
      this.checkForCapturedFields();
      this.calculateStorage();
      console.log("OptionsManager init completed");
    } catch (error) {
      console.error("OptionsManager initialization error:", error);
      this.showError("Failed to initialize options manager: " + error.message);
    }
  }

  async loadAllData() {
    console.log("Loading all data...");
    try {
      const data = await chrome.storage.local.get([
        "profiles",
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

      console.log("Loaded profiles:", Object.keys(this.profiles).length);
      console.log("Loaded hotkeys:", Object.keys(this.hotkeys).length);
      console.log("Loaded settings:", this.settings);
    } catch (error) {
      console.error("Error loading data:", error);
      // Initialize with defaults
      this.profiles = {};
      this.hotkeys = {};
      this.settings = {
        enableHotkeys: true,
        autoSwitchProfile: true,
        confirmOverwrite: true,
        defaultMode: "overwrite",
      };
    }
  }

  async saveAllData() {
    console.log("Saving all data...");
    try {
      await chrome.storage.local.set({
        profiles: this.profiles,
        hotkeys: this.hotkeys,
        settings: this.settings,
      });
      console.log("Data saved successfully");
    } catch (error) {
      console.error("Error saving data:", error);
      this.showMessage("Error saving data: " + error.message, "error");
    }
  }

  applyLocalization() {
    console.log("Applying localization...");

    // Apply i18n to all elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      try {
        const message = chrome.i18n.getMessage(key);
        if (message) {
          if (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT"
          ) {
            if (element.placeholder === undefined) {
              element.textContent = message;
            } else {
              element.placeholder = message;
            }
          } else {
            element.textContent = message;
          }
        }
      } catch (error) {
        console.warn(`Error getting translation for key ${key}:`, error);
      }
    });

    // Apply i18n to title attributes
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.getAttribute("data-i18n-title");
      try {
        const message = chrome.i18n.getMessage(key);
        if (message) {
          element.title = message;
        }
      } catch (error) {
        console.warn(`Error getting title for key ${key}:`, error);
      }
    });

    // Apply i18n-placeholder attributes
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      try {
        const message = chrome.i18n.getMessage(key);
        if (message) {
          element.placeholder = message;
        }
      } catch (error) {
        console.warn(`Error getting placeholder for key ${key}:`, error);
      }
    });

    // Set page title
    try {
      const title =
        chrome.i18n.getMessage("optionsPageTitle") || "Profile Management";
      document.title = title;
    } catch (error) {
      console.warn("Error setting page title:", error);
    }
  }

  setupTabs() {
    console.log("Setting up tabs...");
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        // Show corresponding content
        tabContents.forEach((content) => {
          content.classList.remove("active");
          if (content.id === `${tabName}Tab`) {
            content.classList.add("active");
          }
        });

        // Load specific tab data if needed
        if (tabName === "urlRules") {
          this.renderUrlRulesOverview();
        }
      });
    });
  }

  renderProfiles() {
    console.log("Rendering profiles...");
    const container = document.getElementById("profilesList");
    const template = document.getElementById("profileTemplate");

    if (!container) {
      console.error("Profiles container not found");
      return;
    }

    container.innerHTML = "";

    Object.values(this.profiles).forEach((profile) => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector(".profile-card");

      card.setAttribute("data-id", profile.id);
      card.querySelector(".profile-color").style.backgroundColor =
        profile.color || "#4285f4";
      card.querySelector(".profile-title").textContent = profile.name;

      // Field count
      const fieldCount = profile.fields?.length || 0;
      const fieldsText =
        chrome.i18n.getMessage("fieldsCount", [fieldCount]) ||
        `${fieldCount} fields`;
      card.querySelector(".field-count").textContent = fieldsText;

      // URL rules count
      const urlRulesCount = profile.urlRules?.length || 0;
      const urlRulesText =
        chrome.i18n.getMessage("urlRulesCount", [urlRulesCount]) ||
        `${urlRulesCount} URL rules`;
      card.querySelector(".url-rules-count").textContent = urlRulesText;

      // Hotkey indicator
      const hotkeyIndicator = card.querySelector(".hotkey-indicator");
      if (this.hotkeys[profile.id]) {
        const hotkey = this.formatHotkey(this.hotkeys[profile.id]);
        const hotkeyText =
          chrome.i18n.getMessage("hotkeySet", [hotkey]) || `Hotkey: ${hotkey}`;
        hotkeyIndicator.textContent = hotkeyText;
        hotkeyIndicator.dataset.hotkey = hotkey;
        hotkeyIndicator.style.background = "#e8f0fe";
        hotkeyIndicator.style.color = "#1a73e8";
      } else {
        hotkeyIndicator.textContent =
          chrome.i18n.getMessage("noHotkey") || "No hotkey";
      }

      // Button event listeners
      const editBtn = card.querySelector(".edit-profile");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          this.openProfileModal(profile.id);
        });
      }

      const urlRulesBtn = card.querySelector(".url-rules-btn");
      if (urlRulesBtn) {
        urlRulesBtn.addEventListener("click", () => {
          this.openUrlRulesModal(profile.id);
        });
      }

      const setHotkeyBtn = card.querySelector(".set-hotkey");
      if (setHotkeyBtn) {
        setHotkeyBtn.addEventListener("click", () => {
          this.openHotkeyModal(profile.id);
        });
      }

      const duplicateBtn = card.querySelector(".duplicate-profile");
      if (duplicateBtn) {
        duplicateBtn.addEventListener("click", () => {
          this.duplicateProfile(profile.id);
        });
      }

      const deleteBtn = card.querySelector(".delete-profile");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          this.deleteProfile(profile.id);
        });
      }

      container.appendChild(card);
    });

    // Show empty state
    if (Object.keys(this.profiles).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
            <h3 style="margin-bottom: 10px;">${
              chrome.i18n.getMessage("noProfilesMessage") || "No Profiles Yet"
            }</h3>
            <p style="margin-bottom: 20px;">${
              chrome.i18n.getMessage("noProfilesMessage") ||
              "Create your first profile to start autofilling forms"
            }</p>
            <button id="createFirstProfile" class="primary">${
              chrome.i18n.getMessage("createFirstProfileButton") ||
              "Create First Profile"
            }</button>
          </div>
        </div>
      `;

      const createBtn = document.getElementById("createFirstProfile");
      if (createBtn) {
        createBtn.addEventListener("click", () => {
          this.openProfileModal();
        });
      }
    }
  }

  renderHotkeyConfig() {
    console.log("Rendering hotkey config...");
    const container = document.getElementById("hotkeyConfigList");
    const template = document.getElementById("hotkeyConfigTemplate");

    if (!container) {
      console.error("Hotkey config container not found");
      return;
    }

    container.innerHTML = "";

    Object.values(this.profiles).forEach((profile) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".hotkey-config-item");

      item.setAttribute("data-profile-id", profile.id);
      item.querySelector(".profile-color-small").style.backgroundColor =
        profile.color || "#4285f4";
      item.querySelector(".profile-name").textContent = profile.name;

      // Hotkey display
      const hotkeyDisplay = item.querySelector(".hotkey-value");
      const clearBtn = item.querySelector(".clear-hotkey-btn");

      if (this.hotkeys[profile.id]) {
        hotkeyDisplay.textContent = this.formatHotkey(this.hotkeys[profile.id]);
        hotkeyDisplay.style.background = "#e8f0fe";
        hotkeyDisplay.style.color = "#1a73e8";
        clearBtn.disabled = false;
      } else {
        hotkeyDisplay.textContent =
          chrome.i18n.getMessage("notSet") || "Not set";
        clearBtn.disabled = true;
      }

      // Button event listeners
      const setHotkeyBtn = item.querySelector(".set-hotkey-btn");
      if (setHotkeyBtn) {
        setHotkeyBtn.addEventListener("click", () => {
          this.openHotkeyModal(profile.id);
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.clearHotkey(profile.id);
        });
      }

      container.appendChild(item);
    });

    // Show empty state if no profiles
    if (Object.keys(this.profiles).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="text-align: center; color: #666; padding: 40px;">
            ${
              chrome.i18n.getMessage("noProfilesForHotkeys") ||
              "No profiles available. Create a profile first to assign hotkeys."
            }
          </p>
        </div>
      `;
    }
  }

  renderUrlRulesOverview() {
    console.log("Rendering URL rules overview...");
    const container = document.getElementById("urlRulesOverviewList");
    const template = document.getElementById("urlRuleOverviewTemplate");
    const itemTemplate = document.getElementById("urlRuleItemTemplate");

    if (!container) {
      console.error("URL rules container not found");
      return;
    }

    container.innerHTML = "";

    Object.values(this.profiles).forEach((profile) => {
      const urlRulesCount = profile.urlRules?.length || 0;
      if (urlRulesCount === 0) return; // Skip profiles with no URL rules

      const clone = template.content.cloneNode(true);
      const item = clone.querySelector(".url-rule-overview-item");

      item.setAttribute("data-profile-id", profile.id);
      item.querySelector(".profile-color-small").style.backgroundColor =
        profile.color || "#4285f4";
      item.querySelector(".profile-name").textContent = profile.name;
      item.querySelector(".count").textContent = urlRulesCount;

      const rulesList = item.querySelector(".rules-list");

      // Add URL rules
      if (profile.urlRules && profile.urlRules.length > 0) {
        profile.urlRules.forEach((rule) => {
          const ruleClone = itemTemplate.content.cloneNode(true);
          const ruleItem = ruleClone.querySelector(".url-rule-item");

          ruleItem.setAttribute("data-type", rule.type);
          ruleItem.setAttribute("data-pattern", rule.pattern);

          // Set rule type badge
          const typeBadge = ruleItem.querySelector(".rule-type-badge");
          typeBadge.textContent = this.getRuleTypeLabel(rule.type);

          // Set pattern
          ruleItem.querySelector(".rule-pattern").textContent = rule.pattern;

          // Set options
          const includePathBadge = ruleItem.querySelector(
            ".include-path-badge"
          );
          const enabledBadge = ruleItem.querySelector(".status-badge.enabled");
          const disabledBadge = ruleItem.querySelector(
            ".status-badge.disabled"
          );

          if (rule.includePath) {
            includePathBadge.style.display = "inline-block";
          } else {
            includePathBadge.style.display = "none";
          }

          if (rule.enabled !== false) {
            enabledBadge.style.display = "inline-block";
            disabledBadge.style.display = "none";
          } else {
            enabledBadge.style.display = "none";
            disabledBadge.style.display = "inline-block";
          }

          rulesList.appendChild(ruleClone);
        });
      }

      // Edit button event listener
      const editBtn = item.querySelector(".edit-url-rules-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          this.openUrlRulesModal(profile.id);
        });
      }

      container.appendChild(item);
    });

    // Show empty state if no URL rules
    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">🌐</div>
            <h3 style="margin-bottom: 10px;">${
              chrome.i18n.getMessage("noUrlRules") || "No URL Rules Yet"
            }</h3>
            <p style="margin-bottom: 20px;">${
              chrome.i18n.getMessage("noUrlRulesMessage") ||
              "Create URL rules to automatically switch profiles based on website URLs"
            }</p>
            <p style="font-size: 12px; color: #999;">${
              chrome.i18n.getMessage("createProfileFirst") ||
              "Create a profile first, then add URL rules to it"
            }</p>
          </div>
        </div>
      `;
    }
  }

  getRuleTypeLabel(type) {
    const labels = {
      exact: chrome.i18n.getMessage("exactMatch") || "Exact",
      contains: chrome.i18n.getMessage("containsMatch") || "Contains",
      startsWith: chrome.i18n.getMessage("startsWithMatch") || "Starts With",
      endsWith: chrome.i18n.getMessage("endsWithMatch") || "Ends With",
      regex: chrome.i18n.getMessage("regexMatch") || "Regex",
    };
    return labels[type] || type;
  }

  formatHotkey(hotkey) {
    if (!hotkey) return "";
    const parts = [];
    if (hotkey.ctrlKey) parts.push("Ctrl");
    if (hotkey.shiftKey) parts.push("Shift");
    if (hotkey.altKey) parts.push("Alt");

    let keyName = hotkey.key.toUpperCase();
    if (keyName === " ") keyName = "Space";
    if (keyName === "CONTROL") keyName = "Ctrl";
    if (keyName === "SHIFT") keyName = "Shift";
    if (keyName === "ALT") keyName = "Alt";
    if (keyName === "META") keyName = "Cmd";

    parts.push(keyName);
    return parts.join(" + ");
  }

  openProfileModal(profileId = null) {
    console.log("Opening profile modal for:", profileId);
    const modal = document.getElementById("profileModal");
    const fieldsContainer = document.getElementById("fieldsContainer");

    if (!modal || !fieldsContainer) {
      console.error("Profile modal elements not found");
      return;
    }

    fieldsContainer.innerHTML = "";

    if (profileId && this.profiles[profileId]) {
      // Edit existing profile
      this.currentProfileId = profileId;
      const profile = this.profiles[profileId];

      document.getElementById("modalTitle").textContent =
        chrome.i18n.getMessage("editProfile") || "Edit Profile";
      document.getElementById("profileName").value = profile.name;
      document.getElementById("profileDefaultMode").value =
        profile.defaultMode || "overwrite";

      // Set color
      const colorOptions = document.querySelectorAll(".color-option");
      colorOptions.forEach((option) => {
        option.classList.remove("selected");
        if (option.dataset.color === profile.color) {
          option.classList.add("selected");
        }
      });

      // Add fields
      if (profile.fields && profile.fields.length > 0) {
        profile.fields.forEach((field) => {
          this.addFieldRow(field);
        });
      } else {
        this.addFieldRow();
      }
    } else {
      // New profile
      this.currentProfileId = null;
      document.getElementById("modalTitle").textContent =
        chrome.i18n.getMessage("createProfile") || "Create New Profile";
      document.getElementById("profileName").value = "";
      document.getElementById("profileDefaultMode").value = "overwrite";

      // Reset color selection
      document.querySelectorAll(".color-option").forEach((option) => {
        option.classList.remove("selected");
      });
      const firstColor = document.querySelector(".color-option");
      if (firstColor) {
        firstColor.classList.add("selected");
      }

      // Add one empty field
      this.addFieldRow();
    }

    modal.style.display = "flex";
  }

  addFieldRow(fieldData = {}) {
    const fieldsContainer = document.getElementById("fieldsContainer");
    const fieldTemplate = document.getElementById("fieldTemplate");

    if (!fieldsContainer || !fieldTemplate) {
      console.error("Field container or template not found");
      return;
    }

    const clone = fieldTemplate.content.cloneNode(true);
    const row = clone.querySelector(".field-row");

    if (fieldData.type) {
      row.querySelector(".field-type").value = fieldData.type;
    }
    if (fieldData.name) {
      row.querySelector(".field-name").value = fieldData.name;
    }
    if (fieldData.value) {
      row.querySelector(".field-value").value = fieldData.value;
    }
    if (fieldData.site) {
      row.querySelector(".field-site").value = fieldData.site;
    }
    if (fieldData.mode) {
      row.querySelector(".field-mode").value = fieldData.mode;
    }

    const removeBtn = row.querySelector(".remove-field");
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.target.closest(".field-row").remove();
      });
    }

    fieldsContainer.appendChild(clone);
  }

  openUrlRulesModal(profileId) {
    console.log("Opening URL rules modal for:", profileId);
    this.currentProfileId = profileId;
    const profile = this.profiles[profileId];
    const modal = document.getElementById("urlRulesModal");
    const rulesContainer = document.getElementById("urlRulesContainer");

    if (!modal || !rulesContainer || !profile) {
      console.error("URL rules modal elements not found");
      return;
    }

    rulesContainer.innerHTML = "";

    const profileNameElement = document.getElementById("urlRulesProfileName");
    if (profileNameElement) {
      profileNameElement.textContent = profile.name;
    }

    // Add existing rules
    if (profile.urlRules && profile.urlRules.length > 0) {
      profile.urlRules.forEach((rule) => {
        this.addUrlRuleRow(rule);
      });
    } else {
      // Add one empty rule
      this.addUrlRuleRow();
    }

    modal.style.display = "flex";
  }

  addUrlRuleRow(ruleData = {}) {
    const container = document.getElementById("urlRulesContainer");
    const template = document.getElementById("urlRuleTemplate");

    if (!container || !template) {
      console.error("URL rules container or template not found");
      return;
    }

    const clone = template.content.cloneNode(true);
    const row = clone.querySelector(".url-rule-row");

    // Set values
    if (ruleData.type) {
      row.querySelector(".url-rule-type").value = ruleData.type;
    }
    if (ruleData.pattern) {
      row.querySelector(".url-rule-pattern").value = ruleData.pattern;
    }
    if (ruleData.includePath !== undefined) {
      row.querySelector(".url-rule-include-path").checked =
        ruleData.includePath;
    }
    if (ruleData.enabled !== undefined) {
      row.querySelector(".url-rule-enabled").checked = ruleData.enabled;
    }

    // Remove button
    const removeBtn = row.querySelector(".remove-url-rule");
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.target.closest(".url-rule-row").remove();
      });
    }

    // Pattern type change
    const typeSelect = row.querySelector(".url-rule-type");
    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        const patternInput = row.querySelector(".url-rule-pattern");
        if (patternInput) {
          const placeholderMap = {
            exact: "example.com or example.com/path",
            contains: "google",
            startsWith: "https://www.",
            endsWith: ".com",
            regex: "^https://.*\\.com$",
          };
          patternInput.placeholder =
            placeholderMap[this.value] || "Enter pattern";
        }
      });
    }

    container.appendChild(clone);

    // Trigger change event to set placeholder
    if (typeSelect) {
      typeSelect.dispatchEvent(new Event("change"));
    }
  }

  openHotkeyModal(profileId) {
    console.log("Opening hotkey modal for:", profileId);
    this.currentHotkeyProfileId = profileId;
    this.capturedHotkey = this.hotkeys[profileId] || null;

    const modal = document.getElementById("hotkeyModal");
    const display = document.getElementById("hotkeyDisplay");
    const pressedKeys = document.getElementById("pressedKeys");
    const currentAssignments = document.getElementById("currentAssignments");

    if (!modal || !display) {
      console.error("Hotkey modal elements not found");
      return;
    }

    // Reset display
    if (this.capturedHotkey) {
      display.textContent = this.formatHotkey(this.capturedHotkey);
      this.updatePressedKeysDisplay();
    } else {
      const message =
        chrome.i18n.getMessage("pressKeyCombination") ||
        "Press your key combination...";
      display.innerHTML = `<span>${message}</span>`;
      if (pressedKeys) pressedKeys.innerHTML = "";
    }

    // Show current assignments
    if (currentAssignments) {
      this.updateCurrentAssignments(currentAssignments);
    }

    // Enable/disable save button
    const saveBtn = document.getElementById("saveHotkey");
    if (saveBtn) {
      saveBtn.disabled = !this.capturedHotkey;
    }

    modal.style.display = "flex";

    // Setup hotkey capture
    this.setupHotkeyCapture();
  }

  setupHotkeyCapture() {
    console.log("Setting up hotkey capture");

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore if typing in input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Avoid browser shortcuts
      const forbiddenCombos = [
        { ctrl: true, key: "w" }, // Close tab
        { ctrl: true, key: "t" }, // New tab
        { ctrl: true, key: "n" }, // New window
        { ctrl: true, shift: true, key: "t" }, // Reopen tab
        { ctrl: true, key: "f4" }, // Close window
        { alt: true, key: "f4" }, // Close window
      ];

      // Check if it's a forbidden combo
      const isForbidden = forbiddenCombos.some((combo) => {
        return (
          combo.ctrl === e.ctrlKey &&
          combo.shift === e.shiftKey &&
          combo.alt === e.altKey &&
          combo.key.toLowerCase() === e.key.toLowerCase()
        );
      });

      if (isForbidden) {
        alert(
          chrome.i18n.getMessage("hotkeyForbidden") ||
            "This key combination is reserved by the browser. Please use a different combination."
        );
        return;
      }

      // Capture hotkey
      this.capturedHotkey = {
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        key: e.key.toLowerCase(),
      };

      // Update display
      const display = document.getElementById("hotkeyDisplay");
      if (display) {
        display.textContent = this.formatHotkey(this.capturedHotkey);
      }

      this.updatePressedKeysDisplay();

      const saveBtn = document.getElementById("saveHotkey");
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    };

    // Store handler reference for cleanup
    this.hotkeyCaptureHandler = handleKeyDown;

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);
  }

  updatePressedKeysDisplay() {
    const container = document.getElementById("pressedKeys");
    if (!container || !this.capturedHotkey) {
      return;
    }

    const keys = [];
    if (this.capturedHotkey.ctrlKey) keys.push("Ctrl");
    if (this.capturedHotkey.shiftKey) keys.push("Shift");
    if (this.capturedHotkey.altKey) keys.push("Alt");

    let keyName = this.capturedHotkey.key.toUpperCase();
    if (keyName === " ") keyName = "Space";
    keys.push(keyName);

    container.innerHTML = keys
      .map((key) => `<span class="key-pill">${key}</span>`)
      .join("");
  }

  updateCurrentAssignments(container) {
    const currentHotkeys = Object.entries(this.hotkeys)
      .filter(([id, hk]) => id !== this.currentHotkeyProfileId && hk)
      .map(([id, hk]) => {
        const profile = this.profiles[id];
        return profile
          ? {
              name: profile.name,
              hotkey: this.formatHotkey(hk),
            }
          : null;
      })
      .filter(Boolean);

    if (currentHotkeys.length > 0) {
      container.innerHTML = `
        <h4>${
          chrome.i18n.getMessage("currentAssignments") ||
          "Currently Assigned Hotkeys:"
        }</h4>
        <ul style="list-style: none; padding: 0; margin-top: 10px;">
          ${currentHotkeys
            .map(
              (hk) => `
            <li style="padding: 5px 0; border-bottom: 1px solid #eee;">
              <strong>${hk.name}:</strong> <code>${hk.hotkey}</code>
            </li>
          `
            )
            .join("")}
        </ul>
      `;
    } else {
      container.innerHTML = `<p style="color: #666; text-align: center;">${
        chrome.i18n.getMessage("noOtherHotkeys") || "No other hotkeys assigned"
      }</p>`;
    }
  }

  async saveProfile() {
    console.log("Saving profile...");
    const nameInput = document.getElementById("profileName");
    if (!nameInput) {
      this.showMessage("Profile name input not found", "error");
      return;
    }

    const name = nameInput.value.trim();
    if (!name) {
      this.showMessage(
        chrome.i18n.getMessage("profileNameRequired") ||
          "Profile name is required",
        "error"
      );
      return;
    }

    const defaultMode = document.getElementById("profileDefaultMode").value;
    const selectedColor = document.querySelector(".color-option.selected");
    const color = selectedColor?.dataset.color || "#4285f4";

    const fieldRows = document.querySelectorAll(".field-row");
    const fields = [];

    fieldRows.forEach((row) => {
      const field = {
        type: row.querySelector(".field-type").value,
        name: row.querySelector(".field-name").value.trim(),
        value: row.querySelector(".field-value").value.trim(),
        site: row.querySelector(".field-site").value.trim(),
        mode: row.querySelector(".field-mode").value,
      };

      if (field.name && field.value) {
        fields.push(field);
      }
    });

    if (fields.length === 0) {
      this.showMessage(
        chrome.i18n.getMessage("fieldsRequired") ||
          "Please add at least one field",
        "error"
      );
      return;
    }

    const profileId = this.currentProfileId || `profile_${Date.now()}`;

    this.profiles[profileId] = {
      id: profileId,
      name,
      fields,
      color,
      defaultMode,
      urlRules: this.profiles[profileId]?.urlRules || [],
      created: this.currentProfileId
        ? this.profiles[profileId]?.created || new Date().toISOString()
        : new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await this.saveAllData();
    this.closeModal("profileModal");
    this.renderProfiles();
    this.renderHotkeyConfig();

    // If this is the first profile, set it as active
    if (Object.keys(this.profiles).length === 1) {
      await chrome.storage.local.set({ activeProfile: profileId });
    }

    this.showMessage(
      chrome.i18n.getMessage("profileSaved") || "Profile saved successfully"
    );
  }

  async saveUrlRules() {
    console.log("Saving URL rules...");
    if (!this.currentProfileId) return;

    const ruleRows = document.querySelectorAll(".url-rule-row");
    const urlRules = [];

    ruleRows.forEach((row) => {
      const rule = {
        type: row.querySelector(".url-rule-type").value,
        pattern: row.querySelector(".url-rule-pattern").value.trim(),
        includePath: row.querySelector(".url-rule-include-path").checked,
        enabled: row.querySelector(".url-rule-enabled").checked,
      };

      if (rule.pattern) {
        urlRules.push(rule);
      }
    });

    if (urlRules.length === 0) {
      this.showMessage(
        chrome.i18n.getMessage("urlRuleRequired") ||
          "Please add at least one URL rule",
        "error"
      );
      return;
    }

    this.profiles[this.currentProfileId].urlRules = urlRules;
    await this.saveAllData();

    this.closeModal("urlRulesModal");
    this.renderProfiles();
    this.renderUrlRulesOverview();

    this.showMessage(
      chrome.i18n.getMessage("urlRulesSaved") || "URL rules saved successfully"
    );
  }

  async saveHotkey() {
    console.log("Saving hotkey...");
    if (!this.currentHotkeyProfileId || !this.capturedHotkey) {
      return;
    }

    // Check for duplicate hotkey
    const duplicate = Object.entries(this.hotkeys).find(([id, hk]) => {
      return (
        id !== this.currentHotkeyProfileId &&
        hk.ctrlKey === this.capturedHotkey.ctrlKey &&
        hk.shiftKey === this.capturedHotkey.shiftKey &&
        hk.altKey === this.capturedHotkey.altKey &&
        hk.key === this.capturedHotkey.key
      );
    });

    if (duplicate) {
      const profile = this.profiles[duplicate[0]];
      const message =
        chrome.i18n.getMessage("hotkeyConflictMessage", [profile.name]) ||
        `This hotkey is already assigned to "${profile.name}". Do you want to reassign it?`;

      if (confirm(message)) {
        // Remove from old profile
        delete this.hotkeys[duplicate[0]];
      } else {
        return;
      }
    }

    this.hotkeys[this.currentHotkeyProfileId] = this.capturedHotkey;
    await this.saveAllData();

    this.closeModal("hotkeyModal");
    this.renderProfiles();
    this.renderHotkeyConfig();

    // Cleanup hotkey capture
    this.cleanupHotkeyCapture();

    this.showMessage(
      chrome.i18n.getMessage("hotkeySaved") || "Hotkey saved successfully"
    );
  }

  clearHotkey(profileId) {
    console.log("Clearing hotkey for:", profileId);
    const confirmMessage =
      chrome.i18n.getMessage("confirmRemoveHotkey") ||
      "Remove hotkey assignment?";
    if (confirm(confirmMessage)) {
      delete this.hotkeys[profileId];
      this.saveAllData();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.showMessage(
        chrome.i18n.getMessage("hotkeyRemoved") || "Hotkey removed"
      );
    }
  }

  cleanupHotkeyCapture() {
    console.log("Cleaning up hotkey capture");
    if (this.hotkeyCaptureHandler) {
      document.removeEventListener("keydown", this.hotkeyCaptureHandler);
      this.hotkeyCaptureHandler = null;
    }
  }

  async duplicateProfile(profileId) {
    console.log("Duplicating profile:", profileId);
    const original = this.profiles[profileId];
    if (!original) return;

    const newId = `profile_${Date.now()}`;

    this.profiles[newId] = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name} (Copy)`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await this.saveAllData();
    this.renderProfiles();
    this.renderHotkeyConfig();
    this.showMessage(
      chrome.i18n.getMessage("profileDuplicated") || "Profile duplicated"
    );
  }

  async deleteProfile(profileId) {
    console.log("Deleting profile:", profileId);
    const profile = this.profiles[profileId];
    if (!profile) return;

    const confirmMessage =
      chrome.i18n.getMessage("confirmDeleteMessage") ||
      `Delete profile "${profile.name}"?`;

    if (confirm(confirmMessage)) {
      delete this.profiles[profileId];
      delete this.hotkeys[profileId];
      await this.saveAllData();

      // If this was the active profile, clear it
      const data = await chrome.storage.local.get("activeProfile");
      if (data.activeProfile === profileId) {
        await chrome.storage.local.set({ activeProfile: null });
      }

      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();
      this.showMessage(
        chrome.i18n.getMessage("profileDeleted") || "Profile deleted"
      );
    }
  }

  closeModal(modalId) {
    console.log("Closing modal:", modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
    }

    if (modalId === "hotkeyModal") {
      this.cleanupHotkeyCapture();
    }
  }

  loadSettings() {
    console.log("Loading settings...");
    const enableHotkeys = document.getElementById("enableHotkeys");
    const autoSwitchProfile = document.getElementById("autoSwitchProfile");
    const confirmOverwrite = document.getElementById("confirmOverwrite");
    const defaultMode = document.getElementById("defaultMode");

    if (enableHotkeys)
      enableHotkeys.checked = this.settings.enableHotkeys !== false;
    if (autoSwitchProfile)
      autoSwitchProfile.checked = this.settings.autoSwitchProfile !== false;
    if (confirmOverwrite)
      confirmOverwrite.checked = this.settings.confirmOverwrite !== false;
    if (defaultMode)
      defaultMode.value = this.settings.defaultMode || "overwrite";
  }

  async saveSettings() {
    console.log("Saving settings...");
    this.settings = {
      enableHotkeys: document.getElementById("enableHotkeys").checked,
      autoSwitchProfile: document.getElementById("autoSwitchProfile").checked,
      confirmOverwrite: document.getElementById("confirmOverwrite").checked,
      defaultMode: document.getElementById("defaultMode").value,
    };

    await this.saveAllData();
    this.showMessage(
      chrome.i18n.getMessage("settingsSaved") || "Settings saved successfully"
    );
  }

  async backupNow() {
    console.log("Creating backup...");
    const backupData = {
      profiles: this.profiles,
      hotkeys: this.hotkeys,
      settings: this.settings,
      version: "1.0",
      backupDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(dataBlob);
    a.download = `autofill-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();

    this.showMessage(
      chrome.i18n.getMessage("backupCreated") || "Backup created successfully"
    );
  }

  async restoreBackup() {
    console.log("Restoring backup...");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.profiles || !backupData.version) {
          throw new Error("Invalid backup file");
        }

        const confirmMessage =
          chrome.i18n.getMessage("confirmRestore") ||
          "This will replace all current profiles and settings. Continue?";

        if (confirm(confirmMessage)) {
          this.profiles = backupData.profiles;
          this.hotkeys = backupData.hotkeys || {};
          this.settings = backupData.settings || {};

          await this.saveAllData();
          this.renderProfiles();
          this.renderHotkeyConfig();
          this.renderUrlRulesOverview();
          this.loadSettings();

          this.showMessage(
            chrome.i18n.getMessage("backupRestored") ||
              "Backup restored successfully"
          );
        }
      } catch (error) {
        this.showMessage("Error restoring backup: " + error.message, "error");
      }
    };

    input.click();
  }

  async resetSettings() {
    console.log("Resetting settings...");
    const confirmMessage =
      chrome.i18n.getMessage("confirmResetMessage") ||
      "⚠️ This will delete ALL profiles and settings. This action cannot be undone. Continue?";

    if (confirm(confirmMessage)) {
      this.profiles = {};
      this.hotkeys = {};
      this.settings = {
        enableHotkeys: true,
        autoSwitchProfile: true,
        confirmOverwrite: true,
        defaultMode: "overwrite",
      };

      await chrome.storage.local.clear();
      await this.saveAllData();

      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();
      this.loadSettings();

      this.showMessage(
        chrome.i18n.getMessage("settingsReset") ||
          "All settings have been reset"
      );
    }
  }

  testUrlRule() {
    console.log("Testing URL rule...");
    const testUrl = document.getElementById("testUrlInput").value.trim();
    const ruleType = document.getElementById("testRuleType").value;
    const rulePattern = document.getElementById("testRulePattern").value.trim();
    const includePath = document.getElementById("testIncludePath").checked;

    if (!testUrl || !rulePattern) {
      this.showMessage(
        chrome.i18n.getMessage("testUrlRuleRequired") ||
          "Please enter both URL and pattern to test",
        "error"
      );
      return;
    }

    try {
      const urlObj = new URL(testUrl);
      const urlToTest = includePath
        ? urlObj.hostname + urlObj.pathname
        : urlObj.hostname;

      let matches = false;
      switch (ruleType) {
        case "exact":
          matches = urlToTest === rulePattern;
          break;
        case "contains":
          matches = urlToTest.includes(rulePattern);
          break;
        case "startsWith":
          matches = urlToTest.startsWith(rulePattern);
          break;
        case "endsWith":
          matches = urlToTest.endsWith(rulePattern);
          break;
        case "regex":
          try {
            const regex = new RegExp(rulePattern);
            matches = regex.test(urlToTest);
          } catch (e) {
            this.showMessage(
              chrome.i18n.getMessage("invalidRegex") ||
                "Invalid regex pattern: " + e.message,
              "error"
            );
            return;
          }
          break;
      }

      const resultDiv = document.getElementById("testResult");
      if (resultDiv) {
        if (matches) {
          resultDiv.innerHTML = `
            <div class="test-result success">
              <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
              <div style="font-weight: 500; margin-bottom: 5px;">${
                chrome.i18n.getMessage("urlMatches") ||
                "URL matches the pattern!"
              }</div>
              <div class="test-details">${
                chrome.i18n.getMessage("testedUrl") || "Tested:"
              } ${urlToTest}</div>
            </div>
          `;
          resultDiv.className = "test-result success";
        } else {
          resultDiv.innerHTML = `
            <div class="test-result error">
              <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
              <div style="font-weight: 500; margin-bottom: 5px;">${
                chrome.i18n.getMessage("urlDoesNotMatch") ||
                "URL does not match the pattern"
              }</div>
              <div class="test-details">${
                chrome.i18n.getMessage("testedUrl") || "Tested:"
              } ${urlToTest}</div>
            </div>
          `;
          resultDiv.className = "test-result error";
        }
      }
    } catch (e) {
      this.showMessage(
        chrome.i18n.getMessage("invalidUrl") || "Invalid URL: " + e.message,
        "error"
      );
    }
  }

  async calculateStorage() {
    console.log("Calculating storage...");
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const storageUsed = document.getElementById("storageUsed");

      if (storageUsed) {
        if (bytesInUse < 1024) {
          storageUsed.textContent = `${bytesInUse} bytes`;
        } else if (bytesInUse < 1024 * 1024) {
          storageUsed.textContent = `${(bytesInUse / 1024).toFixed(2)} KB`;
        } else {
          storageUsed.textContent = `${(bytesInUse / (1024 * 1024)).toFixed(
            2
          )} MB`;
        }
      }
    } catch (error) {
      console.error("Error calculating storage:", error);
      const storageUsed = document.getElementById("storageUsed");
      if (storageUsed) {
        storageUsed.textContent = "Unknown";
      }
    }
  }

  showMessage(message, type = "success", duration = 3000) {
    console.log(`Showing message (${type}):`, message);

    // Remove existing toast
    const existingToast = document.querySelector(".toast-message");
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast message
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === "error" ? "#ea4335" : "#34a853"};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);

    // Add CSS for animations if not exists
    if (!document.getElementById("toast-animations")) {
      const style = document.createElement("style");
      style.id = "toast-animations";
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showError(message) {
    this.showMessage(message, "error", 5000);
  }

  checkForCapturedFields() {
    console.log("Checking for captured fields...");
    chrome.storage.local.get(["capturedFields", "captureUrl"], async (data) => {
      if (data.capturedFields && data.capturedFields.length > 0) {
        console.log("Found captured fields:", data.capturedFields.length);
        this.openProfileModal();

        // Pre-fill with captured fields
        try {
          const siteName = new URL(data.captureUrl).hostname.replace(
            "www.",
            ""
          );
          const profileNameInput = document.getElementById("profileName");
          if (profileNameInput) {
            profileNameInput.value = `Profile from ${siteName}`;
          }

          const fieldsContainer = document.getElementById("fieldsContainer");
          if (fieldsContainer) {
            fieldsContainer.innerHTML = "";
          }

          data.capturedFields.forEach((field) => {
            this.addFieldRow({
              type: field.type,
              name: field.name,
              value: field.value,
              site: field.site,
              mode: field.mode,
            });
          });

          // Clear captured data
          await chrome.storage.local.remove(["capturedFields", "captureUrl"]);
        } catch (error) {
          console.error("Error processing captured fields:", error);
        }
      } else {
        console.log("No captured fields found");
      }
    });
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // New profile button
    const newProfileBtn = document.getElementById("newProfile");
    if (newProfileBtn) {
      newProfileBtn.addEventListener("click", () => {
        this.openProfileModal();
      });
    }

    // Import button
    const importBtn = document.getElementById("importBtn");
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        this.restoreBackup();
      });
    }

    // Export button
    const exportBtn = document.getElementById("exportAll");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.backupNow();
      });
    }

    // Add field button (in modal)
    const addFieldBtn = document.getElementById("addField");
    if (addFieldBtn) {
      addFieldBtn.addEventListener("click", () => {
        this.addFieldRow();
      });
    }

    // Add URL rule button (in modal)
    const addUrlRuleBtn = document.getElementById("addUrlRule");
    if (addUrlRuleBtn) {
      addUrlRuleBtn.addEventListener("click", () => {
        this.addUrlRuleRow();
      });
    }

    // Save profile button (in modal)
    const saveProfileBtn = document.getElementById("saveProfile");
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener("click", () => {
        this.saveProfile();
      });
    }

    // Save URL rules button (in modal)
    const saveUrlRulesBtn = document.getElementById("saveUrlRules");
    if (saveUrlRulesBtn) {
      saveUrlRulesBtn.addEventListener("click", () => {
        this.saveUrlRules();
      });
    }

    // Test URL rule button
    const testUrlRuleBtn = document.getElementById("testUrlRuleBtn");
    if (testUrlRuleBtn) {
      testUrlRuleBtn.addEventListener("click", () => {
        this.testUrlRule();
      });
    }

    // Save hotkey button (in modal)
    const saveHotkeyBtn = document.getElementById("saveHotkey");
    if (saveHotkeyBtn) {
      saveHotkeyBtn.addEventListener("click", () => {
        this.saveHotkey();
      });
    }

    // Clear hotkey button (in modal)
    const clearHotkeyBtn = document.getElementById("clearHotkey");
    if (clearHotkeyBtn) {
      clearHotkeyBtn.addEventListener("click", () => {
        this.capturedHotkey = null;
        const message =
          chrome.i18n.getMessage("pressKeyCombination") ||
          "Press your key combination...";
        const hotkeyDisplay = document.getElementById("hotkeyDisplay");
        if (hotkeyDisplay) {
          hotkeyDisplay.innerHTML = `<span>${message}</span>`;
        }
        const pressedKeys = document.getElementById("pressedKeys");
        if (pressedKeys) {
          pressedKeys.innerHTML = "";
        }
        if (saveHotkeyBtn) {
          saveHotkeyBtn.disabled = true;
        }
      });
    }

    // Cancel buttons
    const cancelProfileBtn = document.getElementById("cancelProfileBtn");
    if (cancelProfileBtn) {
      cancelProfileBtn.addEventListener("click", () => {
        this.closeModal("profileModal");
      });
    }

    const cancelUrlRulesBtn = document.getElementById("cancelUrlRulesBtn");
    if (cancelUrlRulesBtn) {
      cancelUrlRulesBtn.addEventListener("click", () => {
        this.closeModal("urlRulesModal");
      });
    }

    // Close modal buttons
    const closeProfileModalBtn = document.getElementById("closeProfileModal");
    if (closeProfileModalBtn) {
      closeProfileModalBtn.addEventListener("click", () => {
        this.closeModal("profileModal");
      });
    }

    const closeUrlRulesModalBtn = document.getElementById("closeUrlRulesModal");
    if (closeUrlRulesModalBtn) {
      closeUrlRulesModalBtn.addEventListener("click", () => {
        this.closeModal("urlRulesModal");
      });
    }

    const closeHotkeyModalBtn = document.getElementById("closeHotkeyModal");
    if (closeHotkeyModalBtn) {
      closeHotkeyModalBtn.addEventListener("click", () => {
        this.closeModal("hotkeyModal");
      });
    }

    // Settings checkboxes
    const enableHotkeys = document.getElementById("enableHotkeys");
    if (enableHotkeys) {
      enableHotkeys.addEventListener("change", () => {
        this.saveSettings();
      });
    }

    const autoSwitchProfile = document.getElementById("autoSwitchProfile");
    if (autoSwitchProfile) {
      autoSwitchProfile.addEventListener("change", () => {
        this.saveSettings();
      });
    }

    const confirmOverwrite = document.getElementById("confirmOverwrite");
    if (confirmOverwrite) {
      confirmOverwrite.addEventListener("change", () => {
        this.saveSettings();
      });
    }

    const defaultMode = document.getElementById("defaultMode");
    if (defaultMode) {
      defaultMode.addEventListener("change", () => {
        this.saveSettings();
      });
    }

    // Backup/Restore buttons
    const backupNowBtn = document.getElementById("backupNow");
    if (backupNowBtn) {
      backupNowBtn.addEventListener("click", () => {
        this.backupNow();
      });
    }

    const restoreBackupBtn = document.getElementById("restoreBackup");
    if (restoreBackupBtn) {
      restoreBackupBtn.addEventListener("click", () => {
        this.restoreBackup();
      });
    }

    const resetSettingsBtn = document.getElementById("resetSettings");
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener("click", () => {
        this.resetSettings();
      });
    }

    // Color picker
    document.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        document
          .querySelectorAll(".color-option")
          .forEach((o) => o.classList.remove("selected"));
        e.target.classList.add("selected");
      });
    });

    // Close modals on outside click
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Check for updates button
    const checkForUpdatesBtn = document.getElementById("checkForUpdates");
    if (checkForUpdatesBtn) {
      checkForUpdatesBtn.addEventListener("click", () => {
        const manifest = chrome.runtime.getManifest();
        this.showMessage(
          chrome.i18n.getMessage("noUpdatesAvailable") ||
            `You have the latest version ${manifest.version}!`
        );
      });
    }

    console.log("Event listeners setup completed");
  }
}

// Initialize options page with error handling
document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page DOM loaded");

  // Check if we're running in extension context
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.error("Not running in extension context!");
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: 'Segoe UI', system-ui, sans-serif;">
        <h2 style="color: #ea4335;">⚠️ Extension Context Required</h2>
        <p>This page must be opened from the AutoFill Pro extension.</p>
        <p>Please open the extension popup and navigate to Options from there.</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
    return;
  }

  try {
    const optionsManager = new OptionsManager();
    window.optionsManager = optionsManager; // Expose for debugging

    console.log("OptionsManager initialized successfully");
  } catch (error) {
    console.error("Failed to initialize OptionsManager:", error);

    // Create error display
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      padding: 20px;
      background: #f8d7da;
      color: #721c24;
      margin: 20px;
      border-radius: 6px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    `;
    errorDiv.innerHTML = `
      <h3 style="margin-top: 0;">Initialization Error</h3>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Stack:</strong> ${error.stack}</p>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Reload Page
      </button>
      <button onclick="chrome.runtime.reload()" style="margin-top: 10px; margin-left: 10px; padding: 8px 16px; background: #34a853; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Reload Extension
      </button>
    `;
    document.body.prepend(errorDiv);
  }
});

// Add global error handler
window.addEventListener("error", function (event) {
  console.error("Global error:", event.error);
});

// Add unhandled rejection handler
window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);
});
