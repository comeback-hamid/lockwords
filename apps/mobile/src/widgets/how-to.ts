import { Platform } from 'react-native';

// How to add the widget, said on the one-time screen after the first round. iOS: the lock screen widget.
// Android phones have no lock screen widgets, so there it is the home screen widget.
export const widgetHowTo = (os: string = Platform.OS) =>
  os === 'android' ? 'Hold your home screen, tap Widgets, then add Lockwords.' : 'Hold your lock screen, tap Customize, then add Lockwords.';
