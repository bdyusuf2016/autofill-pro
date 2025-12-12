class AboutPage {
  constructor() {
    try {
      console.log("AboutPage constructor called");
      this.init();
    } catch (error) {
      console.error("AboutPage initialization error:", error);
      this.showError(error.message);
    }
  }

  async init() {
    console.log("AboutPage init started");

    // Check if extension APIs are available
    if (!this.checkExtensionAPIs()) {
      return;
    }

    await this.applyLocalization();
    await this.loadVersion();
    await this.loadStats();
    this.setupEventListeners();
    this.addDeveloperInfo();
    console.log("AboutPage init completed");
  }

  checkExtensionAPIs() {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      this.showError(
        "Extension APIs are not available. Please make sure you are running this page from the extension."
      );
      return false;
    }

    if (!chrome.i18n || !chrome.i18n.getMessage) {
      console.warn(
        "Localization API is not fully available, but continuing..."
      );
    }

    if (!chrome.storage || !chrome.storage.local) {
      console.warn("Storage API is not fully available, but continuing...");
    }

    return true;
  }

  async applyLocalization() {
    console.log("Applying localization...");

    try {
      // Apply i18n to all text elements
      document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        try {
          const message = chrome.i18n.getMessage(key);
          if (message) {
            element.textContent = message;
            console.log(`Localized: ${key} = ${message}`);
          } else {
            console.warn(`No translation found for key: ${key}`);
            // Keep default text if no translation
          }
        } catch (error) {
          console.error(`Error getting message for key ${key}:`, error);
        }
      });

      // Apply i18n to placeholders
      document
        .querySelectorAll("[data-i18n-placeholder]")
        .forEach((element) => {
          const key = element.getAttribute("data-i18n-placeholder");
          try {
            const message = chrome.i18n.getMessage(key);
            if (message) {
              element.placeholder = message;
            }
          } catch (error) {
            console.error(`Error getting placeholder for key ${key}:`, error);
          }
        });

      // Apply i18n to title attribute
      document.querySelectorAll("[data-i18n-title]").forEach((element) => {
        const key = element.getAttribute("data-i18n-title");
        try {
          const message = chrome.i18n.getMessage(key);
          if (message) {
            element.title = message;
          }
        } catch (error) {
          console.error(`Error getting title for key ${key}:`, error);
        }
      });

      // Set page title
      try {
        const title =
          chrome.i18n.getMessage("aboutTitle") || "About AutoFill Pro";
        document.title = title;
        console.log("Page title set to:", title);
      } catch (error) {
        console.error("Error setting page title:", error);
        document.title = "About AutoFill Pro";
      }
    } catch (error) {
      console.error("Error in applyLocalization:", error);
    }
  }

  loadVersion() {
    try {
      const manifest = chrome.runtime.getManifest();
      const version = manifest.version;
      const versionElement = document.getElementById("appVersion");
      if (versionElement) {
        versionElement.textContent = `Version ${version}`;
        console.log("Version loaded:", version);
      }
    } catch (error) {
      console.error("Error loading version:", error);
      const versionElement = document.getElementById("appVersion");
      if (versionElement) {
        versionElement.textContent = "Version unknown";
      }
    }
  }

  async loadStats() {
    console.log("Loading stats...");
    try {
      const data = await chrome.storage.local.get(["profiles", "hotkeys"]);
      const profiles = data.profiles || {};
      const hotkeys = data.hotkeys || {};

      console.log("Profiles found:", Object.keys(profiles).length);
      console.log("Hotkeys found:", Object.keys(hotkeys).length);

      // Calculate stats
      let totalFields = 0;
      let totalUrlRules = 0;

      Object.values(profiles).forEach((profile) => {
        totalFields += profile.fields?.length || 0;
        totalUrlRules += profile.urlRules?.length || 0;
      });

      console.log("Total fields:", totalFields);
      console.log("Total URL rules:", totalUrlRules);

      // Update UI
      this.updateElementText("profilesCount", Object.keys(profiles).length);
      this.updateElementText("fieldsCount", totalFields);
      this.updateElementText("hotkeysCount", Object.keys(hotkeys).length);
      this.updateElementText("rulesCount", totalUrlRules);
    } catch (error) {
      console.error("Error loading stats:", error);
      // Set default values
      this.updateElementText("profilesCount", "0");
      this.updateElementText("fieldsCount", "0");
      this.updateElementText("hotkeysCount", "0");
      this.updateElementText("rulesCount", "0");
    }
  }

  updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    } else {
      console.warn(`Element not found: ${elementId}`);
    }
  }

  addDeveloperInfo() {
    console.log("Adding developer info...");

    // Developer info is already in the HTML, just make sure it's visible
    const developerSection = document.querySelector(".developer-info");
    if (developerSection) {
      developerSection.style.display = "block";

      // Add developer avatar if not exists
      const avatarDiv = developerSection.querySelector(".developer-avatar");
      if (avatarDiv && !avatarDiv.querySelector("img")) {
        // Create developer avatar
        const avatarImg = document.createElement("div");
        avatarImg.style.cssText = `
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: #667eea;
        `;
        avatarImg.textContent = "👨‍💻";
        avatarDiv.appendChild(avatarImg);
      }

      // Ensure contact info is visible
      const contactInfo = developerSection.querySelector(".contact-info");
      if (contactInfo) {
        contactInfo.style.display = "grid";
      }
    } else {
      console.warn("Developer section not found in HTML");
      this.createDeveloperInfo();
    }
  }

  createDeveloperInfo() {
    // Fallback: Create developer info if not in HTML
    const aboutPage = document.querySelector(".about-page");
    if (!aboutPage) return;

    const developerHTML = `
      <div class="developer-info">
        <div class="developer-header">
          <div class="developer-avatar">
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #667eea;">
              👨‍💻
            </div>
          </div>
          <div class="developer-details">
            <h2 data-i18n="developerName">Md. Yusuf Ali</h2>
            <div class="developer-title" data-i18n="developerTitle">
              Browser Extension Developer
            </div>
            <p data-i18n="developerBio">
              Passionate about creating useful tools that enhance productivity and simplify everyday tasks.
            </p>
          </div>
        </div>

        <div class="contact-info">
          <div class="contact-item">
            <span class="contact-icon">📍</span>
            <div>
              <div style="font-weight: 500" data-i18n="addressLabel">Address</div>
              <div data-i18n="developerAddress">
                Customs Bond Commissionerate Dhaka(South), Dhaka, 342/1, Segunbagicha, Dhaka-1000, Bangladesh.
              </div>
            </div>
          </div>

          <div class="contact-item">
            <span class="contact-icon">📧</span>
            <div>
              <div style="font-weight: 500" data-i18n="emailLabel">Email</div>
              <div>mdyusufcbc@gmail.com</div>
            </div>
          </div>

          <div class="contact-item">
            <span class="contact-icon">🌐</span>
            <div>
              <div style="font-weight: 500" data-i18n="websiteLabel">Website</div>
              <div>
                <a href="https://github.com/bdyusuf2016" 
                   style="color: white; text-decoration: underline;" 
                   target="_blank" 
                   rel="noopener noreferrer">
                  github.com/bdyusuf2016
                </a>
              </div>
            </div>
          </div>

          <div class="contact-item">
            <span class="contact-icon">💼</span>
            <div>
              <div style="font-weight: 500" data-i18n="companyLabel">Company</div>
              <div data-i18n="developerCompany">Yusuf Computer & IT.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert at the beginning of about page
    aboutPage.insertAdjacentHTML("afterbegin", developerHTML);

    // Re-apply localization to new elements
    this.applyLocalization();
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Back to options button
    const backToOptionsBtn = document.getElementById("backToOptions");
    if (backToOptionsBtn) {
      backToOptionsBtn.addEventListener("click", () => {
        console.log("Back to options clicked");
        window.location.href = "options.html";
      });
    } else {
      console.warn("backToOptions button not found");
    }

    // View source code button
    const viewSourceBtn = document.getElementById("viewSourceCode");
    if (viewSourceBtn) {
      viewSourceBtn.addEventListener("click", () => {
        console.log("View source code clicked");
        const repoUrl = "https://github.com/bdyusuf2016/autofill-pro";
        window.open(repoUrl, "_blank");
      });
    }

    // Report issue button
    const reportIssueBtn = document.getElementById("reportIssue");
    if (reportIssueBtn) {
      reportIssueBtn.addEventListener("click", () => {
        console.log("Report issue clicked");
        const issuesUrl = "https://github.com/bdyusuf2016/autofill-pro/issues";
        window.open(issuesUrl, "_blank");
      });
    }

    // Suggest feature button
    const suggestFeatureBtn = document.getElementById("suggestFeature");
    if (suggestFeatureBtn) {
      suggestFeatureBtn.addEventListener("click", () => {
        console.log("Suggest feature clicked");
        const featureUrl =
          "https://github.com/bdyusuf2016/autofill-pro/discussions";
        window.open(featureUrl, "_blank");
      });
    }

    // Back link in header
    const backLink = document.querySelector("a.back-button");
    if (backLink) {
      backLink.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Back link clicked");
        window.location.href = "options.html";
      });
    }

    // Add click handlers for email links
    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        console.log("Email link clicked:", e.target.href);
      });
    });

    // Add click handlers for external links
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      if (!link.hasAttribute("target")) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    console.log("Event listeners setup completed");
  }

  showError(message) {
    console.error("Showing error:", message);
    const container = document.querySelector(".about-page");
    if (!container) {
      // Create container if doesn't exist
      const body = document.body;
      body.innerHTML = "";
      const newContainer = document.createElement("div");
      newContainer.className = "about-page";
      body.appendChild(newContainer);
      container = newContainer;
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h3 style="margin-bottom: 10px; color: #ea4335;">Error Loading Page</h3>
        <p style="margin-bottom: 20px; color: #666;">${
          message || "An error occurred while loading the page."
        }</p>
        <div style="margin-top: 30px;">
          <button onclick="location.reload()" class="primary" style="margin: 5px; padding: 10px 20px; cursor: pointer;">
            🔄 Refresh Page
          </button>
          <button onclick="chrome.runtime.reload()" class="secondary" style="margin: 5px; padding: 10px 20px; cursor: pointer;">
            🔧 Reload Extension
          </button>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #999;">
          <p>If the problem persists, try:</p>
          <ol style="text-align: left; display: inline-block; margin-top: 10px;">
            <li>Reload the extension from chrome://extensions</li>
            <li>Clear browser cache</li>
            <li>Restart Chrome browser</li>
          </ol>
        </div>
      </div>
    `;

    // Add basic styles for buttons
    const style = document.createElement("style");
    style.textContent = `
      .primary {
        background: linear-gradient(135deg, #1a73e8, #4285f4);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
      }
      .primary:hover {
        background: linear-gradient(135deg, #0d62d9, #3367d6);
      }
      .secondary {
        background: #f1f3f4;
        color: #3c4043;
        border: 1px solid #dadce0;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
      }
      .secondary:hover {
        background: #e8eaed;
      }
    `;
    document.head.appendChild(style);
  }

  // Helper method to show loading indicator
  showLoading() {
    const container = document.querySelector(".about-page");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 20px; animation: spin 1s linear infinite;">⌛</div>
          <h3>Loading About Page...</h3>
          <p>Please wait while we load the information.</p>
        </div>
      `;

      // Add spin animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Initialize about page with better error handling
document.addEventListener("DOMContentLoaded", () => {
  console.log("About page DOM loaded");

  // Show loading indicator immediately
  const aboutPage = new AboutPage();

  // Check if we're running in extension context (but don't block if not)
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.warn(
      "Not running in extension context. Some features may be limited."
    );

    // Still try to load the page without extension APIs
    const manifest = { version: "1.0" };
    document.getElementById(
      "appVersion"
    ).textContent = `Version ${manifest.version}`;

    // Set default stats
    document.getElementById("profilesCount").textContent = "N/A";
    document.getElementById("fieldsCount").textContent = "N/A";
    document.getElementById("hotkeysCount").textContent = "N/A";
    document.getElementById("rulesCount").textContent = "N/A";

    // Add a warning message
    const warning = document.createElement("div");
    warning.style.cssText = `
      background: #fff3e0;
      color: #f57c00;
      padding: 10px;
      margin: 10px;
      border-radius: 4px;
      border: 1px solid #ffe0b2;
      text-align: center;
    `;
    warning.innerHTML = `
      <strong>⚠️ Extension Mode Required</strong><br>
      Open this page from the AutoFill Pro extension for full functionality.
    `;
    document.querySelector(".about-page").prepend(warning);
  }

  window.aboutPage = aboutPage; // Expose for debugging

  // Add a debug refresh button in development
  if (window.location.search.includes("debug")) {
    const debugBtn = document.createElement("button");
    debugBtn.textContent = "🔄 Debug Refresh";
    debugBtn.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      z-index: 1000;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    debugBtn.onclick = () => {
      chrome.storage.local.clear();
      location.reload();
    };
    document.body.appendChild(debugBtn);
  }
});

// Add global error handler
window.addEventListener("error", function (event) {
  console.error("Global error:", event.error);

  // Don't show alert for minor errors
  if (
    event.error &&
    event.error.message &&
    !event.error.message.includes("chrome") &&
    !event.error.message.includes("extension")
  ) {
    return;
  }

  // Show user-friendly error message
  const errorMsg = event.error ? event.error.message : "Unknown error";
  console.log("Showing user error:", errorMsg);
});

// Add unhandled rejection handler
window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);
});

// Force clear any cached data on reload
if (performance.navigation.type === 1) {
  // Page was reloaded
  console.log("Page was reloaded");

  // Try to clear caches if available
  if ("caches" in window) {
    caches
      .keys()
      .then(function (names) {
        for (let name of names) {
          caches.delete(name);
          console.log("Deleted cache:", name);
        }
      })
      .catch((err) => {
        console.log("Could not clear caches:", err);
      });
  }
}

// Add a simple cache-busting mechanism for scripts
(function () {
  const scripts = document.querySelectorAll("script[src]");
  const timestamp = Date.now();

  scripts.forEach((script) => {
    const src = script.getAttribute("src");
    if (src && src.includes("about.js")) {
      // Add timestamp to prevent caching
      if (!src.includes("?")) {
        script.src = src + "?v=" + timestamp;
      }
    }
  });
})();
