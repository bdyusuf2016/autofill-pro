# ⚡ AutoFill Pro v2.6.1 Release Notes

AutoFill Pro v2.6.1 comes with **Native Google OAuth & Chrome Identity Support**, **Permanent Fixed Extension ID**, **Rock-Solid Cloud Sync Stability (No Auto-Logout)**, and a **Modernized Login & Register UI**.

---

## 🚀 Key Highlights & What's New in v2.6.1

### 🔑 1. Native Google OAuth & Chrome Identity Integration
- **Direct 1-Click Google Sign-In**: Integrated with `chrome.identity.getAuthToken` and Firebase Identity Platform (`signInWithIdp`) for real ID and refresh token exchange.
- **Fixed Extension Key (`manifest.json`)**: Added an embedded RSA public key to fix the Chrome Extension ID permanently to `kmjeoiiohfgjgnkkifaklhjigloekhfb` across all devices.
- **No More Redirect URI / OAuth Blockers**: Native Chrome account selection eliminates browser popup blocks and redirect URI mismatch issues.

### ☁️ 2. Cloud Sync & Silent Token Refresh (No Auto-Logout)
- **Resolved Auto-Logout during Sync**: Fixed an issue where expired tokens triggered an unexpected logout during sync.
- **Silent Background Token Refresh**: Authenticated sessions automatically refresh expired Firebase tokens via Google Secure Token API without disrupting the user.
- **Enhanced Data Integrity**: Complete cross-device profile, hotkey, and settings synchronization via Firebase Realtime Database with AES-256 E2EE support.

### 🎨 3. Modernized Auth UI with Tab Switcher & Localization
- **Clean Auth Interface**: Brand-new login and registration interface featuring quick tab switching between **Login** and **Create Account**.
- **Complete Bengali (বাংলা) & English Support**: Clear validation messages, password matching indicator, and password reset notifications.
- **Forgot Password Recovery**: 1-click password reset email dispatch directly to user's registered inbox.

---

## 📦 Installation Instructions

1. Download the `autofill-pro-v2.6.1.zip` archive below and extract it.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** (top-left button) and select the extracted extension folder.
5. AutoFill Pro is ready with 1-Click Google Sign-In and Cloud Sync!
