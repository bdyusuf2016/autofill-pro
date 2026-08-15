# ⚡ AutoFill Pro v2.6.1 - Release Notes

AutoFill Pro **v2.6.1** brings native **Google OAuth & Chrome Identity integration**, **permanent Fixed Extension ID key**, **rock-solid Cloud Sync & token refresh stability**, and a **sleek modernized Authentication UI** with Bengali localization.

---

## 🚀 What's New in v2.6.1

### 🔑 1. Native Google OAuth & Chrome Identity Integration
- **Direct 1-Click Google Sign-In**: Integrated with `chrome.identity.getAuthToken` and Firebase Identity Platform (`signInWithIdp`) for real ID and refresh token exchange.
- **Fixed Extension Key (`manifest.json`)**: Added an embedded RSA public key to fix the Chrome Extension ID permanently to `kmjeoiiohfgjgnkkifaklhjigloekhfb` across all computers and browser profiles.
- **No More Redirect URI / OAuth Blockers**: Native Chrome account selection eliminates browser popup blocks and redirect URI mismatch issues.

### ☁️ 2. Cloud Sync & Silent Token Refresh (No Auto-Logout)
- **Resolved Auto-Logout during Sync**: Fixed an issue where expired tokens triggered an unexpected logout during sync.
- **Silent Background Token Refresh**: Authenticated sessions automatically refresh expired Firebase tokens via Google Secure Token API without disrupting the user.
- **Enhanced Data Integrity**: Complete cross-device profile, hotkey, and settings synchronization via Firebase Realtime Database with AES-256 E2EE support.

### 🎨 3. Modernized Auth UI with Tab Switcher & Localization
- **Clean Auth Interface**: Brand-new login and registration interface featuring quick tab switching between **Login** and **Create Account**.
- **Complete Bengali (বাংলা) & English Support**: Clear validation messages, password matching indicator, and password reset notifications.
- **Forgot Password Recovery**: 1-click password reset email dispatch directly to user's registered inbox.

### ⚙️ 4. Profile Management & Security Enhancements
- **Display Name & Password Management**: Users can update their Cloud Profile Display Name and change passwords from Options settings.
- **Seamless Local & Cloud Hybrid**: Works out-of-the-box both offline with local profiles and online with real-time cloud synchronization.

---

## 📦 Installation & Setup

1. Download `autofill-pro-v2.6.1.zip` from the release assets.
2. Extract the ZIP archive to a folder on your computer.
3. Open Google Chrome and go to `chrome://extensions/`.
4. Turn ON **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the extracted folder.
6. AutoFill Pro is ready to use with built-in Cloud Sync!

---

## 📋 Full Changelog

- **Added**: Permanent RSA key in `manifest.json` for deterministic extension ID.
- **Added**: Native `chrome.identity.getAuthToken` Google OAuth flow in `firebase-auth.js`.
- **Added**: Firebase `signInWithIdp` REST integration for Google provider token exchange.
- **Fixed**: Unintended logout during Cloud Sync when token refresh fails.
- **Improved**: `login.html` & `login.js` UI with modern responsive styling and tab switching.
- **Updated**: Error translations and Bengali language strings across auth and sync modules.
