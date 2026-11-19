import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ChatDeck, KaiTurnResult } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { useTimedCount } from '@/components/chat/deck-card';
import { DeckIdeas } from '@/components/chat/deck-ideas';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { WordCard } from '@/components/chat/word-card';
import { LoadError } from '@/components/load-state';
import { languageCode, MAKE_FAILED, pendingDeck, REVIEW_DELAY_MS, TOO_MANY, typingMs, withDeckStatus, withLine, type Line } from '@/new-words/chat';
import { showReviewDot } from '@/review/dot';
import { colors, layout, space, type } from '@/theme/theme';

// Kai's lines that still wait behind a typing bubble, and what comes after the last one.
// keepOptions: a line the app adds by itself (making a deck failed) leaves the options as they are.
type Coming = { lines: Line[]; options: string[]; action: 'review' | null; keepOptions?: boolean };
const NONE: Coming = { lines: [], options: [], action: null };
let localId = 0;
const local = (from: Line['from'], text: string): Line => ({ id: `local-${localId++}`, from, text, translation: null });

// New words (Figma N1, N1b, N8): one ongoing chat with Kai. Kai's lines come from the server (an agent with memory).
export default function NewWordsScreen() {
  const router = useRouter();
  const me = useMe();
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
  const [mood, setMood] = useState<'celebrate' | 'oops' | null>(null);
  const madeWords = useTimedCount(making !== null, making?.wordCount ?? 10);
  const told = useRef(new Set<string>());
  const shown = useRef<Line[]>([]);
  useEffect(() => {
    shown.current = lines;
  }, [lines]);

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
      setMood('celebrate');
      return true;
    },
    [take],
  );
  // Makes a deck Kai offered. The caller has taken the turn (`quiet`).
  const makeDeck = useCallback(
    async (deck: ChatDeck) => {
      setMaking(deck);
      setGreeting(false);
      setFailed(null);
      setMood(null);
      try {
        await api.generateDeck(deck.id); // waits for the server's job, also one that was started before
      } catch {
        // Nothing was made: the cards come back and Kai says so.
        setMaking(null);
        setMood('oops');
        setLines((all) => withDeckStatus(all, deck.id, 'proposed'));
        return setComing({ lines: [local('kai', MAKE_FAILED)], options: [], action: null, keepOptions: true });
      }
      setLines((all) => withDeckStatus(all, deck.id, 'ready'));
      setMaking(null);
      if (!(await sayReady(deck.id, true))) quiet.current = true;
    },
    [sayReady],
  );
  function generate(deck: ChatDeck) {
    if (!quiet.current) return; // Kai is answering, or another deck is being made
    quiet.current = false;
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
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (ready) void open();
      return () => {
        focused.current = false;
      };
    }, [ready, open]),
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
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [lines, typing, options, failed, making]);

  async function send(text: string) {
    if (!quiet.current) return; // Kai is still answering; the composer keeps the text
    quiet.current = false;
    const retry = failed !== null;
    const before = options;
    const mine = local('user', text);
    setLines((all) => [...all, mine]);
    setOptions([]);
    setFailed(null);
    setGreeting(false);
    setMood(null);
    setBusy(true);
    const result = await api.sendKaiMessage(text);
    setBusy(false);
    if (result.ok) {
      // The composer cleared itself on send. After a retry the text was put back by us, so take it out again.
      if (retry) setDraft((d) => ({ key: d.key + 1, text: '' }));
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
  }

  // The Add button of a word card. A new word is waiting in Review, so its tab gets the red dot.
  async function addWord(messageId: string) {
    const { already } = await api.addKaiWord(messageId);
    if (!already) void showReviewDot();
    return already ? ('already' as const) : ('added' as const);
  }

  function toggleTranslation() {
    const on = !translation.on;
    setTranslation((t) => ({ ...t, on }));
    api.setKaiTranslation(on).catch(() => setTranslation((t) => ({ ...t, on: !on }))); // not saved: switch back
  }

  const header = (
    <KaiHeader
      pose={making ? 'making' : busy ? 'thinking' : (mood ?? (greeting ? 'greeting' : 'idle'))}
      progress={making ? madeWords / making.wordCount : undefined}
      back={false}
      right={ready ? <TranslationToggle code={translation.code} on={translation.on} onToggle={toggleTranslation} /> : undefined}
    />
  );

  // Dev builds only: lets the Maestro flows check that the guest user survives a restart (as on the other tabs).
  const devId =
    __DEV__ && me ? (
      <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
        {me.id}
      </Text>
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
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {lines.map((l) => (
          <Fragment key={l.id}>
            <ChatBubble from={l.from} text={l.text} translation={l.translation} showTranslation={translation.on} />
            {l.word ? <WordCard word={l.word} onAdd={() => addWord(l.id)} /> : null}
            {l.decks?.length ? (
              <DeckIdeas decks={l.decks} showTranslation={translation.on} making={making?.id ?? null} locked={typing || making !== null} count={madeWords} onGenerate={generate} onOpen={(d) => router.push(`/deck/${d.id}`)} />
            ) : null}
          </Fragment>
        ))}
        {typing ? <TypingBubble /> : null}
        {failed ? <LoadError message="Kai can’t answer right now." onRetry={() => void send(failed)} /> : null}
      </ScrollView>
      <ReplyOptions options={typing || making ? [] : options} onPick={(o) => void send(o)} />
      <View style={keyboard ? styles.composerTyping : styles.composer}>
        <Composer key={draft.key} defaultValue={draft.text} placeholder="Type a message…" onSend={(t) => void send(t)} maxLength={500} mic={false} canSend={!typing && !making} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.sideMargin },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
  composer: { paddingBottom: layout.tabBarClearance },
  composerTyping: { paddingBottom: space[12] },
  dev: { color: colors.subtle, textAlign: 'center', paddingTop: space[4] },
});
