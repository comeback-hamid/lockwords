import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Deck } from '@/api/client';
import { api } from '@/auth/boot';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { DeckCard, useTimedCount } from '@/components/chat/deck-card';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { RiseIn } from '@/components/chat/rise-in';
import { useKaiTyping } from '@/components/chat/use-kai-typing';
import { markOnboardingFinished } from '@/onboarding/finished';
import { afterNameLines, BACK, chatLanguageOptions, explainLines, kaiStateFor, LINES, openingLines, QUIET_MS, REPLIES, type Step } from '@/onboarding/kai-script';
import { getAnswers } from '@/onboarding/store';
import { colors, layout, space } from '@/theme/theme';

type Message = { from: 'kai'; text: string } | { from: 'user'; text: string; tapped?: boolean } | { from: 'deck' };
const kai = (...lines: string[]): Message[] => lines.map((text) => ({ from: 'kai', text }));
const me = (text: string, tapped = false): Message => ({ from: 'user', text, tapped });
const typedText = (m: Message) => (m.from === 'kai' ? m.text : null);
const OOPS_MS = 1200; // the spec's `oops` hold

// O10–O10f: meet Kai, pick a topic, get the first deck. The user can tap an option or type anything:
// typed text goes to Kai's reply on the server, which says if it answers the step or gives Kai's own lines.
export default function KaiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { learning, speaks } = getAnswers();
  const [step, setStep] = useState<Step>('name');
  // Kai types every bubble (dots first, one after another); options wait for the last one.
  const { messages, typing, busy, say } = useKaiTyping<Message>(typedText, () => kai(...openingLines(learning?.name ?? '')));
  const [options, setOptions] = useState<string[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [waiting, setWaiting] = useState(false); // waiting for the server
  const [composerText, setComposerText] = useState(false);
  const [opened, setOpened] = useState(true);
  const [failed, setFailed] = useState(0); // counts failures; each one plays `oops`
  const [quiet, setQuiet] = useState(false);
  const name = useRef('');
  const topic = useRef('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const languageOptions = learning && speaks ? chatLanguageOptions(speaks, learning) : [];
  const made = useTimedCount(step === 'generating', deck?.wordCount ?? 10);
  const total = deck?.wordCount ?? 10;

  // `oops` holds for a moment after a failure, then the chat goes on.
  const [oops, setOops] = useState(false);
  useEffect(() => {
    if (!failed) return;
    const show = setTimeout(() => setOops(true), 0);
    const hide = setTimeout(() => setOops(false), OOPS_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [failed]);

  // The user's turn and nothing happens for 20 s: Kai waits. Any change starts the clock again.
  const usersTurn = !busy && !waiting && step !== 'generating';
  useEffect(() => {
    const reset = setTimeout(() => setQuiet(false), 0);
    if (!usersTurn || composerText) return () => clearTimeout(reset);
    const t = setTimeout(() => setQuiet(true), QUIET_MS);
    return () => {
      clearTimeout(reset);
      clearTimeout(t);
    };
  }, [usersTurn, composerText, messages.length, step]);

  const pose = kaiStateFor({ step, opened, typing, waiting, composerText, quiet, failed: oops });

  async function propose(nextTopic: string) {
    topic.current = nextTopic;
    setOptions([]);
    setWaiting(true);
    try {
      const proposed = await api.proposeDeck(nextTopic);
      setDeck(proposed);
      setStep('proposed');
      say(...kai(LINES.goodChoice), { from: 'deck' }, ...kai(LINES.tapGenerate));
    } catch {
      setFailed((n) => n + 1);
      say(...kai(LINES.proposeFailed));
      setOptions([REPLIES.tryAgain]);
    } finally {
      setWaiting(false);
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
      setFailed((n) => n + 1);
      setStep('proposed');
      say(...kai(LINES.generateFailed));
    }
  }

  async function finish(to: '/(tabs)/review' | `/deck/${string}`) {
    await markOnboardingFinished();
    router.replace(to);
  }

  // The answer to the current step, from a tap (an option label) or from Kai's reply (a name, native/target, …).
  function answer(value: string) {
    if (step === 'name') {
      name.current = value.slice(0, 40);
      say(...kai(...afterNameLines(name.current)));
      setStep('language');
      setOptions(languageOptions.map((o) => o.label));
    } else if (step === 'language') {
      const picked = languageOptions.find((o) => o.label === value || o.value === value) ?? languageOptions[0];
      say(...kai(...explainLines));
      setStep('topic');
      setOptions([]);
      // The chat goes on even if these fail: the name is nice to have, and a topic can be typed.
      if (picked) api.saveChat({ name: name.current, chatLanguage: picked.value }).catch(() => {});
      api.fetchDeckIdeas().then(setOptions, () => {});
    } else if (step === 'topic') {
      void propose(value === REPLIES.tryAgain ? topic.current : value);
    } else if (step === 'ready' && deck) {
      const wordsFirst = value === REPLIES.wordsFirst || value === 'wordsFirst';
      void finish(wordsFirst ? `/deck/${deck.id}` : '/(tabs)/review');
    }
  }

  // A tapped option is the answer: it rises into the chat as the user's bubble.
  function pick(option: string) {
    setOpened(false);
    say(me(option, true));
    answer(option);
  }

  // Typed text: Kai reads it first. Off the script, Kai answers and asks the step's question again.
  async function typed(text: string) {
    setOpened(false);
    setComposerText(false);
    say(me(text));
    const shown = options;
    setOptions([]);
    setWaiting(true);
    try {
      const reply = await api.kaiReply(step, text, shown);
      if (reply.onScript) answer(reply.answer);
      else {
        say(...kai(...reply.lines, BACK[step]));
        setOptions(shown);
      }
    } catch {
      // Kai cannot answer: the typed text is the answer, as before. Nothing to answer while the deck is proposed or made.
      if (step === 'proposed' || step === 'generating') setOptions(shown);
      else answer(text);
    } finally {
      setWaiting(false);
    }
  }

  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [messages, options, typing]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KaiHeader pose={pose} progress={step === 'generating' ? made / total : step === 'ready' ? 1 : undefined} />
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        {messages.map((m, i) =>
          m.from === 'deck' ? (
            deck ? (
              <DeckCard key={i} deck={deck} state={step === 'generating' ? 'generating' : deck.status} count={made} hideGenerate={busy} onGenerate={() => void generate()} onOpen={() => void finish(`/deck/${deck.id}`)} />
            ) : null
          ) : m.from === 'user' && m.tapped ? (
            <RiseIn key={i}>
              <ChatBubble from="user" text={m.text} />
            </RiseIn>
          ) : (
            <ChatBubble key={i} from={m.from} text={m.text} />
          ),
        )}
        {typing ? <TypingBubble /> : null}
      </ScrollView>
      <ReplyOptions options={busy || waiting ? [] : options} onPick={pick} />
      <View style={{ paddingBottom: Math.max(insets.bottom, space[12]) }}>
        <Composer placeholder={step === 'topic' ? 'Or tell me what you need…' : 'Type a message…'} onSend={(text) => void typed(text)} onTextChange={(t) => setComposerText(t.trim() !== '')} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: layout.sideMargin, paddingVertical: space[16], gap: space[8] },
});
