import { Platform } from 'react-native';

// The name (accessibility label) of a control that is on the screen but hidden from screen readers for now, like the
// red Delete button under a closed word row. iOS and the browser hide such a control from test tools too. Android
// does not: Maestro lists every view there and would read the name of a button nobody can see or press. So on
// Android the control has an empty name until it shows (an empty text, not `undefined`: React Native on Android keeps
// the old name when the label is taken away).
export const nameWhenShown = (name: string, shown: boolean, os: string = Platform.OS) => (os === 'android' && !shown ? '' : name);
