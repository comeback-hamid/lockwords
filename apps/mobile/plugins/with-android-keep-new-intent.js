// Android: the app keeps an address it is opened with while it is still starting.
//
// Why: Android can end the app's process while it sits in the background. A tap on the widget (or any
// `lockwords://` link) then starts the process again and hands the address to the screen as a "new intent", before
// the JavaScript side is up. React Native only passes a new intent on when JavaScript is ready, and when the app later
// asks "what was I opened with?" it reads the screen's first intent, the plain launch. So the address was lost and
// the app opened on its first tab (found 2026-11-25 with the home screen widget). Keeping the new intent as the
// screen's intent makes that question answer with the address.
const { withMainActivity } = require('expo/config-plugins');

const MARK = '// @lockwords keep-new-intent';
const METHOD = `  ${MARK}: see apps/mobile/plugins/with-android-keep-new-intent.js
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }

`;

function keepNewIntent(source) {
  if (source.includes(MARK)) return source;
  if (/override fun onNewIntent\(/.test(source)) throw new Error('with-android-keep-new-intent: MainActivity already has onNewIntent');
  const anchor = /^( {2}\/\*\*\n(?: {3}\*.*\n)+? {3}\*\/\n)? {2}override fun getMainComponentName\(/m;
  if (!anchor.test(source)) throw new Error('with-android-keep-new-intent: MainActivity has no getMainComponentName to put the method before');
  let out = source.replace(anchor, (found) => `${METHOD}${found}`);
  if (!/^import android\.content\.Intent$/m.test(out)) out = out.replace(/^import android\.os\.Bundle$/m, 'import android.content.Intent\nimport android.os.Bundle');
  if (!/^import android\.content\.Intent$/m.test(out)) throw new Error('with-android-keep-new-intent: could not add the Intent import');
  return out;
}

module.exports = function withAndroidKeepNewIntent(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') throw new Error('with-android-keep-new-intent: MainActivity is not Kotlin');
    cfg.modResults.contents = keepNewIntent(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.keepNewIntent = keepNewIntent;
