// Android, debug builds only: let the system take the splash screen away by itself.
//
// Why: expo-splash-screen asks Android to hand the splash picture over to the app, so it can fade it out. Android
// waits about 3 seconds for that. A debug build loads its code from Metro first and is later than that; Android then
// leaves a "starting_reveal" animation hanging on the app's window for as long as the app is open. Nothing shows, but
// every tap a test tool sends waits 10 seconds for that animation (found 2026-11-25: Maestro needed 12 seconds per
// tap). Without the hand-over the system removes the splash at the app's first drawn frame, as it does for any app.
// A release build starts in about a second, keeps Expo's fade and is not changed.
const { withMainActivity } = require('expo/config-plugins');

const ANCHOR = 'SplashScreenManager.registerOnActivity(this)';
const MARK = '// @lockwords debug-splash';
const LINE = `    ${MARK}: see apps/mobile/plugins/with-android-debug-splash.js
    if (BuildConfig.DEBUG && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) splashScreen.clearOnExitAnimationListener()`;

function addDebugSplash(source) {
  if (source.includes(MARK)) return source;
  if (!source.includes(ANCHOR)) throw new Error('with-android-debug-splash: MainActivity has no expo-splash-screen line to follow');
  // After the whole generated block, so `expo prebuild` can still swap that block.
  const end = '// @generated end expo-splashscreen';
  const at = source.includes(end) ? end : ANCHOR;
  return source.replace(at, `${at}\n${LINE}`);
}

module.exports = function withAndroidDebugSplash(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') throw new Error('with-android-debug-splash: MainActivity is not Kotlin');
    cfg.modResults.contents = addDebugSplash(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.addDebugSplash = addDebugSplash;
