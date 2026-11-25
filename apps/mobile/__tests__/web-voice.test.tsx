import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { Composer } from '@/components/chat/composer';
import { audioFormat } from '@/components/chat/voice';

// Voice in a browser (2026-11-25). Browsers do not record the same file type: Chrome and Firefox give webm (Firefox
// also ogg), Safari gives mp4. The recording is a `blob:` address with no ending, so the type comes from the
// recording itself. And a browser has no "Settings" for the mic: the note names the browser.
jest.mock('@/auth/boot', () => ({ api: { transcribe: jest.fn() } }));

const realOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
afterEach(() => setOS(realOS));

test('the file type of a browser recording comes from the recording: Safari mp4, Firefox ogg, Chrome webm', () => {
  expect(audioFormat('blob:http://localhost/abc', 'audio/mp4')).toBe('mp4');
  expect(audioFormat('blob:http://localhost/abc', 'audio/mp4;codecs=mp4a.40.2')).toBe('mp4');
  expect(audioFormat('blob:http://localhost/abc', 'audio/ogg; codecs=opus')).toBe('ogg');
  expect(audioFormat('blob:http://localhost/abc', 'audio/webm;codecs=opus')).toBe('webm');
  expect(audioFormat('blob:http://localhost/abc', 'audio/wav')).toBe('wav');
});

test('an unknown or missing type keeps the old answer; a file name still wins on the phone', () => {
  expect(audioFormat('blob:http://localhost/abc', '')).toBe('webm');
  expect(audioFormat('blob:http://localhost/abc', 'application/octet-stream')).toBe('webm');
  expect(audioFormat('file:///tmp/rec.m4a', 'audio/mp4')).toBe('m4a');
});

test('in a browser a refused microphone names the browser, not the phone’s Settings', async () => {
  setOS('web');
  jest.mocked(requestRecordingPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  await render(<Composer placeholder="Type a message…" onSend={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByText('Allow the microphone for this page in your browser to speak.')).toBeOnTheScreen());
});
