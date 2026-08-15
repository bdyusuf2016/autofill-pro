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
    this.profileModalHotkey = null;
    this.profileHotkeyCaptureHandler = null;
    this.searchQuery = "";

    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.loadAllData = this.loadAllData.bind(this);
    this.saveAllData = this.saveAllData.bind(this);
    this.applyLocalization = this.applyLocalization.bind(this);
    this.loadVersion = this.loadVersion.bind(this);
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
    this.setupProfileHotkeyCapture = this.setupProfileHotkeyCapture.bind(this);
    this.cleanupProfileHotkeyCapture = this.cleanupProfileHotkeyCapture.bind(this);
    this.duplicateProfile = this.duplicateProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.clearHotkey = this.clearHotkey.bind(this);
    this.backupNow = this.backupNow.bind(this);
    this.restoreBackup = this.restoreBackup.bind(this);
    this.resetSettings = this.resetSettings.bind(this);
    this.testUrlRule = this.testUrlRule.bind(this);
    this.setupCloudSyncUI = this.setupCloudSyncUI.bind(this);
    this.updateSyncStatus = this.updateSyncStatus.bind(this);
    this.handleSyncLogin = this.handleSyncLogin.bind(this);
    this.handleSyncLogout = this.handleSyncLogout.bind(this);
    this.handleSyncNow = this.handleSyncNow.bind(this);
    this.handlePullFromCloud = this.handlePullFromCloud.bind(this);
    this.setupCloudSyncEventListeners = this.setupCloudSyncEventListeners.bind(this);
    this.loadTeletalkPropertyDefinitions = this.loadTeletalkPropertyDefinitions.bind(this);
    this.handleCreateDssTemplateProfile = this.handleCreateDssTemplateProfile.bind(this);
    this.handleLoadOcrSourceFile = this.handleLoadOcrSourceFile.bind(this);
    this.handleCreateProfileFromOcr = this.handleCreateProfileFromOcr.bind(this);
    this.handlePassportTextParse = this.handlePassportTextParse.bind(this);
    this.handlePassportFileUpload = this.handlePassportFileUpload.bind(this);
    this.displayPassportPreview = this.displayPassportPreview.bind(this);
    this.handleCreateProfileFromPassport = this.handleCreateProfileFromPassport.bind(this);

    // Initialize
    this.init();
  }

  async init() {
    console.log("OptionsManager init started");
    try {
      await this.loadAllData();
      this.applyLocalization();
      this.loadVersion();
      this.setupTabs();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();
      this.loadSettings();
      this.setupEventListeners();
      await this.setupCloudSyncUI();
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
      this.settings = data.settings || {};
      if (!this.settings.language) {
        this.settings.language = "en";
      }

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

  loadVersion() {
    try {
      const manifest = chrome.runtime.getManifest();
      const version = manifest.version;
      const versionElement = document.getElementById("appVersion");
      if (versionElement) {
        versionElement.textContent = `Version ${version}`;
      }
    } catch (error) {
      console.error("Error loading version:", error);
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

    const search = (this.searchQuery || "").trim().toLowerCase();
    const allProfiles = Object.values(this.profiles);
    const filteredProfiles = allProfiles.filter((profile) => {
      if (!search) return true;
      const nameMatch = (profile.name || "").toLowerCase().includes(search);
      const phoneMatch = (profile.phone || profile.phoneNumber || "").toLowerCase().includes(search);
      const nidMatch = (profile.nid || profile.nidNo || profile.nid_no || profile.nationalId || "").toLowerCase().includes(search);
      const fieldMatch = (profile.fields || []).some((f) =>
        (f.name || "").toLowerCase().includes(search) ||
        (f.value || "").toLowerCase().includes(search) ||
        (f.site || "").toLowerCase().includes(search)
      );
      return nameMatch || phoneMatch || nidMatch || fieldMatch;
    });

    filteredProfiles.forEach((profile) => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector(".profile-card");

      card.setAttribute("data-id", profile.id);
      card.querySelector(".profile-color").style.backgroundColor =
        profile.color || "#4285f4";
      card.querySelector(".profile-title").textContent = profile.name;

      // Phone display
      const phoneEl = card.querySelector(".profile-phone");
      const phoneTextEl = card.querySelector(".profile-phone-text");
      const phoneNum = profile.phone || profile.phoneNumber || "";
      if (phoneEl && phoneTextEl) {
        if (phoneNum) {
          phoneTextEl.textContent = phoneNum;
          phoneEl.classList.remove("hidden");
        } else {
          phoneEl.classList.add("hidden");
        }
      }

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
    if (allProfiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-center">
            <div class="empty-emoji">📝</div>
            <h3 class="empty-title">${
              chrome.i18n.getMessage("noProfilesMessage") || "No Profiles Yet"
            }</h3>
            <p class="empty-desc">${
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
    } else if (filteredProfiles.length === 0 && search) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-center">
            <div class="empty-emoji">🔍</div>
            <h3 class="empty-title">No Profiles Found</h3>
            <p class="empty-desc">No profiles match "${search}"</p>
          </div>
        </div>
      `;
    }

    const createBtn = document.getElementById("createFirstProfile");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        this.openProfileModal();
      });
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
          <p class="empty-center">${
            chrome.i18n.getMessage("noProfilesForHotkeys") ||
            "No profiles available. Create a profile first to assign hotkeys."
          }</p>
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
            includePathBadge.classList.remove("hidden");
          } else {
            includePathBadge.classList.add("hidden");
          }

          if (rule.enabled !== false) {
            enabledBadge.classList.remove("hidden");
            disabledBadge.classList.add("hidden");
          } else {
            enabledBadge.classList.add("hidden");
            disabledBadge.classList.remove("hidden");
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
          <div class="empty-center">
            <div class="empty-emoji">🌐</div>
            <h3 class="empty-title">${
              chrome.i18n.getMessage("noUrlRules") || "No URL Rules Yet"
            }</h3>
            <p class="empty-desc">${
              chrome.i18n.getMessage("noUrlRulesMessage") ||
              "Create URL rules to automatically switch profiles based on website URLs"
            }</p>
            <p class="muted-small">${
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
    this.profileModalHotkey = null; // Reset hotkey

    const hotkeyDisplay = document.getElementById("profileHotkeyDisplay");
    const setHotkeyBtn = document.getElementById("profileSetHotkeyBtn");
    const clearHotkeyBtn = document.getElementById("profileClearHotkeyBtn");

    const updateHotkeyDisplay = () => {
      if (this.profileModalHotkey) {
        hotkeyDisplay.textContent = this.formatHotkey(this.profileModalHotkey);
        hotkeyDisplay.classList.remove("recording");
      } else {
        hotkeyDisplay.textContent =
          chrome.i18n.getMessage("notSet") || "Not set";
        hotkeyDisplay.classList.remove("recording");
      }
    };

    if (profileId && this.profiles[profileId]) {
      // Edit existing profile
      this.currentProfileId = profileId;
      const profile = this.profiles[profileId];

      document.getElementById("modalTitle").textContent =
        chrome.i18n.getMessage("editProfile") || "Edit Profile";
      document.getElementById("profileName").value = profile.name;
      const phoneInput = document.getElementById("profilePhone");
      if (phoneInput) {
        phoneInput.value = profile.phone || profile.phoneNumber || "";
      }
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

      // Set hotkey
      if (this.hotkeys[profileId]) {
        this.profileModalHotkey = { ...this.hotkeys[profileId] };
      }
      updateHotkeyDisplay();

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
      const newPhoneInput = document.getElementById("profilePhone");
      if (newPhoneInput) {
        newPhoneInput.value = "";
      }
      document.getElementById("profileDefaultMode").value = "overwrite";

      // Reset color selection
      document.querySelectorAll(".color-option").forEach((option) => {
        option.classList.remove("selected");
      });
      const firstColor = document.querySelector(".color-option");
      if (firstColor) {
        firstColor.classList.add("selected");
      }

      // Reset hotkey display
      updateHotkeyDisplay();

      // Add one empty field
      this.addFieldRow();
    }

    // Hotkey button listeners
    setHotkeyBtn.onclick = () => {
      this.setupProfileHotkeyCapture();
      hotkeyDisplay.textContent = "Press keys...";
      hotkeyDisplay.classList.add("recording");
    };

    clearHotkeyBtn.onclick = () => {
      this.profileModalHotkey = null;
      this.cleanupProfileHotkeyCapture();
      updateHotkeyDisplay();
    };

    // Show modal by removing the hidden utility class
    modal.classList.remove("hidden");
    // Enable focus trap for accessibility and keyboard users
    this.enableModalFocus(modal);
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
    if (fieldData.cssSelector) {
      const cssInput = row.querySelector(".field-css");
      if (cssInput) cssInput.value = fieldData.cssSelector;
    }
    if (fieldData.xpath) {
      const xpathInput = row.querySelector(".field-xpath");
      if (xpathInput) xpathInput.value = fieldData.xpath;
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

    // Show modal by removing the hidden utility class
    modal.classList.remove("hidden");
    // Enable focus trap for accessibility and keyboard users
    this.enableModalFocus(modal);
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

    // Show modal by removing the hidden utility class
    modal.classList.remove("hidden");

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
        <ul class="simple-list">
          ${currentHotkeys
            .map(
              (hk) => `
            <li class="simple-list-item">
              <strong>${hk.name}:</strong> <code>${hk.hotkey}</code>
            </li>
          `
            )
            .join("")}
        </ul>
      `;
    } else {
      container.innerHTML = `<p class="empty-center">${
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
      const cssEl = row.querySelector(".field-css");
      const xpathEl = row.querySelector(".field-xpath");
      
      const field = {
        type: row.querySelector(".field-type").value,
        name: row.querySelector(".field-name").value.trim(),
        value: row.querySelector(".field-value").value.trim(),
        site: row.querySelector(".field-site").value.trim(),
        mode: row.querySelector(".field-mode").value,
        cssSelector: cssEl ? cssEl.value.trim() : "",
        xpath: xpathEl ? xpathEl.value.trim() : ""
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

    // Handle hotkey
    if (this.profileModalHotkey) {
      const duplicate = Object.entries(this.hotkeys).find(([id, hk]) => {
        return (
          id !== profileId &&
          hk.ctrlKey === this.profileModalHotkey.ctrlKey &&
          hk.shiftKey === this.profileModalHotkey.shiftKey &&
          hk.altKey === this.profileModalHotkey.altKey &&
          hk.key === this.profileModalHotkey.key
        );
      });

      if (duplicate) {
        const profile = this.profiles[duplicate[0]];
        const message =
          chrome.i18n.getMessage("hotkeyConflictMessage", [profile.name]) ||
          `This hotkey is already assigned to "${profile.name}". Do you want to reassign it?`;

        if (confirm(message)) {
          delete this.hotkeys[duplicate[0]];
        } else {
          // Do not save the hotkey
          this.profileModalHotkey = this.hotkeys[profileId] || null;
        }
      }
      this.hotkeys[profileId] = this.profileModalHotkey;
    } else {
      // If hotkey was cleared
      delete this.hotkeys[profileId];
    }

    const phoneInput = document.getElementById("profilePhone");
    const phone = phoneInput ? phoneInput.value.trim() : "";

    // If phone number is provided and not already in fields list, auto add/update mobile field
    if (phone) {
      const hasPhoneField = fields.some((f) => 
        /phone|mobile|cell|contact/i.test(f.name) || /tel|phone/i.test(f.type)
      );
      if (!hasPhoneField) {
        fields.push({
          type: "tel",
          name: "mobile",
          value: phone,
          site: "",
          mode: defaultMode || "overwrite",
          cssSelector: "",
          xpath: ""
        });
      }
    }

    this.profiles[profileId] = {
      id: profileId,
      name,
      phone,
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

    for (const row of ruleRows) {
      const rule = {
        type: row.querySelector(".url-rule-type").value,
        pattern: row.querySelector(".url-rule-pattern").value.trim(),
        includePath: row.querySelector(".url-rule-include-path").checked,
        enabled: row.querySelector(".url-rule-enabled").checked,
      };

      if (!rule.pattern) {
        continue;
      }

      const validation = UrlRuleMatcher.validateRule(rule);
      if (!validation.valid) {
        this.showMessage(
          validation.reason === "regex"
            ? chrome.i18n.getMessage("invalidRegex") ||
                "Invalid regex pattern: " + validation.error.message
            : chrome.i18n.getMessage("urlRuleRequired") ||
                "Please enter a valid URL rule",
          "error"
        );
        return;
      }

      urlRules.push(rule);
    }

    this.profiles[this.currentProfileId].urlRules = urlRules;
    await this.saveAllData();

    this.closeModal("urlRulesModal");
    this.renderProfiles();
    this.renderUrlRulesOverview();

    this.showMessage(
      urlRules.length > 0
        ? chrome.i18n.getMessage("urlRulesSaved") || "URL rules saved successfully"
        : chrome.i18n.getMessage("noUrlRules") || "URL rules cleared"
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

  setupProfileHotkeyCapture() {
    console.log("Setting up profile hotkey capture");
    this.cleanupProfileHotkeyCapture(); // Clean up any existing listener

    const hotkeyDisplay = document.getElementById("profileHotkeyDisplay");

    this.profileHotkeyCaptureHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      this.profileModalHotkey = {
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        key: e.key.toLowerCase(),
      };

      hotkeyDisplay.textContent = this.formatHotkey(this.profileModalHotkey);
      hotkeyDisplay.classList.remove("recording");
      this.cleanupProfileHotkeyCapture();
    };

    document.addEventListener("keydown", this.profileHotkeyCaptureHandler, {
      capture: true,
    });
  }

  cleanupProfileHotkeyCapture() {
    console.log("Cleaning up profile hotkey capture");
    if (this.profileHotkeyCaptureHandler) {
      document.removeEventListener(
        "keydown",
        this.profileHotkeyCaptureHandler,
        { capture: true }
      );
      this.profileHotkeyCaptureHandler = null;
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
      // remove focus trap and restore focus
      this.disableModalFocus(modal);

      // Use the hidden utility class instead of inline styles so CSS !important rules are respected
      modal.classList.add("hidden");
    }

    if (modalId === "hotkeyModal") {
      this.cleanupHotkeyCapture();
    }
    if (modalId === "profileModal") {
      this.cleanupProfileHotkeyCapture();
    }
  }

  loadSettings() {
    console.log("Loading settings...");
    const enableHotkeys = document.getElementById("enableHotkeys");
    const autoSwitchProfile = document.getElementById("autoSwitchProfile");
    const confirmOverwrite = document.getElementById("confirmOverwrite");
    const defaultMode = document.getElementById("defaultMode");
    const language = document.getElementById("language");

    if (enableHotkeys)
      enableHotkeys.checked = this.settings.enableHotkeys !== false;
    if (autoSwitchProfile)
      autoSwitchProfile.checked = this.settings.autoSwitchProfile !== false;
    if (confirmOverwrite)
      confirmOverwrite.checked = this.settings.confirmOverwrite !== false;
    if (defaultMode)
      defaultMode.value = this.settings.defaultMode || "overwrite";
    if (language) language.value = this.settings.language || "en";

    // Load E2EE Settings
    chrome.storage.local.get(['encryptionEnabled', 'masterPassword'], (res) => {
      const encryptionEnabled = document.getElementById("encryptionEnabled");
      const masterPassword = document.getElementById("masterPassword");
      const masterPasswordItem = document.getElementById("masterPasswordItem");
      
      if (encryptionEnabled) {
        encryptionEnabled.checked = !!res.encryptionEnabled;
        if (masterPasswordItem) {
          masterPasswordItem.style.display = res.encryptionEnabled ? "block" : "none";
        }
      }
      if (masterPassword && res.masterPassword) {
        masterPassword.value = res.masterPassword;
      }
    });
  }

  async saveSettings() {
    console.log("Saving settings...");
    this.settings = {
      enableHotkeys: document.getElementById("enableHotkeys").checked,
      autoSwitchProfile: document.getElementById("autoSwitchProfile").checked,
      confirmOverwrite: document.getElementById("confirmOverwrite").checked,
      defaultMode: document.getElementById("defaultMode").value,
      language: document.getElementById("language").value,
    };

    const encryptEnabledCheckbox = document.getElementById("encryptionEnabled");
    const masterPasswordInput = document.getElementById("masterPassword");
    
    const encryptEnabledVal = encryptEnabledCheckbox ? encryptEnabledCheckbox.checked : false;
    const masterPasswordVal = masterPasswordInput ? masterPasswordInput.value.trim() : "";
    
    if (encryptEnabledVal && !masterPasswordVal) {
      this.showMessage("Please set a Master Password to enable Encryption", "error");
      if (encryptEnabledCheckbox) encryptEnabledCheckbox.checked = false;
      return;
    }

    await chrome.storage.local.set({
      encryptionEnabled: encryptEnabledVal,
      masterPassword: masterPasswordVal
    });

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
          "This will merge the profiles from the backup with your current profiles. Existing profiles with the same ID will be overwritten. Continue?";

        if (confirm(confirmMessage)) {
          this.profiles = { ...this.profiles, ...backupData.profiles };
          this.hotkeys = { ...this.hotkeys, ...(backupData.hotkeys || {}) };
          this.settings = backupData.settings || {}; // Overwrite settings from backup

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
      const validation = UrlRuleMatcher.validateRule({
        type: ruleType,
        pattern: rulePattern,
      });
      if (!validation.valid && validation.reason === "regex") {
        this.showMessage(
          chrome.i18n.getMessage("invalidRegex") ||
            "Invalid regex pattern: " + validation.error.message,
          "error"
        );
        return;
      }

      const evaluation = UrlRuleMatcher.matchRule(testUrl, {
        type: ruleType,
        pattern: rulePattern,
        includePath,
        enabled: true,
      });
      const testedValue =
        evaluation.matchedValue || evaluation.candidates[0] || testUrl;
      const candidatesText = evaluation.candidates.join(" | ");

      const resultDiv = document.getElementById("testResult");
      if (resultDiv) {
        if (evaluation.matches) {
          resultDiv.innerHTML = `
            <div class="test-result success">
                  <div class="test-emoji">✅</div>
                  <div class="test-title">${
                    chrome.i18n.getMessage("urlMatches") ||
                    "URL matches the pattern!"
                  }</div>
              <div class="test-details">${
                chrome.i18n.getMessage("testedUrl") || "Tested:"
              } ${testedValue}</div>
              <div class="test-details">Candidates: ${candidatesText}</div>
            </div>
          `;
          resultDiv.className = "test-result success";
        } else {
          resultDiv.innerHTML = `
            <div class="test-result error">
              <div class="test-emoji">❌</div>
              <div class="test-title">${
                chrome.i18n.getMessage("urlDoesNotMatch") ||
                "URL does not match the pattern"
              }</div>
              <div class="test-details">${
                chrome.i18n.getMessage("testedUrl") || "Tested:"
              } ${testedValue}</div>
              <div class="test-details">Candidates: ${candidatesText}</div>
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

  // Focus trap helpers for modals
  enableModalFocus(modal) {
    if (!modal) return;
    // cleanup if already attached
    this.disableModalFocus(modal);

    modal._previouslyFocused = document.activeElement;

    const selector =
      'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(modal.querySelectorAll(selector)).filter(
      (el) => el.offsetParent !== null
    );
    modal._focusables = focusables;

    if (focusables.length > 0) {
      try {
        focusables[0].focus();
      } catch (e) {
        /* ignore */
      }
    }

    modal._focusHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeModal(modal.id);
        return;
      }

      if (e.key !== "Tab") return;

      const curr = document.activeElement;
      const idx = modal._focusables.indexOf(curr);
      if (e.shiftKey) {
        if (idx === 0 || curr === modal) {
          modal._focusables[modal._focusables.length - 1].focus();
          e.preventDefault();
        }
      } else {
        if (idx === modal._focusables.length - 1) {
          modal._focusables[0].focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", modal._focusHandler, true);
  }

  disableModalFocus(modal) {
    if (!modal) return;
    if (modal._focusHandler) {
      document.removeEventListener("keydown", modal._focusHandler, true);
      modal._focusHandler = null;
    }
    if (modal._previouslyFocused && modal._previouslyFocused.focus) {
      try {
        modal._previouslyFocused.focus();
      } catch (e) {}
    }
    modal._previouslyFocused = null;
    modal._focusables = null;
  }

  checkForCapturedFields() {
    console.log("Checking for captured fields...");
    chrome.storage.local.get(["capturedFields", "captureUrl"], async (data) => {
      if (data.capturedFields && data.capturedFields.length > 0) {
        console.log("Found captured fields:", data.capturedFields.length);
        
        const existingProfileIds = Object.keys(this.profiles);
        if (existingProfileIds.length > 0) {
          this.showCaptureActionSelector(data.capturedFields, data.captureUrl);
        } else {
          this.importCapturedFieldsToProfile(null, data.capturedFields, data.captureUrl);
        }
      } else {
        console.log("No captured fields found");
      }
    });
  }

  showCaptureActionSelector(capturedFields, captureUrl) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "captureActionSelectorModal";
    overlay.style.zIndex = "2000";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.maxWidth = "450px";
    modal.style.padding = "25px";

    let profileOptions = `<option value="new">-- Create New Profile --</option>`;
    Object.entries(this.profiles).forEach(([id, p]) => {
      profileOptions += `<option value="${id}">${p.name}</option>`;
    });

    modal.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 15px;">📸 Captured Form Fields</h2>
      <p style="font-size: 13px; color: #666; margin-bottom: 20px;">
        You have captured <strong>${capturedFields.length}</strong> fields from <code>${new URL(captureUrl).hostname}</code>. 
        Select where to save these fields:
      </p>
      <div class="form-group" style="margin-bottom: 25px;">
        <label for="captureTargetProfile" style="font-weight: 500; font-size: 13px; display: block; margin-bottom: 8px;">Target Profile:</label>
        <select id="captureTargetProfile" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; font-size: 14px;">
          ${profileOptions}
        </select>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="captureCancelBtn" class="secondary" style="padding: 8px 16px;">Discard</button>
        <button id="captureProceedBtn" class="primary" style="padding: 8px 16px;">Proceed</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("captureCancelBtn").onclick = () => {
      overlay.remove();
      chrome.storage.local.remove(["capturedFields", "captureUrl"]);
    };

    document.getElementById("captureProceedBtn").onclick = () => {
      const selected = document.getElementById("captureTargetProfile").value;
      overlay.remove();
      
      if (selected === "new") {
        this.importCapturedFieldsToProfile(null, capturedFields, captureUrl);
      } else {
        this.importCapturedFieldsToProfile(selected, capturedFields, captureUrl);
      }
      chrome.storage.local.remove(["capturedFields", "captureUrl"]);
    };
  }

  importCapturedFieldsToProfile(profileId, capturedFields, captureUrl) {
    try {
      const fieldsContainer = document.getElementById("fieldsContainer");
      if (fieldsContainer) {
        fieldsContainer.innerHTML = "";
      }

      if (profileId && this.profiles[profileId]) {
        const profile = this.profiles[profileId];
        this.openProfileModal(profileId);

        const merge = confirm(
          `Do you want to merge these captured fields with the existing fields of "${profile.name}"?\n\n` +
          `[OK] = Merge fields (updates matching fields, adds new ones)\n` +
          `[Cancel] = Overwrite entirely (deletes all current fields and uses only the captured ones)`
        );

        if (merge) {
          const existingFields = [...profile.fields];
          capturedFields.forEach(captured => {
            const index = existingFields.findIndex(f => f.name.toLowerCase() === captured.name.toLowerCase());
            if (index !== -1) {
              existingFields[index].value = captured.value;
              if (captured.cssSelector) existingFields[index].cssSelector = captured.cssSelector;
              if (captured.xpath) existingFields[index].xpath = captured.xpath;
            } else {
              existingFields.push(captured);
            }
          });

          if (fieldsContainer) {
            fieldsContainer.innerHTML = "";
            existingFields.forEach(f => this.addFieldRow(f));
          }
        } else {
          if (fieldsContainer) {
            fieldsContainer.innerHTML = "";
            capturedFields.forEach(f => this.addFieldRow(f));
          }
        }
      } else {
        this.openProfileModal(null);
        
        const siteName = new URL(captureUrl).hostname.replace("www.", "");
        const profileNameInput = document.getElementById("profileName");
        if (profileNameInput) {
          profileNameInput.value = `Profile from ${siteName}`;
        }

        capturedFields.forEach((field) => {
          this.addFieldRow({
            type: field.type,
            name: field.name,
            value: field.value,
            site: field.site,
            mode: field.mode,
            cssSelector: field.cssSelector,
            xpath: field.xpath
          });
        });
      }
    } catch (error) {
      console.error("Error importing captured fields:", error);
    }
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

    // Profile search input
    const profileSearchInput = document.getElementById("profileSearchInput");
    if (profileSearchInput) {
      profileSearchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderProfiles();
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

    const language = document.getElementById("language");
    if (language) {
      language.addEventListener("change", () => {
        this.saveSettings();
        chrome.runtime.sendMessage({ action: "reloadExtension" });
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

    const aboutDeveloperBtn = document.getElementById("aboutDeveloperBtn");
    if (aboutDeveloperBtn) {
      aboutDeveloperBtn.addEventListener("click", () => {
        window.location.href = "about.html";
      });
    }

    // PDF Import listeners
    const uploadPdfBtn = document.getElementById("uploadPdfBtn");
    const pdfFileInput = document.getElementById("pdfFileInput");
    const importProfileBtn = document.getElementById("importProfileBtn");
    const createDssTemplateBtn = document.getElementById("createDssTemplateBtn");
    const ocrSourceFileInput = document.getElementById("ocrSourceFileInput");
    const loadOcrSourceBtn = document.getElementById("loadOcrSourceBtn");
    const createFromOcrBtn = document.getElementById("createFromOcrBtn");

    if (uploadPdfBtn) {
      uploadPdfBtn.addEventListener("click", () => {
        this.handlePdfUpload();
      });
    }

    if (pdfFileInput) {
      pdfFileInput.addEventListener("change", (e) => {
        // Optional: auto-trigger on file select
        if (e.target.files.length > 0) {
          this.handlePdfUpload();
        }
      });
    }

    if (importProfileBtn) {
      importProfileBtn.addEventListener("click", () => {
        this.handleCreateProfileFromPdf();
      });
    }

    if (createDssTemplateBtn) {
      createDssTemplateBtn.addEventListener("click", () => {
        this.handleCreateDssTemplateProfile();
      });
    }

    if (loadOcrSourceBtn) {
      loadOcrSourceBtn.addEventListener("click", () => {
        this.handleLoadOcrSourceFile();
      });
    }

    if (ocrSourceFileInput) {
      ocrSourceFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleLoadOcrSourceFile();
        }
      });
    }

    if (createFromOcrBtn) {
      createFromOcrBtn.addEventListener("click", () => {
        this.handleCreateProfileFromOcr();
      });
    }

    // Passport Parser Listeners
    const parsePassportBtn = document.getElementById("parsePassportBtn");
    const passportFileInput = document.getElementById("passportFileInput");
    const passportDropZone = document.getElementById("passportDropZone");
    const createProfileFromPassportBtn = document.getElementById("createProfileFromPassportBtn");
    const clearPassportBtn = document.getElementById("clearPassportBtn");

    const toggleMrzMode = document.getElementById("toggleMrzMode");
    if (toggleMrzMode) {
      chrome.storage.local.get("passportMrzEnabled", (res) => {
        if (res && res.passportMrzEnabled !== undefined) {
          toggleMrzMode.checked = res.passportMrzEnabled;
        }
      });
      toggleMrzMode.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        chrome.storage.local.set({ passportMrzEnabled: isChecked });
        this.handlePassportTextParse();
      });
    }

    const copyAllPassportDataBtn = document.getElementById("copyAllPassportDataBtn");
    const copyPassportJsonBtn = document.getElementById("copyPassportJsonBtn");

    if (copyAllPassportDataBtn) {
      copyAllPassportDataBtn.addEventListener("click", () => {
        if (!this.currentPassportData) {
          this.showError("No passport data available to copy.");
          return;
        }
        const d = this.currentPassportData;
        const textToCopy = [
          d.passportNo ? `Passport Number: ${d.passportNo}` : "",
          d.fullName ? `Full Name: ${d.fullName}` : "",
          d.surname ? `Surname: ${d.surname}` : "",
          d.givenName ? `Given Name: ${d.givenName}` : "",
          d.fatherName ? `Father's Name: ${d.fatherName}` : "",
          d.motherName ? `Mother's Name: ${d.motherName}` : "",
          d.spouseName ? `Spouse's Name: ${d.spouseName}` : "",
          d.guardianName ? `Legal Guardian: ${d.guardianName}` : "",
          d.dob ? `Date of Birth: ${d.dob}` : "",
          d.gender ? `Gender / Sex: ${d.gender}` : "",
          d.issueDate ? `Date of Issue: ${d.issueDate}` : "",
          d.expiryDate ? `Date of Expiry: ${d.expiryDate}` : "",
          d.issuingAuthority ? `Issuing Authority: ${d.issuingAuthority}` : "",
          d.placeOfBirth ? `Place of Birth: ${d.placeOfBirth}` : "",
          d.nationalityName ? `Nationality: ${d.nationalityName}` : "",
          d.nidNo ? `NID / Personal No: ${d.nidNo}` : "",
          d.permanentAddress ? `Permanent Address: ${d.permanentAddress}` : "",
          d.emergencyContactName ? `Emergency Contact Name: ${d.emergencyContactName}` : "",
          d.emergencyRelationship ? `Relationship: ${d.emergencyRelationship}` : "",
          d.emergencyAddress ? `Emergency Contact Address: ${d.emergencyAddress}` : "",
          d.mobile ? `Emergency Phone / Mobile: ${d.mobile}` : "",
          d.prevPassportNo ? `Previous Passport No: ${d.prevPassportNo}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showMessage("📋 All organized passport data copied to clipboard!", "success", 4000);
        });
      });
    }

    if (copyPassportJsonBtn) {
      copyPassportJsonBtn.addEventListener("click", () => {
        if (!this.currentPassportData) {
          this.showError("No passport data available to copy.");
          return;
        }
        const jsonStr = JSON.stringify(this.currentPassportData, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
          this.showMessage("📄 Extracted passport data copied as JSON!", "success", 4000);
        });
      });
    }

    if (parsePassportBtn) {
      parsePassportBtn.addEventListener("click", () => {
        this.handlePassportTextParse();
      });
    }

    if (passportFileInput) {
      passportFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handlePassportFileUpload(e.target.files[0]);
        }
      });
    }

    if (passportDropZone) {
      passportDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        passportDropZone.style.borderColor = "#2563eb";
        passportDropZone.style.background = "#eff6ff";
      });
      passportDropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        passportDropZone.style.borderColor = "#cbd5e1";
        passportDropZone.style.background = "#f8fafc";
      });
      passportDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        passportDropZone.style.borderColor = "#cbd5e1";
        passportDropZone.style.background = "#f8fafc";
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handlePassportFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (createProfileFromPassportBtn) {
      createProfileFromPassportBtn.addEventListener("click", () => {
        this.handleCreateProfileFromPassport();
      });
    }

    if (clearPassportBtn) {
      clearPassportBtn.addEventListener("click", () => {
        const textInput = document.getElementById("passportTextInput");
        const fileName = document.getElementById("passportFileName");
        const preview = document.getElementById("passportPreview");
        const fileInput = document.getElementById("passportFileInput");
        if (textInput) textInput.value = "";
        if (fileName) fileName.textContent = "";
        if (fileInput) fileInput.value = "";
        if (preview) preview.style.display = "none";
        this.currentPassportData = null;
      });
    }

    // E2EE settings checkbox listener
    const encryptionEnabled = document.getElementById("encryptionEnabled");
    if (encryptionEnabled) {
      encryptionEnabled.addEventListener("change", function() {
        const item = document.getElementById("masterPasswordItem");
        if (item) {
          item.style.display = this.checked ? "block" : "none";
        }
      });
    }

    // Master Password save listener (blur)
    const masterPasswordInput = document.getElementById("masterPassword");
    if (masterPasswordInput) {
      masterPasswordInput.addEventListener("blur", () => {
        this.saveSettings();
      });
    }

    // Visual Capture button trigger
    const visualCaptureBtn = document.getElementById("visualCaptureBtn");
    if (visualCaptureBtn) {
      visualCaptureBtn.addEventListener("click", async () => {
        try {
          const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
          const targetTab = tabs.find(t => t.url && t.url.startsWith("http") && !t.url.includes(chrome.runtime.id));
          if (targetTab) {
            await chrome.tabs.update(targetTab.id, { active: true });
            await chrome.tabs.sendMessage(targetTab.id, { action: "startVisualCapture" });
            window.close();
          } else {
            this.showMessage("Please open a webpage tab first.", "error");
          }
        } catch (e) {
          this.showMessage("Failed to trigger visual capture: " + e.message, "error");
        }
      });
    }

    console.log("Event listeners setup completed");
  }

  // ============ PDF Import Methods ============

  async handlePdfUpload() {
    console.log("PDF upload handler triggered");

    const pdfFileInput = document.getElementById("pdfFileInput");
    const file = pdfFileInput.files[0];

    if (!file) {
      this.showError("Please select a PDF file");
      return;
    }

    // Validate file
    if (!pdfParser.isValidPDF(file)) {
      this.showError("Please select a valid PDF file");
      return;
    }

    const fileSizeMB = pdfParser.getFileSizeMB(file);
    if (fileSizeMB > 10) {
      this.showError(`File size too large (${fileSizeMB}MB). Maximum: 10MB`);
      return;
    }

    // Show loading state
    const uploadBtn = document.getElementById("uploadPdfBtn");
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = "⏳ Processing...";

    try {
      // Parse PDF
      const parseResult = await pdfParser.parsePDF(file);

      if (!parseResult.success) {
        throw new Error(parseResult.error || "Failed to parse PDF");
      }

      if (!Array.isArray(parseResult.fields) || parseResult.fields.length === 0) {
        throw new Error(
          "No fillable values were found in this PDF. Try a saved applicant copy, another filled Teletalk PDF, or use Create Teletalk Template."
        );
      }

      console.log("PDF parsed successfully:", parseResult);

      // Map fields
      const mappedData = teleTalkMapper.mapFields(parseResult.fields);
      console.log("Fields mapped:", mappedData);

      // Store for later use
      this.currentPdfData = mappedData;

      // Display preview
      this.displayPdfPreview(parseResult.fields, mappedData);

      // Show success message
      this.showMessage(
        `✅ PDF processed successfully! Found ${parseResult.fields.length} fields.`,
        "success"
      );
    } catch (error) {
      console.error("PDF processing error:", error);
      this.showError(`Error processing PDF: ${error.message}`);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
    }
  }

  displayPdfPreview(extractedFields, mappedData) {
    const previewDiv = document.getElementById("pdfPreview");
    const tbody = document.querySelector("#extractedFieldsTable tbody");
    const statsDiv = document.getElementById("extractionStats");
    const importBtn = document.getElementById("importProfileBtn");

    // Clear previous rows
    tbody.innerHTML = "";

    // Add field rows
    for (const field of extractedFields) {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #e0e0e0";
      row.innerHTML = `
        <td style="padding: 8px; word-break: break-word;">${this.escapeHtml(field.name)}</td>
        <td style="padding: 8px; word-break: break-word;">${this.escapeHtml(field.value.substring(0, 50))}</td>
      `;
      tbody.appendChild(row);
    }

    // Update stats
    const matchedCount = mappedData.matchedCount;
    const unmappedCount = mappedData.unmapped.length;
    statsDiv.innerHTML = `
      <strong>Extraction Results:</strong><br>
      ✅ Matched fields: ${matchedCount}<br>
      ⚠️ Unmapped fields: ${unmappedCount}<br>
      📊 Total fields: ${extractedFields.length}
    `;

    // Show preview and button
    previewDiv.style.display = "block";
    importBtn.style.display = "block";
  }

  async loadTeletalkPropertyDefinitions() {
    const response = await fetch(chrome.runtime.getURL("teletalk-dss-properties.json"));
    if (!response.ok) {
      throw new Error("Could not load Teletalk property definitions");
    }

    const data = await response.json();
    return Array.isArray(data.fields) ? data.fields : [];
  }

  async handleLoadOcrSourceFile() {
    const input = document.getElementById("ocrSourceFileInput");
    const textarea = document.getElementById("ocrTextInput");
    const file = input && input.files ? input.files[0] : null;

    if (!file) {
      this.showError("Please choose a file (Image, TXT, or HTML) first");
      return;
    }

    try {
      const extractedText = await ocrParser.extractTextFromFile(file);
      textarea.value = extractedText.trim();
      this.showMessage(`Loaded OCR/text source from "${file.name}"`, "success");
    } catch (error) {
      console.error("Error loading OCR source file:", error);
      this.showError(`Error loading OCR source: ${error.message}`);
    }
  }

  async handleCreateProfileFromPdf() {
    if (!this.currentPdfData) {
      this.showError("Please upload a PDF first");
      return;
    }

    try {
      // Create profile from mapped data
      const profile = teleTalkMapper.createProfile(this.currentPdfData);

      // Get existing profiles
      const data = await chrome.storage.local.get("profiles");
      const profiles = data.profiles || {};

      // Add new profile
      profiles[profile.id] = profile;

      // Save to storage
      await chrome.storage.local.set({ profiles });

      console.log("Profile created from PDF:", profile);

      // Clear input
      document.getElementById("pdfFileInput").value = "";
      document.getElementById("pdfPreview").style.display = "none";
      document.getElementById("importProfileBtn").style.display = "none";
      this.currentPdfData = null;

      // Show success
      this.showMessage(
        `✅ Profile "${profile.name}" created successfully from PDF!`,
        "success"
      );

      // Reload profiles
      this.loadAllData();
    } catch (error) {
      console.error("Error creating profile from PDF:", error);
      this.showError(`Error creating profile: ${error.message}`);
    }
  }

  async handleCreateDssTemplateProfile() {
    try {
      const propertyDefinitions = await this.loadTeletalkPropertyDefinitions();
      if (propertyDefinitions.length === 0) {
        throw new Error("No Teletalk field properties were found");
      }

      const profile = teleTalkMapper.createTemplateProfile(
        propertyDefinitions,
        "Teletalk Template"
      );

      const data = await chrome.storage.local.get("profiles");
      const profiles = data.profiles || {};
      profiles[profile.id] = profile;

      await chrome.storage.local.set({ profiles });
      await this.loadAllData();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();

      this.showMessage(
        'Template profile "Teletalk Template" created. Edit the field values before using autofill.',
        "success",
        5000
      );
    } catch (error) {
      console.error("Error creating DSS template profile:", error);
      this.showError(`Error creating Teletalk template: ${error.message}`);
    }
  }

  async handleCreateProfileFromOcr() {
    const textarea = document.getElementById("ocrTextInput");
    const sourceText = textarea ? textarea.value : "";

    if (!sourceText || !sourceText.trim()) {
      this.showError("Please paste OCR text or load a TXT/HTML source first");
      return;
    }

    try {
      const propertyDefinitions = await this.loadTeletalkPropertyDefinitions();
      const ocrResult = ocrParser.parseText(
        sourceText,
        teleTalkMapper,
        propertyDefinitions
      );

      if (!ocrResult.success || !ocrResult.fields.length) {
        throw new Error(
          ocrResult.error ||
            "Could not detect Teletalk fields from the OCR text"
        );
      }

      const mappedData = teleTalkMapper.mapFields(ocrResult.fields);
      const profile = teleTalkMapper.createProfile(mappedData);

      const data = await chrome.storage.local.get("profiles");
      const profiles = data.profiles || {};
      profiles[profile.id] = profile;

      await chrome.storage.local.set({ profiles });
      await this.loadAllData();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();

      this.showMessage(
        `OCR/Text profile created with ${ocrResult.fields.length} detected values.`,
        "success",
        5000
      );
    } catch (error) {
      console.error("Error creating OCR/text profile:", error);
      this.showError(`Error creating OCR/Text profile: ${error.message}`);
    }
  }

  // ============ Passport Parser Methods ============

  async handlePassportFileUpload(file) {
    if (!file) return;

    const fileNameEl = document.getElementById("passportFileName");
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|tiff?)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isTxt = file.name.toLowerCase().endsWith(".txt");

    if (fileNameEl) {
      fileNameEl.innerHTML = `Selected File: <strong>${this.escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }

    const textarea = document.getElementById("passportTextInput");

    // Helper: sanitize text - remove binary garbage, keep only printable chars
    const sanitizeOcrText = (raw) => {
      if (!raw) return "";
      // Remove ALL characters outside basic ASCII printable + Bengali Unicode
      let cleaned = "";
      for (let i = 0; i < raw.length; i++) {
        const code = raw.charCodeAt(i);
        if (
          (code >= 0x20 && code <= 0x7E) ||
          (code >= 0x0980 && code <= 0x09FF) ||
          code === 0x0A || code === 0x0D || code === 0x09
        ) {
          cleaned += raw[i];
        }
      }
      return cleaned.trim();
    };

    try {
      // === IMAGE FILES ===
      if (isImage) {
        // Show thumbnail preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (fileNameEl) {
            fileNameEl.innerHTML = `
              <div style="margin-top: 10px;">
                <img src="${e.target.result}" style="max-height: 140px; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" alt="Passport Preview" /><br/>
                <span style="color: #059669; font-weight: 600;">📸 Image Loaded: ${this.escapeHtml(file.name)}</span>
              </div>
            `;
          }
        };
        reader.readAsDataURL(file);

        this.showMessage(`🔍 Running OCR scan on passport image "${file.name}"...`, "info", 4000);

        const ocrRes = await ocrParser.performImageOCR(file);
        const cleanText = sanitizeOcrText(ocrRes ? ocrRes.text : "");

        if (cleanText) {
          if (textarea) textarea.value = cleanText;
          const testResult = passportParser.parseText(cleanText);
          if (testResult && testResult.success) {
            this.handlePassportTextParse();
            this.showMessage(`✅ Image "${file.name}" scanned and parsed successfully!`, "success", 4000);
          } else {
            // Text extracted but partial parsing - attempt parse anyway and inform user
            this.handlePassportTextParse();
            if (!this.currentPassportData || !this.currentPassportData.passportNo) {
              this.showMessage(
                `📸 Image "${file.name}" loaded! Text extracted into the box below. Please review or complete any missing details and click "Extract Organized OCR Data".`,
                "info",
                8000
              );
            }
          }
        } else {
          this.showMessage(
            `📸 Image "${file.name}" loaded! Please check image clarity or manually paste passport details into the box below.`,
            "info",
            10000
          );
        }
        return;
      }

      // === PDF FILES ===
      if (isPdf) {
        this.showMessage(`📄 Processing PDF passport file "${file.name}"...`, "info", 4000);
        let text = "";
        try {
          const pdfResult = await pdfParser.parsePDF(file);
          if (pdfResult && pdfResult.fields && pdfResult.fields.length > 0) {
            text = pdfResult.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
          }

          if (!text.trim() && pdfParser.extractTextFromPDF) {
            text = await pdfParser.extractTextFromPDF(file);
          }
        } catch (pErr) {
          console.warn("Direct PDF text parse failed, attempting image OCR:", pErr);
        }

        let cleanText = sanitizeOcrText(text);

        // If no plain text in PDF (or scanned PDF), extract embedded image & perform OCR
        if (!cleanText && pdfParser.extractImagesFromPDF) {
          this.showMessage(`🔍 PDF text is scanned image. Running OCR on "${file.name}"...`, "info", 4000);
          const pdfImages = await pdfParser.extractImagesFromPDF(file);
          if (pdfImages && pdfImages.length > 0) {
            const ocrRes = await ocrParser.performImageOCR(pdfImages[0]);
            cleanText = sanitizeOcrText(ocrRes ? ocrRes.text : "");
          }
        }

        if (cleanText) {
          if (textarea) textarea.value = cleanText;
          this.handlePassportTextParse();
          this.showMessage(`✅ PDF "${file.name}" scanned and parsed successfully!`, "success", 4000);
        } else {
          this.showMessage(
            `📄 PDF "${file.name}" loaded! If details do not auto-fill, please type/paste passport text into the box below.`,
            "info",
            8000
          );
        }
        return;
      }

      // === PLAIN TEXT FILES (.txt) ===
      if (isTxt) {
        const rawText = await file.text();
        const cleanText = sanitizeOcrText(rawText);
        if (textarea && cleanText) {
          textarea.value = cleanText;
          this.handlePassportTextParse();
        } else {
          this.showMessage(
            `📄 File "${file.name}" loaded but no readable text found. Please paste passport text into the box.`,
            "info",
            5000
          );
        }
        return;
      }

      // === UNKNOWN FILE TYPE: Try as image OCR ===
      this.showMessage(`🔍 Attempting OCR scan on "${file.name}"...`, "info", 4000);
      const ocrRes = await ocrParser.performImageOCR(file);
      const cleanText = sanitizeOcrText(ocrRes ? ocrRes.text : "");
      if (cleanText) {
        if (textarea) textarea.value = cleanText;
        this.handlePassportTextParse();
        this.showMessage(`✅ "${file.name}" scanned and parsed successfully!`, "success", 4000);
      } else {
        this.showMessage(
          `⚠️ Could not extract text from "${file.name}". Please paste passport text details into the box below.`,
          "info",
          7000
        );
      }
    } catch (err) {
      console.error("Passport file handling error:", err);
      // Fallback: try extracting embedded JPEG image if direct PDF parse threw
      if (isPdf && pdfParser.extractImagesFromPDF) {
        try {
          const pdfImages = await pdfParser.extractImagesFromPDF(file);
          if (pdfImages && pdfImages.length > 0) {
            const ocrRes = await ocrParser.performImageOCR(pdfImages[0]);
            const cleanText = sanitizeOcrText(ocrRes ? ocrRes.text : "");
            if (cleanText) {
              if (textarea) textarea.value = cleanText;
              this.handlePassportTextParse();
              this.showMessage(`✅ PDF "${file.name}" scanned via OCR!`, "success", 4000);
              return;
            }
          }
        } catch (fallbackErr) {
          console.error("Fallback PDF image OCR error:", fallbackErr);
        }
      }

      this.showMessage(
        `📄 PDF "${file.name}" loaded! Please paste passport text into the box below if fields do not auto-fill.`,
        "info",
        7000
      );
    }
  }

  handlePassportTextParse() {
    const textarea = document.getElementById("passportTextInput");
    const text = textarea ? textarea.value : "";

    if (!text || !text.trim()) {
      this.showMessage(
        "Please paste passport OCR scanned text or key-value details into the box below.",
        "error"
      );
      return;
    }

    let result = null;
    try {
      const pParser = new PassportParser();
      result = pParser.parseText(text);
    } catch (err) {
      console.error("passportParser.parseText error:", err);
    }

    if (!result || !result.success || !result.data) {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const pNoMatch = text.match(/([A-Z]\d{7,8}|\b[A-Z0-9]{8,9}\b)/i);
      const fallbackData = {
        documentType: "Passport (Extracted Text)",
        passportNo: pNoMatch ? pNoMatch[1].toUpperCase() : "",
        fullName: lines[0] || "Extracted Passport Data",
        surname: lines[0] ? lines[0].split(/\s+/)[0] : "",
        givenName: lines[0] ? lines[0].split(/\s+/).slice(1).join(" ") : "",
        nationality: "BGD",
        nationalityName: "Bangladesh",
      };

      result = {
        success: true,
        type: "VISUAL_ZONE",
        isValidChecksum: false,
        data: fallbackData,
      };
    }

    this.currentPassportData = result.data;
    this.displayPassportPreview(result);
    this.showMessage("✅ Passport information extracted successfully!", "success");
  }

  displayPassportPreview(result) {
    const previewDiv = document.getElementById("passportPreview");
    const cardsGrid = document.getElementById("passportCardsGrid");
    const tbody = document.getElementById("passportFieldsTableBody");
    const badge = document.getElementById("mrzChecksumBadge");

    if (!previewDiv || !cardsGrid || !tbody) return;

    const data = result.data || {};

    if (badge) {
      if (result.type && result.type.includes("MRZ")) {
        if (result.isValidChecksum) {
          badge.className = "status-badge enabled";
          badge.textContent = "✅ MRZ Verified (Checksum Valid)";
          badge.style.background = "#dcfce7";
          badge.style.color = "#15803d";
        } else {
          badge.className = "status-badge enabled";
          badge.textContent = "⚠️ MRZ Recovered (OCR Auto-Corrected)";
          badge.style.background = "#fef3c7";
          badge.style.color = "#92400e";
        }
      } else {
        badge.className = "status-badge enabled";
        badge.textContent = "📄 Visual OCR Extracted";
        badge.style.background = "#dcfce7";
        badge.style.color = "#15803d";
      }
    }

    cardsGrid.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <small style="color: #64748b; font-size: 11px;">PASSPORT NUMBER</small>
        <div style="font-weight: 700; font-size: 16px; color: #1e293b;">${this.escapeHtml(data.passportNo || "N/A")}</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <small style="color: #64748b; font-size: 11px;">FULL NAME</small>
        <div style="font-weight: 700; font-size: 16px; color: #1e293b;">${this.escapeHtml(data.fullName || "N/A")}</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <small style="color: #64748b; font-size: 11px;">DATE OF BIRTH</small>
        <div style="font-weight: 700; font-size: 16px; color: #1e293b;">${this.escapeHtml(data.dob || "N/A")}</div>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <small style="color: #64748b; font-size: 11px;">NATIONALITY / COUNTRY</small>
        <div style="font-weight: 700; font-size: 16px; color: #1e293b;">${this.escapeHtml(data.nationalityName || data.nationality || "N/A")}</div>
      </div>
    `;

    const tableRows = [
      { label: "Passport Number", val: data.passportNo || "", key: "passport_no / Passport No" },
      { label: "Full Name", val: data.fullName || "", key: "name / Full Name" },
      { label: "Surname", val: data.surname || "", key: "surname / Last Name" },
      { label: "Given Name", val: data.givenName || "", key: "given_name / First Name" },
      { label: "Father's Name", val: data.fatherName || "", key: "father / Father's Name" },
      { label: "Mother's Name", val: data.motherName || "", key: "mother / Mother's Name" },
      { label: "Spouse's Name", val: data.spouseName || "", key: "spouse_name / Spouse Name" },
      { label: "Legal Guardian", val: data.guardianName || "", key: "guardian / Guardian Name" },
      { label: "Date of Birth", val: data.dob || "", key: "dob / Date of Birth" },
      { label: "Place of Birth", val: data.placeOfBirth || "", key: "place_of_birth" },
      { label: "Gender / Sex", val: data.gender || "", key: "gender / Sex" },
      { label: "Date of Issue", val: data.issueDate || "", key: "passport_issue / Issue Date" },
      { label: "Expiry Date", val: data.expiryDate || "", key: "passport_expiry / Expiry Date" },
      { label: "Issuing Authority", val: data.issuingAuthority || "", key: "issuing_authority" },
      { label: "Nationality", val: data.nationalityName || data.nationality || "", key: "nationality / Country" },
      { label: "NID / Personal No", val: data.nidNo || "", key: "nid_no / National ID" },
      { label: "Permanent Address", val: data.permanentAddress || "", key: "permanent_village / Address" },
      { label: "Emergency Contact Name", val: data.emergencyContactName || "", key: "emergency_contact_name" },
      { label: "Relationship", val: data.emergencyRelationship || "", key: "emergency_relationship" },
      { label: "Emergency Contact Address", val: data.emergencyAddress || "", key: "emergency_address" },
      { label: "Emergency Phone", val: data.mobile || "", key: "mobile / Phone" },
      { label: "Previous Passport No", val: data.prevPassportNo || "", key: "prev_passport_no" },
    ];

    tbody.innerHTML = tableRows
      .map(
        (r) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; font-weight: 600; width: 30%; color: #334155;">${this.escapeHtml(r.label)}</td>
        <td style="padding: 10px; width: 45%;">
          ${
            r.val
              ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                   <span style="color: #2563eb; font-weight: 600;">${this.escapeHtml(r.val)}</span>
                   <button class="copy-passport-field-btn" data-val="${this.escapeHtml(r.val)}" style="padding: 2px 8px; font-size: 11px; cursor: pointer; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px; color: #475569; white-space: nowrap;" title="Copy field value">📋 Copy</button>
                 </div>`
              : `<span style="color: #94a3b8; font-style: italic;">Not Detected / N/A</span>`
          }
        </td>
        <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #64748b; width: 25%;">${this.escapeHtml(r.key)}</td>
      </tr>
    `
      )
      .join("");

    // Bind per-field copy buttons
    const fieldBtns = tbody.querySelectorAll(".copy-passport-field-btn");
    fieldBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const valToCopy = e.target.getAttribute("data-val");
        if (valToCopy) {
          navigator.clipboard.writeText(valToCopy).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = "✅ Copied!";
            e.target.style.background = "#dcfce7";
            e.target.style.color = "#15803d";
            setTimeout(() => {
              e.target.textContent = originalText;
              e.target.style.background = "#f8fafc";
              e.target.style.color = "#475569";
            }, 2000);
          });
        }
      });
    });

    previewDiv.style.display = "block";
    try {
      previewDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }

  async handleCreateProfileFromPassport() {
    if (!this.currentPassportData) {
      this.showError("Please parse passport data first");
      return;
    }

    try {
      const profile = teleTalkMapper.createPassportProfile(this.currentPassportData);

      const data = await chrome.storage.local.get("profiles");
      const profiles = data.profiles || {};
      profiles[profile.id] = profile;

      await chrome.storage.local.set({ profiles });
      await this.loadAllData();
      this.renderProfiles();
      this.renderHotkeyConfig();
      this.renderUrlRulesOverview();

      this.showMessage(
        `✅ Profile "${profile.name}" created successfully from Passport data!`,
        "success",
        5000
      );
    } catch (error) {
      console.error("Error creating profile from Passport:", error);
      this.showError(`Error creating profile: ${error.message}`);
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ Cloud Sync Methods ============

  async setupCloudSyncUI() {
    console.log("Setting up cloud sync UI...");

    const syncSettings = await new Promise((resolve) => {
      chrome.storage.local.get(['syncEnabled', 'autoSyncEnabled'], (result) => resolve(result));
    });

    const enableCloudSyncCheckbox = document.getElementById('enableCloudSync');
    const autoSyncCheckbox = document.getElementById('autoSyncOnChange');

    if (enableCloudSyncCheckbox && syncSettings.syncEnabled !== undefined) {
      enableCloudSyncCheckbox.checked = syncSettings.syncEnabled;
    }
    if (autoSyncCheckbox && syncSettings.autoSyncEnabled !== undefined) {
      autoSyncCheckbox.checked = syncSettings.autoSyncEnabled;
    }

    if (typeof firebaseAuth !== 'undefined') {
      // Listen for auth state changes
      firebaseAuth.onAuthStateChange(() => {
        this.updateSyncStatus();
      });

      // Listen for storage changes so the UI updates when login happens in another tab
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.user) {
          this.updateSyncStatus();
        }
      });

      // Refresh status when the page becomes active again
      window.addEventListener('focus', () => {
        this.updateSyncStatus();
      });
      
      // Update status on load
      this.updateSyncStatus();
      
      // Set up event listeners
      this.setupCloudSyncEventListeners();
    } else {
      console.warn("Firebase not available for cloud sync");
    }
  }

  async updateSyncStatus() {
    console.log("Updating sync status...");
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(['user'], (result) => resolve(result));
    });
    const user = storageData?.user || firebaseAuth?.getCurrentUser();
    const userInfoDiv = document.getElementById('syncUserInfo');
    const notLoggedInDiv = document.getElementById('syncNotLoggedIn');
    const loginBtn = document.getElementById('syncLoginBtn');
    const logoutBtn = document.getElementById('syncLogoutBtn');
    const settingsBox = document.getElementById('syncSettingsBox');
    const userEmailSpan = document.getElementById('syncUserEmail');

    const enableCloudSyncCheckbox = document.getElementById('enableCloudSync');
    const autoSyncCheckbox = document.getElementById('autoSyncOnChange');

    if (user) {
      // User is logged in
      if (userInfoDiv) userInfoDiv.style.display = 'block';
      if (notLoggedInDiv) notLoggedInDiv.style.display = 'none';
      if (userEmailSpan) userEmailSpan.textContent = user.email || '';
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (settingsBox) settingsBox.style.display = 'block';
      if (enableCloudSyncCheckbox && firebaseSync) {
        enableCloudSyncCheckbox.checked = firebaseSync.isSyncEnabled;
      }
      if (autoSyncCheckbox && firebaseSync) {
        autoSyncCheckbox.checked = firebaseSync.getAutoSyncEnabled();
      }

      // Update last sync time
      if (firebaseSync && typeof firebaseSync !== 'undefined') {
        const lastSyncTime = firebaseSync.getLastSyncTime();
        const lastSyncDiv = document.getElementById('lastSyncTime');
        if (lastSyncDiv) {
          if (lastSyncTime) {
            const syncDate = new Date(lastSyncTime);
            lastSyncDiv.textContent = `Last sync: ${syncDate.toLocaleString()}`;
          } else {
            lastSyncDiv.textContent = 'Last sync: Never';
          }
        }
      }
    } else {
      // User is not logged in
      if (userInfoDiv) userInfoDiv.style.display = 'none';
      if (notLoggedInDiv) notLoggedInDiv.style.display = 'block';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (settingsBox) settingsBox.style.display = 'none';
      if (enableCloudSyncCheckbox && firebaseSync) {
        enableCloudSyncCheckbox.checked = firebaseSync.isSyncEnabled;
      }
    }
  }

  setupCloudSyncEventListeners() {
    console.log("Setting up cloud sync event listeners...");
    
    const loginBtn = document.getElementById('syncLoginBtn');
    const logoutBtn = document.getElementById('syncLogoutBtn');
    const syncNowBtn = document.getElementById('syncNowBtn');
    const syncPullBtn = document.getElementById('syncPullBtn');
    const enableCloudSyncCheckbox = document.getElementById('enableCloudSync');
    const autoSyncCheckbox = document.getElementById('autoSyncOnChange');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleSyncLogin());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleSyncLogout());
    }

    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', () => this.handleSyncNow());
    }

    if (syncPullBtn) {
      syncPullBtn.addEventListener('click', () => this.handlePullFromCloud());
    }

    if (enableCloudSyncCheckbox) {
      enableCloudSyncCheckbox.addEventListener('change', async (e) => {
        if (e.target.checked) {
          if (firebaseSync) {
            await firebaseSync.enableSync();
            this.showMessage('Cloud sync enabled');
          }
        } else {
          if (firebaseSync) {
            await firebaseSync.disableSync();
            this.showMessage('Cloud sync disabled');
          }
        }
      });
    }

    if (autoSyncCheckbox) {
      autoSyncCheckbox.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if (firebaseSync) {
          await firebaseSync.setAutoSyncEnabled(enabled);
        }
        this.showMessage(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
      });
    }
  }

  handleSyncLogin() {
    console.log("Opening login page...");
    if (!firebaseAuth) {
      this.showMessage('Firebase not configured. Please setup Firebase first.', 'error');
      return;
    }
    
    // Open login page in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('login.html'),
      active: true
    });
  }

  handleSyncLogout() {
    console.log("Logging out...");
    if (!firebaseAuth) return;
    
    if (confirm('Are you sure you want to logout from cloud sync?')) {
      firebaseAuth.logout();
      if (firebaseSync) {
        firebaseSync.disableSync();
        firebaseSync.stopAutoSync();
      }
      this.updateSyncStatus();
      this.showMessage('Logged out from cloud sync');
    }
  }

  async handleSyncNow() {
    console.log("Manual sync triggered...");
    if (!firebaseSync) {
      this.showMessage('Cloud sync not available', 'error');
      return;
    }

    const btn = document.getElementById('syncNowBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🔄 Syncing...';
    }

    try {
      const result = await firebaseSync.syncToCloud();
      if (result.success) {
        this.showMessage('✅ Data synced successfully to cloud');
        this.updateSyncStatus();
      } else {
        this.showMessage('❌ Sync failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showMessage('❌ Sync error: ' + error.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Sync Now';
      }
    }
  }

  async handlePullFromCloud() {
    console.log("Pulling data from cloud...");
    if (!firebaseSync) {
      this.showMessage('Cloud sync not available', 'error');
      return;
    }

    if (!confirm('This will download profiles from cloud and overwrite local data. Continue?')) {
      return;
    }

    const btn = document.getElementById('syncPullBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⬇️ Downloading...';
    }

    try {
      const result = await firebaseSync.syncFromCloud();
      if (result.success) {
        this.showMessage('✅ Data downloaded successfully from cloud');
        // Reload the page to show updated data
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        this.showMessage('❌ Download failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showMessage('❌ Download error: ' + error.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⬇️ Download from Cloud';
      }
    }
  }
}

// Initialize options page with error handling
document.addEventListener("DOMContentLoaded", () => {
  console.log("Options page DOM loaded");

  // Check if we're running in extension context
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.error("Not running in extension context!");
    document.body.innerHTML = `
      <div class="empty-center">
        <h2 class="empty-title" style="color: #ea4335;">⚠️ Extension Context Required</h2>
        <p>This page must be opened from the AutoFill Pro extension.</p>
        <p>Please open the extension popup and navigate to Options from there.</p>
        <button onclick="location.reload()" class="btn btn-primary">
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
    errorDiv.className = "error-panel";
    errorDiv.innerHTML = `
      <h3 style="margin-top: 0;">Initialization Error</h3>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Stack:</strong> ${error.stack}</p>
      <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 10px;">
        Reload Page
      </button>
      <button onclick="chrome.runtime.reload()" class="btn btn-success" style="margin-top: 10px; margin-left: 10px;">
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
