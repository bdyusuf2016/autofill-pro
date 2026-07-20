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
    if (window.location.hostname.includes("teletalk.com.bd")) {
      this.handleTeletalkEnhancements();
    }
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

    const match = UrlRuleMatcher.findBestMatchingProfile(
      Object.values(this.profiles),
      currentUrl
    );

    if (match && match.profileId) {
      if (match.profileId !== this.activeProfileId) {
        this.activeProfileId = match.profileId;
        await chrome.storage.local.set({ activeProfile: this.activeProfileId });

        console.log(
          `Auto-switched to profile: ${this.profiles[this.activeProfileId]?.name}`
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
      // Debug: log incoming messages to help trace message delivery
      try {
        console.log(
          "[AutoFill] content script received message:",
          request && request.action,
          request
        );
      } catch (e) {
        // ignore logging errors
      }

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
        case "startVisualCapture":
          this.startVisualCapture();
          sendResponse({ success: true });
          return true;
        case "getStatus":
          sendResponse({
            hasProfiles: Object.keys(this.profiles).length > 0,
            activeProfile: this.activeProfileId,
            hotkeysCount: Object.keys(this.hotkeys).length,
            isVisualCapturing: !!this.isVisualCapturing
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
        }
      });

      // Global hotkeys
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === "y") {
        // Ctrl+Shift+Y - Fill active profile
        e.preventDefault();
        if (this.activeProfileId) {
          this.fillForm();
        }
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c": // Ctrl+Shift+C - Capture form
            e.preventDefault();
            try {
              const result = this.captureForm();
              if (result && result.success && result.count > 0) {
                // Save captured fields to storage so the options page can read them
                chrome.storage.local.set(
                  {
                    capturedFields: result.fields,
                    captureUrl: result.url,
                  },
                  () => {
                    // Ask background to open the options page so user sees Create New Profile modal
                    try {
                      chrome.runtime.sendMessage({
                        action: "openOptionsFromContent",
                      });
                    } catch (err) {
                      console.error(
                        "Failed to send message to background to open options page",
                        err
                      );
                    }
                  }
                );
              } else {
                // No fields captured — keep silent or show a brief alert
                // Fallback: show an alert for immediate feedback
                alert(`No form fields captured.`);
              }
            } catch (err) {
              console.error("Error capturing form via hotkey:", err);
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

    // Collect all elements that need to be filled
    const itemsToFill = [];
    profile.fields.forEach((field) => {
      if (field.site && field.site.trim() !== "") {
        if (!currentUrl.includes(field.site)) {
          return;
        }
      }

      const elements = this.findFormElements(field);
      elements.forEach((element) => {
        itemsToFill.push({ element, field });
      });
    });

    // Sort items by their physical DOM order (top-to-bottom)
    itemsToFill.sort((a, b) => {
      if (a.element === b.element) return 0;
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });

    // Fill each element sequentially with a 50ms delay
    for (const item of itemsToFill) {
      if (this.fillElement(item.element, item.field, profile.defaultMode)) {
        filledCount++;
        this.triggerEvents(item.element);
        
        // Wait 50ms before filling the next field to allow dynamic frontend scripts to process
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return { success: true, filledCount, profileName: profile.name };
  }

  captureForm() {
    const formFields = [];
    const seenFields = new Set();

    // Include all inputs (except submit, button), textareas, and selects
    const formElements = document.querySelectorAll(
      'input:not([type="submit"]):not([type="button"]):not([type="hidden"]), ' +
        "textarea, select"
    );

    formElements.forEach((element) => {
      const isSelect = element.tagName.toLowerCase() === 'select';
      const isRadioOrCheckbox = element.type === 'radio' || element.type === 'checkbox';
      const isHidden = element.offsetParent === null;

      // Skip hidden text inputs to avoid honey pots, but keep hidden selects, checkboxes, or radios
      // Also don't skip hidden inputs if their name contains educational or common profile keywords (which are dynamic form sub-fields)
      if (isHidden && !isSelect && !isRadioOrCheckbox) {
        const nameLower = (element.name || element.id || "").toLowerCase();
        const eduKeywords = ["exam", "subject", "univ", "inst", "year", "result", "gpa", "cgpa", "roll", "board", "major", "degree", "grad", "masters", "hsc", "ssc", "class", "division", "passing"];
        const isEduField = eduKeywords.some(k => nameLower.includes(k));
        if (!isEduField) {
          return;
        }
      }

      const name = element.name || element.id || element.placeholder || "";
      if (!name || seenFields.has(name.toLowerCase())) return;

      let value = "";
      let type = "text";

      switch (element.type) {
        case "checkbox":
          type = "checkbox";
          const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
          if (checkboxes.length > 1) {
            // Checkbox group
            const checkedVals = Array.from(checkboxes)
              .filter(cb => cb.checked)
              .map(cb => cb.value || "true");
            value = checkedVals.join(", ");
          } else {
            // Single checkbox
            value = element.checked ? "true" : "false";
          }
          break;

        case "radio":
          type = "radio";
          // Query all radios in this group to find the selected one
          if (element.name) {
            const radioGroup = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
            const checkedRadio = Array.from(radioGroup).find(r => r.checked);
            value = checkedRadio ? checkedRadio.value : "";
          } else {
            value = element.checked ? element.value || "true" : "";
          }
          break;

        case "select-one":
        case "select-multiple":
          type = "select";
          if (element.type === "select-multiple") {
            const selectedVals = Array.from(element.selectedOptions).map(opt => opt.value || opt.text);
            value = selectedVals.join(", ");
          } else {
            const selectedOption = element.options[element.selectedIndex];
            if (selectedOption && selectedOption.value !== "") {
              value = selectedOption.value || selectedOption.text || "";
            } else {
              value = "";
            }
          }
          break;

        default:
          value = element.value || "";
          type = element.type || "text";
      }

      // If value is empty and no placeholder, we can skip it, unless it's a select or checkbox/radio
      if (!value.trim() && !element.placeholder && !isSelect && !isRadioOrCheckbox) {
        return;
      }

      let regexName = name;
      if (name.includes(" ")) {
        regexName = name.toLowerCase().replace(/\s+/g, "[-_\\s]*");
      }

      formFields.push({
        name: `^${regexName}$`,
        value: value,
        type: type,
        site: "",
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

    // 1. Try Custom CSS Selector
    if (field.cssSelector) {
      try {
        const els = document.querySelectorAll(field.cssSelector);
        els.forEach((el) => elements.push(el));
      } catch (e) {
        console.error("Invalid CSS Selector:", field.cssSelector, e);
      }
    }

    // 2. Try Custom XPath
    if (elements.length === 0 && field.xpath) {
      try {
        const result = document.evaluate(
          field.xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
          elements.push(result.snapshotItem(i));
        }
      } catch (e) {
        console.error("Invalid XPath:", field.xpath, e);
      }
    }

    // 3. Fallback to name/id matching if no CSS/XPath matched
    if (elements.length === 0 && field.name) {
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
        case "date":
        case "datetime-local":
        case "month":
        case "week":
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
          let targetChecked = false;
          const lowerCheckVal = value.toLowerCase().trim();
          if (lowerCheckVal === "true" || value === "1" || lowerCheckVal === "checked") {
            targetChecked = true;
          } else if (lowerCheckVal === "false" || value === "0" || lowerCheckVal === "unchecked") {
            targetChecked = false;
          } else {
            // Checkbox group matching: check if element's value is in the comma-separated list
            const selectedValues = value.split(',').map(v => v.trim().toLowerCase());
            if (element.value && selectedValues.includes(element.value.toLowerCase())) {
              targetChecked = true;
            } else {
              targetChecked = false;
            }
          }
          
          if (element.checked !== targetChecked) {
            if (typeof element.click === "function") {
              element.click();
            } else {
              element.checked = targetChecked;
            }
          }
          return true;

        case "radio":
          let targetRadioChecked = false;
          const lowerRadioVal = value.toLowerCase().trim();
          if (lowerRadioVal === "true" || value === "1" || lowerRadioVal === "checked") {
            targetRadioChecked = true;
          } else if (lowerRadioVal === "false" || value === "0") {
            targetRadioChecked = false;
          } else {
            // Value-based matching for radio button groups
            if (element.value && element.value.toLowerCase() === lowerRadioVal) {
              targetRadioChecked = true;
            } else {
              targetRadioChecked = false;
            }
          }
          
          if (element.checked !== targetRadioChecked) {
            if (typeof element.click === "function") {
              element.click();
            } else {
              element.checked = targetRadioChecked;
            }
          }
          return true;

        case "select-one":
          const lowerVal = value.toLowerCase().trim();
          if (!lowerVal) return false;

          let matchedIndex = -1;

          // 1. Try exact match on option value
          for (let i = 0; i < element.options.length; i++) {
            if (element.options[i].value.toLowerCase() === lowerVal) {
              matchedIndex = i;
              break;
            }
          }

          // 2. Try exact match on option text
          if (matchedIndex === -1) {
            for (let i = 0; i < element.options.length; i++) {
              if (element.options[i].text.toLowerCase().trim() === lowerVal) {
                matchedIndex = i;
                break;
              }
            }
          }

          // 3. Try starts-with match on option text
          if (matchedIndex === -1) {
            for (let i = 0; i < element.options.length; i++) {
              const optText = element.options[i].text.toLowerCase();
              if (optText.startsWith(lowerVal)) {
                matchedIndex = i;
                break;
              }
            }
          }

          // 4. Try substring match using word boundaries (only if search value is longer than 2 characters)
          if (matchedIndex === -1 && lowerVal.length > 2) {
            try {
              const escapedVal = lowerVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const boundaryRegex = new RegExp("\\b" + escapedVal + "\\b", "i");
              
              for (let i = 0; i < element.options.length; i++) {
                if (boundaryRegex.test(element.options[i].text)) {
                  matchedIndex = i;
                  break;
                }
              }
            } catch (e) {
              console.error("Regex word boundary matching failed:", e);
            }
          }

          if (matchedIndex !== -1) {
            element.selectedIndex = matchedIndex;
            element.value = element.options[matchedIndex].value;
            return true;
          }
          break;

        case "select-multiple":
          const valuesToSelect = value.split(',').map(v => v.trim().toLowerCase());
          let anySelected = false;
          for (let i = 0; i < element.options.length; i++) {
            const optVal = element.options[i].value.toLowerCase();
            const optText = element.options[i].text.toLowerCase().trim();
            
            const matches = valuesToSelect.some(val => {
              if (optVal === val || optText === val) return true;
              if (val.length > 2) {
                try {
                  const escaped = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                  return new RegExp("\\b" + escaped + "\\b", "i").test(optText);
                } catch(e) {}
              }
              return false;
            });

            if (matches) {
              element.options[i].selected = true;
              anySelected = true;
            } else {
              element.options[i].selected = false;
            }
          }
          return anySelected;
      }
    } catch (e) {
      console.error("Error filling element:", e);
    }

    return false;
  }

  triggerEvents(element) {
    try {
      element.focus?.();
      
      // Trigger React value tracker updates
      const valueTracker = element._valueTracker;
      if (valueTracker) {
        valueTracker.setValue("");
      }
    } catch (e) {}

    try {
      element.dispatchEvent(new Event("focus", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    } catch (e) {
      console.error("Error dispatching events:", e);
    }
  }

  // Visual Form Capture functions
  startVisualCapture() {
    if (this.isVisualCapturing) return;
    this.isVisualCapturing = true;
    this.visualCapturedFields = [];

    // Create floating UI panel
    const panel = document.createElement("div");
    panel.id = "autofill-visual-capture-panel";
    panel.style.position = "fixed";
    panel.style.bottom = "20px";
    panel.style.right = "20px";
    panel.style.zIndex = "10000000";
    panel.style.background = "#ffffff";
    panel.style.border = "1px solid #ccc";
    panel.style.borderRadius = "8px";
    panel.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    panel.style.padding = "16px";
    panel.style.fontFamily = "system-ui, -apple-system, sans-serif";
    panel.style.minWidth = "250px";

    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #1a73e8;">📸 Visual Form Capture</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 12px;">Click on input fields, dropdowns, or checkboxes to select them.</div>
      <div style="font-size: 13px; font-weight: 500; margin-bottom: 16px;" id="visual-capture-count">Captured Fields: 0</div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="visual-capture-cancel" style="padding: 6px 12px; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px;">Cancel</button>
        <button id="visual-capture-done" style="padding: 6px 12px; border: none; background: #1a73e8; color: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Done</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Apply temporary hover/click listeners
    this.visualHoverHandler = (e) => {
      const el = e.target;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const isButton = el.type === "submit" || el.type === "button";
      if (isInput && !isButton) {
        el.style.outline = "2px dashed #1a73e8";
        el.style.cursor = "crosshair";
      }
    };

    this.visualOutHandler = (e) => {
      const el = e.target;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const isButton = el.type === "submit" || el.type === "button";
      if (isInput && !isButton && !el.classList.contains("autofill-visually-captured")) {
        el.style.outline = "";
        el.style.cursor = "";
      }
    };

    this.visualClickHandler = (e) => {
      const el = e.target;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const isButton = el.type === "submit" || el.type === "button";
      
      if (isInput && !isButton) {
        e.preventDefault();
        e.stopPropagation();

        const name = el.name || el.id || el.placeholder || `field_${this.visualCapturedFields.length + 1}`;
        
        // Toggle capture state
        if (el.classList.contains("autofill-visually-captured")) {
          el.classList.remove("autofill-visually-captured");
          el.style.outline = "";
          this.visualCapturedFields = this.visualCapturedFields.filter(f => f.originalName !== name);
        } else {
          el.classList.add("autofill-visually-captured");
          el.style.outline = "2px solid #28a745";

          let value = el.value || "";
          let type = el.type || "text";

          if (el.type === "checkbox") {
            value = el.checked ? "true" : "false";
          } else if (el.type === "radio") {
            value = el.checked ? el.value || "true" : "";
          } else if (el.type === "select-one") {
            type = "select";
            value = el.options[el.selectedIndex]?.value || el.options[el.selectedIndex]?.text || "";
          }

          const cssSelector = this.getUniqueCssSelector(el);
          const xpath = this.getXPath(el);

          this.visualCapturedFields.push({
            name: `^${name.toLowerCase().replace(/\s+/g, "[-_\\s]*")}$`,
            value: value,
            type: type,
            site: "",
            mode: "overwrite",
            originalName: name,
            cssSelector: cssSelector,
            xpath: xpath
          });
        }

        document.getElementById("visual-capture-count").textContent = `Captured Fields: ${this.visualCapturedFields.length}`;
      }
    };

    document.addEventListener("mouseover", this.visualHoverHandler, true);
    document.addEventListener("mouseout", this.visualOutHandler, true);
    document.addEventListener("click", this.visualClickHandler, true);

    // Done button event
    document.getElementById("visual-capture-done").addEventListener("click", () => {
      if (this.visualCapturedFields.length > 0) {
        chrome.storage.local.set({
          capturedFields: this.visualCapturedFields,
          captureUrl: window.location.href
        }, () => {
          chrome.runtime.sendMessage({ action: "openOptionsFromContent" });
        });
      }
      this.stopVisualCaptureFlow();
    });

    // Cancel button event
    document.getElementById("visual-capture-cancel").addEventListener("click", () => {
      this.stopVisualCaptureFlow();
    });
  }

  stopVisualCaptureFlow() {
    this.isVisualCapturing = false;
    const panel = document.getElementById("autofill-visual-capture-panel");
    if (panel) panel.remove();

    document.removeEventListener("mouseover", this.visualHoverHandler, true);
    document.removeEventListener("mouseout", this.visualOutHandler, true);
    document.removeEventListener("click", this.visualClickHandler, true);

    // Restore styling of captured fields
    document.querySelectorAll(".autofill-visually-captured").forEach(el => {
      el.classList.remove("autofill-visually-captured");
      el.style.outline = "";
      el.style.cursor = "";
    });
  }

  getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sib = current, sibIndex = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.tagName === current.tagName) sibIndex++;
        }
        selector += `:nth-of-type(${sibIndex})`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    if (el.name) return `//${el.tagName.toLowerCase()}[@name="${el.name}"]`;

    const paths = [];
    let current = el;
    for (; current && current.nodeType === Node.ELEMENT_NODE; current = current.parentNode) {
      let index = 0;
      for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === current.nodeName) ++index;
      }
      const tagName = current.nodeName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : "";
      paths.unshift(`${tagName}${pathIndex}`);
    }
    return paths.length ? `/${paths.join("/")}` : null;
  }

  handleTeletalkEnhancements() {
    try {
      console.log("[AutoFill] Applying Teletalk enhancements...");
      // Query inputs that might be captcha fields
      const captchaInputs = document.querySelectorAll(
        'input[id*="captcha" i], input[name*="captcha" i], ' +
        'input[id*="validation" i], input[name*="validation" i], ' +
        'input[id*="code" i], input[name*="code" i]'
      );

      captchaInputs.forEach(input => {
        input.focus();
        input.style.outline = "3px solid #ff9800";
        input.style.boxShadow = "0 0 10px rgba(255, 152, 0, 0.5)";
        input.style.transition = "outline 0.3s ease, box-shadow 0.3s ease";
      });
    } catch (e) {
      console.error("Error applying Teletalk enhancements:", e);
    }
  }
}

// Initialize auto-fill engine
const autoFillEngine = new AutoFillEngine();

// Export for debugging
window.autoFillEngine = autoFillEngine;
