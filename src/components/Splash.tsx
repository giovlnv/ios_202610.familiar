import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SIZE = 220;

export function Splash() {
  const [done, setDone] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    SplashScreen.hideAsync()
      .catch(() => {})
      .then(() => AccessibilityInfo.isReduceMotionEnabled().catch(() => false))
      .then((reduce) =>
        // With Reduce Motion on, the icon just fades instead of zooming towards the viewer.
        (reduce
          ? Animated.timing(fade, { toValue: 0, duration: 300, delay: 150, useNativeDriver: true })
          : Animated.sequence([
              Animated.delay(150),
              Animated.timing(scale, { toValue: 0.82, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.parallel([
                Animated.timing(scale, { toValue: 14, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
                Animated.timing(fade, { toValue: 0, duration: 380, delay: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              ]),
            ])
        ).start(() => setDone(true)),
      );
  }, [scale, fade]);

  if (done) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { opacity: fade }]}>
      <Animated.Image source={require('../../assets/splash-icon.png')} style={[s.img, { transform: [{ scale }] }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0D1626', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  img: { width: SIZE, height: SIZE },
});
