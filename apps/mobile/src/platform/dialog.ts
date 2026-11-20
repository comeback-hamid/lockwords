import { Alert, Platform } from 'react-native';

// System pop-ups. A browser has no native alert with buttons from React Native, so the web app uses the browser's own.

// "Are you sure?" with a destructive action. `onYes` runs only when the person agrees.
export function confirmAction(title: string, message: string, yesLabel: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}

// A message with one OK button.
export function tell(title: string, message: string) {
  if (Platform.OS === 'web') return window.alert(`${title}\n\n${message}`);
  Alert.alert(title, message, [{ text: 'OK' }]);
}
