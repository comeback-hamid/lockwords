// Skia does not draw in Jest. Kai's canvas becomes a plain view that keeps its props, so tests can read the state.
jest.mock('@/kai/kai-canvas', () => {
  const { View } = jest.requireActual('react-native');
  return { KaiCanvas: (props: Record<string, unknown>) => <View testID="kai-canvas" {...props} /> };
});

// The meadow is drawn with Skia too: Jest uses the still picture made for the browser, so tests can count its blocks.
jest.mock('@/components/meadow-canvas', () => jest.requireActual('@/components/meadow-canvas.web'));

// Kai's typing (dots for about a second per bubble) is off in screen tests, so they read Kai's lines at once.
// __tests__/kai-typing.test.tsx turns it on to test the typing itself.
require('@/components/chat/use-kai-typing').setTypingForTests(false);
