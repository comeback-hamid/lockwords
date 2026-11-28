# TestFlight (the iPhone app for testers)

Set up 2026-11-27. Hamid wants new versions on testers' iPhones through TestFlight. The App Store comes later.

## One command
```bash
npm run ios:testflight
```
It finds the last build number in App Store Connect and adds 1. It makes `ios/` again and sets App Store signing on it (`scripts/ios/manual-signing.rb`). It builds a Release archive and uploads it. Apple then processes the build in 10 to 30 minutes.

- The **internal group** (`dailydoses`, App Store Connect users) gets every build by itself, with no review.
- The **external group** (`Testers`, public link https://testflight.apple.com/join/zA1FzKME) gets a build only when one is added to it. The first build of each version goes through Apple's beta review (usually less than a day).

A change in app code only (no native change) will later reach phones by Expo update with no new build. That needs `expo-updates` in one build first; it is not in the app yet.

## The Apple account
- Team **Moosepath Solutions Ltd.** (`977V8PWS54`), chosen by Hamid on 2026-11-27. The app entry is "Lockwords - learn vocabulary" (app id `6839986144`).
- iPhone ID `com.dailydoses.lockwords`. The widget is `com.dailydoses.lockwords.ExpoWidgetsTarget`. The app group is `group.com.dailydoses.lockwords` (made by Hamid on the Apple website: the API cannot make app groups).
- Android uses the same ID, `com.dailydoses.lockwords`.

## What lives on this Mac, outside git
- `~/.config/lockwords/secrets.env`: `ASC_KEY_ID`, `ASC_ISSUER_ID`. The key itself: `~/.config/lockwords/AuthKey.p8`, linked as `~/.appstoreconnect/private_keys/AuthKey_<id>.p8`. It is an **Admin** team key.
- `~/.config/lockwords/signing/`: the private half of the "Apple Distribution" certificate (`2FCZ36TV3N`, ends 2027-11-27), its `.p12`, and the two App Store profiles. The certificate is also in the login keychain.
- The profiles are installed in `~/Library/MobileDevice/Provisioning Profiles` and `~/Library/Developer/Xcode/UserData/Provisioning Profiles`.

## What we learned (2026-11-27)
- `xcodebuild -allowProvisioningUpdates` with an API key fails with "Authentication failed" on this Mac, also with an Admin key. So signing is manual: the certificate and profiles are made through the App Store Connect API (`scripts/ios/asc.mjs`), and the upload (`-exportArchive`) uses the key.
- The team can have only 3 "Apple Distribution" certificates. On 2026-11-27 it had 3 from other Macs. Hamid said to revoke the one that ended 2026-12-15 (`CBMLFRJ2ZV`) so this Mac could have one.
- A profile does not change when an app ID gets a new app group later. Make the app group first, then the profiles.
- The Info files of the app and the widget carry the build number (`CFBundleVersion`). The script sets both.
- A TestFlight build stops working after 90 days.
- `ITSAppUsesNonExemptEncryption: false` in `app.json` answers Apple's encryption question for every build.

## Beta review details
Feedback email, review contact and the test description are set in App Store Connect (Hamid, 2026-11-27). Testers see the feedback email. The reviewer notes say no sign-in is needed (guest).
