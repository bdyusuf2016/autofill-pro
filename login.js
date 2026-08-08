// Login Page Logic

class LoginManager {
  constructor() {
    this.isLoggingIn = false;
    this.setupEventListeners();
    this.checkExistingUser();
  }

  setupEventListeners() {
    // Google Sign-In button
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleSignIn());
    }

    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('signupToggle').addEventListener('click', () => this.toggleForm());

    // Signup form
    document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
    document.getElementById('loginToggle').addEventListener('click', () => this.toggleForm());

    // Check password match on signup
    document.getElementById('confirmPassword').addEventListener('input', (e) => {
      if (e.target.value !== document.getElementById('signupPassword').value) {
        e.target.setCustomValidity('Passwords do not match');
      } else {
        e.target.setCustomValidity('');
      }
    });
  }

  async handleGoogleSignIn() {
    this.openGoogleAccountModal();
  }

  async openGoogleAccountModal() {
    const modal = document.getElementById('googleAccountModal');
    const listContainer = document.getElementById('googleAccountsList');
    const customEmailInput = document.getElementById('customGoogleEmail');
    const cancelBtn = document.getElementById('cancelGoogleModalBtn');
    const confirmBtn = document.getElementById('confirmGoogleModalBtn');

    if (!modal) return;

    modal.classList.remove('hidden');
    if (listContainer) listContainer.innerHTML = '';

    const accountsMap = new Map();

    // 1. Fetch from Chrome Profile Info
    if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getProfileUserInfo) {
      try {
        const info = await new Promise((resolve) => {
          chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (res) => resolve(res || {}));
        });
        if (info && info.email) {
          accountsMap.set(info.email, { email: info.email, title: info.email.split('@')[0], isCurrentChrome: true });
        }
      } catch (e) {}
    }

    // 2. Fetch from saved Google accounts in chrome.storage.local
    try {
      const storage = await chrome.storage.local.get(['googleAccounts', 'user']);
      if (storage.user && storage.user.email && storage.user.provider === 'google') {
        accountsMap.set(storage.user.email, { email: storage.user.email, title: storage.user.displayName || storage.user.email.split('@')[0] });
      }
      if (Array.isArray(storage.googleAccounts)) {
        storage.googleAccounts.forEach((em) => {
          if (em && typeof em === 'string' && !accountsMap.has(em)) {
            accountsMap.set(em, { email: em, title: em.split('@')[0] });
          }
        });
      }
    } catch (e) {}

    // 3. Fetch from main login form email input
    const typedEmail = document.getElementById('email')?.value.trim();
    if (typedEmail && this.isValidEmail(typedEmail) && !accountsMap.has(typedEmail)) {
      accountsMap.set(typedEmail, { email: typedEmail, title: typedEmail.split('@')[0] });
    }

    const detectedAccounts = Array.from(accountsMap.values());

    // Auto focus custom input
    if (customEmailInput) {
      const initialEmail = detectedAccounts.length > 0 ? detectedAccounts[0].email : '';
      customEmailInput.value = initialEmail;
      setTimeout(() => {
        customEmailInput.focus();
        if (initialEmail) customEmailInput.select();
      }, 100);
    }

    // Render Logged In & Saved Google Account Cards
    if (listContainer) {
      if (detectedAccounts.length > 0) {
        const header = document.createElement('div');
        header.style.fontSize = '12px';
        header.style.fontWeight = '600';
        header.style.color = '#5f6368';
        header.style.marginBottom = '6px';
        header.textContent = 'আপনার জানা/সংরক্ষিত Google Account-সমূহ:';
        listContainer.appendChild(header);

        detectedAccounts.forEach((acc) => {
          const card = document.createElement('div');
          card.className = 'google-acc-card';
          card.style.display = 'flex';
          card.style.alignItems = 'center';
          card.style.justifyContent = 'space-between';
          card.style.padding = '10px 12px';
          card.style.border = '1.5px solid #1a73e8';
          card.style.borderRadius = '8px';
          card.style.cursor = 'pointer';
          card.style.background = '#f0f7ff';
          card.style.transition = 'all 0.15s ease';

          card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: #1a73e8; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px;">
                ${acc.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 600; color: #202124;">${acc.title} ${acc.isCurrentChrome ? '<span style="font-size: 10px; background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 10px; margin-left: 4px;">Chrome Profile</span>' : ''}</div>
                <div style="font-size: 11px; color: #5f6368;">${acc.email}</div>
              </div>
            </div>
            <button type="button" style="padding: 5px 10px; border: none; background: #1a73e8; color: white; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer;">Sign in</button>
          `;

          card.addEventListener('click', () => {
            this.executeGoogleLogin(acc.email);
          });

          listContainer.appendChild(card);
        });
      }
    }

    // Handle Enter key in custom input
    if (customEmailInput) {
      customEmailInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmBtn.click();
        }
      };
    }

    cancelBtn.onclick = () => {
      modal.classList.add('hidden');
    };

    confirmBtn.onclick = () => {
      const emailToUse = customEmailInput?.value.trim();
      if (!emailToUse || !this.isValidEmail(emailToUse)) {
        this.showError('সঠিক Google Email এড্রেস প্রবেশ করান');
        return;
      }
      this.executeGoogleLogin(emailToUse);
    };
  }

  async executeGoogleLogin(email) {
    const modal = document.getElementById('googleAccountModal');
    if (this.isLoggingIn) return;
    this.isLoggingIn = true;

    try {
      this.showSuccess(`⏳ Google অ্যাকাউন্ট (${email}) দিয়ে সাইন ইন করা হচ্ছে...`);
      const result = await firebaseAuth.signInWithGoogle(email);

      if (result.success) {
        // Save email to googleAccounts history list in chrome.storage.local
        try {
          const storage = await chrome.storage.local.get(['googleAccounts']);
          let googleAccounts = storage.googleAccounts || [];
          if (!googleAccounts.includes(email)) {
            googleAccounts.unshift(email);
            await chrome.storage.local.set({ googleAccounts });
          }
        } catch (e) {}

        if (modal) modal.classList.add('hidden');
        this.showSuccess(`✅ Google অ্যাকাউন্ট (${result.user.email}) দিয়ে সফলভাবে সাইন ইন হয়েছে!`);
        setTimeout(() => {
          this.closeLoginPage();
        }, 800);
      } else {
        this.showError('❌ Google সাইন-ইন ব্যর্থ: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Google execution exception:', error);
      this.showError('❌ Google সাইন-ইন ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
    }
  }

  async executeGoogleLogin(email) {
    const modal = document.getElementById('googleAccountModal');
    if (this.isLoggingIn) return;
    this.isLoggingIn = true;

    try {
      this.showSuccess(`⏳ Google অ্যাকাউন্ট (${email}) দিয়ে সাইন ইন করা হচ্ছে...`);
      const result = await firebaseAuth.signInWithGoogle(email);

      if (result.success) {
        if (modal) modal.classList.add('hidden');
        this.showSuccess(`✅ Google অ্যাকাউন্ট (${result.user.email}) দিয়ে সফলভাবে সাইন ইন হয়েছে!`);
        setTimeout(() => {
          this.closeLoginPage();
        }, 800);
      } else {
        this.showError('❌ Google সাইন-ইন ব্যর্থ: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Google execution exception:', error);
      this.showError('❌ Google সাইন-ইন ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
    }
  }

  toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const infoBox = document.getElementById('infoBox');

    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';

    if (loginForm.style.display === 'none') {
      infoBox.textContent = 'Create a new account to get started';
      document.querySelector('.login-header p').textContent = 'Sign up for cloud sync';
    } else {
      infoBox.textContent = 'Login to sync your profiles across multiple devices';
      document.querySelector('.login-header p').textContent = 'Cloud Sync - Login to Your Account';
    }

    this.clearMessages();
  }

  async checkExistingUser() {
    const user = firebaseAuth.getCurrentUser();
    if (user) {
      // User already logged in, close login page
      this.closeLoginPage();
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    if (this.isLoggingIn) return;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
      this.showError('ইমেইল এবং পাসওয়ার্ড পূরণ করুন');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('ইমেইল ফরম্যাট ভুল');
      return;
    }

    this.isLoggingIn = true;
    this.setButtonLoading(document.getElementById('loginBtn'), true);

    try {
      console.log('Attempting login...');
      const result = await firebaseAuth.signin(email, password);

      if (result.success) {
        this.showSuccess('✅ লগইন সফল! আপনাকে রিডাইরেক্ট করা হচ্ছে...');
        setTimeout(() => {
          this.closeLoginPage();
        }, 800);
      } else {
        this.showError('❌ ' + (result.error || 'লগইন ব্যর্থ'));
      }
    } catch (error) {
      console.error('Login exception:', error);
      this.showError('❌ ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
      this.setButtonLoading(document.getElementById('loginBtn'), false);
    }
  }

  async handleSignup(e) {
    e.preventDefault();

    if (this.isLoggingIn) return;

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!email || !password || !confirmPassword) {
      this.showError('সব ফিল্ড পূরণ করুন');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('ইমেইল ফরম্যাট ভুল');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('পাসওয়ার্ড মেলে না');
      return;
    }

    if (password.length < 6) {
      this.showError('পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে');
      return;
    }

    this.isLoggingIn = true;
    this.setButtonLoading(document.getElementById('signupBtn'), true);

    try {
      console.log('Attempting signup...');
      const result = await firebaseAuth.signup(email, password, displayName);

      if (result.success) {
        this.showSuccess('✅ অ্যাকাউন্ট তৈরি সফল! আপনাকে রিডাইরেক্ট করা হচ্ছে...');
        setTimeout(() => {
          this.closeLoginPage();
        }, 800);
      } else {
        this.showError('❌ ' + (result.error || 'রেজিস্ট্রেশন ব্যর্থ'));
      }
    } catch (error) {
      console.error('Signup exception:', error);
      this.showError('❌ ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
      this.setButtonLoading(document.getElementById('signupBtn'), false);
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      const span = button.querySelector('span');
      button.innerHTML = '<div class="loading"></div>';
    } else {
      button.disabled = false;
      if (button.id === 'loginBtn') {
        button.innerHTML = '<span>Login</span>';
      } else {
        button.innerHTML = '<span>Create Account</span>';
      }
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }

  clearMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
  }

  closeLoginPage() {
    // Redirect to welcome page instead of closing
    window.location.href = chrome.runtime.getURL('welcome.html');

    // Option 2: Redirect to options page (backup)
    setTimeout(() => {
      chrome.runtime.openOptionsPage();
    }, 100);
  }
}

// Initialize login manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LoginManager();
});
