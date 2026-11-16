import Svg, { Path } from 'react-native-svg';

import { iconPaths } from './icon-paths';

export type IconName = keyof typeof iconPaths;

// Octicons (Figma Icon/16 and Icon/24). Add a name in scripts/gen-icons.mjs, then `npm run icons:gen`.
export function Icon({ name, size = 16, color }: { name: IconName; size?: 16 | 24; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden importantForAccessibility="no">
      {iconPaths[name][size].map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}
