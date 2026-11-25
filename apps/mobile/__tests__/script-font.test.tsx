import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ChatBubble } from '@/components/chat/chat-bubble';
import { LangText } from '@/components/lang-text';
import { fontFor, scriptOf } from '@/theme/script-font';
import { type } from '@/theme/theme';

// One font rule for every language (Hamid, 2026-11-25). Mona Sans has Latin letters only.
test('the script of a text', () => {
  for (const latin of ['deadline', 'la propina', 'İstanbul’da görüşürüz', 'Tiếng Việt', '🎉 Great — 100%!']) expect(scriptOf(latin)).toBe('latin');
  for (const arabic of ['مهلت', 'مرحبا', 'یک جمله با deadline بنویس']) expect(scriptOf(arabic)).toBe('arabic');
  for (const other of ['Привет', 'Ελληνικά', '你好', 'こんにちは', '안녕하세요', 'שלום', 'नमस्ते']) expect(scriptOf(other)).toBe('other');
});

test('Latin keeps Mona Sans; the Arabic script gets Vazirmatn at the same weight; every other script the phone’s font at the same weight', () => {
  expect(fontFor('deadline', type.body)).toBeNull();
  expect(fontFor('مهلت', type.body)).toMatchObject({ fontFamily: 'Vazirmatn_400Regular' });
  expect(fontFor('مهلت', type.calloutMedium)).toMatchObject({ fontFamily: 'Vazirmatn_500Medium' });
  expect(fontFor('مهلت', type.bodyStrong)).toMatchObject({ fontFamily: 'Vazirmatn_600SemiBold' });
  expect(fontFor('Привет', type.bodyStrong)).toMatchObject({ fontWeight: '600' });
  expect(fontFor('你好', type.body)).toMatchObject({ fontWeight: '400' });
  expect(fontFor('你好', type.body)!.fontFamily).not.toMatch(/MonaSans/);
  expect(fontFor('مهلت', type.label)).toBeNull(); // the mono labels are the app's own English
});

test('a text part and a chat bubble use the rule', async () => {
  await render(
    <>
      <LangText style={type.headline}>مهلت</LangText>
      <LangText style={type.headline}>la propina</LangText>
      <ChatBubble from="kai" text="Write one sentence with **deadline**." translation="یک جمله با **deadline** بنویس." showTranslation />
    </>,
  );
  expect(StyleSheet.flatten(screen.getByText('مهلت').props.style).fontFamily).toBe('Vazirmatn_600SemiBold');
  expect(StyleSheet.flatten(screen.getByText('la propina').props.style).fontFamily).toBe('MonaSans_600SemiBold');
  expect(StyleSheet.flatten(screen.getByText(/یک جمله با/).props.style).fontFamily).toBe('Vazirmatn_400Regular');
});
