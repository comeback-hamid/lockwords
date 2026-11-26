import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Android widget (modules/lockwords-widget) is native code. Jest cannot run it, so this checks the parts that
// must stay the same as the rest of the app: Kai's pictures, the colors, and the views a widget may use.
const root = join(__dirname, '..');
const res = join(root, 'modules/lockwords-widget/android/src/main/res');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('Kai’s poses in the Android widget are the same files as the iOS home screen widget’s', () => {
  for (const pose of ['greeting', 'idle', 'thinking', 'speaking', 'celebrate']) {
    const android = readFileSync(join(res, `drawable-nodpi/lw_kai_${pose}.png`));
    const ios = readFileSync(join(root, `assets/widget/kai-color-${pose}.png`));
    expect(android.equals(ios)).toBe(true); // made together by `npm run widget:kai`
  }
});

test('the Android widget’s colors are the iOS widget’s colors, light and dark', () => {
  const ios = read('src/widgets/lockwords-widget.tsx');
  const colors = (file: string) => [...read(`modules/lockwords-widget/android/src/main/res/${file}`).matchAll(/<color name="(\w+)">(#[0-9a-f]{6})<\/color>/g)].map((m) => m[2]!);
  const light = colors('values/lw_colors.xml');
  const dark = colors('values-night/lw_colors.xml');
  expect(light).toHaveLength(11);
  expect(dark).toHaveLength(11);
  for (const hex of [...light, ...dark]) expect(ios).toContain(hex);
});

test('the layouts use only views Android allows in a widget', () => {
  // https://developer.android.com/develop/ui/views/appwidgets/layouts: a widget with any other view does not load.
  const allowed = new Set(['FrameLayout', 'LinearLayout', 'RelativeLayout', 'GridLayout', 'ImageView', 'TextView', 'Button', 'ImageButton', 'ProgressBar']);
  for (const layout of ['lw_widget_small', 'lw_widget_medium']) {
    const tags = [...read(`modules/lockwords-widget/android/src/main/res/layout/${layout}.xml`).matchAll(/<([A-Za-z.]+)[\s>]/g)].map((m) => m[1]!).filter((t) => t !== 'xml');
    expect(tags.filter((t) => !allowed.has(t))).toEqual([]);
    // Every id the Kotlin code sets is in the layout.
    for (const id of ['lw_root', 'lw_label', 'lw_word', 'lw_meaning', 'lw_squares', 'lw_sq1', 'lw_sq5', 'lw_kai']) expect(read(`modules/lockwords-widget/android/src/main/res/layout/${layout}.xml`)).toContain(`@+id/${id}"`);
  }
  expect(read('modules/lockwords-widget/android/src/main/res/layout/lw_widget_medium.xml')).toContain('@+id/lw_example"');
});

test('the widget wakes every 30 minutes (one word slot) and opens the app from a tap', () => {
  expect(read('modules/lockwords-widget/android/src/main/res/xml/lw_widget_info.xml')).toContain('android:updatePeriodMillis="1800000"');
  const provider = read('modules/lockwords-widget/android/src/main/java/com/comebackhamid/lockwords/widget/HardWordsWidget.kt');
  expect(provider).toContain('setOnClickPendingIntent(R.id.lw_root');
  expect(provider).toContain('Intent.ACTION_VIEW');
});
