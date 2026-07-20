# Registration Troubleshooting Guide (রেজিস্ট্রেশন সমস্যা সমাধান)

## ✅ আপনার সেটআপ চেক করুন

### 1️⃣ Supabase Configuration চেক করুন
- [ ] supabase-config.js এ সব ফিল্ড ভরা আছে?
- [ ] supabaseUrl সঠিক?
- [ ] supabaseKey সঠিক?

### 2️⃣ Supabase Console-এ চেক করুন
- [ ] Authentication > Providers > Email **এনাবল** করা আছে?
- [ ] Database Table `user_profiles` তৈরি করা আছে?
- [ ] RLS (Row Level Security) পলিসি সেট করা আছে?

---

## 🔍 Registration Error Messages

### Error: "EMAIL_EXISTS" / "User already registered"
**অর্থ**: এই ইমেইল ইতিমধ্যে রেজিস্টার করা
**সমাধান**: 
- অন্য ইমেইল ব্যবহার করুন
- অথবা "Sign in" ব্যবহার করুন

### Error: Network/CORS Issues
**অর্থ**: ইন্টারনেট সংযোগ সমস্যা বা API URL ভুল
**সমাধান**:
- ইন্টারনেট সংযোগ চেক করুন
- `supabase-config.js` এ API URL এবং Key পুনরায় চেক করুন

---

## 🛠️ ডিবাগিং ধাপ

### স্টেপ 1: Browser Console খুলুন
1. Login Page খোলা থাকলে **F12** চাপুন
2. **Console** ট্যাবে যান
3. সব এরর মেসেজ দেখুন

### স্টেপ 2: supabase-config.js চেক করুন
```javascript
// এটি দেখতে হবে:
const supabaseConfig = {
  supabaseUrl: "https://prsghqqtlgkjjmywmvgw.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1..."
};
```

---

## কমান্ড দিয়ে Test করুন (Chrome DevTools Console)

```javascript
// আপনার বর্তমান ইউজার চেক করুন
supabaseAuth.getCurrentUser()

// লগ আউট করুন
supabaseAuth.logout()

// Supabase Config চেক করুন
console.log(supabaseConfig)

// Sync স্ট্যাটাস চেক করুন
console.log(supabaseSync.isSyncActive())
```

---

**আপনার Supabase Config সঠিক আছে!** ✅
এখন রেজিস্ট্রেশন চেষ্টা করুন এবং আমাকে যে এরর পান তা জানান।
