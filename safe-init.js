// Safe initialization script
// Prevents errors when scripts load in different contexts

// 1. Ensure firebaseConfig is defined
if (typeof firebaseConfig === 'undefined') {
  console.warn("⚠️ firebaseConfig not loaded - Cloud sync will be disabled");
  window.firebaseConfig = {
    apiKey: "",
    databaseURL: ""
  };
}

// 2. Ensure firebaseAuth is defined (compatibility alias for supabaseAuth)
if (typeof firebaseAuth === 'undefined') {
  console.warn("⚠️ firebaseAuth not loaded - Using dummy implementation");
  window.firebaseAuth = {
    isAuthenticated: () => false,
    getCurrentUser: () => null,
    signin: async () => ({ success: false, error: 'Not available' }),
    signup: async () => ({ success: false, error: 'Not available' }),
    logout: async () => ({ success: false, error: 'Not available' }),
    onAuthStateChange: (cb) => cb(null),
    refreshToken: async () => null
  };
}

// 3. Ensure firebaseSync is defined (compatibility alias for supabaseSync)
if (typeof firebaseSync === 'undefined') {
  console.warn("⚠️ firebaseSync not loaded - Using dummy implementation");
  window.firebaseSync = {
    isSyncActive: () => false,
    enableSync: async () => ({ success: false, error: 'Not available' }),
    disableSync: async () => ({ success: false, error: 'Not available' }),
    syncToCloud: async () => ({ success: false, error: 'Not available' }),
    syncFromCloud: async () => ({ success: false, error: 'Not available' }),
    startAutoSync: () => {},
    stopAutoSync: () => {},
    getLastSyncTime: () => null,
    isSyncEnabled: false
  };
}

console.log("✅ Safe initialization complete");

