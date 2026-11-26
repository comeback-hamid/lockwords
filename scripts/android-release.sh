#!/usr/bin/env bash
# Build the Android release files: an APK to install by hand and an AAB for the Play Store.
# Usage: npm run android:release        Output: apps/mobile/build/android/ (not in git)
# The app talks to the cloud: a release build must never point at a Mac (see apps/mobile/src/config/backend.ts).
# Signing: with the upload key (docs/android-release.md) when its Gradle properties are set, else with the debug key.
set -euo pipefail
cd "$(dirname "$0")/../apps/mobile"
# Empty values win over apps/mobile/.env.local, so the built-in cloud addresses are used.
export EXPO_PUBLIC_API_URL= EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY=
export NODE_ENV=production LANG=${LANG:-en_US.UTF-8}
npx expo prebuild -p android --clean --no-install
(cd android && ./gradlew app:assembleRelease app:bundleRelease -x lint -x test)
out=build/android
version=$(node -p "require('./app.json').expo.version")
mkdir -p "$out"
cp android/app/build/outputs/apk/release/app-release.apk "$out/Lockwords-$version.apk"
cp android/app/build/outputs/bundle/release/app-release.aab "$out/Lockwords-$version.aab"
# Say who signed the APK, so nobody ships a debug-signed file by mistake.
sdk=${ANDROID_HOME:-$HOME/Library/Android/sdk}
signer=$(ls "$sdk"/build-tools/*/apksigner 2>/dev/null | sort | tail -1)
if [[ -n "$signer" ]]; then
  who=$("$signer" verify --print-certs "$out/Lockwords-$version.apk" | sed -n 's/^Signer #1 certificate DN: //p')
  echo "signed by: $who"
  [[ "$who" == *"Android Debug"* ]] && echo "This is the DEBUG key: fine for a test, not for the Play Store (docs/android-release.md)." >&2
fi
ls -lh "$out"
