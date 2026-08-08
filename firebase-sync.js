// Firebase Cloud Sync Module
// Handles syncing profiles and settings to Firebase Realtime Database

class FirebaseSync {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.isSyncEnabled = true; // Default cloud sync enabled
    this.autoSyncEnabled = false;
    this.autoSyncInterval = null;
    this.loadSyncSettings();

    if (typeof firebaseAuth !== 'undefined' && firebaseAuth.onAuthStateChange) {
      firebaseAuth.onAuthStateChange((user) => {
        if (this.isSyncEnabled && this.autoSyncEnabled && user) {
          this.startAutoSync();
        } else {
          this.stopAutoSync();
        }
      });
    }
  }

  async loadSyncSettings() {
    const data = await chrome.storage.local.get(['syncEnabled', 'lastSyncTime', 'autoSyncEnabled']);
    if (data.syncEnabled !== undefined) {
      this.isSyncEnabled = data.syncEnabled;
    }
    if (data.autoSyncEnabled !== undefined) {
      this.autoSyncEnabled = data.autoSyncEnabled;
    }
    this.lastSyncTime = data.lastSyncTime || null;

    if (this.autoSyncEnabled && this.isSyncEnabled && typeof firebaseAuth !== 'undefined' && firebaseAuth.isAuthenticated()) {
      this.startAutoSync();
    }
  }

  // Enable cloud sync
  async enableSync() {
    if (!firebaseAuth.isAuthenticated()) {
      return { success: false, error: 'User not authenticated' };
    }

    this.isSyncEnabled = true;
    await chrome.storage.local.set({ syncEnabled: true });

    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }

    await this.syncToCloud();
    return { success: true };
  }

  // Disable cloud sync
  async disableSync() {
    this.isSyncEnabled = false;
    await chrome.storage.local.set({ syncEnabled: false });
    this.stopAutoSync();
    return { success: true };
  }

  // Check if sync is active
  async isSyncActive() {
    if (typeof firebaseAuth !== 'undefined') {
      await firebaseAuth.ensureAuthenticated();
      if (firebaseAuth.isAuthenticated()) {
        if (!this.isSyncEnabled) {
          this.isSyncEnabled = true;
          await chrome.storage.local.set({ syncEnabled: true });
        }
        return true;
      }
    }
    return false;
  }

  // Sync local data to Firebase
  async syncToCloud() {
    const active = await this.isSyncActive();
    if (!active) {
      return { success: false, error: 'লগইন করা নেই বা সিঙ্ক নিষ্ক্রিয়। অনুগ্রহ করে লগইন করুন।' };
    }

    if (typeof firebaseConfig === 'undefined' || !firebaseConfig.databaseURL) {
      return { success: false, error: 'Firebase configuration not loaded' };
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: false, error: 'Sync already in progress' };
    }
    this.syncInProgress = true;

    try {
      const user = firebaseAuth.getCurrentUser();
      const data = await chrome.storage.local.get(['profiles', 'hotkeys', 'settings', 'encryptionEnabled', 'masterPassword']);
      const isEncrypted = data.encryptionEnabled && data.masterPassword;

      const payload = {};

      // 1. Prepare profiles payload (encrypting if required)
      if (data.profiles) {
        const profilesToWrite = {};
        if (isEncrypted) {
          for (const [id, profile] of Object.entries(data.profiles)) {
            const plaintext = JSON.stringify(profile);
            const encryptedObj = await CryptoHelper.encrypt(plaintext, data.masterPassword);
            profilesToWrite[id] = { encrypted: true, ...encryptedObj };
          }
        } else {
          Object.assign(profilesToWrite, data.profiles);
        }
        payload.profiles = profilesToWrite;
      }

      // 2. Prepare hotkeys payload
      if (data.hotkeys) {
        payload.hotkeys = data.hotkeys;
      }

      // 3. Prepare settings payload
      if (data.settings) {
        payload.settings = data.settings;
      }

      // Sync payload to Firebase RTDB in one request
      let dbUrl = firebaseConfig.databaseURL;
      if (dbUrl && dbUrl.endsWith('/')) {
        dbUrl = dbUrl.slice(0, -1);
      }
      const url = `${dbUrl}/users/${user.uid}.json?auth=${user.token}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401 Unauthorized');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to sync to database (Status: ${response.status})`);
      }

      this.lastSyncTime = new Date().toISOString();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

      console.log('Data synced to cloud successfully');
      return { success: true, syncTime: this.lastSyncTime };
    } catch (error) {
      console.error('Cloud sync error:', error);

      // If token expired, try to refresh
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        const newToken = await firebaseAuth.refreshToken();
        if (newToken) {
          this.syncInProgress = false;
          return this.syncToCloud(); // Retry with new token
        }
      }

      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync data from Firebase to local
  async syncFromCloud() {
    const active = await this.isSyncActive();
    if (!active) {
      return { success: false, error: 'লগইন করা নেই বা সিঙ্ক নিষ্ক্রিয়। অনুগ্রহ করে লগইন করুন।' };
    }

    if (typeof firebaseConfig === 'undefined' || !firebaseConfig.databaseURL) {
      return { success: false, error: 'Firebase configuration not loaded' };
    }

    try {
      const user = firebaseAuth.getCurrentUser();
      let dbUrl = firebaseConfig.databaseURL;
      if (dbUrl && dbUrl.endsWith('/')) {
        dbUrl = dbUrl.slice(0, -1);
      }
      const url = `${dbUrl}/users/${user.uid}.json?auth=${user.token}`;

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401 Unauthorized');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch from database (Status: ${response.status})`);
      }

      const userData = await response.json();
      
      const keys = await chrome.storage.local.get(['encryptionEnabled', 'masterPassword']);
      const isDecryptionPossible = keys.encryptionEnabled && keys.masterPassword;

      const cloudProfiles = {};
      if (userData && userData.profiles) {
        for (const [id, profileData] of Object.entries(userData.profiles)) {
          if (profileData) {
            let finalProfile = profileData;
            if (profileData.encrypted) {
              if (!isDecryptionPossible) {
                throw new Error('E2EE_KEY_REQUIRED');
              }
              try {
                const decryptedText = await CryptoHelper.decrypt(profileData, keys.masterPassword);
                finalProfile = JSON.parse(decryptedText);
              } catch (err) {
                console.error('Decryption failed for profile data:', err);
                throw new Error('E2EE_DECRYPTION_FAILED');
              }
            }
            cloudProfiles[id] = finalProfile;
          }
        }
      }

      const cloudData = {
        profiles: cloudProfiles,
        hotkeys: (userData && userData.hotkeys) || {},
        settings: (userData && userData.settings) || {}
      };

      // Only update if we have cloud data
      if (
        (cloudData.profiles && Object.keys(cloudData.profiles).length > 0) ||
        (cloudData.hotkeys && Object.keys(cloudData.hotkeys).length > 0) ||
        (cloudData.settings && Object.keys(cloudData.settings).length > 0)
      ) {
        await chrome.storage.local.set({
          profiles: cloudData.profiles,
          hotkeys: cloudData.hotkeys,
          settings: cloudData.settings,
          _syncSource: 'cloud'
        });

        console.log('Data synced from cloud successfully');
        return { success: true, data: cloudData };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Cloud sync error:', error);

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        const newToken = await firebaseAuth.refreshToken();
        if (newToken) {
          return this.syncFromCloud(); // Retry with new token
        }
      }

      return { success: false, error: error.message };
    }
  }

  // Auto sync on interval
  startAutoSync(intervalMinutes = 5) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      if (this.isSyncActive()) {
        await this.syncToCloud();
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto sync started with interval: ${intervalMinutes} minutes`);
  }

  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    console.log('Auto sync stopped');
  }

  // Get last sync time
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  getAutoSyncEnabled() {
    return this.autoSyncEnabled;
  }

  async setAutoSyncEnabled(enabled) {
    this.autoSyncEnabled = Boolean(enabled);
    await chrome.storage.local.set({ autoSyncEnabled: this.autoSyncEnabled });

    if (this.autoSyncEnabled && this.isSyncEnabled && firebaseAuth.isAuthenticated()) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }

    return { success: true, autoSyncEnabled: this.autoSyncEnabled };
  }

  // Get device name for identification
  async getDeviceName() {
    try {
      const data = await chrome.storage.local.get('deviceName');
      if (!data.deviceName) {
        const deviceName = `Device-${new Date().getTime()}`;
        await chrome.storage.local.set({ deviceName });
        return deviceName;
      }
      return data.deviceName;
    } catch (error) {
      return `Device-${new Date().getTime()}`;
    }
  }

  // Conflict resolution: check if cloud data is newer
  isCloudDataNewer(localTime, cloudTime) {
    if (!localTime) return true;
    if (!cloudTime) return false;
    return new Date(cloudTime) > new Date(localTime);
  }
}

// Create global instance
const firebaseSync = new FirebaseSync();
