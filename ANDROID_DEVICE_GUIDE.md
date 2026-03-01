# Running New Eleusis on a Samsung Galaxy Tablet

This guide covers how to build the app and run it directly on a physical Samsung Galaxy tablet using Capacitor and Android Studio. The Android project is already set up in `android/` — you don't need to initialise anything from scratch.

---

## Prerequisites

### On your Mac

- **Android Studio** (latest stable) — [developer.android.com/studio](https://developer.android.com/studio)
  - During install, let it install the default Android SDK (API 35)
- **JDK 17+** — bundled with Android Studio, or install via `brew install openjdk@17`
- **Node.js 18+** — already in use for this project

Verify your setup after installing. **Run this from inside the project directory:**

```bash
cd /Users/brooks/Documents/git/new-eleusis
npx cap doctor
```

This prints any missing dependencies (SDK path, Java version, etc.). All `npx cap` commands must be run from inside the project — running them elsewhere resolves to the wrong package.

### On your Samsung Galaxy tablet

1. Open **Settings**
2. Scroll to **About tablet** (sometimes under General Management)
3. Tap **Software information**
4. Tap **Build number** 7 times → you'll see "Developer mode has been turned on"
5. Go back to **Settings** → **Developer options** (now visible)
6. Enable **Wireless debugging** (Android 11+) — see [Connecting over Wi-Fi](#connecting-over-wi-fi-recommended) below

---

## Connecting over Wi-Fi (recommended)

Android 11+ (all recent Samsung Galaxy tablets) supports wireless debugging with no USB cable needed after the first pairing. Your Mac and tablet must be on the same Wi-Fi network.

### One-time pairing

**On the tablet:**

1. **Settings** → **Developer options** → enable **Wireless debugging**
2. Tap **Wireless debugging** to open it
3. Tap **Pair device with pairing code**
4. Note the **IP address & port** and **pairing code** shown on screen

**On your Mac:**

```bash
adb pair <ip>:<pairing-port>
```

Enter the 6-digit pairing code when prompted. You'll see `Successfully paired`.

Then connect (this uses a different port — check the main Wireless debugging screen, not the pairing screen):

```bash
adb connect <ip>:<port>
```

Verify it worked:

```bash
adb devices
```

You should see your tablet listed as `<ip>:<port> device`.

### Every subsequent session

The pairing is remembered. When you return to dev, just:

1. On the tablet: **Developer options** → enable **Wireless debugging** (toggle it on)
2. On your Mac:

```bash
adb connect <ip>:<port>
```

The IP and port are shown on the Wireless debugging screen each time. The port may change between sessions.

Then run as normal:

```bash
npx cap run android
```

### Tip: live reload over Wi-Fi

Wireless debugging pairs especially well with live reload — no cables at all:

```bash
npx cap run android --livereload --external
```

Changes in your source files appear on the tablet immediately on save.

---

## Connecting via USB (alternative)

If you prefer USB or wireless isn't working:

Plug in your Samsung Galaxy tablet. On the tablet, also enable **USB debugging** in Developer options. A prompt will appear:

> **"Allow USB debugging?"**

Tap **Allow** (check "Always allow from this computer"). Verify detection:

```bash
npx cap run android --list
```

If it doesn't appear: try a different cable (some are charge-only), or pull down the notification shade and set USB mode to **File Transfer (MTP)**.

---

## Step 1 — Build the web app

```bash
npm run build
```

This compiles TypeScript and bundles everything into `dist/`.

---

## Step 2 — Sync into the Android project

```bash
npx cap sync android
```

This copies `dist/` into `android/app/src/main/assets/public/` and updates any native plugin configuration. Run this after every `npm run build`.

---

## Step 3 — Connect your tablet

Follow the [Connecting over Wi-Fi](#connecting-over-wi-fi-recommended) steps above, then verify the tablet is detected:

```bash
npx cap run android --list
```

You should see your tablet listed as a device.

---

## Step 4 — Run on the tablet

```bash
npx cap run android
```

Capacitor will prompt you to select a target. Choose your tablet from the list. It will:

1. Compile the Android project via Gradle (~1–2 minutes first time, faster after)
2. Install the APK on your tablet
3. Launch the app

The app will stay installed — you can open it from the home screen without re-running the command. Only re-run when you've made code changes.

---

## Step 5 — Iterating on code changes

After editing source files:

```bash
npm run build && npx cap sync android && npx cap run android
```

Or use the existing npm script:

```bash
npm run cap:run
```

For faster iteration during development, you can use live reload (the tablet and your Mac must be on the same Wi-Fi network):

```bash
npx cap run android --livereload --external
```

This starts the Vite dev server and loads it directly on the device — changes appear immediately on save without rebuilding.

---

## Debugging

### Open in Android Studio

```bash
npx cap open android
```

From Android Studio you can:
- Inspect logs in **Logcat** (filter by `Capacitor` or your app package `com.neweleusis.app`)
- Use **Chrome DevTools** for WebView debugging (see below)
- Profile GPU/CPU performance

### Remote WebView debugging (Chrome DevTools)

While the app is running on the tablet:

1. Open Chrome on your Mac
2. Go to `chrome://inspect/#devices`
3. Your tablet and the app's WebView will appear under **Remote Target**
4. Click **inspect** to open full DevTools (console, network, elements, sources)

This is the most useful tool for catching JavaScript errors and layout issues on the real device.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `JAVA_HOME` not set | Android Studio bundles JDK — run `npx cap doctor` for the correct path to set |
| Gradle build fails first time | It downloads ~500 MB of dependencies; ensure you have internet access and wait |
| Tablet not detected wirelessly | Run `adb kill-server && adb start-server`, then `adb connect <ip>:<port>` again — the port changes each session |
| Tablet not detected via USB | Try `adb kill-server && adb start-server`, reconnect cable, re-accept the debug prompt |
| App installs but shows blank screen | Run `cap sync` again — the `dist/` assets may not have been copied correctly |
| "INSTALL_FAILED_UPDATE_INCOMPATIBLE" | Uninstall the existing app on the tablet and re-run |
| Touch targets feel too small | The tablet resolution may be very high — this is a CSS issue, debug via Chrome DevTools |

---

## Samsung-specific notes

- **DeX mode** (if your tablet supports it): the app will run in a window. The layout is designed for portrait — it may appear letterboxed. This is fine for now.
- **Samsung Internet browser**: the app targets the Android WebView (Chromium-based), not Samsung Internet. Running via Capacitor bypasses Samsung Internet entirely.
- **Screen orientation**: the Android manifest locks the app to portrait. Rotating the tablet will have no effect — this matches how the card game UI is designed.
