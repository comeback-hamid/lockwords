import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { ChatDeck, KaiTurnResult } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { useTimedCount } from '@/components/chat/deck-card';
import { DeckIdeas } from '@/components/chat/deck-ideas';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { RiseIn } from '@/components/chat/rise-in';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { WordCard } from '@/components/chat/word-card';
import { LoadError } from '@/components/load-state';
import { hasPendingAsk, takePendingAsk } from '@/new-words/pending';
import { useDeckPictures } from '@/new-words/pictures';
import { languageCode, MAKE_FAILED, newWordsKaiState, OOPS_MS, pendingDeck, QUIET_MS, REVIEW_DELAY_MS, SLEEP_MS, TOO_MANY, TOP_PX, typingMs, withDeckStatus, withLine, withOlder, type Line } from '@/new-words/chat';
import { showReviewDot, useReviewDot } from '@/review/dot';
import { colors, layout, radius, space, type } from '@/theme/theme';

// Kai's lines that still wait behind a typing bubble, and what comes after the last one.
// keepOptions: a line the app adds by itself (making a deck failed) leaves the options as they are.
type Coming = { lines: Line[]; options: string[]; action: 'review' | null; keepOptions?: boolean };
const NONE: Coming = { lines: [], options: [], action: null };
const KEEP_PLACE = { minIndexForVisible: 0 };
let localId = 0;
const LOCAL = 'local-'; // a line the app made itself; the server does not know its id
const local = (from: Line['from'], text: string, tapped = false): Line => ({ id: `${LOCAL}${localId++}`, from, text, translation: null, tapped });

// New words (Figma N1, N1b, N8): one ongoing chat with Kai. Kai's lines come from the server (an agent with memory).
export default function NewWordsScreen() {
  const router = useRouter();
  const me = useMe();
  const reviewDot = useReviewDot();
  const [load, setLoad] = useState<'loading' | 'error' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [coming, setComing] = useState<Coming>(NONE);
  const [options, setOptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); // waiting for the server
  const [greeting, setGreeting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null); // the text of a turn that did not go through
  const [draft, setDraft] = useState({ key: 0, text: '' }); // a new key puts `text` back in the composer
  const [translation, setTranslation] = useState({ on: true, code: '' });
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Decks (Figma N2–N5): the deck being made now, how Kai feels about the last one, and the decks Kai was asked to speak about.
  const [making, setMaking] = useState<ChatDeck | null>(null);
  const [celebrate, setCelebrate] = useState(0); // 0 = no; a new number plays it again (a deck is ready, a word was added)
  const madeWords = useTimedCount(making !== null, making?.wordCount ?? 10);
  const told = useRef(new Set<string>());
  const shown = useRef<Line[]>([]);
  useEffect(() => {
    shown.current = lines;
  }, [lines]);

  // Kai's state follows the chat (see `newWordsKaiState`). `oops` holds for a moment after a failure.
  const [composerText, setComposerText] = useState(false);
  const [oops, setOops] = useState(false);
  const oopsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fail = useCallback(() => {
    setOops(true);
    clearTimeout(oopsTimer.current);
    oopsTimer.current = setTimeout(() => setOops(false), OOPS_MS);
  }, []);
  useEffect(() => () => clearTimeout(oopsTimer.current), []);
  // Anything the learner does (typing, a tap, a scroll) starts the quiet clock again.
  const [activity, setActivity] = useState(0);
  const touch = useCallback(() => setActivity((a) => a + 1), []);
  const [resting, setResting] = useState<{ since: string; level: 'waiting' | 'sleeping' } | null>(null);
  // Older messages: the server said more are left; one page loads at a time, after the learner's own scroll.
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const dragged = useRef(false);

  // The tab bar floats over the screen, so the composer sits above it. With the keyboard up the tab bar is hidden behind it.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Queues Kai's lines of a finished turn. False when there is nothing to show.
  const take = useCallback((result: KaiTurnResult) => {
    if (!result.ok || result.turn.messages.length === 0) return false;
    const { messages, options: next, action } = result.turn;
    setComing({ lines: messages, options: next, action });
    return true;
  }, []);

  // Kai opens the chat when it has something new to say (the server decides: at most once in 12 hours).
  // Asked when the tab is in view with the chat loaded, and when the app comes back to the front.
  const quiet = useRef(true); // false while a turn runs, a deck is made or Kai's lines are still showing
  const focused = useRef(false);

  // The deck is made: Kai says so (the server answers once per deck). False when Kai has nothing to add.
  const sayReady = useCallback(
    async (deckId: string, justMade: boolean) => {
      told.current.add(deckId);
      if (justMade) void showReviewDot();
      setBusy(true);
      const result = await api.deckReady(deckId);
      setBusy(false);
      if (!take(result)) return false;
      if (!justMade) void showReviewDot(); // made while the learner was away
      setCelebrate((n) => n + 1);
      return true;
    },
    [take],
  );
  const { drawing, draw } = useDeckPictures({ quietRef: quiet, take, setBusy });
  // Makes a deck Kai offered. The caller has taken the turn (`quiet`).
  const makeDeck = useCallback(
    async (deck: ChatDeck) => {
      setMaking(deck);
      setGreeting(false);
      setFailed(null);
      setCelebrate(0);
      let made: Awaited<ReturnType<typeof api.generateDeck>>;
      try {
        made = await api.generateDeck(deck.id); // waits for the server's job, also one that was started before
      } catch {
        // Nothing was made: the cards come back and Kai says so.
        setMaking(null);
        fail();
        setLines((all) => withDeckStatus(all, deck.id, 'proposed'));
        return setComing({ lines: [local('kai', MAKE_FAILED)], options: [], action: null, keepOptions: true });
      }
      setLines((all) => withDeckStatus(all, deck.id, 'ready'));
      setMaking(null);
      void draw(made); // the pictures come after the words: the card counts them, and Kai says when they are done
      if (!(await sayReady(deck.id, true))) quiet.current = true;
    },
    [sayReady, fail, draw],
  );
  function generate(deck: ChatDeck) {
    if (!quiet.current) return; // Kai is answering, or another deck is being made
    quiet.current = false;
    touch();
    void makeDeck(deck);
  }

  const open = useCallback(async () => {
    if (!quiet.current) return;
    quiet.current = false;
    // First a deck that was left half way: still being made, or made while the learner was away.
    const pending = pendingDeck(shown.current, told.current);
    if (pending?.status === 'generating') return void makeDeck(pending);
    if (pending && (await sayReady(pending.id, false))) return;
    setBusy(true);
    const opening = await api.openKaiChat();
    setBusy(false);
    // A failed opening is quiet: the learner can still write, and Kai opens next time.
    if (opening.ok && opening.turn.messages.length) {
      setOptions([]);
      setGreeting(true);
      take(opening);
    } else {
      quiet.current = true;
    }
  }, [take, makeDeck, sayReady]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const chat = await api.fetchKaiChat();
        if (!live) return;
        setLines(chat.messages);
        setHasMore(chat.hasMore === true);
        setOptions(chat.options);
        setTranslation({ on: chat.translationOn, code: languageCode(chat.nativeLanguage) });
        setLoad('ready');
      } catch {
        if (live) setLoad('error');
      }
    })();
    return () => {
      live = false;
    };
  }, [attempt]);

  const ready = load === 'ready';
  // A deck idea tapped in the word plan (Progress tab) waits for this chat: it is sent once the tab is open and Kai is
  // quiet. Kai may still be saying hello, so look again for a few seconds. Returns how to stop looking.
  const latestSend = useRef<(text: string) => Promise<void>>(async () => {});
  useEffect(() => {
    latestSend.current = send;
  });
  const sendPendingAsk = useCallback(() => {
    if (!hasPendingAsk()) return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      if (quiet.current) {
        const ask = takePendingAsk();
        if (ask) void latestSend.current(ask);
      }
      if (!hasPendingAsk() || ++tries > 40) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (ready) void open();
      const stop = ready ? sendPendingAsk() : undefined;
      return () => {
        focused.current = false;
        stop?.();
      };
    }, [ready, open, sendPendingAsk]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready && focused.current) void open();
    });
    return () => sub.remove();
  }, [ready, open]);

  // One line at a time: typing dots for about a second, then the line. Options come after the last line.
  useEffect(() => {
    const [next, ...rest] = coming.lines;
    if (!next) return;
    const timer = setTimeout(() => {
      setLines((all) => withLine(all, next));
      setComing((c) => ({ ...c, lines: rest }));
      if (rest.length === 0) {
        if (!coming.keepOptions) setOptions(coming.options);
        if (coming.action !== 'review') quiet.current = true;
      }
    }, typingMs(next.text));
    return () => clearTimeout(timer);
  }, [coming]);

  // Kai said "I take you to Review": one second after the last line, open the tab.
  const leaving = coming.action === 'review' && coming.lines.length === 0;
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setComing(NONE);
      quiet.current = true;
      if (focused.current) router.navigate('/review'); // the learner may have left for another tab in that second
    }, REVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [leaving, router]);

  const typing = busy || coming.lines.length > 0;
  // A new line at the bottom scrolls the chat down. Older messages joining at the top do not.
  const newest = lines.at(-1)?.id;
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [newest, typing, options, failed, making]);

  // The learner's turn and nothing happens: Kai waits after 20 seconds and sleeps after 2 minutes.
  // `moment` changes with anything that happens, and a rest only counts for the moment it started in.
  const usersTurn = ready && !typing && making === null;
  const moment = `${activity}:${lines.length}:${composerText}`;
  useEffect(() => {
    if (!usersTurn || composerText) return;
    const wait = setTimeout(() => setResting({ since: moment, level: 'waiting' }), QUIET_MS);
    const sleep = setTimeout(() => setResting({ since: moment, level: 'sleeping' }), SLEEP_MS);
    return () => {
      clearTimeout(wait);
      clearTimeout(sleep);
    };
  }, [usersTurn, composerText, moment]);
  const rest = usersTurn && resting?.since === moment ? resting.level : null;

  function typed(text: string) {
    const has = text.trim() !== '';
    setComposerText(has);
    touch();
    if (!has) return;
    // Kai listens now: the wave or the cheer is over.
    setGreeting(false);
    setCelebrate(0);
  }

  // The page before the oldest line on screen. A failed load is quiet: the next scroll to the top tries again.
  async function loadOlder() {
    const oldest = shown.current.find((l) => !l.id.startsWith(LOCAL));
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const page = await api.fetchKaiChat(oldest.id);
      setLines((all) => withOlder(all, page.messages));
      setHasMore(page.hasMore === true);
    } catch {
      // nothing to show
    }
    setLoadingOlder(false);
  }
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!hasMore || loadingOlder || !dragged.current || e.nativeEvent.contentOffset.y > TOP_PX) return;
    dragged.current = false; // one page per scroll of the learner's own
    void loadOlder();
  }

  async function send(text: string, tapped = false) {
    if (!quiet.current) return; // Kai is still answering; the composer keeps the text
    quiet.current = false;
    touch();
    const retry = failed !== null;
    const before = options;
    const mine = local('user', text, tapped);
    setLines((all) => [...all, mine]);
    setOptions([]);
    setFailed(null);
    setGreeting(false);
    setCelebrate(0);
    setBusy(true);
    const result = await api.sendKaiMessage(text);
    setBusy(false);
    if (result.ok) {
      // The composer cleared itself on send. After a retry the text was put back by us, so take it out again.
      if (retry) {
        setDraft((d) => ({ key: d.key + 1, text: '' }));
        setComposerText(false);
      }
      if (!take(result)) quiet.current = true;
      return;
    }
    if (result.error === 'too_many_messages') return setComing({ lines: [local('kai', TOO_MANY)], options: [], action: null });
    // Nothing was saved: take the bubble back, and give the learner their text and the options again.
    quiet.current = true;
    setLines((all) => all.filter((l) => l.id !== mine.id));
    setOptions(before);
    setFailed(text);
    setDraft((d) => ({ key: d.key + 1, text }));
    setComposerText(true);
    fail();
  }

  // The Add button of a word card. A new word is waiting in Review, so its tab gets the red dot.
  async function addWord(messageId: string) {
    touch();
    const { already } = await api.addKaiWord(messageId);
    if (!already) {
      void showReviewDot();
      setCelebrate((n) => n + 1);
    }
    return already ? ('already' as const) : ('added' as const);
  }

  function toggleTranslation() {
    const on = !translation.on;
    touch();
    setTranslation((t) => ({ ...t, on }));
    api.setKaiTranslation(on).catch(() => setTranslation((t) => ({ ...t, on: !on }))); // not saved: switch back
  }

  const header = (
    <KaiHeader
      pose={newWordsKaiState({ failed: oops, making: making !== null, waiting: busy, typing: coming.lines.length > 0, composerText, rest, celebrate: celebrate > 0, greeting })}
      playKey={celebrate}
      progress={making ? madeWords / making.wordCount : undefined}
      back={false}
      right={ready ? <TranslationToggle code={translation.code} on={translation.on} onToggle={toggleTranslation} /> : undefined}
    />
  );

  // Dev builds only: lets the Maestro flows check that the guest user survives a restart (as on the other tabs).
  const devId =
    __DEV__ && me ? (
      <>
        <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
          {me.id}
        </Text>
        {/* The Review tab's red dot is a native badge with no text, which Maestro cannot see. This line says the same thing. */}
        <Text testID="dev-review-dot" style={[type.caption, styles.dev]}>
          {reviewDot ? 'review dot on' : 'review dot off'}
        </Text>
      </>
    ) : null;

  if (!ready)
    return (
      <View style={styles.root}>
        {header}
        {devId}
        {load === 'loading' ? (
          <View accessible accessibilityLabel="Loading the chat" style={styles.center} />
        ) : (
          <View style={styles.center}>
            <LoadError
              message="Kai can’t load the chat."
              onRetry={() => {
                setLoad('loading');
                setAttempt((a) => a + 1);
              }}
            />
          </View>
        )}
      </View>
    );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {devId}
      <View style={styles.scroll}>
      <ScrollView
        ref={scroll}
        testID="chat-messages"
        style={styles.scroll}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        // Older messages join at the top: the line the learner is reading stays where it is.
        maintainVisibleContentPosition={KEEP_PLACE}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          dragged.current = true;
          touch();
        }}
      >
        {lines.map((l) => (
          <Fragment key={l.id}>
            {l.tapped ? (
              <RiseIn>
                <ChatBubble from={l.from} text={l.text} />
              </RiseIn>
            ) : (
              <ChatBubble from={l.from} text={l.text} translation={l.translation} showTranslation={translation.on} />
            )}
            {l.word ? <WordCard word={l.word} onAdd={() => addWord(l.id)} /> : null}
            {l.decks?.length ? (
              <DeckIdeas decks={l.decks} showTranslation={translation.on} making={making?.id ?? null} locked={typing || making !== null} count={madeWords} drawing={drawing} onGenerate={generate} onOpen={(d) => router.push(`/deck/${d.id}`)} />
            ) : null}
          </Fragment>
        ))}
        {typing ? <TypingBubble /> : null}
        {failed ? <LoadError message="Kai can’t answer right now." onRetry={() => void send(failed)} /> : null}
        </ScrollView>
        {loadingOlder ? (
          // Over the chat, not in it: the messages do not move while the page loads.
          <View pointerEvents="none" style={styles.older}>
            <Text accessibilityLabel="Loading older messages" style={[type.caption, styles.olderText]}>
              Loading older messages…
            </Text>
          </View>
        ) : null}
      </View>
      <ReplyOptions options={typing || making ? [] : options} onPick={(o) => void send(o, true)} />
      <View style={keyboard ? styles.composerTyping : styles.composer}>
        <Composer key={draft.key} defaultValue={draft.text} placeholder="Type a message…" onSend={(t) => void send(t)} onTextChange={typed} maxLength={500} mic={false} canSend={!typing && !making} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.sideMargin },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
  older: { position: 'absolute', top: space[8], left: 0, right: 0, alignItems: 'center' },
  olderText: { color: colors.muted, backgroundColor: colors.canvas, paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: radius.pill, overflow: 'hidden' },
  composer: { paddingBottom: layout.tabBarClearance },
  composerTyping: { paddingBottom: space[12] },
  dev: { color: colors.subtle, textAlign: 'center', paddingTop: space[4] },
});
