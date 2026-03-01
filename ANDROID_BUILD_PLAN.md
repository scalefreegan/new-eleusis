# Android Build Plan — New Eleusis

## Approach: Capacitor (by Ionic)

Capacitor wraps the existing Vite/React web app in a native Android WebView, giving us Play Store distribution with minimal code changes. The game engine, UI components, animations, audio, and shaders all run as-is inside the WebView.

---

## Prerequisites

- **Android Studio** (latest stable) with Android SDK 33+
- **Java JDK 17+**
- **Node.js 18+** (already in use)
- **Gradle** (bundled with Android Studio)

---

## Phase 1: Capacitor Setup

### 1.1 Install Capacitor dependencies

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar  # optional native plugins
```

### 1.2 Initialize Capacitor

```bash
npx cap init "New Eleusis" com.neweleusis.app --web-dir dist
```

This creates `capacitor.config.ts` at the project root. The key setting is `webDir: 'dist'` pointing to Vite's build output.

### 1.3 Capacitor config

Create/edit `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neweleusis.app',
  appName: 'New Eleusis',
  webDir: 'dist',
  server: {
    // Enable during development to load from Vite dev server
    // url: 'http://10.0.2.2:5173',  // Android emulator localhost alias
    // cleartext: true,
  },
  android: {
    // WebView settings for optimal game performance
    backgroundColor: '#1a0f2e',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1a0f2e',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      launchShowDuration: 1500,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a0f2e',
    },
  },
};

export default config;
```

### 1.4 Add Android platform

```bash
npm run build          # Build the web app first
npx cap add android    # Creates android/ directory with native project
npx cap sync           # Copies dist/ into the Android project
```

---

## Phase 2: Web App Adaptations

### 2.1 Viewport and mobile meta tags

Update `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#1a0f2e" />
<meta name="mobile-web-app-capable" content="yes" />
```

The `user-scalable=no` prevents accidental pinch-zoom during card interactions. The `viewport-fit=cover` handles Android notch/cutout areas.

### 2.2 Safe area insets

Add to `src/styles/globals.css`:

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

body {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
}
```

### 2.3 Touch interaction improvements

The current CSS has hover states that won't work well on touch. Add touch-specific styles:

```css
@media (hover: none) and (pointer: coarse) {
  /* Disable hover effects on touch devices */
  .card:hover { transform: none; }

  /* Increase tap targets to 44px minimum */
  button { min-height: 44px; min-width: 44px; }
}
```

### 2.4 WebGL compatibility check

The OGL background shader should work on modern Android WebViews (Chrome-based), but add a fallback in `src/shaders/background.ts`:

```typescript
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

// Use CSS gradient fallback if WebGL unavailable
```

### 2.5 Audio context resume on user gesture

Android WebView requires user interaction before audio can play. The existing Web Audio code in `src/audio/sounds.ts` may need:

```typescript
// Ensure AudioContext is resumed on first user tap
document.addEventListener('touchstart', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}, { once: true });
```

### 2.6 Back button handling

Android hardware/gesture back button should be handled:

```typescript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  // If in game, show confirm dialog
  // If on start menu, exit app
  if (!canGoBack) {
    App.exitApp();
  }
});
```

This requires: `npm install @capacitor/app`

---

## Phase 3: Android Native Configuration

### 3.1 App icon and splash screen

Place assets in the Android project:

```
android/app/src/main/res/
├── mipmap-hdpi/ic_launcher.png        (72x72)
├── mipmap-mdpi/ic_launcher.png        (48x48)
├── mipmap-xhdpi/ic_launcher.png       (96x96)
├── mipmap-xxhdpi/ic_launcher.png      (144x144)
├── mipmap-xxxhdpi/ic_launcher.png     (192x192)
└── drawable/splash.png                 (splash screen)
```

Design: Purple background (#1a0f2e) with gold "New Eleusis" title in Press Start 2P style, matching the retro arcade aesthetic.

### 3.2 Android manifest adjustments

In `android/app/src/main/AndroidManifest.xml`, verify:

```xml
<activity
  android:name=".MainActivity"
  android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
  android:screenOrientation="portrait"
  android:windowSoftInputMode="adjustResize">
```

Lock to portrait orientation since the card game UI is designed for vertical layout.

### 3.3 WebView hardware acceleration

In `android/app/src/main/AndroidManifest.xml`, ensure:

```xml
<application android:hardwareAccelerated="true" ...>
```

This is critical for WebGL shader performance.

---

## Phase 4: Build Scripts

### 4.1 Add npm scripts to package.json

```json
{
  "scripts": {
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android",
    "android:run": "npx cap run android",
    "android:dev": "npx cap run android --livereload --external"
  }
}
```

### 4.2 Development workflow

```bash
# One-time setup
npm run build && npx cap sync

# Open in Android Studio for debugging
npm run android:open

# Quick iteration (live reload from dev server)
npm run android:dev

# Production build
npm run android:sync
# Then build APK/AAB in Android Studio
```

### 4.3 Generate signed APK/AAB for Play Store

```bash
# In Android Studio: Build > Generate Signed Bundle/APK
# Or via command line:
cd android && ./gradlew assembleRelease    # APK
cd android && ./gradlew bundleRelease      # AAB (Play Store preferred)
```

---

## Phase 5: Testing Checklist

- [ ] App launches and displays start menu correctly
- [ ] WebGL background shader renders (or fallback works)
- [ ] Card tap/selection works (no hover issues)
- [ ] Card drag interactions work on touch
- [ ] Sound effects play after first user interaction
- [ ] Game state persists across app close/reopen (localStorage)
- [ ] All game phases work: setup, play, prophet, no-play, scoring
- [ ] AI player turns execute correctly
- [ ] Animations render smoothly (Motion library)
- [ ] Back button behavior is correct
- [ ] Screen rotation is locked to portrait
- [ ] Safe area insets respected on notch devices
- [ ] App doesn't crash on low-end devices
- [ ] Splash screen displays correctly
- [ ] Performance is acceptable (60fps target for animations)

---

## Phase 6: Optional Enhancements

### 6.1 Offline support (PWA + Capacitor)

The app already works offline since there's no backend. Adding a service worker would cache assets for faster cold starts:

```bash
npm install vite-plugin-pwa
```

### 6.2 Haptic feedback

Add vibration on card plays for tactile response:

```bash
npm install @capacitor/haptics
```

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
// On card play:
Haptics.impact({ style: ImpactStyle.Light });
```

### 6.3 Keep screen awake during gameplay

```bash
npm install @capacitor/keep-awake
```

### 6.4 Share game results

```bash
npm install @capacitor/share
```

---

## Compatibility Notes

| Feature | Android WebView Support | Notes |
|---------|------------------------|-------|
| WebGL (OGL shaders) | Yes (Chrome 80+) | Hardware acceleration required |
| Web Audio API | Yes (Chrome 66+) | Requires user gesture to start |
| localStorage | Yes | 10MB default limit (more than enough) |
| CSS backdrop-filter | Yes (Chrome 76+) | Glass morphism effects work |
| CSS custom properties | Yes (Chrome 49+) | All CSS variables work |
| Motion (Framer Motion) | Yes | DOM animations work in WebView |
| ES2022 | Yes (Chrome 94+) | All modern JS features available |

**Minimum Android version:** Android 7.0 (API 24) — covers 97%+ of active devices. Set in `android/variables.gradle` (`minSdkVersion = 24`).

---

## Estimated Effort

| Phase | Work |
|-------|------|
| Phase 1: Capacitor setup | Install packages, configure, add Android platform |
| Phase 2: Web adaptations | Viewport, safe areas, touch fixes, audio fix, back button |
| Phase 3: Native config | Icons, splash, manifest |
| Phase 4: Build scripts | npm scripts for dev/build workflow |
| Phase 5: Testing | Device testing, bug fixes |
| Phase 6: Enhancements | Optional haptics, keep-awake, etc. |

---

## File Changes Summary

### Already committed (Phase 1 complete)
- `capacitor.config.ts` — Capacitor configuration (root)
- `android/` — Native Android project (auto-generated by `cap add android`)
- `package.json` — New dependencies + `cap:sync`, `cap:open`, `cap:run` scripts
- `vite.config.ts` — Added `base: './'` for correct asset paths in WebView

### Still needed (Phase 2–6)
- `index.html` — Mobile viewport meta tags
- `src/styles/globals.css` — Safe area insets, touch-specific styles
- `src/shaders/background.ts` — WebGL fallback check
- `src/audio/sounds.ts` — Audio context resume on touch (verify current implementation)
- `src/App.tsx` — Back button handler (if using `@capacitor/app` plugin)
- App icon and splash screen assets — replace Capacitor defaults with purple/gold retro design

### No changes needed
- `src/engine/*` — Pure game logic works as-is
- `src/store/*` — Zustand + localStorage works in WebView
- `src/components/*` — React components render in WebView (minor touch CSS only)
