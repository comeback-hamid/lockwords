// Skia does not draw in Jest. Kai's canvas becomes a plain view that keeps its props, so tests can read the state.
jest.mock('@/kai/kai-canvas', () => {
  const { View } = jest.requireActual('react-native');
  return { KaiCanvas: (props: Record<string, unknown>) => <View testID="kai-canvas" {...props} /> };
});
