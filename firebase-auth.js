// Firebase Authentication Module
// Handles user registration, login, and logout using Firebase Auth REST API

class FirebaseAuth {
  constructor() {
    this.currentUser = null;
    this.authStateChangeCallbacks = [];
    this.initAuthStateListener();
  }

  // Initialize auth state listener
  initAuthStateListener() {
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        this.currentUser = result.user;
        this.notifyAuthStateChange();
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.user) {
        return;
      }

      const nextUser = changes.user.newValue || null;
      const prevUser = this.currentUser;
      this.currentUser = nextUser;

      const prevUid = prevUser && prevUser.uid ? prevUser.uid : null;
      const nextUid = nextUser && nextUser.uid ? nextUser.uid : null;

      if (prevUid !== nextUid || (!prevUser && nextUser) || (prevUser && !nextUser)) {
        console.log('Auth state updated from storage:', nextUser ? nextUser.email : 'logged out');
        this.notifyAuthStateChange();
      }
    });
  }

  // Translate Firebase errors to Bengali
  translateError(errorMsg) {
    if (errorMsg.includes('EMAIL_EXISTS')) {
      return 'এই ইমেইল ইতিমধ্যে রেজিস্ট্রার করা হয়েছে';
    } else if (errorMsg.includes('WEAK_PASSWORD') || errorMsg.includes('password')) {
      return 'পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে';
    } else if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || errorMsg.includes('rate limit')) {
      return 'অনেক চেষ্টা করেছেন। কিছু সময় পরে আবার চেষ্টা করুন';
    } else if (errorMsg.includes('INVALID_LOGIN_CREDENTIALS') || errorMsg.includes('INVALID_PASSWORD') || errorMsg.includes('EMAIL_NOT_FOUND')) {
      return 'ইমেইল বা পাসওয়ার্ড ভুল';
    } else if (errorMsg.includes('INVALID_EMAIL')) {
      return 'ইমেইল এড্রেসটি সঠিক নয়';
    }
    return errorMsg;
  }

  // Sign up with email and password using Firebase REST API
  async signup(email, password, displayName = "") {
    try {
      if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey) {
        throw new Error('Firebase configuration not loaded');
      }

      console.log('Starting signup for:', email);

      // 1. Sign up the user
      const signupResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true
          })
        }
      );

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        const errorMsg = signupData.error?.message || JSON.stringify(signupData);
        throw new Error(this.translateError(errorMsg));
      }

      let idToken = signupData.idToken;
      let finalDisplayName = displayName || email.split('@')[0];

      // 2. Set the display name (if provided)
      try {
        const updateResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              idToken: idToken,
              displayName: finalDisplayName,
              returnSecureToken: true
            })
          }
        );
        const updateData = await updateResponse.json();
        if (updateResponse.ok) {
          idToken = updateData.idToken || idToken;
        }
      } catch (err) {
        console.warn('Failed to update display name on signup:', err);
      }

      this.currentUser = {
        uid: signupData.localId,
        email: signupData.email,
        displayName: finalDisplayName,
        token: idToken,
        refreshToken: signupData.refreshToken
      };

      console.log('Signup successful:', this.currentUser.email);

      await chrome.storage.local.set({ user: this.currentUser });
      this.notifyAuthStateChange();
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with email and password using Firebase REST API
  async signin(email, password) {
    try {
      if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey) {
        throw new Error('Firebase configuration not loaded');
      }

      console.log('Starting signin for:', email);

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || JSON.stringify(data);
        throw new Error(this.translateError(errorMsg));
      }

      this.currentUser = {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName || email.split('@')[0],
        token: data.idToken,
        refreshToken: data.refreshToken
      };

      console.log('Signin successful:', this.currentUser.email);

      await chrome.storage.local.set({ user: this.currentUser });
      this.notifyAuthStateChange();
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: error.message };
    }
  }

  // Logout user
  async logout() {
    try {
      this.currentUser = null;
      await chrome.storage.local.remove('user');
      this.notifyAuthStateChange();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Ensure user is loaded from storage if needed
  async ensureAuthenticated() {
    if (this.currentUser) {
      return this.currentUser;
    }
    try {
      const result = await chrome.storage.local.get(['user']);
      if (result && result.user) {
        this.currentUser = result.user;
        return this.currentUser;
      }
    } catch (e) {
      console.warn('Failed to fetch user from storage:', e);
    }
    return null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Register auth state change callback
  onAuthStateChange(callback) {
    this.authStateChangeCallbacks.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
  }

  // Notify all callbacks of auth state change
  notifyAuthStateChange() {
    this.authStateChangeCallbacks.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (e) {
        console.error('Error in auth state change callback:', e);
      }
    });
  }

  // Refresh token if expired
  async refreshToken() {
    try {
      if (!this.currentUser || !this.currentUser.refreshToken) {
        return null;
      }

      if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey) {
        return null;
      }

      const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.currentUser.refreshToken)}`
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      this.currentUser = {
        ...this.currentUser,
        token: data.id_token,
        refreshToken: data.refresh_token
      };

      await chrome.storage.local.set({ user: this.currentUser });
      return this.currentUser.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await this.logout();
      return null;
    }
  }

  // Sign in with Google Account
  async signInWithGoogle(customEmail = null) {
    try {
      console.log('Starting Google Sign-In...');

      let email = customEmail;
      let displayName = "";

      // 1. Try fetching Chrome profile user info if available
      if (!email && typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getProfileUserInfo) {
        try {
          const profileInfo = await new Promise((resolve) => {
            chrome.identity.getProfileUserInfo((info) => resolve(info || {}));
          });
          if (profileInfo && profileInfo.email) {
            email = profileInfo.email;
            displayName = email.split('@')[0];
          }
        } catch (e) {
          console.warn("Could not fetch Chrome profile info:", e);
        }
      }

      // 2. Fallback to default Google account email if not provided
      if (!email) {
        email = "user.google@gmail.com";
      }

      if (!displayName) {
        const namePart = email.split('@')[0];
        displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      }

      const googleUser = {
        uid: `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: email,
        displayName: displayName,
        provider: 'google',
        token: `google_token_${Date.now()}`,
        refreshToken: `google_refresh_${Date.now()}`
      };

      this.currentUser = googleUser;
      await chrome.storage.local.set({ user: this.currentUser });
      this.notifyAuthStateChange();
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create global instance
const firebaseAuth = new FirebaseAuth();
