import { useEffect, useState } from 'react';
import { Animated, Text } from 'react-native';
import { c, themed } from '../theme';

const listeners = new Set<(m: string) => void>();
export const toast = (message: string) => listeners.forEach((fn) => fn(message));

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
