import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { addSubject, CardDraft, Flashcard, removeCard, removeNote, saveCard, saveNote, StudyNote, Subject, useStudy } from '../study';
import { getOnboarding, setOnboarding } from '../familiar';
import { t as tr } from '../i18n';
import { c, F, themed } from '../theme';

export function promptSubject(onDone?: (s: Subject) => void) {
  Alert.prompt(tr('New study subject'), tr('Its name is also the name of its path'), (n) => {
    const name = n?.trim();
    if (!name) return;
    const s = addSubject(name);
    const paths = getOnboarding().paths ?? [];
    setOnboarding({ paths: [...paths, s.id] });
    onDone?.(s);
  });
}

function SubjectChips({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { subjects } = useStudy();
  return (
    <View style={s.chips}>
      {subjects.map((x) => {
        const on = x.id === value;
        return (
          <Pressable key={x.id} onPress={() => onChange(x.id)} style={[s.chip, { borderColor: on ? x.color : 'transparent', backgroundColor: on ? x.color + '2e' : c.raised }]}>
            <Text style={[s.chipText, { color: on ? x.color : c.dim }]}>{x.name}</Text>
          </Pressable>
        );
      })}
      <Pressable onPress={() => promptSubject((x) => onChange(x.id))} style={[s.chip, { borderColor: c.line }]}>
        <Text style={[s.chipText, { color: c.gold }]}>{tr('+ Subject')}</Text>
      </Pressable>
    </View>
  );
}

function Sheet({ title, onClose, onSave, onDelete, children }: { title: string; onClose: () => void; onSave: () => void; onDelete?: () => void; children: React.ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheet}>
        <View style={s.top}>
          <Pressable hitSlop={8} onPress={onClose}>
            <Text style={s.dim}>{tr('Cancel')}</Text>
          </Pressable>
          <Text style={s.title}>{title}</Text>
          <Pressable hitSlop={8} onPress={onSave}>
            <Text style={s.link}>{tr('Save')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {children}
          {onDelete && (
            <Pressable onPress={onDelete} style={{ alignSelf: 'center', marginTop: 16 }}>
              <Text style={{ color: '#E07A7A', fontSize: 15 }}>{tr('Delete')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function CardEditor({ draft, source, onClose }: { draft: CardDraft; source?: string; onClose: () => void }) {
  const { subjects } = useStudy();
  const [subject, setSubject] = useState(draft.subject ?? subjects[0]?.id);
  const [front, setFront] = useState(draft.front ?? '');
  const [back, setBack] = useState(draft.back ?? '');
  const save = () => {
    if (!subject) return Alert.alert(tr('Choose a subject'), tr('Add a study subject first.'));
    if (!front.trim() || !back.trim()) return Alert.alert(tr('Fill both sides'), tr('Write the front (question) and the back (answer).'));
    saveCard({ ...(draft as Flashcard), subject, front: front.trim(), back: back.trim() });
    onClose();
  };
  return (
    <Sheet
      title={draft.id ? tr('Flashcard') : tr('New flashcard')}
      onClose={onClose}
      onSave={save}
      onDelete={draft.id ? () => Alert.alert(tr('Delete this flashcard?'), undefined, [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Delete'), style: 'destructive', onPress: () => (removeCard(draft.id!), onClose()) }]) : undefined}
    >
      <Text style={s.label}>{tr('Subject')}</Text>
      <SubjectChips value={subject} onChange={setSubject} />
      <Text style={s.label}>{tr('Front side')}</Text>
      <TextInput style={s.input} value={front} onChangeText={setFront} multiline placeholder={tr('A question or a term')} placeholderTextColor={c.dim} autoFocus={!draft.front} />
      <Text style={s.label}>{tr('Back side')}</Text>
      <TextInput style={[s.input, { minHeight: 120 }]} value={back} onChangeText={setBack} multiline placeholder={tr('The answer')} placeholderTextColor={c.dim} />
      {!!source && <Text style={s.meta}>{tr('From {0}', { 0: source })}</Text>}
    </Sheet>
  );
}

export function NoteEditor({ draft, onClose }: { draft: Partial<StudyNote>; onClose: () => void }) {
  const { subjects } = useStudy();
  const [subject, setSubject] = useState(draft.subject ?? subjects[0]?.id);
  const [title, setTitle] = useState(draft.title ?? '');
  const [text, setText] = useState(draft.text ?? '');
  const save = () => {
    if (!subject) return Alert.alert(tr('Choose a subject'), tr('Add a study subject first.'));
    if (!title.trim() && !text.trim()) return onClose();
    saveNote({ id: draft.id, subject, title: title.trim(), text: text.trim(), book: draft.book });
    onClose();
  };
  return (
    <Sheet
      title={draft.id ? tr('Note') : tr('New note')}
      onClose={onClose}
      onSave={save}
      onDelete={draft.id ? () => Alert.alert(tr('Delete this note?'), undefined, [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Delete'), style: 'destructive', onPress: () => (removeNote(draft.id!), onClose()) }]) : undefined}
    >
      <Text style={s.label}>{tr('Subject')}</Text>
      <SubjectChips value={subject} onChange={setSubject} />
      <TextInput style={[s.input, s.noteTitle]} value={title} onChangeText={setTitle} placeholder={tr('Title')} placeholderTextColor={c.dim} />
      <TextInput style={[s.input, { minHeight: 260 }]} value={text} onChangeText={setText} multiline placeholder={tr('Write your notes…')} placeholderTextColor={c.dim} autoFocus={!draft.id} />
    </Sheet>
  );
}

const s = themed(() => ({
  sheet: { flex: 1, backgroundColor: c.bg, padding: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: c.text, fontFamily: F.heading, fontSize: 19 },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 16 },
  label: { color: c.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 },
  meta: { color: c.dim, fontSize: 13 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 16, textAlignVertical: 'top' },
  noteTitle: { fontFamily: F.heading, fontSize: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
}));
