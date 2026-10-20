import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { familiarFor, nightNow, Pose } from '../familiar';
import { FamiliarArt } from './Familiar';
import { c, themed } from '../theme';

export default function EmptyState({
  text,
  pose = 'idle',
  paths,
  action,
  onPress,
  size = 120,
}: {
  text: string;
  pose?: Pose;
  paths?: string[];
  action?: string;
  onPress?: () => void;
  size?: number;
}) {
  const f = useMemo(() => familiarFor(paths), [paths]);
  const body = (
    <View style={s.wrap}>
      <FamiliarArt familiar={f} pose={nightNow() ? 'sleeping' : pose} size={size} alive />
      <Text style={s.text}>{text}</Text>
      {!!action && (
        <View style={s.action}>
          <Ionicons name="add-circle-outline" size={18} color={c.gold} />
          <Text style={s.actionText}>{action}</Text>
        </View>
      )}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

const s = themed(() => ({
  wrap: { alignItems: 'center', gap: 10, paddingVertical: 24, paddingHorizontal: 20 },
  text: { color: c.dim, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  actionText: { color: c.gold, fontSize: 15, fontWeight: '600' },
}));
