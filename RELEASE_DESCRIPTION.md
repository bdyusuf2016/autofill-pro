# Autofill Pro v2.3 - Release Notes 🚀

## 🏷️ Release Details
- **Tag Version**: `v2.3`
- **Release Title**: `Autofill Pro v2.3`
- **Target Branch**: `main`

---

## ⚡ What's New in Version 2.2

### 1. 🔄 Existing Profile Overwrite & Merge Options
- **Profile Selector**: When capturing fields from web forms, you can now choose to save them as a new profile or apply them directly to an existing profile.
- **Intelligent Merging**: Pick **Merge** to update existing matching fields and add newly captured ones, preserving your profile structure.
- **Complete Overwrite**: Pick **Overwrite** to replace all fields of the target profile with the newly captured fields.

### 📸 2. Visual Point-and-Click Form Capture
- **Interactive Element Selector**: Launch visual capture from the popup or options page to hover-highlight elements and record input fields, checkboxes, radios, and selects on click.
- **Automatic Selector Resolution**: Automatically generates exact CSS Selectors and XPaths to resolve complex or hidden elements.

### 🔐 3. Client-Side End-to-End Encryption (E2EE)
- **Local Encryption**: Secures your database sync payloads. Data is encrypted using AES-GCM 256-bit locally inside your browser before upload.
- **Key Derivation (PBKDF2)**: Derives keys securely from your private Master Password using PBKDF2 (100,000 iterations + SHA-256).

### ☁️ 4. Supabase Cloud Sync Integration
- **Cross-device Syncing**: Replaced old backend mechanisms with Supabase database handlers.
- **Zero-Knowledge Backup**: Your cloud backups are fully encrypted when client-side encryption is enabled.

### 🎯 5. Custom CSS & XPath Matching
- Configure form fields to match by precise CSS Selectors or XPaths directly in the updated profile editor.

### 🇧🇩 6. Teletalk Portal Optimizations
- **Captcha Visual Highlights**: Identifies captcha inputs on `*.teletalk.com.bd` domains, programmatically focusing them and overlaying a glowing animated orange border.

---

## 📦 Installation Instructions

1. Download the `autofill-pro-v2.3.zip` archive attached below.
2. Extract the zip file contents to a local folder.
3. Open Google Chrome and go to `chrome://extensions/`.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** (top-left button) and select your extracted folder.
6. Open options, register an account, set a Master Password, and sync!
