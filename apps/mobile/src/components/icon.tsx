import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iconPaths } from './icon-paths';

export type IconName = keyof typeof iconPaths;

// An icon is decoration: screen readers skip it. A browser has its own word for that.
const HIDDEN = Platform.OS === 'web' ? { 'aria-hidden': true } : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const);

// Octicons (Figma Icon/16 and Icon/24). Add a name in scripts/gen-icons.mjs, then `npm run icons:gen`.
export function Icon({ name, size = 16, color }: { name: IconName; size?: 16 | 24; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} {...HIDDEN}>
      {iconPaths[name][size].map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}
