import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { chatMessagesGrow, chatScrollProps, scrollChatToEnd, useScrollToEndOnKeyboard } from '@/components/chat/keyboard';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { useTranslation } from '@/components/chat/use-translation';
import { useKaiTyping } from '@/components/chat/use-kai-typing';
import { LangText } from '@/components/lang-text';
import { LINES, type KaiPose } from '@/onboarding/kai-script';
import { advance, findCard } from '@/review/round-store';
import { colors, layout, levelColor, levelColors, radius, space, type } from '@/theme/theme';
import { NoRound } from '@/platform/no-round';

type Message = { from: 'kai'; text: string; translation?: string; status?: boolean } | { from: 'user'; text: string } | { from: 'word' } | { from: 'movedUp' };
// Kai types every line (dots first); the word card and the "Checking" status show at once.
const typedText = (m: Message) => (m.from === 'kai' && !m.status ? m.text : null);

// Kai's fixed lines of this chat. They come from the server in the language Kai speaks with this learner, with a
// translation under them when that is the language they learn. Without the server: the built-in English.
type ScriptLine = { text: string; translation?: string };
type UseItScript = { nativeLanguage: string | null; lines: Record<string, ScriptLine> };
const KEYS = ['useItIntro', 'useItWrite', 'useItChecking', 'useItThinking', 'useItCheckFailed', 'useItAskFailed', 'replyExample', 'replySkip', 'replyNext'] as const;
type Key = (typeof KEYS)[number];
const ENGLISH: UseItScript = { nativeLanguage: null, lines: Object.fromEntries(KEYS.map((key) => [key, { text: LINES[key] }])) };
const SCRIPT_WAIT_MS = 4000;
const loadScript = (): Promise<UseItScript> =>
  Promise.race([
    Promise.resolve()
      .then(() => api.fetchUseItScript())
      .then((s) => s ?? ENGLISH)
      .catch(() => ENGLISH),
    new Promise<UseItScript>((resolve) => setTimeout(() => resolve(ENGLISH), SCRIPT_WAIT_MS)),
  ]);

// Use it (Figma O13–O13c / A6): write one sentence with the word; Kai checks it.
// The screen waits for Kai's lines (Kai and the typing dots), 4 seconds at most.
export default function UseItScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = findCard(id);
  const [script, setScript] = useState<UseItScript | null>(null);
  useEffect(() => {
    let live = true;
    void loadScript().then((s) => live && setScript(s));
    return () => {
      live = false;
    };
  }, []);
  if (!card) return <NoRound />; // opened without a round (a deep link; a reload in the browser): see NoRound
  if (!script) {
    return (
      <View style={styles.root}>
        <KaiHeader pose="idle" icon="close" />
        <View style={styles.messages}>
          <TypingBubble />
        </View>
      </View>
    );
  }
  return <UseItChat card={card} script={script} />;
}

function UseItChat({ card, script }: { card: NonNullable<ReturnType<typeof findCard>>; script: UseItScript }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // One of Kai's fixed lines, with the word put in. A key the server did not send is the English line.
  const line = (key: Key): ScriptLine => {
    const fill = (text: string) => text.replace('{word}', card.word);
    const l = script.lines[key] ?? ENGLISH.lines[key]!;
    return { text: fill(l.text), ...(l.translation ? { translation: fill(l.translation) } : {}) };
  };
  const kai = (key: Key, status = false): Message => ({ from: 'kai', ...line(key), ...(status ? { status } : {}) });
  const REPLY = { example: line('replyExample').text, skip: line('replySkip').text, next: line('replyNext').text };
  // The same translation switch as every Kai chat: one saved choice.
  const translation = useTranslation(script.nativeLanguage);
  const { messages, typing, busy, say: add, edit } = useKaiTyping<Message>(typedText, () => [kai('useItIntro'), { from: 'word' }, kai('useItWrite')]);
  const [options, setOptions] = useState<string[]>([REPLY.example, REPLY.skip]);
  const [pose, setPose] = useState<KaiPose>('idle');
  const [composerText, setComposerText] = useState(false); // the learner is typing: Kai listens
  const [cheer, setCheer] = useState(0); // counts good sentences; each one plays the thumbs-up
  // After a good sentence the chat turns into questions about the word: typed text is asked, not checked.
  const [goodSentence, setGoodSentence] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToEndOnKeyboard(scroll);
  const say = (...next: Message[]) => {
    edit((all) => all.filter((m) => !(m.from === 'kai' && m.status)));
    add(...next);
  };

  useEffect(() => {
    scrollChatToEnd(scroll, !busy && options.length > 0);
  }, [messages, options, typing, busy]);

  async function check(sentence: string) {
    say({ from: 'user', text: sentence }, kai('useItChecking', true));
    setOptions([]);
    setPose('thinking');
    try {
      const result = await api.useIt(card.id, sentence);
      say(...result.lines.map((text, i): Message => ({ from: 'kai', text, translation: result.translations?.[i] })), ...(result.movedUp ? [{ from: 'movedUp' } as const] : []));
      setPose(result.good ? 'celebrate' : 'idle');
      if (result.good) {
        setCheer((n) => n + 1);
        setGoodSentence(sentence);
        setOptions(result.followUp ? [REPLY.next, result.followUp] : [REPLY.next]);
      } else {
        setOptions([REPLY.example, REPLY.skip]);
      }
    } catch {
      say(kai('useItCheckFailed'));
      setPose('idle');
    }
  }

  async function ask(question: string) {
    say({ from: 'user', text: question }, kai('useItThinking', true));
    setOptions([]);
    setPose('thinking');
    try {
      const { lines, translations } = await api.askAboutWord(card.id, question, goodSentence ?? undefined);
      say(...lines.map((text, i): Message => ({ from: 'kai', text, translation: translations?.[i] })));
    } catch {
      say(kai('useItAskFailed'));
    }
    setPose('idle');
    setOptions([REPLY.next]);
  }

  // Leaving (Next card or the X): after a good sentence this word is done for today, so the round moves on.
  // Before one, the word is still the round's current card.
  function close() {
    if (goodSentence !== null) advance();
    router.back();
  }

  function reply(text: string) {
    if (text === REPLY.skip) return router.back();
    if (text === REPLY.next) return close();
    if (text === REPLY.example) {
      // The example with its translation under it, like every Kai line.
      say({ from: 'user', text }, { from: 'kai', text: card.example, translation: card.exampleTranslation });
      return setOptions([REPLY.skip]);
    }
    if (goodSentence !== null) return void ask(text);
    void check(text);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KaiHeader pose={pose} talking={typing} listening={composerText} icon="close" onBack={close} right={translation.code ? <TranslationToggle code={translation.code} on={translation.on} onToggle={translation.toggle} /> : undefined} />
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={[styles.messages, chatMessagesGrow]} {...chatScrollProps}>
        {messages.map((m, i) =>
          m.from === 'word' ? (
            <View key={i} accessible accessibilityLabel={`Kai: ${card.word}, ${card.translation}`} style={styles.word}>
              <View style={[styles.square, { backgroundColor: levelColor(card.stage) }]} />
              <LangText style={[type.bodyStrong, styles.ink]}>{card.word}</LangText>
              <LangText style={[type.callout, styles.muted]}>{card.translation}</LangText>
            </View>
          ) : m.from === 'movedUp' ? (
            <View key={i} style={styles.movedUp}>
              <View style={[styles.square, { backgroundColor: levelColors[3] }]} />
              <Text style={[type.labelTag, styles.green]}>{`${card.word.toUpperCase()} MOVED UP A LEVEL`}</Text>
            </View>
          ) : (
            <ChatBubble key={i} from={m.from} text={m.text} translation={m.from === 'kai' ? m.translation : undefined} showTranslation={translation.on} />
          ),
        )}
        {typing ? <TypingBubble /> : null}
        <ReplyOptions options={busy ? [] : options} onPick={reply} />
      </ScrollView>
      {cheer ? <ThumbsUp key={cheer} /> : null}
      <View style={{ paddingBottom: Math.max(insets.bottom, space[12]) }}>
        <Composer placeholder={goodSentence !== null ? 'Ask Kai about this word…' : 'Type a message…'} onSend={reply} maxLength={300} onTextChange={(t) => setComposerText(t.trim() !== '')} />
      </View>
    </KeyboardAvoidingView>
  );
}

// Thumbs-up emoji float up once after a good sentence (no score).
const THUMBS = [
  { left: '12%', size: 30, delay: 0 },
  { left: '30%', size: 22, delay: 180 },
  { left: '48%', size: 34, delay: 60 },
  { left: '64%', size: 24, delay: 260 },
  { left: '80%', size: 38, delay: 120 },
] as const;
function ThumbsUp() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {THUMBS.map((thumb) => (
        <Animated.Text
          key={thumb.left}
          style={{
            position: 'absolute',
            bottom: 140,
            left: thumb.left,
            fontSize: thumb.size,
            opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -260 - thumb.delay] }) }],
          }}>
          👍
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
  word: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: 14, paddingVertical: space[12], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  movedUp: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingLeft: space[4] },
  square: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: colors.divider },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
});
