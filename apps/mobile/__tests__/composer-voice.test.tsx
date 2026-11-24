import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';

import { Composer } from '@/components/chat/composer';
import { addSpoken, audioFormat, clock, level, pushLevel, transcribeRecording, WAVE_BARS } from '@/components/chat/voice';

// The mic in the chat box (Hamid, 2026-11-24): tap the mic, speak, Stop writes the words into the box; the learner
// can change them and then send. X throws the recording away.
jest.mock('@/components/chat/voice', () => ({ ...jest.requireActual('@/components/chat/voice'), transcribeRecording: jest.fn() }));
jest.mock('@/auth/boot', () => ({ api: { transcribe: jest.fn() } }));
const mockWrite = jest.mocked(transcribeRecording);
const mockAsk = jest.mocked(requestRecordingPermissionsAsync);

beforeEach(() => {
  jest.clearAllMocks();
  mockAsk.mockResolvedValue({ granted: true } as never);
});

test('mic, then Stop: what was said is in the box, can be changed, and is sent', async () => {
  mockWrite.mockResolvedValue('I want to learn food words');
  const onSend = jest.fn();
  await render(<Composer placeholder="Type a message…" onSend={onSend} maxLength={300} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Cancel recording' })).toBeOnTheScreen();
  expect(screen.queryByLabelText('Message')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Stop recording' }));
  await waitFor(() => expect(screen.getByLabelText('Message').props.value).toBe('I want to learn food words'));
  await fireEvent.changeText(screen.getByLabelText('Message'), 'I want to learn travel words');
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  expect(onSend).toHaveBeenCalledWith('I want to learn travel words');
});

test('X throws the recording away: nothing is written', async () => {
  await render(<Composer placeholder="Type a message…" onSend={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel recording' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel recording' }));
  await waitFor(() => expect(screen.getByLabelText('Message').props.value).toBe(''));
  expect(mockWrite).not.toHaveBeenCalled();
});

test('no microphone permission, a failed writing, and silence each say so and keep the typed text', async () => {
  mockAsk.mockResolvedValueOnce({ granted: false } as never);
  await render(<Composer placeholder="Type a message…" onSend={jest.fn()} defaultValue="" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByText('Allow the microphone for Lockwords in Settings to speak.')).toBeOnTheScreen());

  mockWrite.mockRejectedValueOnce(new Error('down'));
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Stop recording' }));
  await waitFor(() => expect(screen.getByText('I could not write that. Try again.')).toBeOnTheScreen());

  mockWrite.mockResolvedValueOnce('');
  await fireEvent.press(screen.getByRole('button', { name: 'Voice message' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Stop recording' }));
  await waitFor(() => expect(screen.getByText('I heard nothing. Try again.')).toBeOnTheScreen());
});

test('the box takes more than one line and grows to six, then scrolls', async () => {
  await render(<Composer placeholder="Type a message…" onSend={jest.fn()} />);
  const input = screen.getByLabelText('Message');
  expect(input.props.multiline).toBe(true);
  expect(input.props.submitBehavior).toBe('blurAndSubmit'); // Return still sends and closes the keyboard
  const style = ([] as { maxHeight?: number }[]).concat(input.props.style).reduce((all, s) => ({ ...all, ...s }), {});
  expect(style.maxHeight).toBe(6 * 22 + 12);
});

test('small rules: the file type, joining spoken text, the wave and the clock', () => {
  expect(audioFormat('file:///tmp/rec.m4a')).toBe('m4a');
  expect(audioFormat('blob:http://localhost/abc')).toBe('webm');
  expect(audioFormat('file:///tmp/rec')).toBe('m4a');
  expect(addSpoken('I think', ' it is good ')).toBe('I think it is good');
  expect(addSpoken('', 'Hello')).toBe('Hello');
  expect(level(undefined)).toBe(0);
  expect(level(-60)).toBe(0);
  expect(level(0)).toBe(1);
  expect(level(-30)).toBeCloseTo(0.5);
  expect(pushLevel(Array(WAVE_BARS).fill(0), 1)).toHaveLength(WAVE_BARS);
  expect(clock(65_000)).toBe('1:05');
});
