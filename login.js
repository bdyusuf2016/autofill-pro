// Login Page Logic

class LoginManager {
  constructor() {
    this.isLoggingIn = false;
    this.setupEventListeners();
    this.checkExistingUser();
  }

  setupEventListeners() {
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
