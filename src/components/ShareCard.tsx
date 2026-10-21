import { t as tr } from '../i18n';
import { ReactNode, useRef, useState } from 'react';
import { Share, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { c, F, themed } from '../theme';

export function ShareFrame({ children, width = 360 }: { children: ReactNode; width?: number }) {
  return (
    <View style={[s.frame, { width }]}>
      <Text style={s.brand}>{tr("FAMILIAR")}</Text>
      {children}
      <Text style={s.tagline}>{tr("Your familiar knows the way.")}</Text>
    </View>
  );
}

export function useShareCard() {
  const ref = useRef<View>(null);
  const [node, setNode] = useState<ReactNode>(null);
  const share = (content: ReactNode, text: string) => {
    setNode(content);
    setTimeout(async () => {
      try {
        const uri = await captureRef(ref, { format: 'png', quality: 1 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
      } catch {
        await Share.share({ message: text });
      } finally {
        setNode(null);
      }
    }, 700);
  };
  const host = node ? (
    <View style={s.off} pointerEvents="none">
      <View ref={ref} collapsable={false}>
        {node}
      </View>
    </View>
  ) : null;
  return { host, share };
}

const s = themed(() => ({
  off: { position: 'absolute', left: -10000, top: 0 },
  frame: { backgroundColor: c.bg, padding: 24, gap: 14, alignItems: 'center' },
  brand: { color: c.gold, fontFamily: F.heading, fontSize: 18, letterSpacing: 6 },
  tagline: { color: c.dim, fontFamily: F.headingItalic, fontSize: 13, marginTop: 4 },
}));
