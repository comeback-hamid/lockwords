import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState, Dimensions } from 'react-native';

import { createApi, type ChatDeck, type Deck, type KaiChat, type KaiMessage, type KaiTurn } from '@/api/client';
import TabsLayout from '@/app/(tabs)/_layout';
import NewWordsScreen from '@/app/(tabs)/index';
import { api } from '@/auth/boot';
import { SECURE_KEYS } from '@/auth/session-storage';
import { DeckCard } from '@/components/chat/deck-card';
import { DeckIdeas, ideaStep } from '@/components/chat/deck-ideas';
import { MAKE_FAILED } from '@/new-words/chat';
import { clearReviewDot, loadReviewDot, REVIEW_DOT_KEY, showReviewDot } from '@/review/dot';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
let mockPath = '/';
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPath,
  Redirect: () => null,
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
}));
// Native tabs do not draw in Jest: each trigger becomes its label, and a badge becomes a marked view.
jest.mock('expo-router/native-tabs', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const Trigger = Object.assign(({ name, children }: { name: string; children?: React.ReactNode }) => <View testID={`tab-${name}`}>{children}</View>, {
    Label: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
    Icon: () => null,
    Badge: ({ hidden }: { hidden?: boolean }) => (hidden ? null : <View testID="tab-badge" accessibilityLabel="New words to review" />),
  });
  return { NativeTabs: Object.assign(pass, { Trigger }) };
});
jest.mock('@/onboarding/finished', () => ({ useOnboardingFinished: () => true }));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiChat: jest.fn(), openKaiChat: jest.fn(), sendKaiMessage: jest.fn(), setKaiTranslation: jest.fn(), generateDeck: jest.fn(), deckReady: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
let n = 0;
const kai = (text: string, decks?: ChatDeck[]): KaiMessage => ({ id: `k${n++}`, from: 'kai', text, translation: `EN: ${text}`, createdAt: '2026-11-18T10:00:00.000Z', ...(decks ? { decks } : {}) });
const user = (text: string): KaiMessage => ({ id: `u${n++}`, from: 'user', text, translation: null, createdAt: '2026-11-18T10:00:00.000Z' });
const idea = (id: string, over: Partial<ChatDeck> = {}): ChatDeck => ({ id, title: `Título ${id}`, titleTranslation: `Title ${id}`, reason: 'Para tu viaje', cefr: 'A2', wordCount: 20, status: 'proposed', current: true, ...over });
const three = (over: Partial<ChatDeck> = {}) => [idea('d1', { wordCount: 12, ...over }), idea('d2', over), idea('d3', { wordCount: 30, ...over })];
const chat = (over: Partial<KaiChat> = {}): KaiChat => ({ messages: [], options: [], translationOn: true, nativeLanguage: 'en', ...over });
const turn = (over: Partial<KaiTurn> = {}): { ok: true; turn: KaiTurn } => ({ ok: true, turn: { userMessage: null, messages: [], options: [], action: null, ...over } });
const NOTHING = turn();
const made = (id: string, wordCount = 20): Deck => ({
  id,
  topic: 't',
  title: `Título ${id}`,
  titleTranslation: `Title ${id}`,
  reason: 'r',
  cefr: 'A2',
  wordCount,
  status: 'ready',
  cards: Array.from({ length: wordCount }, (_, i) => ({ id: `c${i}`, position: i, word: `w${i}`, translation: `t${i}`, example: 'e', exampleTranslation: 'x', stage: 0 })),
});
const READY = turn({ messages: [kai('¡Tu mazo está listo! Ya está en Review.'), kai('¿Practicamos ahora?')], options: ['Vamos a practicar', 'Hacer otro mazo'] });
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const kaiState = () => screen.getByTestId('kai-canvas').props.state;
const generateButtons = () => screen.queryAllByRole('button', { name: 'Generate' });
const settle = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockStore.clear();
  mockPath = '/';
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  mockApi.fetchKaiChat.mockResolvedValue(chat());
  mockApi.openKaiChat.mockResolvedValue(NOTHING);
  mockApi.sendKaiMessage.mockResolvedValue(NOTHING);
  mockApi.setKaiTranslation.mockResolvedValue(undefined);
  mockApi.deckReady.mockResolvedValue(NOTHING);
});
afterEach(async () => {
  await act(async () => clearReviewDot());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('deck card', () => {
  const noop = { onGenerate: jest.fn(), onOpen: jest.fn() };
  test('sizes: a ready deck of 10 and of 30 show their own count and one square per word', async () => {
    const view = await render(<DeckCard deck={idea('d1', { wordCount: 10, status: 'ready' })} state="ready" inWordList {...noop} />);
    expect(screen.getByText('A2 · 10 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('10 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(screen.getByText('JUST NOW')).toBeOnTheScreen();
    expect(screen.getAllByTestId('level-square')).toHaveLength(10);
    await view.rerender(<DeckCard deck={idea('d1', { wordCount: 30, status: 'ready' })} state="ready" inWordList {...noop} />);
    expect(screen.getByText('A2 · 30 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('30 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(screen.getAllByTestId('level-square')).toHaveLength(30);
  });
  test('a made deck with cards shows their level squares', async () => {
    await render(<DeckCard deck={made('d1', 12)} state="ready" inWordList {...noop} />);
    expect(screen.getAllByTestId('level-square')).toHaveLength(12);
  });
  test('states: Generate, then the progress bar with no button and "n / 20 WORDS", then IN YOUR WORD LIST', async () => {
    const onGenerate = jest.fn();
    const onOpen = jest.fn();
    const view = await render(<DeckCard deck={idea('d1')} state="proposed" onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('“Título d1”')).toBeOnTheScreen();
    expect(screen.getByText('Para tu viaje')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    await view.rerender(<DeckCard deck={idea('d1')} state="generating" count={7} onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('Making your deck…')).toBeOnTheScreen();
    expect(screen.getByText('7 / 20 WORDS')).toBeOnTheScreen();
    expect(generateButtons()).toHaveLength(0);
    await view.rerender(<DeckCard deck={idea('d1')} state="ready" inWordList onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('20 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open deck' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  test('translation: under the title when translations are on, gone when off or when the deck has none', async () => {
    const view = await render(<DeckCard deck={idea('d1', { title: 'Pedir comida', titleTranslation: 'Ordering food' })} state="proposed" showTranslation {...noop} />);
    expect(screen.getByText('Ordering food')).toBeOnTheScreen();
    await view.rerender(<DeckCard deck={idea('d1', { title: 'Pedir comida', titleTranslation: 'Ordering food' })} state="proposed" showTranslation={false} {...noop} />);
    expect(screen.queryByText('Ordering food')).toBeNull();
    await view.rerender(<DeckCard deck={idea('d1', { title: 'Pedir comida', titleTranslation: null })} state="proposed" showTranslation {...noop} />);
    expect(screen.getByText('“Pedir comida”')).toBeOnTheScreen();
    expect(screen.queryByTestId('deck-title-translation')).toBeNull();
  });
  test('disabled: no Generate button and tapping does nothing', async () => {
    const onGenerate = jest.fn();
    const onOpen = jest.fn();
    await render(<DeckCard deck={idea('d1')} state="disabled" onGenerate={onGenerate} onOpen={onOpen} />);
    expect(generateButtons()).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
    await fireEvent.press(screen.getByText('“Título d1”'));
    expect(onGenerate).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('deck ideas row', () => {
  const props = { showTranslation: true, making: null, locked: false, onGenerate: jest.fn(), onOpen: jest.fn() };
  test('three ideas: three cards with Generate in a row, and three dots with the first one dark', async () => {
    await render(<DeckIdeas decks={three()} {...props} />);
    expect(generateButtons()).toHaveLength(3);
    expect(screen.getByTestId('deck-ideas-row')).toBeOnTheScreen();
    expect(screen.getByLabelText('Deck 1 of 3')).toBeOnTheScreen();
    expect(screen.getAllByTestId('deck-dot')).toHaveLength(3);
    expect(screen.getByText('A2 · 12 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('A2 · 30 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('Title d1')).toBeOnTheScreen();
  });
  test('swipe left: the second card is in the middle and the second dot is dark', async () => {
    await render(<DeckIdeas decks={three()} {...props} />);
    const step = ideaStep(Dimensions.get('window').width);
    await fireEvent.scroll(screen.getByTestId('deck-ideas-row'), { nativeEvent: { contentOffset: { x: step, y: 0 } } });
    expect(screen.getByLabelText('Deck 2 of 3')).toBeOnTheScreen();
    await fireEvent.scroll(screen.getByTestId('deck-ideas-row'), { nativeEvent: { contentOffset: { x: step * 2 + 3, y: 0 } } });
    expect(screen.getByLabelText('Deck 3 of 3')).toBeOnTheScreen();
  });
  test('one card shows alone: no row to swipe, no dots', async () => {
    await render(<DeckIdeas decks={[idea('d1')]} {...props} />);
    expect(generateButtons()).toHaveLength(1);
    expect(screen.queryByTestId('deck-ideas-row')).toBeNull();
    expect(screen.queryByTestId('deck-dot')).toBeNull();
  });
  test('Generate gives the tapped deck; locked hides Generate on every card', async () => {
    const onGenerate = jest.fn();
    const view = await render(<DeckIdeas decks={three()} {...props} onGenerate={onGenerate} />);
    await fireEvent.press(generateButtons()[1]!);
    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ id: 'd2' }));
    await view.rerender(<DeckIdeas decks={three()} {...props} locked onGenerate={onGenerate} />);
    await fireEvent.press(screen.getAllByText('Generate', { includeHiddenElements: true })[0]!);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
  test('making: only the chosen card shows, as generating; a made deck shows alone as ready', async () => {
    const view = await render(<DeckIdeas decks={three()} {...props} making="d2" count={3} />);
    expect(screen.getByText('“Título d2”')).toBeOnTheScreen();
    expect(screen.queryByText('“Título d1”')).toBeNull();
    expect(screen.getByText('3 / 20 WORDS')).toBeOnTheScreen();
    expect(generateButtons()).toHaveLength(0);
    await view.rerender(<DeckIdeas decks={[idea('d1', { wordCount: 12 }), idea('d2', { status: 'ready' }), idea('d3')]} {...props} />);
    expect(screen.getByText('20 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(screen.queryByText('“Título d3”')).toBeNull();
  });
  test('ideas that are not current show as disabled; a made one stays ready', async () => {
    const view = await render(<DeckIdeas decks={three({ current: false })} {...props} />);
    expect(generateButtons()).toHaveLength(0);
    expect(screen.getByText('“Título d1”')).toBeOnTheScreen();
    expect(screen.getAllByTestId('deck-dot')).toHaveLength(3);
    await view.rerender(<DeckIdeas decks={[idea('d1', { current: false }), idea('d2', { current: false, status: 'ready' }), idea('d3', { current: false })]} {...props} />);
    expect(screen.getByRole('button', { name: 'Open deck' })).toBeOnTheScreen();
  });
});

describe('New words screen with decks', () => {
  const withIdeas = () => chat({ messages: [user('Sí, quiero verlos'), kai('Mira, 3 mazos para ti'), kai('Toca Generate en uno', three())] });

  test('three ideas show under Kai’s line and follow the translation button', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(withIdeas());
    await render(<NewWordsScreen />);
    await settle();
    expect(kaiSays('Toca Generate en uno')).toBeOnTheScreen();
    expect(generateButtons()).toHaveLength(3);
    expect(screen.getByLabelText('Deck 1 of 3')).toBeOnTheScreen();
    expect(screen.getByText('Title d1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
    expect(screen.queryByText('Title d1')).toBeNull();
    expect(mockApi.deckReady).not.toHaveBeenCalled();
    expect(mockApi.generateDeck).not.toHaveBeenCalled();
  });

  test('ideas that come with a turn show after Kai’s last line; Generate waits until Kai has finished typing', async () => {
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('Sí'), messages: [kai('Mira, 3 mazos para ti'), kai('Toca Generate en uno', three())] }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Sí');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await settle(1200);
    expect(kaiSays('Mira, 3 mazos para ti')).toBeOnTheScreen();
    expect(screen.queryByTestId('deck-ideas-row')).toBeNull();
    await settle(1200);
    expect(screen.getByTestId('deck-ideas-row')).toBeOnTheScreen();
    expect(generateButtons()).toHaveLength(3);
  });

  test('Generate on the second card: only that card shows as generating, Kai is making; ready: the card, Kai’s lines, the options and the Review dot', async () => {
    let finish!: (d: Deck) => void;
    mockApi.generateDeck.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mockApi.deckReady.mockResolvedValue(READY);
    mockApi.fetchKaiChat.mockResolvedValue(withIdeas());
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(generateButtons()[1]!);
    expect(mockApi.generateDeck).toHaveBeenCalledWith('d2');
    expect(screen.getByText('Making your deck…')).toBeOnTheScreen();
    expect(screen.getByText('“Título d2”')).toBeOnTheScreen();
    expect(screen.queryByText('“Título d1”')).toBeNull();
    expect(generateButtons()).toHaveLength(0);
    expect(kaiState()).toBe('making');
    expect(mockStore.get(REVIEW_DOT_KEY)).toBeUndefined();
    // While it runs the learner cannot send: the text stays in the box.
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Hola');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(mockApi.sendKaiMessage).not.toHaveBeenCalled();

    await act(async () => finish(made('d2')));
    await settle();
    expect(screen.getByText('20 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(mockApi.deckReady).toHaveBeenCalledWith('d2');
    expect(mockStore.get(REVIEW_DOT_KEY)).toBe('1');
    await settle(1300);
    await settle(1300);
    expect(kaiSays('¡Tu mazo está listo! Ya está en Review.')).toBeOnTheScreen();
    expect(kaiSays('¿Practicamos ahora?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Vamos a practicar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Hacer otro mazo' })).toBeOnTheScreen();
    expect(kaiState()).not.toBe('making');
  });

  test('making fails: the three cards come back with Generate and Kai says to try again', async () => {
    mockApi.generateDeck.mockRejectedValue(new Error('deck not made'));
    mockApi.fetchKaiChat.mockResolvedValue(withIdeas());
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(generateButtons()[0]!);
    await settle(1500);
    expect(generateButtons()).toHaveLength(3);
    expect(kaiSays(MAKE_FAILED)).toBeOnTheScreen();
    expect(mockApi.deckReady).not.toHaveBeenCalled();
    expect(mockStore.get(REVIEW_DOT_KEY)).toBeUndefined();
    // Trying again works.
    mockApi.generateDeck.mockResolvedValue(made('d1', 12));
    await fireEvent.press(generateButtons()[0]!);
    await settle();
    expect(screen.getByText('12 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
  });

  test('came back later, the deck is ready: the card shows as ready and Kai’s ready lines show once', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Toca Generate en uno', [idea('d1'), idea('d2', { status: 'ready' }), idea('d3')])] }));
    mockApi.deckReady.mockResolvedValueOnce(READY);
    await render(<NewWordsScreen />);
    await settle(2600);
    expect(screen.getByText('20 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(mockApi.deckReady).toHaveBeenCalledTimes(1);
    expect(mockApi.deckReady).toHaveBeenCalledWith('d2');
    expect(kaiSays('¡Tu mazo está listo! Ya está en Review.')).toBeOnTheScreen();
    expect(mockApi.generateDeck).not.toHaveBeenCalled();
    expect(mockStore.get(REVIEW_DOT_KEY)).toBe('1');
    // The app comes to the front again: the event is not sent a second time.
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.map((c) => c[1] as (s: string) => void);
    await act(async () => listeners.forEach((l) => l('active')));
    await settle();
    expect(mockApi.deckReady).toHaveBeenCalledTimes(1);
  });

  test('came back later, Kai already said it: nothing new shows and Kai may open as usual', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Toca Generate en uno', [idea('d2', { status: 'ready' })]), kai('¡Tu mazo está listo!')], options: ['Vamos a practicar'] }));
    await render(<NewWordsScreen />);
    await settle(1500);
    expect(mockApi.deckReady).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText(/^Kai: /)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Vamos a practicar' })).toBeOnTheScreen();
    expect(mockApi.openKaiChat).toHaveBeenCalledTimes(1);
    expect(mockStore.get(REVIEW_DOT_KEY)).toBeUndefined();
  });

  test('came back later, the deck is still being made: the card shows as generating, then ready', async () => {
    let finish!: (d: Deck) => void;
    mockApi.generateDeck.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mockApi.deckReady.mockResolvedValue(READY);
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Toca Generate en uno', [idea('d1'), idea('d2', { status: 'generating' }), idea('d3')])] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(mockApi.generateDeck).toHaveBeenCalledWith('d2');
    expect(screen.getByText('Making your deck…')).toBeOnTheScreen();
    expect(kaiState()).toBe('making');
    await act(async () => finish(made('d2')));
    await settle(1300);
    await settle(1300);
    expect(screen.getByText('20 WORDS · IN YOUR WORD LIST')).toBeOnTheScreen();
    expect(kaiSays('¿Practicamos ahora?')).toBeOnTheScreen();
  });

  test('older ideas are disabled once Kai offers new ones', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(withIdeas());
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('otra'), messages: [kai('Aquí tienes', [idea('d9', { title: 'Nuevo' })])] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(generateButtons()).toHaveLength(3);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'otra');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await settle(1200);
    expect(generateButtons()).toHaveLength(1);
    expect(screen.getByText('“Título d1”')).toBeOnTheScreen();
    expect(screen.getByText('“Nuevo”')).toBeOnTheScreen();
  });

  test('tapping the ready card opens the deck page', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Toca Generate en uno', [idea('d2', { status: 'ready' })])] }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Open deck' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/deck/d2');
  });

  test('"Let’s practice" after a deck: Kai’s line, then Review opens one second later', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos ahora?')], options: ['Vamos a practicar', 'Hacer otro mazo'] }));
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('Vamos a practicar'), messages: [kai('Te llevo a Review')], action: 'review' }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Vamos a practicar' }));
    await settle(900);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    await settle(1100);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/review');
  });
});

describe('Review dot', () => {
  test('the flag is listed with the secure keys, so a fresh install clears it', () => {
    expect(SECURE_KEYS).toContain(REVIEW_DOT_KEY);
  });
  test('set: the Review tab shows a dot; kept after a restart; gone when the Review tab opens', async () => {
    await render(<TabsLayout />);
    expect(screen.queryByTestId('tab-badge')).toBeNull();
    await act(async () => showReviewDot());
    expect(screen.getByTestId('tab-badge')).toBeOnTheScreen();
    expect(mockStore.get(REVIEW_DOT_KEY)).toBe('1');

    // A restart: the app reads the flag again at start.
    await screen.unmount();
    await act(async () => loadReviewDot());
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-badge')).toBeOnTheScreen();

    mockPath = '/review';
    await screen.rerender(<TabsLayout />);
    await settle();
    expect(screen.queryByTestId('tab-badge')).toBeNull();
    expect(mockStore.has(REVIEW_DOT_KEY)).toBe(false);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(REVIEW_DOT_KEY);
  });
  test('no flag saved: no dot after a restart', async () => {
    await act(async () => loadReviewDot());
    await render(<TabsLayout />);
    expect(screen.queryByTestId('tab-badge')).toBeNull();
  });
});

describe('api client', () => {
  beforeEach(() => jest.useRealTimers());
  test('deckReady posts the event with the deck id', async () => {
    const body = { userMessage: null, messages: [], options: [], action: null };
    const fetchMock = jest.fn(async (_req: Request) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const real = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch });
    expect(await real.deckReady('d2')).toEqual({ ok: true, turn: body });
    expect(await fetchMock.mock.calls[0]![0].json()).toEqual({ event: 'deck_ready', deckId: 'd2' });
    expect(fetchMock.mock.calls[0]![0].url).toBe('http://api.test/v1/kai/chat/turns');
  });
});
