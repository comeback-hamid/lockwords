import * as router from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

// "Is my screen the one in front?" A screen test that swaps the router for a stand-in without this hook counts as in front.
const useInFront: () => boolean = router.useIsFocused ?? (() => true);

// Android only: while `active`, Back does nothing on this screen (the button, and the swipe from a screen edge).
// For the review round: an Easy or Hard swipe that starts at the edge of the screen is Android's Back gesture, and Back
// from the Review tab opens the first tab. iOS has the same rule for its own swipe-back (root layout, `gestureEnabled`).
// It lets go when another screen is on top (Use it), so Back works there.
export function useBlockBack(active: boolean) {
  const inFront = useInFront();
  useEffect(() => {
    if (Platform.OS !== 'android' || !active || !inFront) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [active, inFront]);
}
