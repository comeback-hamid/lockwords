// Android: a release build is signed with our own upload key when the key is given, else with the debug key.
//
// `android/` is generated, so the signing lines are written by this plugin. The key itself is never in the repo: the
// four values come from Gradle properties (on this Mac: ~/.config/lockwords/gradle-home/gradle.properties, used with
// GRADLE_USER_HOME; see docs/android-release.md).
//   LOCKWORDS_UPLOAD_STORE_FILE      the full path of the keystore file
//   LOCKWORDS_UPLOAD_STORE_PASSWORD  its password
//   LOCKWORDS_UPLOAD_KEY_ALIAS       the key's name inside the file
//   LOCKWORDS_UPLOAD_KEY_PASSWORD    the key's password
// Without them (CI, a first build on a new Mac) the release build still works and is signed with the debug key:
// good for a check on an emulator, not for the Play Store.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// @lockwords release-signing';
const HAS_KEY = "findProperty('LOCKWORDS_UPLOAD_STORE_FILE')";
const CONFIG = `        release {
            ${MARK}: see apps/mobile/plugins/with-android-release-signing.js
            if (${HAS_KEY}) {
                storeFile file(findProperty('LOCKWORDS_UPLOAD_STORE_FILE'))
                storePassword findProperty('LOCKWORDS_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('LOCKWORDS_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('LOCKWORDS_UPLOAD_KEY_PASSWORD')
            }
        }
`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARK)) return gradle;
  // 1. A `release` signing config next to the template's `debug` one.
  const configs = /(signingConfigs \{\n\s+debug \{[^}]*\}\n)/;
  if (!configs.test(gradle)) throw new Error('with-android-release-signing: no signingConfigs block with a debug config in app/build.gradle');
  let out = gradle.replace(configs, `$1${CONFIG}`);
  // 2. The release build type uses it when the key is there. (The debug build type keeps the debug key.)
  const inRelease = /(buildTypes \{[\s\S]*?\n\s+release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!inRelease.test(out)) throw new Error('with-android-release-signing: the release build type has no signingConfig line in app/build.gradle');
  out = out.replace(inRelease, `$1signingConfig ${HAS_KEY} ? signingConfigs.release : signingConfigs.debug`);
  return out;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') throw new Error('with-android-release-signing: app/build.gradle is not Groovy');
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.addReleaseSigning = addReleaseSigning;
