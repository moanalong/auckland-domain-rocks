# 🔥 Firebase Setup Instructions

## Step 1: Get Your Firebase Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project** (Auckland Rock Hunters)
3. **Click the gear icon** ⚙️ → "Project settings"
4. **Scroll down to "Your apps"**
5. **Click "Add app"** → **Web app** 🌐
6. **App nickname**: "Rock Hunter Web App"
7. **Click "Register app"**
8. **Copy the config object** that appears

## Step 2: Update firebase-config.js

Replace the placeholder values in `firebase-config.js` with your real config:

```javascript
const firebaseConfig = {
    apiKey: "AIza...", // Your actual API key
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};
```

## Step 3: Set Up Database & Storage

### Database (Firestore):
1. **In Firebase Console** → "Firestore Database"
2. **"Create database"** → **"Start in test mode"** → **"Next"**
3. **Location**: Choose "asia-southeast1 (Singapore)" → **"Done"**

### Storage:
1. **In Firebase Console** → "Storage"
2. **"Get started"** → **"Start in test mode"** → **"Next"**
3. **Location**: Same as above → **"Done"**

## What You'll Get:

✅ **Real-time sync** - Rocks appear instantly on all devices
✅ **Automatic photo storage** - No more manual file updates
✅ **Unlimited users** - Anyone can add/find rocks
✅ **Works offline** - Syncs when internet returns

## Current Status:

- ⚠️ App will show "Firebase not available, using JSON fallback" until you add the config
- ✅ Everything else works normally with the old system
- 🔥 Once config is added, you'll see "Using real Firebase!" in the logs

The app is ready - just need your Firebase keys! 🚀