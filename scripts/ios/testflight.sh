#!/bin/bash
# One command: a new build of the iPhone app goes to TestFlight (docs/testflight.md).
# Needs on this Mac: ~/.config/lockwords/secrets.env (ASC_KEY_ID, ASC_ISSUER_ID), the key in
# ~/.appstoreconnect/private_keys/AuthKey_<id>.p8, the "Apple Distribution" certificate in the keychain,
# and the two profiles "Lockwords AppStore" and "Lockwords Widgets AppStore" installed.
set -euo pipefail
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
set -a; . ~/.config/lockwords/secrets.env; set +a
ROOT=$(cd "$(dirname "$0")/../.." && pwd); MOBILE="$ROOT/apps/mobile"; OUT=~/apps/lockwords-builds/ios
ASC="node $ROOT/scripts/ios/asc.mjs"
# Each upload needs a build number higher than every earlier one: the last one in App Store Connect + 1.
LAST=$($ASC GET '/v1/builds?filter[app]=6839986144&sort=-version&limit=1&fields[builds]=version' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s.slice(s.indexOf("{")));console.log(j.data[0]?.attributes.version||0)})')
BUILD=$((LAST + 1)); echo "Build number $BUILD"
cd "$MOBILE" && npx expo prebuild -p ios --no-install && (cd ios && pod install)
(cd ios && ruby "$ROOT/scripts/ios/manual-signing.rb")
# The app and the widget must carry the same build number.
for plist in ios/Lockwords/Info.plist ios/ExpoWidgetsTarget/Info.plist; do /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" "$plist"; done
rm -rf "$OUT/Lockwords.xcarchive" "$OUT/export"; mkdir -p "$OUT"
xcodebuild -workspace ios/Lockwords.xcworkspace -scheme Lockwords -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$OUT/Lockwords.xcarchive" archive -quiet
xcodebuild -exportArchive -archivePath "$OUT/Lockwords.xcarchive" -exportPath "$OUT/export" -exportOptionsPlist "$ROOT/scripts/ios/export-options.plist" \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID"
echo "Uploaded build $BUILD. Apple processes it in 10 to 30 minutes; the internal group gets it by itself."
