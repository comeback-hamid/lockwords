import { Redirect } from 'expo-router';

// An address that is not a screen of the app (a typing mistake, an old link). The router's own page for this is a
// black developer page with a link to every route. The app opens its start instead: the tabs, or onboarding for a
// new learner.
export default function NotFound() {
  return <Redirect href="/" />;
}
