import { t as tr } from '../../../i18n';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cancelJob, canCancel, Job, listJobs, STAGE_LABEL } from '../../../jobs';
import { usePad } from '../../../playback';
import { c, themed } from '../../../theme';
import EmptyState from '../../../components/EmptyState';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  splitting: 'timer-outline',
  review: 'list',
  fix: 'sparkles-outline',
  explanations: 'sparkles-outline',
  voices: 'timer-outline',
  ready: 'cloud-download-outline',
  imported: 'checkmark-circle',
  error: 'close',
  cancelling: 'close-circle-outline',
};

export default function Jobs() {
  const pad = usePad();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setBusy(true);
    listJobs()
      .then((j) => (setJobs(j), setErr('')))
      .catch((e) => setErr(String(e.message ?? e)))
      .finally(() => setBusy(false));
  }, []);
  useFocusEffect(load);

  return (
    <FlatList
      style={s.wrap}
      data={jobs}
      keyExtractor={(j) => j.slug}
      contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 40 + pad }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={c.gold} />}
      ListHeaderComponent={
        <>
          <Stack.Screen
            options={{
              headerRight: () => (
                <Pressable hitSlop={10} onPress={() => router.push('/add')}>
                  <Ionicons name="add" size={26} color={c.gold} />
                </Pressable>
              ),
            }}
          />
          {!!err && <Text style={s.err}>{err}</Text>}
        </>
      }
      ListEmptyComponent={busy ? null : <EmptyState text={tr("No books in progress. Tap + to add one.")} />}
      renderItem={({ item: j }) => (
        <Pressable
          style={s.card}
          onPress={() => router.push({ pathname: '/job/[slug]', params: { slug: j.slug } })}
          onLongPress={() =>
            canCancel(j) &&
            Alert.alert(j.title, tr("Cancel this book? This stops the work on GitHub and deletes the uploaded file and everything made from it."), [
              { text: tr("Keep it"), style: 'cancel' },
              {
                text: tr("Cancel book"),
                style: 'destructive',
                onPress: () =>
                  cancelJob(j)
                    .then(load)
                    .catch((e) => Alert.alert(tr("Could not cancel"), String(e.message ?? e))),
              },
            ])
          }
        >
          <Ionicons name={ICON[j.stage]} size={22} color={j.stage === 'explanations' || j.stage === 'fix' ? c.claude : j.stage === 'error' ? c.claude : c.gold} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.title} numberOfLines={2}>
              {j.title}
            </Text>
            <Text style={[s.dim, j.stage === 'review' && { color: c.gold }]}>
              {STAGE_LABEL[j.stage]}
              {j.sections ? tr(" · {0} sections", { 0: j.sections.length }) : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      )}
    />
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 14 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 13 },
  err: { color: c.claude, marginBottom: 10 },
}));
