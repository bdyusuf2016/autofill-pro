// Supabase Authentication Module
// Handles user registration, login, and logout using Supabase Auth

class SupabaseAuth {
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

  // Sign up with email and password using Supabase
  async signup(email, password, displayName = "") {
    try {
      if (typeof supabaseConfig === 'undefined') {
        throw new Error('Supabase configuration not loaded');
      }

      console.log('Starting signup for:', email);

      const response = await fetch(
        `${supabaseConfig.supabaseUrl}/auth/v1/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.supabaseKey
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      console.log('Signup response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Full error response:', JSON.stringify(errorData, null, 2));

        // Try different error field names
        const errorMsg = errorData.error_description || errorData.msg || errorData.message || JSON.stringify(errorData);
        console.error('Error message:', errorMsg);

        if (errorMsg.includes('already registered') || errorMsg.includes('user already exists')) {
          throw new Error('এই ইমেইল ইতিমধ্যে রেজিস্ট্রার করা হয়েছে');
        } else if (errorMsg.includes('password') || errorMsg.includes('weak')) {
          throw new Error('পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে');
        } else if (errorMsg.includes('rate limit')) {
          throw new Error('অনেক চেষ্টা করেছেন। ১ ঘণ্টা পরে আবার চেষ্টা করুন');
        } else if (errorMsg.includes('invalid')) {
          throw new Error('ইমেইল বা পাসওয়ার্ড invalid');
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('Signup response data:', data);

      // Handle different response formats
      const user = data.user || data;
      const session = data.session || data;

      if (!user || !user.id || !user.email) {
        console.error('Invalid signup response structure:', data);
        throw new Error('Invalid response: missing user data');
      }

      this.currentUser = {
        uid: user.id,
        email: user.email,
        displayName: displayName || email.split('@')[0],
        token: session.access_token,
        refreshToken: session.refresh_token
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

  // Sign in with email and password using Supabase
  async signin(email, password) {
    try {
      if (typeof supabaseConfig === 'undefined') {
        throw new Error('Supabase configuration not loaded');
      }

      console.log('Starting signin for:', email);

      const response = await fetch(
        `${supabaseConfig.supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.supabaseKey
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      console.log('Signin response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Full error response:', JSON.stringify(errorData, null, 2));

        // Try different error field names
        const errorMsg = errorData.error_description || errorData.msg || errorData.message || JSON.stringify(errorData);
        console.error('Error message:', errorMsg);

        if (errorMsg.includes('not authorized') || errorMsg.includes('invalid')) {
          throw new Error('ইমেইল বা পাসওয়ার্ড ভুল');
        } else if (errorMsg.includes('rate limit')) {
          throw new Error('অনেক চেষ্টা করেছেন। ১ ঘণ্টা পরে আবার চেষ্টা করুন');
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('Signin response:', data);

      // Handle both response formats
      const user = data.user || data;
      const token = data.access_token || data.token;
      const refreshToken = data.refresh_token || data.refreshToken;

      if (!user || !user.id) {
        throw new Error('Invalid response: user id missing');
      }

      this.currentUser = {
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || email.split('@')[0],
        token: token,
        refreshToken: refreshToken
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
      callback(this.currentUser);
    });
  }

  // Refresh token if expired
  async refreshToken() {
    try {
      if (!this.currentUser || !this.currentUser.refreshToken) {
        return null;
      }

      const response = await fetch(
        `${supabaseConfig.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.supabaseKey
          },
          body: JSON.stringify({
            refresh_token: this.currentUser.refreshToken
          })
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      this.currentUser = {
        ...this.currentUser,
        token: data.access_token,
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
}

// Create global instance with alias for Firebase compatibility
const supabaseAuth = new SupabaseAuth();
const firebaseAuth = supabaseAuth;
