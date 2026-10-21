import { t as tr } from '../../i18n';
import { useMemo } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Player from '../../components/Player';
import { getBook } from '../../storage';

export default function PlayerScreen() {
  const { id, section, para } = useLocalSearchParams<{ id: string; section?: string; para?: string }>();
  const item = useMemo(() => getBook(id), [id]);
  if (!item) return <Text>{tr("Book not found.")}</Text>;
  return <Player item={item} start={section !== undefined ? Number(section) : undefined} startPara={para !== undefined ? Number(para) : undefined} onClose={() => router.back()} />;
}
