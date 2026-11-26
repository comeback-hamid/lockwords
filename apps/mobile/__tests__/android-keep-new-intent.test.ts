import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The config plugin that makes the Android app keep an address it is opened with while it is still starting
// (plugins/with-android-keep-new-intent.js): a tap on the widget after Android ended the app's process opened the
// first tab, not the word. The plugin edits the generated MainActivity; this checks the text it writes.
const { keepNewIntent } = require('../plugins/with-android-keep-new-intent') as { keepNewIntent: (source: string) => string };

const ACTIVITY = `package com.comebackhamid.lockwords

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"
}`;

describe('with-android-keep-new-intent', () => {
  const out = keepNewIntent(ACTIVITY);

  it('the screen keeps a new intent as its own, then hands it on as before', () => {
    expect(out).toContain('override fun onNewIntent(intent: Intent) {\n    setIntent(intent)\n    super.onNewIntent(intent)\n  }');
    expect(out).toContain('import android.content.Intent\n');
  });

  it('the method sits inside the class, before the next method and its comment', () => {
    expect(out.indexOf('override fun onNewIntent')).toBeGreaterThan(out.indexOf('class MainActivity'));
    expect(out.indexOf('override fun onNewIntent')).toBeLessThan(out.indexOf('/**\n   * Returns the name of the main component'));
  });

  it('writes its lines once, also when prebuild runs twice', () => {
    expect(keepNewIntent(out)).toBe(out);
  });

  it('says so when MainActivity changed and there is nothing to attach to', () => {
    expect(() => keepNewIntent('class MainActivity')).toThrow('no getMainComponentName');
  });

  it('is switched on in app.json', () => {
    const plugins = JSON.parse(readFileSync(join(__dirname, '../app.json'), 'utf8')).expo.plugins as unknown[];
    expect(plugins).toContain('./plugins/with-android-keep-new-intent');
  });
});
