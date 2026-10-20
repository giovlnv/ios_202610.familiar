import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Consult, Note } from '../types';
import { fmtTime } from '../format';
import { toast } from './Toast';
import { c, F, themed } from '../theme';
import EmptyState from './EmptyState';

export type AskDraft = { section: string; para: number; time: number; quote: string; parent?: Consult };

export function buildPrompt(book: Book, consult: Consult, notes: Note[], parent?: Consult) {
  const section = book.sections.find((s) => s.id === consult.section);
  const related = notes.filter((n) => n.section === consult.section && n.para === consult.para).map((n) => `- ${n.text}`);
  return [
    `[Familiar · Consult #C${consult.id}]`,
    `Book: ${book.title}`,
    `Section: ${section?.title ?? consult.section} (at ${fmtTime(consult.time)})`,
    '',
    `Passage: "${consult.quote}"`,
    ...(related.length ? ['', 'My notes on this passage:', ...related] : []),
    ...(parent ? ['', `Earlier, in #C${parent.id}, I asked: ${parent.question}`, `You answered: ${parent.answer ?? ''}`] : []),
    '',
    `Question: ${consult.question}`,
    '',
    'Please answer in a way I can save as a study note (plain text, no tables).',
  ].join('\n');
}

export function AskSheet({
  draft,
  onCancel,
  onSend,
}: {
  draft: AskDraft | null;
  onCancel: () => void;
  onSend: (question: string) => void;
}) {
  const [q, setQ] = useState('');
  const close = () => (setQ(''), onCancel());
  return (
    <Modal visible={!!draft} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.dim}>
        <View style={s.sheet}>
          <Text style={s.meta}>
            <Ionicons name="sparkles-outline" size={13} color={c.claude} /> Ask Claude{draft?.parent ? ` · follow-up to #C${draft.parent.id}` : ''} · {fmtTime(draft?.time ?? 0)}
          </Text>
          <Text style={s.quote} numberOfLines={3}>
            “{draft?.quote}”
          </Text>
          <TextInput
            autoFocus
            multiline
            placeholder="Your question…"
            placeholderTextColor={c.dim}
            style={s.input}
            value={q}
            onChangeText={setQ}
          />
          <View style={s.row}>
            <Btn label="Cancel" onPress={close} />
            <Btn
              label="Send to Claude"
              primary
              onPress={() => {
                if (!q.trim()) return;
                onSend(q.trim());
                setQ('');
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConsultList({
  visible,
  book,
  consults,
  onClose,
  onJump,
  onAnswer,
  onResend,
  onFollowUp,
  onDelete,
  onSaveNote,
  onExport,
}: {
  visible: boolean;
  book: Book;
  consults: Consult[];
  onClose: () => void;
  onJump: (cst: Consult) => void;
  onAnswer: (cst: Consult, answer: string) => void;
  onResend: (cst: Consult) => void;
  onFollowUp: (cst: Consult) => void;
  onDelete: (cst: Consult) => void;
  onSaveNote: (cst: Consult, keep: boolean) => void;
  onExport: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'asked' | 'answered'>('all');
  const [open, setOpen] = useState<number | null>(null);
  const data = [...consults].filter((x) => filter === 'all' || x.status === filter).sort((a, b) => b.id - a.id);

  const paste = async (cst: Consult) => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return Alert.alert('Nothing to paste', 'Copy Claude’s answer first (long-press the reply → Copy).');
    onAnswer(cst, text);
    setOpen(cst.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <View style={s.top}>
          <Text style={s.h2}>
            <Ionicons name="sparkles-outline" size={20} color={c.claude} /> Claude consults
          </Text>
          <View style={s.topRight}>
            {!!consults.length && (
              <Pressable onPress={onExport} hitSlop={8}>
                <Text style={s.link}>Export</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={s.link}>Done</Text>
            </Pressable>
          </View>
        </View>
        <View style={s.filters}>
          {(['all', 'asked', 'answered'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
              <Text style={[s.chipText, filter === f && s.chipTextOn]}>
                {f === 'all' ? 'All' : f === 'asked' ? 'Waiting' : 'Answered'} (
                {f === 'all' ? consults.length : consults.filter((x) => x.status === f).length})
              </Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={data}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <EmptyState text="Tap “Ask” while listening, or long-press a paragraph, to ask Claude about a passage. Your question opens in the Claude app; copy the answer and paste it back here." />
          }
          renderItem={({ item: x }) => {
            const sec = book.sections.find((y) => y.id === x.section);
            const expanded = open === x.id;
            return (
              <Pressable style={s.card} onPress={() => setOpen(expanded ? null : x.id)}>
                <View style={s.cardTop}>
                  <Text style={s.meta}>
                    #C{x.id} · {sec?.title} · {fmtTime(x.time)}
                  </Text>
                  <Text style={[s.badge, x.status === 'answered' ? s.badgeOk : s.badgeWait]}>
                    {x.status === 'answered' ? 'answered' : 'waiting'}
                  </Text>
                </View>
                {x.parent && <Text style={s.dimSmall}>Follow-up to #C{x.parent}</Text>}
                <Text style={s.question}>{x.question}</Text>
                {expanded && (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <Text style={s.quote}>“{x.quote}”</Text>
                    {x.answer ? (
                      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }} nestedScrollEnabled>
                        <Text style={s.answer} selectable>
                          {x.answer}
                        </Text>
                      </ScrollView>
                    ) : null}
                    <View style={s.actions}>
                      <Btn label={x.answer ? 'Replace answer' : 'Paste answer'} primary={!x.answer} onPress={() => paste(x)} />
                      {x.status === 'asked' && <Btn label="Send again" onPress={() => onResend(x)} />}
                      {x.answer && <Btn label="Follow-up" onPress={() => onFollowUp(x)} />}
                      {x.answer && !x.noted && (
                        <Btn
                          label="Save as note"
                          onPress={() =>
                            Alert.alert(`Save #C${x.id} as a note?`, 'The question and Claude’s answer become a note on this passage.', [
                              { text: 'Keep consult too', onPress: () => onSaveNote(x, true) },
                              { text: 'Move to notes', onPress: () => onSaveNote(x, false) },
                              { text: 'Cancel', style: 'cancel' },
                            ])
                          }
                        />
                      )}
                      {x.noted && <Text style={{ color: c.dim, alignSelf: 'center' }}>Saved as note</Text>}
                      <Btn label="Go to passage" onPress={() => onJump(x)} />
                      <Btn
                        label="Delete"
                        onPress={() =>
                          Alert.alert(`Delete #C${x.id}?`, undefined, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => onDelete(x) },
                          ])
                        }
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const linkFile = () => new File(Paths.document, 'claude-chat-link.txt');
const DEFAULT_LINK = 'https://claude.ai/chat/594ac005-3036-4c48-9380-27914feafcee';
export const getClaudeLink = () => {
  try {
    return (linkFile().exists && linkFile().textSync().trim()) || DEFAULT_LINK;
  } catch {
    return DEFAULT_LINK;
  }
};
export const setClaudeLink = (url: string) => {
  const f = linkFile();
  if (!f.exists) f.create();
  f.write(url.trim());
};

const askForLink = () =>
  new Promise<string>((done) =>
    Alert.prompt(
      'Claude chat link',
      'Paste the link of the chat where consults go (claude.ai/chat/…). You can change it in Settings.',
      (v) => {
        const url = v?.trim() ?? '';
        if (/^https?:\/\//.test(url)) setClaudeLink(url);
        done(getClaudeLink());
      },
      'plain-text',
      '',
      'url',
    ),
  );

export async function shareToClaude(message: string) {
  await Clipboard.setStringAsync(message);
  toast('Copied to clipboard');
  await new Promise((r) => setTimeout(r, 700));
  const url = getClaudeLink() || (await askForLink());
  if (!url) return Share.share({ message });
  await Linking.openURL(url);
}

const Btn = ({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) => (
  <Pressable style={[s.btn, primary && s.btnPrimary]} onPress={onPress} hitSlop={6}>
    <Text style={[s.btnText, primary && s.btnTextPrimary]}>{label}</Text>
  </Pressable>
);

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  topRight: { flexDirection: 'row', gap: 18 },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading },
  link: { color: c.gold, fontSize: 16 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.panel },
  chipOn: { backgroundColor: c.claude },
  chipText: { color: c.dim, fontSize: 13 },
  chipTextOn: { color: c.bg, fontWeight: '700' },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  meta: { color: c.claude, fontSize: 13, flexShrink: 1 },
  dimSmall: { color: c.dim, fontSize: 12, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  badgeOk: { backgroundColor: c.claude, color: c.bg },
  badgeWait: { backgroundColor: c.line, color: c.text },
  question: { color: c.text, fontSize: 16, marginTop: 6 },
  quote: { color: c.dim, fontStyle: 'italic' },
  answer: { color: c.text, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { backgroundColor: c.raised, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: c.claude },
  btnText: { color: c.text, fontSize: 14 },
  btnTextPrimary: { color: c.bg, fontWeight: '700' },
  dim: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.panel, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  input: {
    minHeight: 110,
    color: c.text,
    fontSize: 17,
    backgroundColor: c.bg,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
}));
