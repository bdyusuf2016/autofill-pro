# ⚡ AutoFill Pro

AutoFill Pro is a premium, secure, and feature-rich Chrome Extension (Manifest V3) designed to accelerate form filling. It is highly optimized for applicant profiles on recruitment portals (specifically `*.teletalk.com.bd`), featuring advanced select dropdown matching, point-and-click visual capture overlays, custom CSS/XPath matching, and secure End-to-End Encrypted (E2EE) cloud synchronization.

---

## ✨ Key Features

### 📸 Visual Form Capture
- **Point-and-Click Interface**: Capture form inputs, textareas, selects, and checkboxes interactively directly on the webpage.
- **Unique Selector Resolution**: Automatically generates optimized CSS Selectors and XPaths for perfect target element recovery.

### 🔐 Client-Side End-to-End Encryption (E2EE)
- **Zero-Knowledge Encryption**: Profile data is encrypted locally inside the extension using `AES-GCM 256-bit` before upload.
- **Secure Key Derivation**: Derives encryption keys using `PBKDF2` with `100,000` iterations and `SHA-256` from a user-provided Master Password.

### ☁️ Supabase Cloud Sync
- **Cross-Device Sync**: Log in and sync your profiles across multiple computers securely.
- **Auto-Sync Engine**: Periodically backups your changes every 5 minutes or offers instant manual sync triggers.
- **Flexible Schema Fallbacks**: Adapts seamlessly to both row-per-profile databases and serialized single-row tables.

### 🎯 Multi-Tier Dropdown Matching
- Matches dropdown options dynamically in 4 tiers:
  1. Exact option value.
  2. Exact option text.
  3. Option text starts-with.
  4. Option text substring (avoiding short false-match cases).

### ⚡ Framework & Portal Optimizations
- **Teletalk Captcha Highlights**: Auto-focuses and adds visual highlights to captcha input fields on Bangladeshi government job portals.
- **Modern Framework Support**: Dispatches native DOM focus, input, click, change, and blur events, bypassing React's internal value trackers for clean form validation.

---

## 🚀 Setup & Installation

### Developer Installation
1. Download the latest `autofill-pro-v2.3.zip` from the **Releases** section and extract it.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch at the top right.
4. Click **Load unpacked** and select the extracted extension folder.

### Supabase Backend Setup
To enable Cloud Sync, create a project on [Supabase](https://supabase.com) and run the following queries in the SQL Editor to construct the database schema and Row-Level Security policies:

```sql
-- Create user profiles table
create table user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id text not null,
  name text not null,
  fields jsonb not null,
  color text,
  default_mode text,
  url_rules jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, profile_id)
);

-- Enable RLS
alter table user_profiles enable row level security;

-- Create access policies
create policy "Users can perform all actions on their own profiles"
  on user_profiles for all
  using (auth.uid() = user_id);
```

Configure your credentials inside `supabase-config.js`:
```javascript
const supabaseConfig = {
  supabaseUrl: "https://your-supabase-url.supabase.co",
  supabaseKey: "your-anon-public-key"
};
```

---

## 🌐 Localization Support
AutoFill Pro supports multilingual operations:
- 🇬🇧 English
- 🇧🇩 Bengali

Switch languages easily under the **Settings** tab in the extension options page.

---

## 🧪 Development & Testing
To run mock validation tests locally (validating element querying, E2EE routines, and form-fill events), execute:
```bash
node scratch/test_autofill.js
```

---
*Created by Yusuf Computer & IT. Designed for maximum efficiency and security.*
