# Android release build

How to make the Android files someone can install: an **APK** (install by hand, send to a tester) and an **AAB** (what the Play Store takes). Written 2026-11-25. No Play Store step is done: there is no Google Play account yet.

## Make the files
```bash
GRADLE_USER_HOME=~/.config/lockwords/gradle-home npm run android:release
```
- Output: `apps/mobile/build/android/Lockwords-<version>.apk` and `.aab` (not in git).
- The app in these files talks to **the cloud** (the script empties the three `EXPO_PUBLIC_*` values, so a `.env.local` cannot leak in).
- The script says who signed the APK. "Android Debug" means the upload key was not found.
- On this Mac `GRADLE_USER_HOME` is needed for two reasons: Google's package server (see `apps/mobile/CLAUDE.md`, "Android") and the upload key.

## The upload key (never in git)
- The key file: `~/.config/lockwords/android-upload.keystore` (made 2026-11-25 on Hamid's Mac, key name `lockwords-upload`, valid about 27 years).
- Its four values are Gradle properties in `~/.config/lockwords/gradle-home/gradle.properties`: `LOCKWORDS_UPLOAD_STORE_FILE`, `LOCKWORDS_UPLOAD_STORE_PASSWORD`, `LOCKWORDS_UPLOAD_KEY_ALIAS`, `LOCKWORDS_UPLOAD_KEY_PASSWORD`. Both files can be read only by the Mac's user.
- `apps/mobile/plugins/with-android-release-signing.js` writes the signing lines into the generated `android/app/build.gradle`. With no properties (CI, another Mac) a release build is signed with the debug key and still builds.
- **Back the key file and the properties file up** (a password manager, an encrypted drive). With Play App Signing a lost upload key can be replaced by Google; without it, a lost key means the app can never be updated.

## Install the APK
- Emulator or a phone on USB: `adb install -r apps/mobile/build/android/Lockwords-<version>.apk`.
- A phone without a cable: send the file, open it on the phone, allow "install unknown apps" for the app that opened it.
- A debug build of Lockwords on the same device has another signature: remove it first (`adb uninstall com.comebackhamid.lockwords`).

## Before the Play Store (waits for Hamid)
1. A Google Play developer account (25 US dollars, once) and the app's listing.
2. Turn on Play App Signing and upload the first AAB signed with the upload key above.
3. Raise `versionCode` for every upload (`android.versionCode` in `app.json`; it is 1 today).
4. Payments on Android (RevenueCat + Google Play billing) come with the paywall epic.
