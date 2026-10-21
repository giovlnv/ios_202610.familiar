import { t as tr } from '../i18n';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Share, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { CARDS, cardName, cardUri } from '../decks';
import { isLenormand } from '../lenormand';
import { CHIPS, explainPrompt, loadChips, Saved, saveChips } from '../explain';
import { Book, Section } from '../types';
import { shareToClaude } from './Consults';
import ToastHost, { toast } from './Toast';
import ListenBar from './ListenBar';
import { c, F, themed } from '../theme';

export type ExplainTarget = { kind: 'passage' | 'section'; section: Section; para?: number; text?: string; card?: string; saved?: Saved; builtIn?: string[] };

export default function ExplainSheet({
  target,
  book,
  onClose,
  onSave,
}: {
  target: ExplainTarget | null;
  book: Book;
  onClose: () => void;
  onSave: (t: ExplainTarget, text: string, quote?: string) => void;
}) {
  const [chips, setChips] = useState<string[]>(loadChips);
  const [image, setImage] = useState(true);
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [answer, setAnswer] = useState(target?.saved?.text ?? '');
  const [listen, setListen] = useState(false);
  const [prev, setPrev] = useState(target);
  if (prev !== target) {
    setPrev(target);
    setSel({ start: 0, end: 0 });
    setAnswer(target?.saved?.text ?? '');
    setImage(true);
    setListen(false);
  }
  if (!target) return null;

  const full = target.text ?? '';
  const quote = sel.end > sel.start ? full.slice(sel.start, sel.end).trim() : full;
  const img = target.card && (CARDS.some((x) => x.id === target.card) || isLenormand(target.card)) ? cardUri(target.card) : undefined;
  const flip = (id: string) => {
    const next = chips.includes(id) ? chips.filter((x) => x !== id) : [...chips, id];
    setChips(next);
    saveChips(next);
  };

  const ask = async () => {
    const msg = explainPrompt({ kind: target.kind, book, section: target.section, card: target.card ? cardName(target.card) : undefined, passage: quote, chips });
    if (img && image) {
      await Clipboard.setStringAsync(msg);
      toast('Copied to clipboard');
      setTimeout(() => Share.share({ url: img, message: msg }), 700);
    } else await shareToClaude(msg);
  };

  const paste = async () => {
    const t = (await Clipboard.getStringAsync()).trim();
    if (t) setAnswer(t);
    else toast('Clipboard is empty');
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={s.top}>
            <Text style={s.h2}>{tr("Explain this")}{' '}{target.kind}</Text>
            <Pressable hitSlop={10} onPress={onClose}>
              <Text style={s.link}>{tr("Done")}</Text>
            </Pressable>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
            <Text style={s.meta}>{target.section.title}</Text>
            {target.kind === 'passage' && (
              <>
                <TextInput
                  style={s.passage}
                  value={full}
                  multiline
                  scrollEnabled={false}
                  editable={false}
                  onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
                />
                <Text style={s.hint}>{sel.end > sel.start ? tr("Only the selected part ({0} words) will be sent.", { 0: quote.split(/\s+/).length }) : tr("Select part of the text to explain only that.")}</Text>
              </>
            )}
            {!!target.builtIn?.length && !answer && (
              <View style={s.card}>
                <Text style={s.label}>{tr("From the book’s explanation")}</Text>
                {target.builtIn.map((p, i) => (
                  <Text key={i} style={s.text}>
                    {p}
                  </Text>
                ))}
              </View>
            )}
            <Text style={s.label}>{tr("Include")}</Text>
            <View style={s.chips}>
              {CHIPS.filter((x) => target.kind === 'section' || !x.section).map((x) => (
                <Pressable key={x.id} style={[s.chip, chips.includes(x.id) && s.chipOn]} onPress={() => flip(x.id)}>
                  <Text style={[s.chipText, chips.includes(x.id) && s.chipTextOn]}>{x.label}</Text>
                </Pressable>
              ))}
              {img && (
                <Pressable style={[s.chip, image && s.chipOn]} onPress={() => setImage(!image)}>
                  <Text style={[s.chipText, image && s.chipTextOn]}>{tr("Card image")}</Text>
                </Pressable>
              )}
            </View>
            <Pressable style={s.ask} onPress={ask}>
              <Text style={s.askText}>{tr("Ask Claude")}</Text>
            </Pressable>
            <Text style={s.label}>{tr("Claude’s answer")}</Text>
            {!!(answer.trim() || target.builtIn?.length) && (
              <View style={s.listenRow}>
                <Text style={s.chipText}>{tr("Listen")}</Text>
                <Switch value={listen} onValueChange={setListen} trackColor={{ true: c.gold }} />
              </View>
            )}
            {listen && <ListenBar text={answer.trim() || (target.builtIn ?? []).join('\n\n')} />}
            <TextInput style={s.answer} multiline value={answer} onChangeText={setAnswer} placeholder={tr("Paste Claude’s answer here")} placeholderTextColor={c.dim} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[s.btn, { flex: 1 }]} onPress={paste}>
                <Text style={s.btnText}>{tr("Paste answer")}</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnOn, { flex: 1 }]}
                onPress={() => answer.trim() && (onSave(target, answer.trim(), target.kind === 'passage' ? quote : undefined), toast('Explanation saved'))}
              >
                <Text style={[s.btnText, { color: c.bg }]}>{tr("Save")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <ToastHost />
      </SafeAreaView>
    </Modal>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  h2: { color: c.text, fontSize: 21, fontFamily: F.heading },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  meta: { color: c.gold, fontSize: 13 },
  passage: { color: c.text, fontSize: 16, lineHeight: 24, backgroundColor: c.panel, borderRadius: 12, padding: 12 },
  hint: { color: c.dim, fontSize: 12 },
  label: { color: c.dim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 12, gap: 8 },
  text: { color: c.explain, fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.text, fontSize: 14 },
  chipTextOn: { color: c.bg, fontWeight: '700' },
  listenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ask: { backgroundColor: c.claude, borderRadius: 12, padding: 14, alignItems: 'center' },
  askText: { color: c.bg, fontSize: 16, fontWeight: '700' },
  answer: { minHeight: 140, color: c.text, fontSize: 15, lineHeight: 22, backgroundColor: c.panel, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  btn: { borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: c.panel },
  btnOn: { backgroundColor: c.gold },
  btnText: { color: c.text, fontWeight: '700' },
}));
