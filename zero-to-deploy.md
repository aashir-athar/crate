# 🚀 Crate — Zero to Deploy

A practical, copy-paste path from a fresh clone to the App Store and Google Play. Crate uses native modules, so **Expo Go will not work** — every step below uses a custom dev client / EAS build.

---

## 0. Prerequisites

- **Node.js 20+** and npm
- **EAS CLI**: `npm install -g eas-cli`
- An [Expo account](https://expo.dev) (`eas login`)
- **iOS:** macOS + Xcode + an Apple Developer account ($99/yr)
- **Android:** Android Studio + a Google Play Developer account ($25 one-time)

---

## 1. Clone & install

```bash
git clone https://github.com/aashir-athar/crate.git
cd crate
npm install
```

---

## 2. Configure

- **Bundle identifiers** are already set in `app.json` (`com.aashirathar.crate`). Change them to your own org if publishing yourself.
- **Jamendo:** Internet Archive & Audius need no key. For Jamendo, get a free `client_id` at [devportal.jamendo.com](https://devportal.jamendo.com) and paste it into **Settings → Jamendo client ID** in the running app (it is stored locally, never committed).

---

## 3. Run locally (dev client)

```bash
# Android (device or emulator)
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

This compiles the native dev client and launches Metro. Re-run only when native dependencies change; otherwise `npx expo start --dev-client` is enough.

> Background playback, lock-screen controls, and background sync only fully work on a **physical device**.

---

## 4. Replace the app icon

The repo ships Expo's placeholder icon. Generate Crate's icon from [`assets/icon-prompts.json`](assets/icon-prompts.json) (Nano Banana Pro), background-remove the flat green, then export:

- `assets/images/icon.png` — 1024×1024
- `assets/images/android-icon-foreground.png` — 1024×1024 (transparent)
- adaptive background color is already `#0B0A0A` in `app.json`

---

## 5. Set up EAS

```bash
eas login
eas build:configure
```

This creates `eas.json`. A good starting profile set:

```jsonc
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

---

## 6. Internal builds (share with testers)

```bash
# A shareable dev client / preview build
eas build --profile preview --platform android   # installable APK
eas build --profile preview --platform ios        # ad-hoc / TestFlight-ready
```

---

## 7. Production builds

```bash
eas build --profile production --platform all
```

---

## 8. Submit to the stores

```bash
# Google Play (first submit may require manual Play Console setup)
eas submit --profile production --platform android

# Apple App Store / TestFlight
eas submit --profile production --platform ios
```

---

## 9. Over-the-air updates

JavaScript-only changes ship instantly without a store review:

```bash
eas update --branch production --message "Fix sync edge case"
```

(Native dependency changes still require a new store build.)

---

## ✅ Pre-submission checklist

- [ ] App icon + splash replaced (no Expo placeholders)
- [ ] Privacy: Crate collects **no** personal data and requires **no** account — declare "No data collected" in App Privacy / Data Safety
- [ ] **Background audio justification** (iOS): the app plays user-downloaded music in the background (`UIBackgroundModes: ["audio"]`)
- [ ] **Background processing** (iOS `BGTaskScheduler`) is for playlist sync
- [ ] Licensing copy present (the Settings → About & licensing screen lists each source's terms)
- [ ] `npx tsc --noEmit` clean and `npx expo-doctor` green
- [ ] Tested on a physical iOS and Android device (playback, lock screen, sync, downloads)
- [ ] Store listing makes clear this is a Creative Commons / public-domain music player (avoids "Spotify downloader" rejection)

---

Built by [aashir-athar](https://github.com/aashir-athar).
