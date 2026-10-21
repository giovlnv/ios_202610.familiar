import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cancelJob, canCancel, downloadJob, estimateMinutes, getJob, Job, setStage, STAGE_LABEL } from '../../../../jobs';
import { syncAudioBooks } from '../../../../tracker';
import { shareToClaude } from '../../../../components/Consults';
import { Button } from '../../../../components/ui';
import { usePad } from '../../../../playback';
import { c, F, themed } from '../../../../theme';

const STEPS = ['review', 'explanations', 'voices', 'ready', 'imported'] as const;

export default function JobScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const pad = usePad();
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const load = useCallback(() => {
    setBusy(true);
    getJob(slug)
      .then((j) => setJob(j ?? { slug, title: slug, stage: 'splitting' }))
      .catch((e) => Alert.alert('Could not load', String(e.message ?? e)))
      .finally(() => setBusy(false));
  }, [slug]);
  useFocusEffect(load);

  const run = async (fn: () => Promise<Job | void>) => {
    setBusy(true);
    try {
      const j = await fn();
      if (j) setJob(j);
    } catch (e) {
      Alert.alert('Something went wrong', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  if (!job) return <View style={s.wrap} />;
  const noExplain = job.explanations === false;
  const step = STEPS.indexOf((job.stage === 'queued' ? 'explanations' : job.stage) as (typeof STEPS)[number]);
  const askClaude = `Familiar job "${job.slug}" (${job.title}) is ready for explanations. Please write them following the audiobook explanation prompt${job.instructions ? ` and these instructions: ${job.instructions}` : ''}, then run Generate audiobook.`;
  const fixMsg = `Familiar job "${job.slug}" (${job.title}): the section split needs fixing. ${job.note ?? ''}`;

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 40 + pad }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={c.gold} />}
    >
      <Stack.Screen options={{ title: '' }} />
      <Text style={s.h1}>{job.title}</Text>
      <Text style={[s.dim, { color: job.stage === 'error' ? c.claude : c.gold }]}>{STAGE_LABEL[job.stage]}</Text>

      <View style={s.card}>
        {['Split into sections', 'You check the split', noExplain ? 'No explanations (skipped)' : 'Claude writes explanations', 'Voices on GitHub', 'Download & import'].map((t, i) => {
          const done = job.stage === 'imported' || (step >= 0 && i < step + 1) || (job.stage !== 'splitting' && i === 0);
          const now = step + 1 === i || (job.stage === 'splitting' && i === 0) || (job.stage === 'fix' && i === 1);
          return (
            <View key={t} style={s.stepRow}>
              <Ionicons name={done && !now ? 'checkmark-circle' : now ? 'ellipse' : 'ellipse-outline'} size={16} color={done || now ? c.gold : c.line} />
              <Text style={[s.step, !done && !now && { color: c.dim }]}>{t}</Text>
            </View>
          );
        })}
      </View>

      {job.stage === 'splitting' && <Text style={s.p}>GitHub is splitting the book into sections. This takes a minute or two — pull down to refresh.</Text>}

      {job.stage === 'error' && <Text style={s.p}>{job.error}</Text>}

      {(job.stage === 'review' || job.stage === 'fix') && (
        <>
          <Text style={s.p}>
            {job.sections?.length} sections · {(job.words ?? 0).toLocaleString()} words · about {Math.round((job.words ?? 0) / 150 / 60 * 10) / 10} h of audio
            {noExplain ? '(no explanations)' : '(plus explanations)'}. Check the titles and lengths: very short or very long sections usually mean a bad split.
          </Text>
          {job.stage === 'review' && (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Button label="Looks right" icon="checkmark-circle" primary onPress={() => run(() => setStage(job, noExplain ? 'queued' : 'explanations'))} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Something’s off"
                  onPress={() =>
                    Alert.prompt('What looks wrong?', 'Claude will read this and fix the split.', (note) =>
                      run(() => setStage(job, 'fix', { note }))
                    )
                  }
                />
              </View>
            </View>
          )}
          {job.stage === 'fix' && (
            <>
              <Text style={s.p}>Your note: “{job.note}”. Send it to Claude in the TAROT chat to fix the split.</Text>
              <Button label="Send to Claude" icon="sparkles-outline" primary onPress={() => shareToClaude(fixMsg)} />
            </>
          )}
          <View style={s.card}>
            {job.sections?.map((x, i) => (
              <View key={i} style={s.secRow}>
                <Text style={s.num}>{i + 1}</Text>
                <Text style={s.secTitle} numberOfLines={2}>
                  {x.title}
                </Text>
                <Text style={[s.dim, (x.words < 80 || x.words > 15000) && { color: c.claude }]}>{x.words.toLocaleString()} w</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {job.stage === 'explanations' && (
        <>
          <Text style={s.p}>
            Next step happens in the TAROT chat with Claude: open it and send the message below. Claude writes the explanations and starts the voices.
          </Text>
          <View style={s.quote}>
            <Text style={s.quoteText}>{askClaude}</Text>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button label="Send to Claude" icon="sparkles-outline" primary onPress={() => shareToClaude(askClaude)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Copy" onPress={() => Clipboard.setStringAsync(askClaude)} />
            </View>
          </View>
        </>
      )}

      {job.stage === 'queued' && <Text style={s.p}>No explanations for this book, so the voices start on GitHub by themselves in a minute. Pull down to refresh.</Text>}

      {job.stage === 'voices' && (
        <Text style={s.p}>
          Generating the two voices on GitHub (6 parallel jobs). Usually about {estimateMinutes(job)} minutes
          {job.started ? `, started ${new Date(job.started).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}. Pull down to refresh.
        </Text>
      )}

      {job.stage === 'ready' && (
        <>
          <Text style={s.p}>
            {job.hours} h of audio · {job.files?.filter((f) => f.endsWith(".m4a")).length ?? 0} audio files. Streaming keeps it off your iPhone (needs internet); you can download the audio later from the book page.
          </Text>
          <Button
            label={progress || 'Add to library (stream)'}
            icon="headset"
            primary
            onPress={() =>
              busy
                ? undefined
                : run(async () => {
                    const j = await downloadJob(job, (d, t) => setProgress(`Adding ${d}/${t}`));
                    syncAudioBooks();
                    return j;
                  })
            }
          />
          <Button
            label={`Add and download audio (~${Math.round((job.hours ?? 0) * 23)} MB)`}
            icon="cloud-download-outline"
            onPress={() =>
              busy
                ? undefined
                : run(async () => {
                    const j = await downloadJob(job, (d, t) => setProgress(`Downloading ${d}/${t}`), true);
                    syncAudioBooks();
                    return j;
                  })
            }
          />
        </>
      )}

      {job.stage === 'cancelling' && (
        <Text style={s.p}>GitHub is stopping the work and deleting the upload and everything made from it. The book disappears from this list in a minute or two.</Text>
      )}

      {canCancel(job) && (
        <Button
          label="Cancel this book"
          icon="close-circle-outline"
          onPress={() =>
            Alert.alert('Cancel this book?', 'This stops the work on GitHub and deletes the uploaded file and everything made from it. You can upload it again later.', [
              { text: 'Keep it', style: 'cancel' },
              { text: 'Cancel book', style: 'destructive', onPress: () => run(() => cancelJob(job)) },
            ])
          }
        />
      )}

      {job.stage === 'imported' && (
        <Button label="Open in Library" icon="headset" primary onPress={() => router.push({ pathname: '/book/[id]', params: { id: job.slug } })} />
      )}

      {!!job.instructions && (
        <>
          <Text style={s.label}>How the explanations should be</Text>
          <Text style={s.p}>{job.instructions}</Text>
        </>
      )}
      <Pressable onPress={load}>
        <Text style={[s.dim, { textAlign: 'center', marginTop: 8 }]}>Pull down or tap to refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  h1: { color: c.text, fontSize: 22, fontFamily: F.heading },
  dim: { color: c.dim, fontSize: 13 },
  p: { color: c.text, fontSize: 15, lineHeight: 21 },
  label: { color: c.dim, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { color: c.text, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { color: c.dim, fontSize: 13, width: 24 },
  secTitle: { color: c.text, fontSize: 14, flex: 1 },
  quote: { backgroundColor: c.panel, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: c.claude },
  quoteText: { color: c.text, fontSize: 14, lineHeight: 20 },
}));
