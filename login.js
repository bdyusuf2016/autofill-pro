// Login Page Logic

class LoginManager {
  constructor() {
    this.isLoggingIn = false;
    this.setupEventListeners();
    this.checkExistingUser();
  }

  setupEventListeners() {
    // Tabs
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    if (tabLogin) {
      tabLogin.addEventListener('click', () => this.showView('login'));
    }
    if (tabSignup) {
      tabSignup.addEventListener('click', () => this.showView('signup'));
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    // Forgot password
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', () => this.showView('reset'));
    }
    const backFromReset = document.getElementById('backToLoginFromReset');
    if (backFromReset) {
      backFromReset.addEventListener('click', () => this.showView('login'));
    }
    const resetForm = document.getElementById('forgotPasswordForm');
    if (resetForm) {
      resetForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
    }

    // Google Sign-In button
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleLogin());
    }

    // Check password match on signup
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', (e) => {
        const signupPass = document.getElementById('signupPassword')?.value;
        if (e.target.value !== signupPass) {
          e.target.setCustomValidity('পাসওয়ার্ড মিলছে না');
        } else {
          e.target.setCustomValidity('');
        }
      });
    }
  }

  showView(viewName) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const resetForm = document.getElementById('forgotPasswordForm');
    const infoBox = document.getElementById('infoBox');
    const authTabs = document.getElementById('authTabs');
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const headerSubtitle = document.getElementById('headerSubtitle');

    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';

    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.remove('active');

    if (viewName === 'signup') {
      if (signupForm) signupForm.style.display = 'block';
      if (authTabs) authTabs.style.display = 'flex';
      if (tabSignup) tabSignup.classList.add('active');
      if (infoBox) infoBox.textContent = '💡 নতুন অ্যাকাউন্ট খুলে বিনামূল্যে সব প্রোফাইল ক্লাউডে সিঙ্ক করুন।';
      if (headerSubtitle) headerSubtitle.textContent = 'নতুন অ্যাকাউন্ট তৈরি করুন';
    } else if (viewName === 'reset') {
      if (resetForm) resetForm.style.display = 'block';
      if (authTabs) authTabs.style.display = 'none';
      if (infoBox) infoBox.textContent = '✉️ আপনার নিবন্ধিত ইমেইলে পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে।';
      if (headerSubtitle) headerSubtitle.textContent = 'পাসওয়ার্ড রিসেট';
    } else {
      // default: login
      if (loginForm) loginForm.style.display = 'block';
      if (authTabs) authTabs.style.display = 'flex';
      if (tabLogin) tabLogin.classList.add('active');
      if (infoBox) infoBox.textContent = '💡 লগইন করলে আপনার সব প্রোফাইল ক্লাউডে নিরাপদে সেভ থাকবে।';
      if (headerSubtitle) headerSubtitle.textContent = 'ক্লাউড সিঙ্ক এবং প্রোফাইল ব্যাকআপ';
    }

    this.clearMessages();
  }

  async handleForgotPassword(e) {
    e.preventDefault();
    if (this.isLoggingIn) return;

    const email = document.getElementById('resetEmail')?.value.trim();
    if (!email) {
      this.showError('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল এড্রেস প্রবেশ করান');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('ইমেইল ফরম্যাট সঠিক নয়');
      return;
    }

    const resetBtn = document.getElementById('resetPasswordBtn');
    this.isLoggingIn = true;
    this.setButtonLoading(resetBtn, true, 'রিসেট লিঙ্ক পাঠান');

    try {
      const result = await firebaseAuth.sendPasswordResetEmail(email);
      if (result.success) {
        this.showSuccess(`✅ পাসওয়ার্ড রিসেট লিঙ্ক "${email}"-এ পাঠানো হয়েছে! আপনার ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।`);
        setTimeout(() => {
          this.showView('login');
        }, 3500);
      } else {
        this.showError('❌ ' + (result.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে'));
      }
    } catch (error) {
      this.showError('❌ ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
      this.setButtonLoading(resetBtn, false, 'রিসেট লিঙ্ক পাঠান');
    }
  }

  async checkExistingUser() {
    const user = firebaseAuth.getCurrentUser();
    if (user) {
      this.closeLoginPage();
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    if (this.isLoggingIn) return;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      this.showError('ইমেইল এবং পাসওয়ার্ড প্রবেশ করান');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('ইমেইল এড্রেসটি সঠিক নয়');
      return;
    }

    const loginBtn = document.getElementById('loginBtn');
    this.isLoggingIn = true;
    this.setButtonLoading(loginBtn, true, 'লগইন করুন');

    try {
      console.log('Attempting login for:', email);
      const result = await firebaseAuth.signin(email, password);

      if (result.success) {
        this.showSuccess('✅ লগইন সফল! রিডাইরেক্ট করা হচ্ছে...');
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
      this.setButtonLoading(loginBtn, false, 'লগইন করুন');
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
      this.showError('সবগুলো ফিল্ড সঠিকভাবে পূরণ করুন');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('ইমেইল এড্রেসটি সঠিক নয়');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('পাসওয়ার্ড মিলছে না');
      return;
    }

    if (password.length < 6) {
      this.showError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    const signupBtn = document.getElementById('signupBtn');
    this.isLoggingIn = true;
    this.setButtonLoading(signupBtn, true, 'অ্যাকাউন্ট তৈরি করুন');

    try {
      console.log('Attempting signup for:', email);
      const result = await firebaseAuth.signup(email, password, displayName);

      if (result.success) {
        this.showSuccess('✅ অ্যাকাউন্ট তৈরি সফল! রিডাইরেক্ট করা হচ্ছে...');
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
      this.setButtonLoading(signupBtn, false, 'অ্যাকাউন্ট তৈরি করুন');
    }
  }

  async handleGoogleLogin() {
    if (this.isLoggingIn) return;
    const googleBtn = document.getElementById('googleSignInBtn');
    this.isLoggingIn = true;
    this.setButtonLoading(googleBtn, true, 'Google দিয়ে সাইন ইন করুন');

    try {
      this.showSuccess('⏳ Google সাইন-ইন উইন্ডো খোলা হচ্ছে...');
      const result = await firebaseAuth.signInWithGoogle();

      if (result && result.success) {
        this.showSuccess(`✅ Google অ্যাকাউন্ট (${result.user.email}) দিয়ে সফলভাবে সাইন ইন হয়েছে!`);
        setTimeout(() => {
          this.closeLoginPage();
        }, 800);
      } else {
        this.showError('❌ Google সাইন-ইন ব্যর্থ: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Google execution exception:', error);
      this.showError('❌ Google সাইন-ইন ত্রুটি: ' + error.message);
    } finally {
      this.isLoggingIn = false;
      this.setButtonLoading(googleBtn, false, 'Google দিয়ে সাইন ইন করুন');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setButtonLoading(button, isLoading, defaultText = 'সাবমিট') {
    if (!button) return;
    if (isLoading) {
      button.disabled = true;
      button.innerHTML = '<div class="loading"></div>';
    } else {
      button.disabled = false;
      button.innerHTML = `<span>${defaultText}</span>`;
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    const successDiv = document.getElementById('successMessage');
    if (successDiv) successDiv.style.display = 'none';
  }

  showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (!successDiv) return;
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
  }

  clearMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
  }

  closeLoginPage() {
    window.location.href = chrome.runtime.getURL('welcome.html');
  }
}

// Initialize login manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LoginManager();
});
