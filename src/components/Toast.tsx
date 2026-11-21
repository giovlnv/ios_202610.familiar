import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { t as tr } from '../i18n';
import { c, themed } from '../theme';

const listeners = new Set<(m: string) => void>();
/** Shows a short confirmation, translated, and reads it out to VoiceOver. */
export const toast = (message: string) => {
  const m = tr(message);
  listeners.forEach((fn) => fn(m));
  AccessibilityInfo.announceForAccessibility(m);
};

export default function ToastHost() {
  const [msg, setMsg] = useState('');
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const show = (m: string) => {
      setMsg(m);
      fade.stopAnimation();
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    };
    listeners.add(show);
    return () => void listeners.delete(show);
  }, [fade]);
  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { opacity: fade }]}>
      <Text style={s.text}>{msg}</Text>
    </Animated.View>
  );
}

const s = themed(() => ({
  wrap: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: c.raised, borderColor: c.gold, borderWidth: 1, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, zIndex: 999 },
  text: { color: c.text, fontSize: 15, fontWeight: '600' },
}));
