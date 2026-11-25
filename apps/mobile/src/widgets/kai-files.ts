import { Asset } from 'expo-asset';
import { Directory, File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';

import type { KaiFiles, KaiPose } from './timeline';

// Kai's five still poses in one color (white, the eyes cut out), made by scripts/gen-widget-kai.mjs from assets/kai.
// The lock screen has no color: iOS only keeps how bright a pixel is.
const SOURCES: Record<KaiPose, number> = {
  greeting: require('../../assets/widget/kai-mono-greeting.png'),
  idle: require('../../assets/widget/kai-mono-idle.png'),
  thinking: require('../../assets/widget/kai-mono-thinking.png'),
  speaking: require('../../assets/widget/kai-mono-speaking.png'),
  celebrate: require('../../assets/widget/kai-mono-celebrate.png'),
};
const VERSION = 1; // raise when the pictures change, so the old files are replaced

let ready: Promise<KaiFiles> | null = null;

// Copies the poses into the folder the widget can read (once per app start) and answers their addresses.
export function kaiFiles(): Promise<KaiFiles> {
  ready ??= copyAll().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function copyAll(): Promise<KaiFiles> {
  const dir = new Directory(widgetsDirectory);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const entries = await Promise.all(
    (Object.keys(SOURCES) as KaiPose[]).map(async (pose) => {
      const target = new File(dir, `kai-mono-${pose}-v${VERSION}.png`);
      if (!target.exists) {
        const asset = await Asset.fromModule(SOURCES[pose]).downloadAsync();
        new File(asset.localUri!).copy(target);
      }
      return [pose, target.uri] as const;
    }),
  );
  return Object.fromEntries(entries) as KaiFiles;
}
