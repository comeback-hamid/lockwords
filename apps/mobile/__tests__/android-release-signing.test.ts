// The config plugin that signs an Android release build with our own upload key when the key is given
// (plugins/with-android-release-signing.js). It edits the generated app/build.gradle; this checks the text it writes.
const { addReleaseSigning } = require('../plugins/with-android-release-signing') as { addReleaseSigning: (gradle: string) => string };

// The part of Expo's template the plugin works on.
const GRADLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

describe('with-android-release-signing', () => {
  const out = addReleaseSigning(GRADLE);

  it('adds a release signing config that reads the key from Gradle properties, never from the repo', () => {
    expect(out).toContain("storeFile file(findProperty('LOCKWORDS_UPLOAD_STORE_FILE'))");
    expect(out).toContain("storePassword findProperty('LOCKWORDS_UPLOAD_STORE_PASSWORD')");
    expect(out).toContain("keyAlias findProperty('LOCKWORDS_UPLOAD_KEY_ALIAS')");
    expect(out).toContain("keyPassword findProperty('LOCKWORDS_UPLOAD_KEY_PASSWORD')");
  });

  it('the release build uses our key when it is given, else the debug key (so CI can still build)', () => {
    expect(out).toContain("signingConfig findProperty('LOCKWORDS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug");
  });

  it('the debug build keeps the debug key', () => {
    const debugType = out.slice(out.indexOf('buildTypes {'), out.indexOf('release {', out.indexOf('buildTypes {')));
    expect(debugType).toContain('signingConfig signingConfigs.debug');
    expect(debugType).not.toContain('LOCKWORDS_UPLOAD');
  });

  it('writes its lines once, also when prebuild runs twice', () => {
    expect(addReleaseSigning(out)).toBe(out);
  });

  it('says so when the template changed and there is nothing to attach to', () => {
    expect(() => addReleaseSigning('android { }')).toThrow('no signingConfigs block');
  });
});
