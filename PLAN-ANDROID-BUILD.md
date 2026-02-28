# Plan: Android Build via Capacitor

## Overview

Wrap the existing React + Vite web app in a native Android shell using **Capacitor**.
The React app stays 100% unchanged — Capacitor adds a thin native layer around it.

---

## Compatibility Assessment

### What already works in Android WebView (no changes needed)
- **localStorage** — Capacitor WebView supports it natively
- **Zustand persist middleware** — uses localStorage, works as-is
- **Web Audio API** — Chrome-based WebView supports it (Android 5+)
- **WebGL / OGL shaders** — background shader works in modern Android WebView
- **Tailwind CSS v4** — pure CSS, fully compatible
- **Motion (framer-motion)** — CSS/JS animations, works as-is
- **CSS custom properties** — supported in all modern Android WebView
- **Viewport units (vw/vh)** — supported

### What needs minor attention
- **Google Fonts (Press Start 2P)** — loads from CDN; should bundle locally for offline play
- **AudioContext init** — Android requires a user gesture before creating AudioContext (already handled — `initContext()` is called lazily on first sound play which happens after user taps)
- **Safe area insets** — need CSS tweaks for notches/navigation bars on modern Android phones
- **Touch targets** — some buttons may be too small for touch; audit needed
- **Splash screen / app icon** — need to create Android-appropriate assets

---

## Implementation Steps

### Step 1: Install Capacitor dependencies
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "New Eleusis" "com.neweleusis.app" --web-dir dist
```

This creates `capacitor.config.ts` at the project root. No changes to existing code.

### Step 2: Add Android platform
```bash
npm install @capacitor/android
npx cap add android
```

This creates the `android/` directory with a full Android Studio project. The web app
gets loaded inside a WebView in `MainActivity`.

### Step 3: Configure Capacitor
Update `capacitor.config.ts`:
```typescript
import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.neweleusis.app',
  appName: 'New Eleusis',
  webDir: 'dist',
  server: {
    // Allow inline audio (Web Audio API)
    androidScheme: 'https'
  },
  android: {
    // Allow WebGL
    webContentsDebuggingEnabled: true  // remove for production
  }
};

export default config;
```

### Step 4: Update Vite config for Capacitor
Ensure the build output works correctly inside the Android WebView:
```typescript
// vite.config.ts — add base path
export default defineConfig({
  plugins: [react()],
  base: './',  // relative paths for Capacitor
})
```

### Step 5: Bundle the Google Font locally
Download `Press Start 2P` and serve it from `public/fonts/` instead of loading from
Google Fonts CDN. This ensures the app works offline.

- Download the font files (woff2)
- Add `@font-face` declaration in CSS
- Update `index.html` to remove the Google Fonts `<link>` tags

### Step 6: Add safe area CSS
Add to the app's global CSS:
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

Update `index.html`:
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />
```

### Step 7: Add Android app icon and splash screen
Install the Capacitor splash screen plugin:
```bash
npm install @capacitor/splash-screen
```

Create icon assets:
- `resources/icon.png` — 1024x1024 app icon
- `resources/splash.png` — 2732x2732 splash screen

Generate platform assets:
```bash
npx capacitor-assets generate
```

### Step 8: Audit touch targets
Review all interactive elements to ensure they meet the 48x48dp minimum touch
target size recommended by Android. Key components to check:
- `Card.tsx` — card tap targets
- `PlayerHand.tsx` — card selection
- `StartMenu.tsx` — buttons
- `SettingsPanel.tsx` — checkboxes, range slider, speed buttons
- `Scoreboard.tsx` — collapsible sections

### Step 9: Build and sync workflow
The dev/build workflow becomes:
```bash
# Build the web app
npm run build

# Copy web assets into the Android project
npx cap sync android

# Open in Android Studio for testing/building
npx cap open android
```

For development with live reload:
```bash
npm run dev
# In capacitor.config.ts, temporarily set:
#   server: { url: 'http://YOUR_LOCAL_IP:5173' }
npx cap run android
```

### Step 10: Add to `.gitignore`
```
# Capacitor Android
android/app/build/
android/.gradle/
android/local.properties
```

The `android/` directory itself SHOULD be committed (it contains platform config,
manifest, icons, etc.).

---

## What Does NOT Change
- All files in `src/engine/` — untouched
- All files in `src/store/` — untouched
- All files in `src/components/` — untouched (except minor CSS for safe areas)
- All files in `src/audio/` — untouched
- All tests — untouched and still pass
- The web version — `npm run dev` and `npm run build` still produce the web app exactly as before

---

## Build Outputs
- **Web**: `npm run build` → `dist/` folder (deploy anywhere)
- **Android**: `npm run build && npx cap sync android` → open Android Studio → Build APK

---

## Dependencies Added
| Package | Purpose | Size impact |
|---|---|---|
| `@capacitor/core` | Runtime bridge (JS side) | ~15 KB |
| `@capacitor/cli` | Build tooling (dev only) | Dev only |
| `@capacitor/android` | Android platform files | Native only |
| `@capacitor/splash-screen` | Splash screen on launch | ~5 KB |

Total impact on web bundle: ~15 KB (just `@capacitor/core`).

---

## Requirements
- **Android Studio** installed (for building the APK)
- **Java 17+** (required by Android Gradle)
- **Android SDK 24+** (Android 7.0 minimum — covers 97%+ of devices)

---

## Optional Future Enhancements (not in this plan)
- Haptic feedback on card plays (`@capacitor/haptics`)
- Status bar color matching the app theme (`@capacitor/status-bar`)
- Keep screen awake during gameplay (`@capacitor/keep-awake`)
- Play Store listing and signing configuration
