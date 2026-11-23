import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { chatScrollProps } from '@/components/chat/keyboard';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { useKaiTyping } from '@/components/chat/use-kai-typing';
import type { KaiPose } from '@/onboarding/kai-script';
import { advance, findCard } from '@/review/round-store';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

type Message = { from: 'kai' | 'user'; text: string } | { from: 'word' } | { from: 'movedUp' };
const REPLY = { example: 'Show me an example', skip: 'Skip this word', next: 'Next card' } as const;
const CHECKING = 'Checking… 👀';
const THINKING = 'Thinking… 💭';
// Kai types every line (dots first); the word card and the "Checking" status show at once.
const typedText = (m: Message) => (m.from === 'kai' && m.text !== CHECKING && m.text !== THINKING ? m.text : null);

// Use it (Figma O13–O13c / A6): write one sentence with the word; Kai checks it.
export default function UseItScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = findCard(id);
  const { messages, typing, busy, say: add, edit } = useKaiTyping<Message>(typedText, () =>
    card ? [{ from: 'kai', text: 'Time to use a word! ✍️' }, { from: 'word' }, { from: 'kai', text: `Write one sentence with **${card.word}**. I’ll check it for you.` }] : [],
  );
  const [options, setOptions] = useState<string[]>([REPLY.example, REPLY.skip]);
  const [pose, setPose] = useState<KaiPose>('idle');
  const [cheer, setCheer] = useState(0); // counts good sentences; each one plays the thumbs-up
  // After a good sentence the chat turns into questions about the word: typed text is asked, not checked.
  const [goodSentence, setGoodSentence] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const say = (...next: Message[]) => {
    edit((all) => all.filter((m) => !(m.from === 'kai' && (m.text === CHECKING || m.text === THINKING))));
    add(...next);
  };

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [messages, options, typing]);

  if (!card) return <View style={styles.root} />; // opened without a round (deep link): nothing to show

  async function check(sentence: string) {
    say({ from: 'user', text: sentence }, { from: 'kai', text: CHECKING });
    setOptions([]);
    setPose('thinking');
    try {
      const result = await api.useIt(card!.id, sentence);
      say(...result.lines.map((text): Message => ({ from: 'kai', text })), ...(result.movedUp ? [{ from: 'movedUp' } as const] : []));
      setPose(result.good ? 'celebrate' : 'idle');
      if (result.good) {
        setCheer((n) => n + 1);
        setGoodSentence(sentence);
        setOptions(result.followUp ? [REPLY.next, result.followUp] : [REPLY.next]);
      } else {
        setOptions([REPLY.example, REPLY.skip]);
      }
    } catch {
      say({ from: 'kai', text: 'I could not check that. Try again.' });
      setPose('idle');
    }
  }

  async function ask(question: string) {
    say({ from: 'user', text: question }, { from: 'kai', text: THINKING });
    setOptions([]);
    setPose('thinking');
    try {
      const { lines } = await api.askAboutWord(card!.id, question, goodSentence ?? undefined);
      say(...lines.map((text): Message => ({ from: 'kai', text })));
    } catch {
      say({ from: 'kai', text: 'I could not answer that. Try again.' });
    }
    setPose('idle');
    setOptions([REPLY.next]);
  }

  function reply(text: string) {
    if (text === REPLY.skip) return router.back();
    if (text === REPLY.next) {
      advance(); // this word is done for today
      return router.back();
    }
    if (text === REPLY.example) {
      say({ from: 'user', text }, { from: 'kai', text: card!.example }, { from: 'kai', text: card!.exampleTranslation });
      return setOptions([REPLY.skip]);
    }
    if (goodSentence !== null) return void ask(text);
    void check(text);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KaiHeader pose={pose} icon="close" />
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} {...chatScrollProps}>
        {messages.map((m, i) =>
          m.from === 'word' ? (
            <View key={i} accessible accessibilityLabel={`Kai: ${card.word}, ${card.translation}`} style={styles.word}>
              <View style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
              <Text style={[type.bodyStrong, styles.ink]}>{card.word}</Text>
              <Text style={[type.callout, styles.muted]}>{card.translation}</Text>
            </View>
          ) : m.from === 'movedUp' ? (
            <View key={i} style={styles.movedUp}>
              <View style={[styles.square, { backgroundColor: levelColors[3] }]} />
              <Text style={[type.labelTag, styles.green]}>{`${card.word.toUpperCase()} MOVED UP A LEVEL`}</Text>
            </View>
          ) : (
            <ChatBubble key={i} from={m.from} text={m.text} />
          ),
        )}
        {typing ? <TypingBubble /> : null}
      </ScrollView>
      {cheer ? <ThumbsUp key={cheer} /> : null}
      <ReplyOptions options={busy ? [] : options} onPick={reply} />
      <View style={{ paddingBottom: Math.max(insets.bottom, space[12]) }}>
        <Composer placeholder={goodSentence !== null ? 'Ask Kai about this word…' : 'Type a message…'} onSend={reply} maxLength={300} />
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
