// Safe initialization script
// Prevents errors when scripts load in different contexts

// Resolve the global object depending on the context (window in pages, self in service worker)
const globalObject = (typeof window !== 'undefined') ? window : (typeof self !== 'undefined' ? self : globalThis);

// 1. Ensure firebaseConfig is defined with built-in default values
if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey) {
  console.log("ℹ️ Using built-in Firebase configuration");
  globalObject.firebaseConfig = {
    apiKey: "AIzaSyBzjSgCHCSZphK3DPYWaCUIEk1gIos6JXk",
    databaseURL: "https://autofill-55fb6-default-rtdb.firebaseio.com"
  };
}

// 2. Ensure firebaseAuth is defined (compatibility alias for supabaseAuth)
if (typeof firebaseAuth === 'undefined') {
  console.warn("⚠️ firebaseAuth not loaded - Using dummy implementation");
  globalObject.firebaseAuth = {
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
  globalObject.firebaseSync = {
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

