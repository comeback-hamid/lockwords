import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, layout, radius, type } from '@/theme/theme';

type Props = { label: string; onPress(): void; disabled?: boolean };

// Figma Button/Primary: 56 tall, green. One per screen.
export function ButtonPrimary({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[type.button, styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

// Figma Text link: muted, underlined, 44 tall hit area.
export function TextLink({ label, onPress }: Omit<Props, 'disabled'>) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.link} hitSlop={4}>
      <Text style={[type.callout, styles.linkLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: layout.buttonHeight,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.buttonEdge,
    backgroundColor: colors.button,
  },
  pressed: { backgroundColor: colors.buttonPressed },
  disabled: { opacity: 0.4 },
  primaryLabel: { color: colors.white },
  link: { height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: colors.muted, textDecorationLine: 'underline' },
});
