import { Pressable as RNPressable, type PressableProps, type View } from 'react-native';
import type { Ref } from 'react';

/**
 * React Native's Pressable with two app-wide defaults:
 * - VoiceOver hears "button" for anything tappable (pass another accessibilityRole to override);
 * - the control dims while pressed, so every tap gets a visible response (`dim={false}` for backdrops).
 */
export function Pressable({
  accessibilityRole,
  style,
  dim = true,
  ref,
  ...rest
}: PressableProps & { dim?: boolean; ref?: Ref<View> }) {
  const tappable = !!(rest.onPress || rest.onLongPress);
  return (
    <RNPressable
      ref={ref}
      accessibilityRole={accessibilityRole ?? (tappable ? 'button' : undefined)}
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        return dim && tappable && state.pressed ? [base, { opacity: 0.6 }] : base;
      }}
      {...rest}
    />
  );
}
