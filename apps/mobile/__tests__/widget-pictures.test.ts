import { pictureName, savePictures } from '@/widgets/pictures';

// A tiny fake of the shared widget folder.
const mockFiles = new Set<string>();
const mockDownload = jest.fn(async (_url: string, file: { name: string }) => void mockFiles.add(file.name));
jest.mock('expo-file-system', () => {
  class File {
    name: string;
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
      this.uri = `file:///widgets/${name}`;
    }
    get exists() {
      return mockFiles.has(this.name);
    }
    delete() {
      mockFiles.delete(this.name);
    }
    static downloadFileAsync(url: string, file: File) {
      return mockDownload(url, file);
    }
  }
  class Directory {
    exists = true;
    create() {}
    list() {
      return [...mockFiles].map((n) => new File(this, n));
    }
  }
  return { File, Directory };
});

const slot = (cardId: string, imageUrl?: string) => ({ cardId, ...(imageUrl ? { imageUrl } : {}) });

beforeEach(() => {
  mockFiles.clear();
  mockDownload.mockClear();
  mockDownload.mockImplementation(async (_url, file) => void mockFiles.add(file.name));
});

test('a word that is in 5 slots gets its picture once', async () => {
  const slots = [1, 2, 3, 4, 5].map(() => slot('c1', 'https://x.test/pictures/p1'));
  const saved = await savePictures(slots);
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(saved).toEqual({ c1: 'file:///widgets/pic-p1.webp' });
});

test('a picture that is already saved is not downloaded again', async () => {
  mockFiles.add(pictureName('https://x.test/pictures/p1'));
  const saved = await savePictures([slot('c1', 'https://x.test/pictures/p1')]);
  expect(mockDownload).not.toHaveBeenCalled();
  expect(saved.c1).toBe('file:///widgets/pic-p1.webp');
});

test('pictures of words that left the plan are deleted; Kai’s files stay', async () => {
  mockFiles.add('pic-old.webp');
  mockFiles.add('kai-mono-idle-v1.png');
  await savePictures([slot('c1', 'https://x.test/pictures/p1')]);
  expect([...mockFiles].sort()).toEqual(['kai-mono-idle-v1.png', 'pic-p1.webp']);
});

test('a picture that cannot be downloaded is skipped; the others are kept', async () => {
  mockDownload.mockImplementationOnce(async () => {
    throw new Error('offline');
  });
  const saved = await savePictures([slot('c1', 'https://x.test/pictures/p1'), slot('c2', 'https://x.test/pictures/p2'), slot('c3')]);
  expect(saved).toEqual({ c2: 'file:///widgets/pic-p2.webp' });
});

// Found in review, 2026-11-25.
test('two words with the same picture: one download, both get the file', async () => {
  const saved = await savePictures([slot('c1', 'https://x.test/pictures/p1'), slot('c2', 'https://x.test/pictures/p1')]);
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(saved).toEqual({ c1: 'file:///widgets/pic-p1.webp', c2: 'file:///widgets/pic-p1.webp' });
});

test('two syncs at once: the download is refused because the other sync saved the file, and the picture is still used', async () => {
  mockDownload.mockImplementationOnce(async (_url, file) => {
    mockFiles.add(file.name); // the other sync finished first
    throw new Error('DestinationAlreadyExists');
  });
  expect(await savePictures([slot('c1', 'https://x.test/pictures/p1')])).toEqual({ c1: 'file:///widgets/pic-p1.webp' });
});
