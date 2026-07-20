// CryptoHelper - Web Crypto API wrapper for AES-GCM encryption/decryption
// Using PBKDF2 for key derivation

class CryptoHelper {
  // Helper to convert string to Uint8Array
  static strToBuf(str) {
    return new TextEncoder().encode(str);
  }

  // Helper to convert Uint8Array to string
  static bufToStr(buf) {
    return new TextDecoder().decode(buf);
  }

  // Helper to convert Uint8Array to Base64 string
  static bufToBase64(buf) {
    const binary = String.fromCharCode.apply(null, new Uint8Array(buf));
    return btoa(binary);
  }

  // Helper to convert Base64 string to Uint8Array
  static base64ToBuf(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Derives an AES-GCM key from password and salt using PBKDF2
  static async deriveKey(password, saltBuf) {
    const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) ? (window.crypto || window.msCrypto) : (typeof self !== 'undefined' ? self.crypto : global.crypto);
    const subtle = cryptoObj.subtle;

    const baseKey = await subtle.importKey(
      "raw",
      this.strToBuf(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuf,
        iterations: 100000,
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypts text using password
  static async encrypt(text, password) {
    try {
      const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) ? (window.crypto || window.msCrypto) : (typeof self !== 'undefined' ? self.crypto : global.crypto);
      const subtle = cryptoObj.subtle;

      // 1. Generate salt and IV
      const salt = cryptoObj.getRandomValues(new Uint8Array(16));
      const iv = cryptoObj.getRandomValues(new Uint8Array(12));

      // 2. Derive key from password
      const key = await this.deriveKey(password, salt);

      // 3. Encrypt plaintext
      const plaintextBuf = this.strToBuf(text);
      const ciphertextBuf = await subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        plaintextBuf
      );

      // 4. Return serialized Base64 representations
      return {
        ciphertext: this.bufToBase64(ciphertextBuf),
        iv: this.bufToBase64(iv),
        salt: this.bufToBase64(salt)
      };
    } catch (e) {
      console.error("Encryption failed:", e);
      throw new Error("Encryption failed: " + e.message);
    }
  }

  // Decrypts data using password
  static async decrypt(encryptedObj, password) {
    try {
      const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) ? (window.crypto || window.msCrypto) : (typeof self !== 'undefined' ? self.crypto : global.crypto);
      const subtle = cryptoObj.subtle;

      // 1. Parse base64 values back to Uint8Arrays
      const ciphertext = this.base64ToBuf(encryptedObj.ciphertext);
      const iv = this.base64ToBuf(encryptedObj.iv);
      const salt = this.base64ToBuf(encryptedObj.salt);

      // 2. Derive key from password and salt
      const key = await this.deriveKey(password, salt);

      // 3. Decrypt ciphertext
      const decryptedBuf = await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        ciphertext
      );

      // 4. Return plaintext string
      return this.bufToStr(decryptedBuf);
    } catch (e) {
      console.error("Decryption failed:", e);
      throw new Error("Decryption failed. Please verify your Master Password.");
    }
  }
}

// Export class if running in a node environment for testing, otherwise declare on window/global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoHelper;
} else if (typeof window !== 'undefined') {
  window.CryptoHelper = CryptoHelper;
} else {
  self.CryptoHelper = CryptoHelper;
}
