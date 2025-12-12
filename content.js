class AutoFillEngine {
  constructor() {
    this.profiles = {};
    this.hotkeys = {};
    this.settings = {};
    this.activeProfileId = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupMessageListener();
    this.setupHotkeyListener();
    this.setupStorageListener();
    this.setupUrlChangeListener();
  }

  async loadData() {
    const data = await chrome.storage.local.get([
      "profiles",
      "hotkeys",
      "settings",
      "activeProfile",
    ]);
    this.profiles = data.profiles || {};
    this.hotkeys = data.hotkeys || {};
    this.settings = data.settings || {};
    this.activeProfileId = data.activeProfile || null;

    // Auto-select profile based on URL if setting is enabled
    if (this.settings.autoSwitchProfile) {
      await this.autoSelectProfileByUrl();
    }
  }

  async autoSelectProfileByUrl() {
    const currentUrl = window.location.href;
    if (!currentUrl || currentUrl === "about:blank") return;

    const url = new URL(currentUrl);
    const hostname = url.hostname;
    const pathname = url.pathname;

    // Find profiles that match current URL
    const matchingProfiles = Object.values(this.profiles).filter((profile) => {
      if (!profile.urlRules || profile.urlRules.length === 0) return false;

      return profile.urlRules.some((rule) => {
        if (!rule.enabled) return false;

        try {
          const urlToTest = rule.includePath ? hostname + pathname : hostname;

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
          console.error("Error matching URL rule:", e);
          return false;
        }
      });
    });

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
        await chrome.storage.local.set({ activeProfile: this.activeProfileId });

        console.log(
          `Auto-switched to profile: ${this.profiles[newActiveProfileId]?.name}`
        );
      }
    }
  }

  setupUrlChangeListener() {
    // Listen for URL changes (for single page applications)
    let lastUrl = location.href;

    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        if (this.settings.autoSwitchProfile) {
          this.autoSelectProfileByUrl();
        }
      }
    }).observe(document, { subtree: true, childList: true });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case "fillForm":
          this.fillForm(request.profileId).then(sendResponse);
          return true;
        case "quickFill":
          this.fillForm().then(sendResponse);
          return true;
        case "captureForm":
          const result = this.captureForm();
          sendResponse(result);
          return true;
        case "getStatus":
          sendResponse({
            hasProfiles: Object.keys(this.profiles).length > 0,
            activeProfile: this.activeProfileId,
            hotkeysCount: Object.keys(this.hotkeys).length,
          });
          return true;
      }
    });
  }

  setupHotkeyListener() {
    document.addEventListener("keydown", (e) => {
      // Don't trigger if user is typing
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      // Don't trigger if hotkeys are disabled
      if (this.settings.enableHotkeys === false) return;

      // Check for profile hotkeys
      Object.entries(this.hotkeys).forEach(([profileId, hotkey]) => {
        if (this.matchesHotkey(e, hotkey)) {
          e.preventDefault();
          e.stopPropagation();

          const profile = this.profiles[profileId];
          if (!profile) return;

          if (this.settings.confirmOverwrite !== false) {
            if (confirm(`Fill form with "${profile.name}" profile?`)) {
              this.fillForm(profileId);
            }
          } else {
            this.fillForm(profileId);
          }
          return;
        }
      });

      // Global hotkeys
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "f": // Ctrl+Shift+F - Fill active profile
            e.preventDefault();
            if (this.activeProfileId) {
              this.fillForm();
            }
            break;

          case "c": // Ctrl+Shift+C - Capture form
            e.preventDefault();
            const result = this.captureForm();
            if (result.success) {
              alert(`Captured ${result.count} form fields!`);
            }
            break;
        }
      }
    });
  }

  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        if (changes.profiles) {
          this.profiles = changes.profiles.newValue || {};
        }
        if (changes.hotkeys) {
          this.hotkeys = changes.hotkeys.newValue || {};
        }
        if (changes.settings) {
          this.settings = changes.settings.newValue || {};
        }
        if (changes.activeProfile) {
          this.activeProfileId = changes.activeProfile.newValue;
        }
      }
    });
  }

  matchesHotkey(event, hotkey) {
    return (
      event.ctrlKey === hotkey.ctrlKey &&
      event.shiftKey === hotkey.shiftKey &&
      event.altKey === hotkey.altKey &&
      event.key.toLowerCase() === hotkey.key.toLowerCase()
    );
  }

  async fillForm(profileId = null) {
    const targetProfileId = profileId || this.activeProfileId;

    if (!targetProfileId) {
      return { success: false, error: "No profile selected" };
    }

    const profile = this.profiles[targetProfileId];
    if (!profile || !profile.fields) {
      return { success: false, error: "Profile not found" };
    }

    const currentUrl = window.location.hostname;
    let filledCount = 0;

    profile.fields.forEach((field) => {
      // Check site restriction (old method)
      if (field.site && field.site.trim() !== "") {
        if (!currentUrl.includes(field.site)) {
          return;
        }
      }

      const elements = this.findFormElements(field);
      elements.forEach((element) => {
        if (this.fillElement(element, field, profile.defaultMode)) {
          filledCount++;

          // Trigger events
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    return { success: true, filledCount, profileName: profile.name };
  }

  captureForm() {
    const formFields = [];
    const seenFields = new Set();

    const formElements = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
        "textarea, select"
    );

    formElements.forEach((element) => {
      if (element.offsetParent === null) return;

      const name = element.name || element.id || element.placeholder || "";
      if (!name || seenFields.has(name.toLowerCase())) return;

      let value = "";
      let type = "text";

      switch (element.type) {
        case "checkbox":
        case "radio":
          type = element.type;
          value = element.checked ? "true" : "false";
          break;
        case "select-one":
          type = "select";
          value = element.options[element.selectedIndex]?.text || "";
          break;
        default:
          value = element.value || "";
          type = element.type || "text";
      }

      if (!value.trim() && !element.placeholder) return;

      let regexName = name;
      if (name.includes(" ")) {
        regexName = name.toLowerCase().replace(/\s+/g, "[-_\\s]*");
      }

      formFields.push({
        name: `^${regexName}$`,
        value: value,
        type: type,
        site: window.location.hostname,
        mode: "overwrite",
        originalName: name,
      });

      seenFields.add(name.toLowerCase());
    });

    return {
      success: true,
      fields: formFields,
      count: formFields.length,
      url: window.location.href,
    };
  }

  findFormElements(field) {
    const elements = [];

    if (field.name) {
      try {
        const nameRegex = new RegExp(field.name, "i");

        document.querySelectorAll("[name]").forEach((el) => {
          if (nameRegex.test(el.name)) elements.push(el);
        });

        document.querySelectorAll("[id]").forEach((el) => {
          if (nameRegex.test(el.id)) elements.push(el);
        });

        document.querySelectorAll("[placeholder]").forEach((el) => {
          if (nameRegex.test(el.placeholder)) elements.push(el);
        });

        document.querySelectorAll("[aria-label]").forEach((el) => {
          if (nameRegex.test(el.getAttribute("aria-label"))) elements.push(el);
        });
      } catch (e) {
        console.error("Invalid regex:", field.name);
      }
    }

    if (elements.length === 0 && field.name) {
      const commonNames = [
        field.name.toLowerCase(),
        field.name.replace(/\$/g, "").toLowerCase(),
      ];

      commonNames.forEach((name) => {
        document
          .querySelectorAll(`[name="${name}" i]`)
          .forEach((el) => elements.push(el));
        document
          .querySelectorAll(`[id="${name}" i]`)
          .forEach((el) => elements.push(el));
      });
    }

    return elements;
  }

  fillElement(element, field, defaultMode = "overwrite") {
    const value = field.value;
    const mode = field.mode || defaultMode || "overwrite";

    try {
      switch (element.type) {
        case "text":
        case "email":
        case "tel":
        case "url":
        case "search":
        case "password":
        case "number":
        case "textarea":
          if (mode === "overwrite" || !element.value) {
            element.value = value;
          } else if (mode === "append") {
            element.value = element.value + value;
          } else if (mode === "prepend") {
            element.value = value + element.value;
          } else if (mode === "smart") {
            if (!element.value.trim()) {
              element.value = value;
            }
          }
          return true;

        case "checkbox":
        case "radio":
          if (
            value.toLowerCase() === "true" ||
            value === "1" ||
            value === "checked"
          ) {
            element.checked = true;
            return true;
          } else if (value.toLowerCase() === "false" || value === "0") {
            element.checked = false;
            return true;
          }
          break;

        case "select-one":
          for (let i = 0; i < element.options.length; i++) {
            if (
              element.options[i].text
                .toLowerCase()
                .includes(value.toLowerCase()) ||
              element.options[i].value
                .toLowerCase()
                .includes(value.toLowerCase())
            ) {
              element.selectedIndex = i;
              return true;
            }
          }
          break;
      }
    } catch (e) {
      console.error("Error filling element:", e);
    }

    return false;
  }
}

// Initialize auto-fill engine
const autoFillEngine = new AutoFillEngine();

// Export for debugging
window.autoFillEngine = autoFillEngine;
