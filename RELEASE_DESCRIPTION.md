# Autofill Pro v2.6 - Release Notes 🚀

## 🏷️ Release Details
- **Tag Version**: `v2.6`
- **Release Title**: `Autofill Pro v2.6`
- **Target Branch**: `main`

---

## ⚡ What's New in Version 2.6

### 🔑 1. Built-in Firebase API Key Credentials
- Built-in API Key and Realtime Database configuration included out-of-the-box. Users no longer need manual setup to access cloud sync features.

### 📱 2. Phone Number Support in Profile Creation
- Easily provide and edit a Phone Number (`phone`) when creating or updating any profile.
- Automatically generates and maps phone/mobile input fields during autofill operations.
- Phone numbers are clearly displayed with a `📱` badge on profile cards.

### 🔍 3. Real-time Profile Search
- Search bar added to the Options Page and Popup interfaces.
- Instant fuzzy search filtering across profile names, phone numbers, and form field values/names.


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

### ☁️ 4. Firebase Cloud Sync Integration
- **Cross-device Syncing**: Replaced database sync mechanisms with always-on Firebase Realtime Database.
- **Zero-Knowledge Backup**: Your cloud backups are fully encrypted when client-side encryption is enabled.

### 🎯 5. Custom CSS & XPath Matching
- Configure form fields to match by precise CSS Selectors or XPaths directly in the updated profile editor.

### 🇧🇩 6. Teletalk Portal Optimizations
- **Captcha Visual Highlights**: Identifies captcha inputs on `*.teletalk.com.bd` domains, programmatically focusing them and overlaying a glowing animated orange border.

---

## 📦 Installation Instructions

1. Download the `autofill-pro-v2.5.zip` archive attached below.
2. Extract the zip file contents to a local folder.
3. Open Google Chrome and go to `chrome://extensions/`.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** (top-left button) and select your extracted folder.
6. Firebase API Key and credentials come built-in out of the box! Simply register an account and sync!

