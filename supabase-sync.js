// Supabase Cloud Sync Module
// Handles syncing profiles and settings to Supabase PostgreSQL

class SupabaseSync {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.isSyncEnabled = true; // Default cloud sync enabled
    this.profileRowSchemaSupported = true;
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

    if (data.profileRowSchemaSupported !== undefined) {
      this.profileRowSchemaSupported = data.profileRowSchemaSupported;
    }
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

  // Check if sync is enabled
  isSyncActive() {
    return this.isSyncEnabled && firebaseAuth.isAuthenticated();
  }

  // Sync local data to Supabase
  async syncToCloud() {
    if (!this.isSyncActive()) {
      return { success: false, error: 'Sync not enabled or user not authenticated' };
    }

    if (typeof supabaseConfig === 'undefined') {
      return { success: false, error: 'Supabase configuration not loaded' };
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

      // Sync profiles: try row-per-profile schema first so each profile is stored separately.
      // If the schema is not compatible, fall back to legacy single-row per-user storage.
      if (data.profiles) {
        if (isEncrypted) {
          if (this.profileRowSchemaSupported) {
            const profileRows = [];
            for (const profile of Object.values(data.profiles)) {
              const plaintext = JSON.stringify(profile);
              const encryptedObj = await CryptoHelper.encrypt(plaintext, data.masterPassword);
              profileRows.push({
                user_id: user.uid,
                profile_id: profile.id,
                profile_data: { encrypted: true, ...encryptedObj }
              });
            }

            if (profileRows.length > 0) {
              let response = await this.upsertData('user_profiles', profileRows, user.token);
              let errorBody = null;

              if (!response.ok) {
                errorBody = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
                const isLegacyUserRowConflict =
                  response.status === 409 &&
                  errorBody.message &&
                  errorBody.message.includes('user_profiles_user_id_key');

                if (isLegacyUserRowConflict || response.status === 409 || response.status === 400) {
                  this.profileRowSchemaSupported = false;
                  await this.persistSchemaSupport();
                  console.warn('Profile row schema not supported; falling back to legacy single-row sync:', response.status, errorBody);
                  await this.syncProfilesSingleRowEncrypted(data.profiles, user, data.masterPassword);
                } else {
                  console.error('Profile sync error:', response.status, errorBody);
                  throw new Error(`Failed to sync profiles: ${response.status} - ${JSON.stringify(errorBody)}`);
                }
              }
            }
          } else {
            await this.syncProfilesSingleRowEncrypted(data.profiles, user, data.masterPassword);
          }
        } else {
          // Standard unencrypted sync
          const profileRows = Object.values(data.profiles).map(profile => ({
            user_id: user.uid,
            profile_id: profile.id,
            profile_data: profile
          }));

          if (profileRows.length > 0) {
            if (!this.profileRowSchemaSupported) {
              await this.syncProfilesSingleRow(data.profiles, user);
            } else {
              let response = await this.upsertData('user_profiles', profileRows, user.token);
              let errorBody = null;

              if (!response.ok) {
                errorBody = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
                const isLegacyUserRowConflict =
                  response.status === 409 &&
                  errorBody.message &&
                  errorBody.message.includes('user_profiles_user_id_key');

                if (isLegacyUserRowConflict || response.status === 409 || response.status === 400) {
                  this.profileRowSchemaSupported = false;
                  await this.persistSchemaSupport();
                  console.warn('Profile row schema not supported; falling back to legacy single-row sync:', response.status, errorBody);
                  await this.syncProfilesSingleRow(data.profiles, user);
                } else {
                  console.error('Profile sync error:', response.status, errorBody);
                  throw new Error(`Failed to sync profiles: ${response.status} - ${JSON.stringify(errorBody)}`);
                }
              }
            }
          }
        }
      }

      // Sync hotkeys
      if (data.hotkeys) {
        const response = await this.upsertData('user_hotkeys', {
          user_id: user.uid,
          hotkey_data: data.hotkeys
        }, user.token);

        if (!response.ok) {
          const error = await response.json();
          console.error('Hotkeys sync error:', response.status, error);
          throw new Error(`Failed to sync hotkeys: ${response.status} - ${JSON.stringify(error)}`);
        }
      }

      // Sync settings
      if (data.settings) {
        const response = await this.upsertData('user_settings', {
          user_id: user.uid,
          settings_data: data.settings
        }, user.token);

        if (!response.ok) {
          const error = await response.json();
          console.error('Settings sync error:', response.status, error);
          throw new Error(`Failed to sync settings: ${response.status} - ${JSON.stringify(error)}`);
        }
      }

      this.lastSyncTime = new Date().toISOString();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

      console.log('Data synced to cloud successfully');
      return { success: true, syncTime: this.lastSyncTime };
    } catch (error) {
      console.error('Cloud sync error:', error);

      // If token expired, try to refresh
      if (error.message.includes('401')) {
        const newToken = await firebaseAuth.refreshToken();
        if (newToken) {
          return this.syncToCloud(); // Retry with new token
        }
      }

      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync data from Supabase to local
  async syncFromCloud() {
    if (!this.isSyncActive()) {
      return { success: false, error: 'Sync not enabled or user not authenticated' };
    }

    if (typeof supabaseConfig === 'undefined') {
      return { success: false, error: 'Supabase configuration not loaded' };
    }

    try {
      const user = firebaseAuth.getCurrentUser();

      // Fetch profiles
      const profilesResponse = await this.fetchData('user_profiles', user.uid, user.token);
      const profilesData = profilesResponse.ok ? await profilesResponse.json() : null;

      // Fetch hotkeys
      const hotkeysResponse = await this.fetchData('user_hotkeys', user.uid, user.token);
      const hotkeysData = hotkeysResponse.ok ? await hotkeysResponse.json() : null;

      // Fetch settings
      const settingsResponse = await this.fetchData('user_settings', user.uid, user.token);
      const settingsData = settingsResponse.ok ? await settingsResponse.json() : null;

      const keys = await chrome.storage.local.get(['encryptionEnabled', 'masterPassword']);
      const isDecryptionPossible = keys.encryptionEnabled && keys.masterPassword;

      const cloudProfiles = {};
      if (Array.isArray(profilesData)) {
        for (const row of profilesData) {
          if (row) {
            let profileData = row.profile_data || {};
            if (profileData && profileData.encrypted) {
              if (!isDecryptionPossible) {
                throw new Error('E2EE_KEY_REQUIRED');
              }
              try {
                const decryptedText = await CryptoHelper.decrypt(profileData, keys.masterPassword);
                profileData = JSON.parse(decryptedText);
              } catch (err) {
                console.error('Decryption failed for profile data:', err);
                throw new Error('E2EE_DECRYPTION_FAILED');
              }
            }

            if (profileData && !profileData.id && typeof profileData === 'object') {
              // Legacy single-row dictionary fallback
              Object.assign(cloudProfiles, profileData);
            } else if (row.profile_id) {
              cloudProfiles[row.profile_id] = profileData;
            } else if (profileData.id) {
              cloudProfiles[profileData.id] = profileData;
            }
          }
        }
      }

      const cloudData = {
        profiles: cloudProfiles,
        hotkeys: hotkeysData && hotkeysData[0] ? hotkeysData[0].hotkey_data : {},
        settings: settingsData && settingsData[0] ? settingsData[0].settings_data : {}
      };

      // Only update if we have cloud data
      if (
        (cloudData.profiles && Object.keys(cloudData.profiles).length > 0) ||
        (cloudData.hotkeys && Object.keys(cloudData.hotkeys).length > 0) ||
        (cloudData.settings && Object.keys(cloudData.settings).length > 0)
      ) {
        await chrome.storage.local.set({
          profiles: cloudData.profiles || {},
          hotkeys: cloudData.hotkeys || {},
          settings: cloudData.settings || {}
        });

        console.log('Data synced from cloud successfully');
        return { success: true, data: cloudData };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Cloud sync error:', error);

      if (error.message.includes('401')) {
        const newToken = await firebaseAuth.refreshToken();
        if (newToken) {
          return this.syncFromCloud(); // Retry with new token
        }
      }

      return { success: false, error: error.message };
    }
  }

  // Helper: Insert data to Supabase
  async insertData(table, data, token) {
    const url = `${supabaseConfig.supabaseUrl}/rest/v1/${table}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.supabaseKey
      },
      body: JSON.stringify(data)
    });
  }

  // Helper: Delete data from Supabase
  async deleteData(table, userId, token) {
    const url = `${supabaseConfig.supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}`;

    return fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.supabaseKey
      }
    });
  }

  // Helper: Upsert data to Supabase (deprecated, but keeping for reference)
  async upsertData(table, data, token) {
    const url = `${supabaseConfig.supabaseUrl}/rest/v1/${table}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.supabaseKey,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
  }

  // Helper: Fetch data from Supabase
  async fetchData(table, userId, token) {
    const url = `${supabaseConfig.supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}`;

    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.supabaseKey
      }
    });
  }

  async persistSchemaSupport() {
    await chrome.storage.local.set({ profileRowSchemaSupported: this.profileRowSchemaSupported });
  }

  async syncProfilesSingleRow(profileData, user) {
    const singleRow = {
      user_id: user.uid,
      profile_data: profileData
    };

    const patchResponse = await this.patchData('user_profiles', { user_id: user.uid }, singleRow, user.token);
    if (patchResponse.ok) {
      return patchResponse;
    }

    const upsertResponse = await this.upsertData('user_profiles', singleRow, user.token);
    if (!upsertResponse.ok) {
      const errorBody = await upsertResponse.json().catch(() => ({ message: 'Failed to parse error body' }));
      console.error('Single-row profile sync error:', upsertResponse.status, errorBody);
      throw new Error(`Failed to sync profiles: ${upsertResponse.status} - ${JSON.stringify(errorBody)}`);
    }

    return upsertResponse;
  }

  async syncProfilesSingleRowEncrypted(profileData, user, password) {
    const plaintext = JSON.stringify(profileData);
    const encryptedObj = await CryptoHelper.encrypt(plaintext, password);
    const singleRow = {
      user_id: user.uid,
      profile_data: { encrypted: true, ...encryptedObj }
    };

    const patchResponse = await this.patchData('user_profiles', { user_id: user.uid }, singleRow, user.token);
    if (patchResponse.ok) {
      return patchResponse;
    }

    const upsertResponse = await this.upsertData('user_profiles', singleRow, user.token);
    if (!upsertResponse.ok) {
      const errorBody = await upsertResponse.json().catch(() => ({ message: 'Failed to parse error body' }));
      console.error('Single-row encrypted profile sync error:', upsertResponse.status, errorBody);
      throw new Error(`Failed to sync profiles: ${upsertResponse.status} - ${JSON.stringify(errorBody)}`);
    }

    return upsertResponse;
  }

  async patchData(table, queryParams, data, token) {
    const url = `${supabaseConfig.supabaseUrl}/rest/v1/${table}?user_id=eq.${encodeURIComponent(queryParams.user_id)}`;
    return fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseConfig.supabaseKey
      },
      body: JSON.stringify(data)
    });
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

// Create global instance with alias for Firebase compatibility
const supabaseSync = new SupabaseSync();
const firebaseSync = supabaseSync;
