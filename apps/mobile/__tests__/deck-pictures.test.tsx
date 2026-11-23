import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createApi, type Deck } from '@/api/client';
import KaiScreen from '@/app/onboarding/kai';
import { api } from '@/auth/boot';
import { DeckCard } from '@/components/chat/deck-card';
import { DeckIdeas } from '@/components/chat/deck-ideas';
import { ENGLISH_SCRIPT, kaiStateFor } from '@/onboarding/kai-script';
import { resetAnswers, setAnswers } from '@/onboarding/store';

// Deck pictures and the deck card's arrow column (2026-11-23).
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({}) }));
jest.mock('@/auth/boot', () => ({ api: { saveChat: jest.fn(), fetchDeckIdeas: jest.fn(), proposeDeck: jest.fn(), generateDeck: jest.fn(), fetchDeck: jest.fn(), waitForPictures: jest.fn(), kaiReply: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const proposed: Deck = { id: 'd1', topic: 'Ordering food', title: 'Order food and pay the bill.', titleTranslation: 'غذا سفارش بده و حساب را بپرداز.', reason: 'For your trip', cefr: 'A2+', wordCount: 10, status: 'proposed', cards: [] };
const cards = (pictures: number) => Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, position: i, word: `word ${i}`, translation: `t ${i}`, example: 'e', exampleTranslation: 't', stage: 0, ...(i < pictures ? { imageUrl: `http://api.test/pictures/p${i}` } : {}) }));
const words: Deck = { ...proposed, status: 'ready', picturesStatus: 'making', picturesReady: 0, cards: cards(0) };
const drawn: Deck = { ...words, picturesStatus: 'ready', picturesReady: 10, cards: cards(10) };
const noop = { onGenerate: jest.fn(), onOpen: jest.fn() };
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);

describe('deck card', () => {
  test('a deck that can be opened has the arrow column on its right; no other state has it', async () => {
    const view = await render(<DeckCard deck={drawn} state="ready" {...noop} />);
    expect(screen.getByTestId('deck-open-column')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open deck' })).toContainElement(screen.getByTestId('deck-open-column'));
    for (const state of ['proposed', 'generating', 'drawing', 'disabled'] as const) {
      await view.rerender(<DeckCard deck={drawn} state={state} {...noop} />);
      expect(screen.queryByTestId('deck-open-column')).toBeNull();
    }
  });
  test('tapping the arrow column opens the deck', async () => {
    const onOpen = jest.fn();
    await render(<DeckCard deck={drawn} state="ready" onGenerate={jest.fn()} onOpen={onOpen} />);
    await fireEvent.press(screen.getByTestId('deck-open-column'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  test('in a list of decks (Progress): no JUST NOW, and the button says which deck it opens', async () => {
    const view = await render(<DeckCard deck={drawn} state="ready" {...noop} />);
    expect(screen.getByText('JUST NOW')).toBeOnTheScreen();
    await view.rerender(<DeckCard deck={drawn} state="ready" listed flat {...noop} />);
    expect(screen.queryByText('JUST NOW')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open deck, Order food and pay the bill.' })).toBeOnTheScreen();
    expect(screen.getByTestId('deck-open-column')).toBeOnTheScreen();
  });
  test('drawing: the words are there, the pictures are counted, and the card cannot be opened yet', async () => {
    await render(<DeckCard deck={words} state="drawing" pictures={{ ready: 3, total: 10 }} {...noop} />);
    expect(screen.getByText('Drawing the pictures…')).toBeOnTheScreen();
    expect(screen.getByText('3 / 10 PICTURES')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open deck' })).toBeNull();
    expect(screen.queryByText('Making your deck…')).toBeNull();
  });
  test('a row of ideas shows the drawing card for the deck whose pictures are being made', async () => {
    const deck = { id: 'd1', title: 'Título', titleTranslation: 'Title', reason: 'r', cefr: 'A2', wordCount: 20, status: 'ready' as const, current: true };
    await render(<DeckIdeas decks={[deck]} showTranslation making={null} locked={false} drawing={{ id: 'd1', ready: 0, total: 20 }} onGenerate={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText('0 / 20 PICTURES')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open deck' })).toBeNull();
  });
});

describe('waiting for the pictures', () => {
  const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const apiWith = (steps: Partial<Deck>[]) => {
    const calls: string[] = [];
    const fetchMock = jest.fn(async (req: Request) => {
      calls.push(`${req.method} ${new URL(req.url).pathname}`);
      return answer({ ...words, ...(steps.length > 1 ? steps.shift() : steps[0]) });
    });
    return { calls, api: createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch, deckPollMs: 1 }) };
  };
  test('reads the deck until the picture run ends, and reports each new count once', async () => {
    const { api: real, calls } = apiWith([{ picturesReady: 0 }, { picturesReady: 10 }, { picturesReady: 10 }, { picturesStatus: 'ready', picturesReady: 20 }]);
    const seen: number[] = [];
    const deck = await real.waitForPictures('d1', (ready) => seen.push(ready));
    expect(deck.picturesStatus).toBe('ready');
    expect(seen).toEqual([0, 10, 20]);
    expect(calls).toEqual(Array(4).fill('GET /v1/decks/d1'));
  });
  test('a failed run ends the wait; a run that never ends stops after the limit', async () => {
    expect((await apiWith([{ picturesStatus: 'failed' }]).api.waitForPictures('d1')).picturesStatus).toBe('failed');
    expect((await apiWith([{ picturesStatus: 'making' }]).api.waitForPictures('d1', undefined, 20)).picturesStatus).toBe('making');
  });
  test('the pictures event is sent to Kai', async () => {
    const bodies: unknown[] = [];
    const real = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: (async (req: Request) => (bodies.push(await req.json()), answer({ userMessage: null, messages: [], options: [], action: null }))) as unknown as typeof fetch });
    expect((await real.deckPictures('d1')).ok).toBe(true);
    expect(bodies).toEqual([{ event: 'deck_pictures', deckId: 'd1' }]);
  });
});

describe('the first deck in onboarding', () => {
  beforeEach(() => {
    resetAnswers();
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
    jest.clearAllMocks();
    mockApi.saveChat.mockImplementation(async (c) => c);
    mockApi.fetchDeckIdeas.mockResolvedValue(['Ordering food']);
    mockApi.proposeDeck.mockResolvedValue(proposed);
    mockApi.generateDeck.mockResolvedValue(words);
    mockApi.kaiReply.mockResolvedValue({ onScript: false, lines: ['😊 It means **the bill**.'] });
  });
  const send = async (text: string) => {
    await fireEvent.changeText(screen.getByLabelText('Message'), text);
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  };
  const toGenerate = async () => {
    await render(<KaiScreen />);
    mockApi.kaiReply.mockResolvedValueOnce({ onScript: true, answer: 'Maya' });
    await send('Maya');
    await fireEvent.press(await screen.findByRole('button', { name: 'English' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Ordering food' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen());
  };

  test('the deck card shows the title in the learned language and its translation under it', async () => {
    await toGenerate();
    expect(screen.getByText('“Order food and pay the bill.”')).toBeOnTheScreen();
    expect(screen.getByTestId('deck-title-translation')).toHaveTextContent('غذا سفارش بده و حساب را بپرداز.');
  });

  test('words ready → Kai says it is drawing and invites a question → progress → pictures ready → practice', async () => {
    let progress!: (ready: number) => void;
    let finish!: (d: Deck) => void;
    mockApi.waitForPictures.mockImplementation((_id, onProgress) => ((progress = onProgress!), new Promise((resolve) => (finish = resolve))));
    await toGenerate();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(kaiSays('Your words are ready! 🎉 Now I’m drawing a picture for each one 🎨')).toBeOnTheScreen());
    expect(kaiSays('It takes about half a minute. Meanwhile, ask me a question, send a sentence to correct, or ask about me 🙂')).toBeOnTheScreen();
    expect(mockApi.waitForPictures).toHaveBeenCalledWith('d1', expect.any(Function));
    expect(screen.getByText('0 / 10 PICTURES')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open deck' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'OK, let’s practice!' })).toBeNull();

    // The learner uses the wait: Kai answers, then says the pictures are almost ready.
    await send('What does la cuenta mean?');
    expect(mockApi.kaiReply).toHaveBeenLastCalledWith('drawing', 'What does la cuenta mean?', []);
    await waitFor(() => expect(kaiSays('😊 It means the bill.')).toBeOnTheScreen());
    expect(kaiSays('Your pictures are almost ready 🎨')).toBeOnTheScreen();

    await act(async () => progress(5));
    expect(screen.getByText('5 / 10 PICTURES')).toBeOnTheScreen();
    expect(kaiSays('5 of 10 pictures are ready 🎨')).toBeOnTheScreen();

    await act(async () => finish(drawn));
    await waitFor(() => expect(kaiSays('All the pictures are ready! 🖼️ Tap your deck any time to see the words.')).toBeOnTheScreen());
    expect(kaiSays('Shall we practice them now? 💪')).toBeOnTheScreen();
    // The deck card shows again under that line (the first one is far up the chat by now); both open the deck.
    expect(screen.getAllByRole('button', { name: 'Open deck' })).toHaveLength(2);
    expect(screen.getAllByTestId('deck-open-column')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'OK, let’s practice!' })).toBeOnTheScreen();
  });

  test('the picture run fails (or the wait breaks): the deck is ready all the same, and Kai says so', async () => {
    mockApi.waitForPictures.mockResolvedValueOnce({ ...words, picturesStatus: 'failed' });
    await toGenerate();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(kaiSays('I could not draw the pictures this time, but your deck is ready! Tap it any time to see the words.')).toBeOnTheScreen());
    expect(screen.getAllByRole('button', { name: 'Open deck' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'OK, let’s practice!' })).toBeOnTheScreen();
  });

  test('a deck with no pictures coming keeps the old lines', async () => {
    mockApi.generateDeck.mockResolvedValueOnce({ ...words, picturesStatus: 'none' });
    await toGenerate();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(kaiSays('Your deck is ready! 🎉 Tap it any time to see the words.')).toBeOnTheScreen());
    expect(mockApi.waitForPictures).not.toHaveBeenCalled();
  });

  test('Kai draws while the pictures are made, and answers when the learner writes', () => {
    const base = { step: 'drawing' as const, opened: false, typing: false, waiting: false, composerText: false, quiet: false, failed: false };
    expect(kaiStateFor(base)).toBe('making');
    expect(kaiStateFor({ ...base, composerText: true })).toBe('listening');
    expect(kaiStateFor({ ...base, waiting: true })).toBe('thinking');
    expect(ENGLISH_SCRIPT.backDrawing).toBe('Your pictures are almost ready 🎨');
  });
});

describe('New words: the pictures of a deck Kai made', () => {
  const { renderHook } = jest.requireActual<typeof import('@testing-library/react-native')>('@testing-library/react-native');
  const { useDeckPictures } = jest.requireActual<typeof import('@/new-words/pictures')>('@/new-words/pictures');
  const turn = { ok: true as const, turn: { userMessage: null, messages: [], options: [], action: null } };
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockApi, { deckPictures: jest.fn(async () => turn) });
  });

  test('the card counts the pictures; when the run ends Kai is asked to say so, once the chat is quiet', async () => {
    let progress!: (ready: number) => void;
    let finish!: (d: Deck) => void;
    mockApi.waitForPictures.mockImplementation((_id, onProgress) => ((progress = onProgress!), new Promise((resolve) => (finish = resolve))));
    const quietRef = { current: false }; // Kai is still saying "your words are ready"
    const take = jest.fn(() => true);
    const { result } = await renderHook(() => useDeckPictures({ quietRef, take, setBusy: jest.fn() }));
    let done!: Promise<void>;
    await act(async () => void (done = result.current.draw({ ...words, wordCount: 20 })));
    expect(result.current.drawing).toEqual({ id: 'd1', ready: 0, total: 20 });
    await act(async () => progress(10));
    expect(result.current.drawing).toEqual({ id: 'd1', ready: 10, total: 20 });
    await act(async () => finish(drawn));
    expect(result.current.drawing).toBeNull();
    expect(jest.mocked(mockApi as unknown as { deckPictures: jest.Mock }).deckPictures).not.toHaveBeenCalled(); // not while Kai has the turn
    quietRef.current = true;
    await act(async () => done);
    expect((mockApi as unknown as { deckPictures: jest.Mock }).deckPictures).toHaveBeenCalledWith('d1');
    expect(take).toHaveBeenCalledWith(turn);
    expect(quietRef.current).toBe(false); // Kai has the turn until its lines are shown
  });

  test('a deck with no pictures coming does nothing', async () => {
    const { result } = await renderHook(() => useDeckPictures({ quietRef: { current: true }, take: jest.fn(), setBusy: jest.fn() }));
    await act(async () => result.current.draw({ ...words, picturesStatus: 'none' }));
    await act(async () => result.current.draw(undefined));
    expect(result.current.drawing).toBeNull();
    expect(mockApi.waitForPictures).not.toHaveBeenCalled();
  });
});
