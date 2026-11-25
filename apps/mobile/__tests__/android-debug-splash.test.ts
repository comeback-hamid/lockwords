// The config plugin that keeps a debug build's splash screen from leaving a hanging animation on Android
// (plugins/with-android-debug-splash.js). The plugin edits the generated MainActivity; this checks the text it writes.
const { addDebugSplash } = require('../plugins/with-android-debug-splash') as { addDebugSplash: (source: string) => string };

const ACTIVITY = `class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-abc
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }
}`;

describe('with-android-debug-splash', () => {
  it('drops the splash hand-over in debug builds only, after the generated block and before super.onCreate', () => {
    const out = addDebugSplash(ACTIVITY);
    expect(out).toContain('if (BuildConfig.DEBUG && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) splashScreen.clearOnExitAnimationListener()');
    expect(out.indexOf('@generated end expo-splashscreen')).toBeLessThan(out.indexOf('clearOnExitAnimationListener'));
    expect(out.indexOf('clearOnExitAnimationListener')).toBeLessThan(out.indexOf('super.onCreate'));
  });

  it('writes its line once, also when prebuild runs twice', () => {
    const once = addDebugSplash(ACTIVITY);
    expect(addDebugSplash(once)).toBe(once);
  });

  it('says so when expo-splash-screen is not in MainActivity', () => {
    expect(() => addDebugSplash('class MainActivity')).toThrow('no expo-splash-screen line');
  });
});
