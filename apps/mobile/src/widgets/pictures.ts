import { Directory, File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';

// The word pictures for the medium home screen widget. The widget cannot load from the network, so the app saves
// each picture as a file in the folder shared with the widget. The server's pictures are small already
// (512×410 WebP, about 20 KB), so they are saved as they are.
const PREFIX = 'pic-';

// One file per picture. A picture never changes, so its id in the address is the file name.
export const pictureName = (imageUrl: string) => `${PREFIX}${imageUrl.split('/').pop()!.replace(/[^a-zA-Z0-9-]/g, '')}.webp`;

// Saves the pictures of the plan's words (once per picture), deletes the pictures of words that left the plan, and
// answers the file of each card that has one. A picture that cannot be downloaded is skipped.
export async function savePictures(slots: { cardId: string; imageUrl?: string }[]): Promise<Record<string, string>> {
  const wanted = new Map<string, string>(); // cardId → address
  for (const s of slots) if (s.imageUrl) wanted.set(s.cardId, s.imageUrl);
  const dir = new Directory(widgetsDirectory);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const keep = new Set([...wanted.values()].map(pictureName));
  for (const entry of dir.list()) {
    if (entry instanceof File && entry.name.startsWith(PREFIX) && !keep.has(entry.name)) entry.delete();
  }
  const saved: Record<string, string> = {};
  const done = new Map<string, Promise<string | null>>(); // address → file, so two cards with one picture load it once
  await Promise.all(
    [...wanted].map(async ([cardId, url]) => {
      if (!done.has(url)) {
        const file = new File(dir, pictureName(url));
        done.set(url, file.exists ? Promise.resolve(file.uri) : File.downloadFileAsync(url, file).then(() => file.uri, () => (file.exists ? file.uri : null))); // two syncs at once: the other one saved it
      }
      const uri = await done.get(url)!;
      if (uri) saved[cardId] = uri;
    }),
  );
  return saved;
}
