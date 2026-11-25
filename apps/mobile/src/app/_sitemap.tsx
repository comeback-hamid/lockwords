import { Redirect } from 'expo-router';

// The router has a built-in page at /_sitemap that lists every route of the app. It is a tool for developers and has
// no place in the app people use, so this file takes its place and opens the start.
export default function Sitemap() {
  return <Redirect href="/" />;
}
