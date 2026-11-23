import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Deck } from '@/api/client';
import { api } from '@/auth/boot';
import { ChatBubble, TypingBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { chatMessagesGrow, chatScrollProps, useScrollToEndOnKeyboard } from '@/components/chat/keyboard';
import { DeckCard, useTimedCount } from '@/components/chat/deck-card';
import { KaiHeader } from '@/components/chat/kai-header';
import { ReplyOptions } from '@/components/chat/reply-options';
import { RiseIn } from '@/components/chat/rise-in';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { useKaiTyping } from '@/components/chat/use-kai-typing';
import { useTranslation } from '@/components/chat/use-translation';
import { markOnboardingFinished } from '@/onboarding/finished';
import { BACK_KEY, chatLanguageOptions, EXPLAIN_KEYS, isEnglish, kaiStateFor, makeScript, QUIET_MS, SCRIPT_WAIT_MS, type ScriptLine, type ScriptMaps, type Step } from '@/onboarding/kai-script';
import { getAnswers } from '@/onboarding/store';
import { colors, layout, space } from '@/theme/theme';

type Message = { from: 'kai'; text: string; translation?: string } | { from: 'user'; text: string; tapped?: boolean } | { from: 'deck' };
const kai = (...lines: (string | ScriptLine)[]): Message[] => lines.map((line) => ({ from: 'kai', ...(typeof line === 'string' ? { text: line } : line) }));
const me = (text: string, tapped = false): Message => ({ from: 'user', text, tapped });
const typedText = (m: Message) => (m.from === 'kai' ? m.text : null);
const OOPS_MS = 1200; // the spec's `oops` hold

// Kai's lines in another language come from the server. A failed call means English.
const loadScript = (native: string, learning: string): Promise<ScriptMaps | null> =>
  Promise.resolve()
    .then(() => api.fetchKaiScript(native, learning))
    .catch(() => null);
// The same, but never longer than the wait: then English.
const loadScriptInTime = (native: string, learning: string) => Promise.race([loadScript(native, learning), new Promise<null>((resolve) => setTimeout(() => resolve(null), SCRIPT_WAIT_MS))]);

// O10–O10f. Kai speaks the learner's own language from the first line, so a learner who does not speak English
// waits here (Kai and the typing dots) until the lines are loaded, 4 seconds at most.
export default function KaiScreen() {
  const { learning, speaks } = getAnswers();
  const wait = !!speaks && !isEnglish(speaks);
  const [maps, setMaps] = useState<ScriptMaps | null | undefined>(wait ? undefined : null); // undefined = still loading
  useEffect(() => {
    if (!wait) return;
    let live = true;
    void loadScriptInTime(speaks.name, learning?.name ?? '').then((m) => live && setMaps(m));
    return () => {
      live = false;
    };
  }, [wait, speaks, learning]);
  if (maps === undefined) {
    return (
      <View style={styles.root}>
        <KaiHeader pose="greeting" />
        <View style={styles.messages}>
          <TypingBubble />
        </View>
      </View>
    );
  }
  return <KaiChat loaded={maps} />;
}

// Meet Kai, pick a topic, get the first deck. The user can tap an option or type anything:
// typed text goes to Kai's reply on the server, which says if it answers the step or gives Kai's own lines.
function KaiChat({ loaded }: { loaded: ScriptMaps | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { learning, speaks } = getAnswers();
  const [step, setStep] = useState<Step>('name');
  // Kai's lines in the chat's language. It changes once, when the chat language is picked (read in handlers only).
  const script = useRef(makeScript(loaded, null));
  const chatLanguage = useRef<'native' | 'target' | null>(null);
  // The same translation switch as the New words chat, from Kai's first line: the app knows the learner's language here.
  const translation = useTranslation(speaks ? (speaks.code ?? speaks.name) : null);
  const S = () => script.current;
  // Kai types every bubble (dots first, one after another); options wait for the last one.
  const { messages, typing, busy, say } = useKaiTyping<Message>(typedText, () => kai(makeScript(loaded, null).line('hi'), makeScript(loaded, null).line('askName', { language: learning?.name ?? '' })));
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
  useScrollToEndOnKeyboard(scroll);

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
      say(...kai(S().line('goodChoice')), { from: 'deck' }, ...kai(S().line('tapGenerate')));
    } catch {
      setFailed((n) => n + 1);
      say(...kai(S().line('proposeFailed')));
      setOptions([S().label('replyTryAgain')]);
    } finally {
      setWaiting(false);
    }
  }

  async function generate() {
    if (!deck) return;
    setStep('generating');
    say(...kai(S().line('picking')));
    try {
      setDeck(await api.generateDeck(deck.id));
      setStep('ready');
      say(...kai(S().line('ready'), S().line('practice')));
      setOptions([S().label('replyPractice'), S().label('replyWordsFirst')]);
    } catch {
      setFailed((n) => n + 1);
      setStep('proposed');
      say(...kai(S().line('generateFailed')));
    }
  }

  async function finish(to: '/(tabs)/review' | `/deck/${string}`) {
    await markOnboardingFinished();
    router.replace(to);
  }

  // The chat language is picked: from here Kai's lines follow it. An English speaker who picks the learned language
  // has no script yet: it is loaded now (4 seconds at most, then English).
  async function chooseLanguage(chat: 'native' | 'target') {
    setStep('topic');
    setOptions([]);
    let maps = loaded;
    if (!maps && chat === 'target' && speaks && learning && !isEnglish(learning)) {
      setWaiting(true);
      maps = await loadScriptInTime(speaks.name, learning.name);
      setWaiting(false);
    }
    script.current = makeScript(maps, chat);
    chatLanguage.current = chat;
    say(...kai(...EXPLAIN_KEYS.map((key) => S().line(key))));
    // A topic can be typed, so the chat goes on even if the ideas fail.
    api.fetchDeckIdeas().then(
      (ideas) => setOptions(ideas.map((idea) => S().label(`idea:${idea}`))),
      () => {},
    );
  }

  // The answer to the current step, from a tap (an option label) or from Kai's reply (a name, native/target, …).
  function answer(value: string) {
    if (step === 'name') {
      name.current = value.slice(0, 40);
      say(...kai(S().line('niceToMeet', { name: name.current }), S().line('whichLanguage')));
      setStep('language');
      setOptions(languageOptions.map((o) => o.label));
    } else if (step === 'language') {
      const picked = languageOptions.find((o) => o.label === value || o.value === value) ?? languageOptions[0];
      void chooseLanguage(picked?.value ?? 'native');
      // The chat goes on even if this fails: the name is nice to have.
      if (picked) api.saveChat({ name: name.current, chatLanguage: picked.value }).catch(() => {});
    } else if (step === 'topic') {
      void propose(value === S().label('replyTryAgain') ? topic.current : value);
    } else if (step === 'ready' && deck) {
      const wordsFirst = value === S().label('replyWordsFirst') || value === 'wordsFirst';
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
      // Kai answers in the chat's language. In the learned language its lines come with translations.
      const reply = chatLanguage.current === 'target' ? await api.kaiReply(step, text, shown, 'target') : await api.kaiReply(step, text, shown);
      if (reply.onScript) answer(reply.answer);
      else {
        say(...kai(...reply.lines.map((line, i) => ({ text: line, translation: reply.translations?.[i] })), S().line(BACK_KEY[step])));
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
      <KaiHeader
        pose={pose}
        progress={step === 'generating' ? made / total : step === 'ready' ? 1 : undefined}
        right={translation.code ? <TranslationToggle code={translation.code} on={translation.on} onToggle={translation.toggle} /> : undefined}
      />
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={[styles.messages, chatMessagesGrow]} {...chatScrollProps}>
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
            <ChatBubble key={i} from={m.from} text={m.text} translation={m.from === 'kai' ? m.translation : undefined} showTranslation={translation.on} />
          ),
        )}
        {typing ? <TypingBubble /> : null}
        <ReplyOptions options={busy || waiting ? [] : options} onPick={pick} />
      </ScrollView>
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
