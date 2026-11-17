import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Deck } from '@/api/client';
import { api } from '@/auth/boot';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { DeckCard } from '@/components/chat/deck-card';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { useKaiTyping } from '@/components/chat/use-kai-typing';
import { markOnboardingFinished } from '@/onboarding/finished';
import { afterNameLines, chatLanguageOptions, explainLines, LINES, openingLines, poseFor, REPLIES, type Step } from '@/onboarding/kai-script';
import { getAnswers } from '@/onboarding/store';
import { colors, layout, space } from '@/theme/theme';

type Message = { from: 'kai' | 'user'; text: string } | { from: 'deck' };
const kai = (...lines: string[]): Message[] => lines.map((text) => ({ from: 'kai', text }));
const me = (text: string): Message => ({ from: 'user', text });
const typedText = (m: Message) => (m.from === 'kai' ? m.text : null);

// O10–O10f: meet Kai, pick a topic, get the first deck.
export default function KaiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { learning, speaks } = getAnswers();
  const [step, setStep] = useState<Step>('name');
  // Kai types every bubble (dots first, one after another); options wait for the last one.
  const { messages, typing, busy, say } = useKaiTyping<Message>(typedText, () => kai(...openingLines(learning?.name ?? '')));
  const [options, setOptions] = useState<string[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const name = useRef('');
  const topic = useRef('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const languageOptions = learning && speaks ? chatLanguageOptions(speaks, learning) : [];

  async function propose(nextTopic: string) {
    topic.current = nextTopic;
    setOptions([]);
    try {
      const proposed = await api.proposeDeck(nextTopic);
      setDeck(proposed);
      setStep('proposed');
      say(...kai(LINES.goodChoice), { from: 'deck' }, ...kai(LINES.tapGenerate));
    } catch {
      say(...kai(LINES.proposeFailed));
      setOptions([REPLIES.tryAgain]);
    }
  }

  async function generate() {
    if (!deck) return;
    setStep('generating');
    say(...kai(LINES.picking));
    try {
      setDeck(await api.generateDeck(deck.id));
      setStep('ready');
      say(...kai(LINES.ready, LINES.practice));
      setOptions([REPLIES.practice, REPLIES.wordsFirst]);
    } catch {
      setStep('proposed');
      say(...kai(LINES.generateFailed));
    }
  }

  async function finish(to: '/(tabs)/review' | `/deck/${string}`) {
    await markOnboardingFinished();
    router.replace(to);
  }

  // One entry point for tapped options and typed text.
  function reply(text: string) {
    if (step === 'name') {
      name.current = text.slice(0, 40);
      say(me(text), ...kai(...afterNameLines(name.current)));
      setStep('language');
      setOptions(languageOptions.map((o) => o.label));
    } else if (step === 'language') {
      const picked = languageOptions.find((o) => o.label === text) ?? languageOptions[0];
      say(me(text), ...kai(...explainLines));
      setStep('topic');
      setOptions([]);
      // The chat goes on even if these fail: the name is nice to have, and a topic can be typed.
      if (picked) api.saveChat({ name: name.current, chatLanguage: picked.value }).catch(() => {});
      api.fetchDeckIdeas().then(setOptions, () => {});
    } else if (step === 'topic') {
      if (text === REPLIES.tryAgain) return void propose(topic.current);
      say(me(text));
      void propose(text);
    } else if (step === 'ready' && deck) {
      say(me(text));
      void finish(text === REPLIES.wordsFirst ? `/deck/${deck.id}` : '/(tabs)/review');
    }
  }

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [messages, options, typing]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KaiHeader pose={poseFor(step)} />
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {messages.map((m, i) =>
          m.from === 'deck' ? (
            deck ? <DeckCard key={i} deck={deck} state={step === 'generating' ? 'generating' : deck.status} onGenerate={() => void generate()} onOpen={() => void finish(`/deck/${deck.id}`)} /> : null
          ) : (
            <ChatBubble key={i} from={m.from} text={m.text} />
          ),
        )}
        {typing ? <TypingBubble /> : null}
      </ScrollView>
      <ReplyOptions options={busy ? [] : options} onPick={reply} />
      <View style={{ paddingBottom: Math.max(insets.bottom, space[12]) }}>
        <Composer placeholder={step === 'topic' ? 'Or tell me what you need…' : 'Type a message…'} onSend={reply} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
});
