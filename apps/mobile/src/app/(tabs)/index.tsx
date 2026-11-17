import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { KaiMessage, KaiTurnResult } from '@/api/client';
import { api } from '@/auth/boot';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { TypingBubble } from '@/components/chat/typing-bubble';
import { LoadError } from '@/components/load-state';
import { languageCode, REVIEW_DELAY_MS, TOO_MANY, typingMs } from '@/new-words/chat';
import { colors, layout, space } from '@/theme/theme';

type Line = Pick<KaiMessage, 'id' | 'from' | 'text' | 'translation'>;
// Kai's lines that still wait behind a typing bubble, and what comes after the last one.
type Coming = { lines: Line[]; options: string[]; action: 'review' | null };
const NONE: Coming = { lines: [], options: [], action: null };
let localId = 0;
const local = (from: Line['from'], text: string): Line => ({ id: `local-${localId++}`, from, text, translation: null });

// New words (Figma N1, N1b, N8): one ongoing chat with Kai. Kai's lines come from the server (an agent with memory).
export default function NewWordsScreen() {
  const router = useRouter();
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

  // What a finished turn adds to the screen.
  const take = useCallback((result: KaiTurnResult) => {
    if (!result.ok) return false;
    const { messages, options: next, action } = result.turn;
    if (messages.length) setComing({ lines: messages, options: next, action });
    return true;
  }, []);

  // Load the chat, then let Kai open it (the server decides if Kai has something new to say).
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
        return;
      }
      setBusy(true);
      const opening = await api.openKaiChat();
      if (!live) return;
      setBusy(false);
      // A failed opening is quiet: the learner can still write, and Kai opens next time.
      if (opening.ok && opening.turn.messages.length) {
        setOptions([]);
        setGreeting(true);
        take(opening);
      }
    })();
    return () => {
      live = false;
    };
  }, [attempt, take]);

  // One line at a time: typing dots for about a second, then the line. Options come after the last line.
  useEffect(() => {
    const [next, ...rest] = coming.lines;
    if (!next) return;
    const timer = setTimeout(() => {
      setLines((all) => [...all, next]);
      setComing((c) => ({ ...c, lines: rest }));
      if (rest.length === 0) setOptions(coming.options);
    }, typingMs(next.text));
    return () => clearTimeout(timer);
  }, [coming]);

  // Kai said "I take you to Review": one second after the last line, open the tab.
  const leaving = coming.action === 'review' && coming.lines.length === 0;
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setComing(NONE);
      router.navigate('/review');
    }, REVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [leaving, router]);

  const typing = busy || coming.lines.length > 0;
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [lines, typing, options, failed]);

  async function send(text: string) {
    if (busy) return;
    const mine = local('user', text);
    setLines((all) => [...all, mine]);
    setOptions([]);
    setFailed(null);
    setGreeting(false);
    setBusy(true);
    const result = await api.sendKaiMessage(text);
    setBusy(false);
    if (take(result)) return setDraft((d) => ({ key: d.key + 1, text: '' }));
    if (!result.ok && result.error === 'too_many_messages') return setComing({ lines: [local('kai', TOO_MANY)], options: [], action: null });
    // Nothing was saved: take the bubble back and give the learner their text again.
    setLines((all) => all.filter((l) => l.id !== mine.id));
    setFailed(text);
    setDraft((d) => ({ key: d.key + 1, text }));
  }

  function toggleTranslation() {
    const on = !translation.on;
    setTranslation((t) => ({ ...t, on }));
    api.setKaiTranslation(on).catch(() => setTranslation((t) => ({ ...t, on: !on }))); // not saved: switch back
  }

  const header = (
    <KaiHeader
      pose={busy ? 'thinking' : greeting ? 'greeting' : 'idle'}
      back={false}
      right={load === 'ready' ? <TranslationToggle code={translation.code} on={translation.on} onToggle={toggleTranslation} /> : undefined}
    />
  );

  if (load !== 'ready')
    return (
      <View style={styles.root}>
        {header}
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
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {lines.map((l) => (
          <ChatBubble key={l.id} from={l.from} text={l.text} translation={l.translation} showTranslation={translation.on} />
        ))}
        {typing ? <TypingBubble /> : null}
        {failed ? <LoadError message="Kai can’t answer right now." onRetry={() => void send(failed)} /> : null}
      </ScrollView>
      <ReplyOptions options={typing ? [] : options} onPick={(o) => void send(o)} />
      <View style={styles.composer}>
        <Composer key={draft.key} defaultValue={draft.text} placeholder="Type a message…" onSend={(t) => void send(t)} maxLength={500} mic={false} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.sideMargin },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
  composer: { paddingBottom: space[12] },
});
