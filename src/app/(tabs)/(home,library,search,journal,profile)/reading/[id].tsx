import { t as tr } from '../../../../i18n';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addPerson,
  addSpread,
  allAreas,
  birthCards,
  cardSections,
  cotdDraft,
  loadJournal,
  parseDate,
  patchReading,
  Reading,
  readingPrompt,
  readingSystem,
  removeReading,
  saveReading,
  showDate,
  spreadOf,
  defaultSpread,
  significatorFor,
  spreadsFor,
  updateJournal,
} from '../../../../journal';
import { dealt, related } from '../../../../lenormand';
import { cardIdOf, getSystem, isCustomSystem, listSystems } from '../../../../systems';
import Tableau from '../../../../components/Tableau';
import { personal } from '../../../../numerology';
import { sky } from '../../../../astrology';
import { getProfile } from '../../../../tracker';
import { getOnboarding } from '../../../../familiar';
import { baseOf, cardName, reversible, systemName } from '../../../../decks';
import { CardImage, CardPicker } from '../../../../components/Cards';
import CardSheet from '../../../../components/CardSheet';
import { shareToClaude } from '../../../../components/Consults';
import { Button, Chip, DateStepper, fmtDate } from '../../../../components/ui';
import { usePad } from '../../../../playback';
import { c, F, themed } from '../../../../theme';
import { maskTime } from '../../../../format';
import { DateInput } from '../../../../components/SplitInput';

const short = (id: string) => cardName(id).split(' · ').pop()!;

export default function ReadingScreen() {
  const pad = usePad();
  const { id, card, reversed, system: sysParam } = useLocalSearchParams<{ id: string; card?: string; reversed?: string; system?: string }>();
  const { width } = useWindowDimensions();
  const [j, setJ] = useState(loadJournal);
  const [draft, setDraft] = useState(id === 'draft');
  const [r, setR] = useState<Reading | undefined>(() => (id === 'draft' ? cotdDraft(card, reversed === '1', sysParam || 'tarot') : loadJournal().readings.find((x) => x.id === id)));
  const [slot, setSlot] = useState<number | null>(null);
  const [about, setAbout] = useState<{ id: string; role: string; near?: string[] } | null>(null);
  const [personSheet, setPersonSheet] = useState(false);

  useEffect(
    () => () => {
      const cur = loadJournal().readings.find((x) => x.id === id);
      if (cur && !cur.question.trim() && !cur.cards.some((p) => p?.card) && !cur.interpretation?.trim()) removeReading(cur.id);
    },
    [id],
  );

  if (!r) return <Text style={s.dim}>{tr("Reading not found.")}</Text>;
  const sp = spreadOf(j, r.spreadId);
  const person = j.people.find((p) => p.id === r.personId);
  const system = readingSystem(r);
  const len = baseOf(system) === 'lenormand';
  const flips = reversible(system);
  const myPaths = getOnboarding().paths ?? [];
  const decks = [
    'tarot',
    ...(system === 'lenormand' || myPaths.includes('lenormand') ? ['lenormand'] : []),
    ...listSystems().filter((x) => x.id === system || myPaths.includes(x.id)).map((x) => x.id),
  ];
  const grand = sp.layout === 'gt49' || sp.layout === 'gt84' ? sp.layout : null;
  const isLine = sp.layout === 'line' && sp.positions.length > 3;
  const slotW = isLine ? 78 : (width - 32 - 20) / 3;
  const showDecks = !sp.daily && decks.length > 1;
  const placed = r.cards.map((p) => p?.card).filter((x): x is string => !!x);
  const nearOf = (i: number) => {
    if (grand) return related(grand, i, 'near').map((k) => r.cards[k]?.card).filter((x): x is string => !!x);
    return [r.cards[i - 1]?.card, r.cards[i + 1]?.card].filter((x): x is string => !!x);
  };

  const set = (patch: Partial<Reading>) => {
    const next = { ...r, ...patch };
    setR(next);
    if (!draft) patchReading(next.id, (x) => Object.assign(x, next));
  };
  const placeCard = (i: number, card: string | undefined, reversed = false) => {
    const cards = [...r.cards];
    cards[i] = card ? { card, reversed: flips && reversed } : {};
    set({ cards });
    if (grand && card) {
      const next = sp.positions.findIndex((_, k) => k > i && !cards[k]?.card);
      setSlot(next >= 0 ? next : null);
    }
  };
  const switchSystem = (next: string) => {
    if (next === system) return;
    const go = () =>
      set({
        system: next === 'tarot' ? undefined : next,
        significator: significatorFor(next),
        spreadId: defaultSpread(next),
        cards: [],
      });
    if (!placed.length) return go();
    Alert.alert(tr("Switch deck?"), tr("The cards placed in this reading are cleared."), [
      { text: tr("Cancel"), style: 'cancel' },
      { text: tr("Switch"), style: 'destructive', onPress: go },
    ]);
  };
  const deal = () => {
    const own = (x: string) => (isCustomSystem(system) ? cardIdOf(system, x) : x);
    const go = () => set({ cards: dealt().map((x) => ({ card: getSystem(system) && !getSystem(system)!.cards.some((k) => k.key === x) ? undefined : own(x) })) });
    if (!placed.length) return go();
    Alert.alert(tr("Deal all 36 at random?"), tr("The cards already placed are replaced."), [
      { text: tr("Cancel"), style: 'cancel' },
      { text: tr("Deal"), onPress: go },
    ]);
  };
  const reload = () => setJ(loadJournal());

  const locked = (i: number) => (r.spreadId === 'cotd' || r.spreadId === 'lcotd') && i === 0;
  const slotMenu = (i: number) => {
    const p = r.cards[i];
    if (!p?.card) return locked(i) ? undefined : setSlot(i);
    const links = cardSections(p.card);
    Alert.alert(`${sp.positions[i]} · ${short(p.card)}${p.reversed ? tr(" (reversed)") : ''}`, undefined, [
      { text: tr("About this card"), onPress: () => setAbout({ id: p.card!, role: sp.positions[i], near: len ? nearOf(i) : undefined }) },
      ...links.map((l) => ({
        text: tr("Listen: {0}", { 0: l.title }),
        onPress: () => router.push({ pathname: '/player/[id]', params: { id: l.folder, section: String(l.index) } }),
      })),
      ...(locked(i)
        ? []
        : [
            ...(!flips ? [] : [{ text: p.reversed ? tr("Make upright") : tr("Make reversed"), onPress: () => placeCard(i, p.card, !p.reversed) }]),
            { text: tr("Change card"), onPress: () => setSlot(i) },
            { text: tr("Remove card"), style: 'destructive' as const, onPress: () => placeCard(i, undefined) },
          ]),
      { text: tr("Cancel"), style: 'cancel' as const },
    ]);
  };

  const newArea = () =>
    Alert.prompt(tr("New area"), undefined, (v) => {
      const a = v?.trim();
      if (!a) return;
      if (!allAreas(j).includes(a)) updateJournal((x) => x.areas.push(a));
      reload();
      set({ area: a });
    });

  const newSpread = () =>
    Alert.prompt(tr("New spread"), tr("Name of the layout"), (name) => {
      if (!name?.trim()) return;
      Alert.prompt(tr("Positions"), tr("Separate them with commas, in order (e.g. Me, You, Bond)"), (pos) => {
        const positions = (pos ?? '').split(',').map((x) => x.trim()).filter(Boolean);
        if (!positions.length) return;
        const created = addSpread(name.trim(), positions, system === 'tarot' ? undefined : system);
        reload();
        set({ spreadId: created.id });
      });
    });

  const pasteAnswer = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return Alert.alert(tr("Clipboard is empty"), tr("Copy Claude’s answer first, then tap Paste answer."));
    set({ answers: [...(r.answers ?? []), { text, at: Date.now() }] });
  };

  const [date, time] = r.at.split('T');
  const myDob = getProfile().dob;
  const stamp = myDob && (getOnboarding().paths ?? []).includes('numerology') ? personal(myDob, new Date(`${date}T12:00:00`)) : null;
  const skyStamp = (getOnboarding().paths ?? []).includes('astrology') ? sky(new Date(`${date}T${time || '12:00'}:00`)) : '';
  const filled = sp.positions.map((pos, i) => ({ pos, p: r.cards[i] })).filter((x) => x.p?.card);
  const pBirth = birthCards(person?.dob);

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={s.wrap} contentContainerStyle={{ paddingBottom: 60 + pad }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: fmtDate(date, { day: 'numeric', month: 'short' }),
          headerRight: () => draft ? (
            <Pressable hitSlop={10} onPress={() => (saveReading(r), setDraft(false), setJ(loadJournal()))}>
              <Text style={{ color: c.gold, fontSize: 16, fontWeight: '700' }}>{tr("Save")}</Text>
            </Pressable>
          ) : (
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert(tr("Delete this reading?"), undefined, [
                  { text: tr("Cancel"), style: 'cancel' },
                  {
                    text: tr("Delete"),
                    style: 'destructive',
                    onPress: () => {
                      removeReading(r.id);
                      router.back();
                    },
                  },
                ])
              }
            >
              <Ionicons name="trash-outline" size={22} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      {draft && (
        <Text style={{ color: c.dim, fontSize: 13, marginBottom: 4 }}>{tr("Not saved yet. Tap Save (top right) to keep it in your journal.")}</Text>
      )}

      <TextInput
        style={s.question}
        value={r.question}
        onChangeText={(question) => set({ question })}
        placeholder={tr("What is the question?")}
        placeholderTextColor={c.dim}
        multiline
      />

      <View style={s.dateRow}>
        <View style={{ flex: 1 }}>
          <DateStepper value={date} onChange={(d) => set({ at: `${d}T${time}` })} />
        </View>
        <Pressable
          style={s.time}
          onPress={() =>
            Alert.prompt(
              tr("Time"),
              tr("HH:MM"),
              (v) => {
                const t = maskTime(v ?? '');
                if (/^\d{2}:\d{2}$/.test(t)) set({ at: `${date}T${t}` });
              },
              'plain-text',
              time,
              'number-pad',
            )
          }
        >
          <Ionicons name="time-outline" size={16} color={c.gold} />
          <Text style={s.timeText}>{time}</Text>
        </Pressable>
      </View>
      {!!skyStamp && <Text style={s.stamp}>{skyStamp}</Text>}
      {stamp && <Text style={s.stamp}>{tr("Personal day")}{' '}{stamp.day}{' '}{tr("· month")}{' '}{stamp.month}{' '}{tr("· year")}{' '}{stamp.year}</Text>}

      <Text style={s.label}>{tr("For")}</Text>
      <View style={s.chips}>
        <Chip label={tr("Me")} on={!r.personId} onPress={() => set({ personId: undefined })} />
        {j.people.map((p) => (
          <Chip key={p.id} label={p.name} on={r.personId === p.id} onPress={() => set({ personId: p.id })} />
        ))}
        <Chip label={tr("+ Person")} onPress={() => setPersonSheet(true)} />
      </View>
      {person && (
        <Text style={s.dim}>
          {[person.dob && `Born ${showDate(person.dob)}`, pBirth && `personality ${short(pBirth.personality)}`, person.background]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}

      <Text style={s.label}>{tr("Area")}</Text>
      <View style={s.chips}>
        {allAreas(j).map((a) => (
          <Chip key={a} label={tr(a)} on={r.area === a} onPress={() => set({ area: r.area === a ? undefined : a })} />
        ))}
        <Chip label={tr("+ Custom")} onPress={newArea} />
      </View>

      {showDecks && (
        <>
          <Text style={s.label}>{tr("Deck")}</Text>
          <View style={s.chips}>
            {decks.map((d) => (
              <Chip key={d} label={systemName(d)} on={system === d} onPress={() => switchSystem(d)} />
            ))}
          </View>
        </>
      )}

      <Text style={s.label}>{tr("Spread")}</Text>
      <View style={s.chips}>
        {spreadsFor(j, system, !!sp.daily).map((x) => (
          <Chip key={x.id} label={x.name} on={r.spreadId === x.id} onPress={() => set({ spreadId: x.id })} />
        ))}
        {!sp.daily && <Chip label={tr("+ Custom")} onPress={newSpread} />}
      </View>

      {grand && (
        <>
          <Text style={s.label}>{tr("Significator")}</Text>
          <View style={s.chips}>
            {(['l29', 'l28'] as const).map((x) => {
              const sig = significatorFor(system, x)!;
              return <Chip key={x} label={cardName(sig)} on={r.significator === sig} onPress={() => set({ significator: sig })} />;
            })}
            <Chip label={tr("Deal at random")} onPress={deal} />
            {!!placed.length && (
              <Chip
                label={tr("Clear")}
                onPress={() =>
                  Alert.alert(tr("Clear all cards?"), undefined, [
                    { text: tr("Cancel"), style: 'cancel' },
                    { text: tr("Clear"), style: 'destructive', onPress: () => set({ cards: [] }) },
                  ])
                }
              />
            )}
          </View>
          <Tableau
            layout={grand}
            cards={r.cards}
            significator={r.significator}
            onTap={(i) => setSlot(i)}
            onHold={(i) => (r.cards[i]?.card ? slotMenu(i) : setSlot(i))}
          />
          <Text style={s.hint}>{placed.length}{' '}{tr("of 36 placed · picking a card moves on to the next empty place.")}</Text>
        </>
      )}

      {!grand && (
      <ScrollView horizontal={isLine} scrollEnabled={isLine} showsHorizontalScrollIndicator={false} contentContainerStyle={isLine ? { gap: 10 } : undefined}>
      <View style={[s.slots, isLine && { flexWrap: 'nowrap' }]}>
        {sp.positions.map((pos, i) => {
          const p = r.cards[i];
          return (
            <Pressable key={`${sp.id}${i}`} style={{ width: slotW, alignItems: 'center', gap: 4 }} onPress={() => slotMenu(i)}>
              {p?.card ? (
                <CardImage id={p.card} reversed={p.reversed} width={slotW * 0.8} />
              ) : (
                <View style={[s.empty, { width: slotW * 0.8, height: slotW * 0.8 * 1.72 }]}>
                  <Ionicons name="add" size={24} color={c.dim} />
                </View>
              )}
              <Text style={s.pos} numberOfLines={1}>
                {i + 1}. {pos}
              </Text>
              {p?.card && (
                <Text style={s.cardLabel} numberOfLines={2}>
                  {short(p.card)}
                  {p.reversed ? ' ↓' : ''}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      </ScrollView>
      )}
      {!grand && !!filled.length && (
        <Text style={s.hint}>{flips ? tr("Tap a card to flip, change it or listen to its section.") : tr("Tap a card to change it or read about it.")}</Text>
      )}

      <Text style={s.label}>{tr("My interpretation")}</Text>
      <TextInput
        style={[s.input, { minHeight: 110 }]}
        value={r.interpretation ?? ''}
        onChangeText={(interpretation) => set({ interpretation })}
        placeholder={tr("What I see in the cards…")}
        placeholderTextColor={c.dim}
        multiline
      />
      <Text style={s.label}>{tr("Key points · one per line")}</Text>
      <TextInput
        style={[s.input, { minHeight: 80 }]}
        value={r.keyPoints ?? ''}
        onChangeText={(keyPoints) => set({ keyPoints })}
        placeholder={len ? tr("Heart next to the Ring") : tr("Strong Cups energy")}
        placeholderTextColor={c.dim}
        multiline
      />
      <Text style={s.label}>{tr("Open questions · one per line")}</Text>
      <TextInput
        style={[s.input, { minHeight: 80 }]}
        value={r.openQuestions ?? ''}
        onChangeText={(openQuestions) => set({ openQuestions })}
        placeholder={len ? tr("What does the Clouds card near me mean?") : tr("Why the Tower reversed in the outcome?")}
        placeholderTextColor={c.dim}
        multiline
      />

      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button label={tr("Ask Claude")} icon="sparkles-outline" primary onPress={() => shareToClaude(readingPrompt(r, j))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={tr("Paste answer")} icon="clipboard-outline" onPress={pasteAnswer} />
        </View>
      </View>
      {(r.answers ?? []).map((a, i) => (
        <Pressable
          key={a.at}
          style={s.answer}
          onLongPress={() =>
            Alert.alert(tr("Delete this answer?"), undefined, [
              { text: tr("Cancel"), style: 'cancel' },
              { text: tr("Delete"), style: 'destructive', onPress: () => set({ answers: r.answers!.filter((_, k) => k !== i) }) },
            ])
          }
        >
          <Text style={s.answerHead}>{tr("Claude ·")}{' '}{new Date(a.at).toLocaleDateString()}</Text>
          <Text style={s.answerText}>{a.text}</Text>
        </Pressable>
      ))}

      <CardSheet id={about?.id ?? null} role={about?.role} near={about?.near} onClose={() => setAbout(null)} />
      <CardPicker
        visible={slot !== null}
        title={slot !== null ? `${slot + 1}. ${sp.positions[slot]}` : ''}
        system={system}
        taken={len ? placed.filter((x) => x !== (slot !== null ? r.cards[slot]?.card : undefined)) : undefined}
        stayOpen={!!grand}
        onClose={() => setSlot(null)}
        onPick={(card, reversed) => slot !== null && placeCard(slot, card, reversed)}
      />
      <PersonSheet
        visible={personSheet}
        onClose={() => setPersonSheet(false)}
        onSave={(p) => {
          const created = addPerson(p);
          reload();
          set({ personId: created.id });
          setPersonSheet(false);
        }}
      />
    </ScrollView>
  );
}

function PersonSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (p: { name: string; dob?: string; background?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [bg, setBg] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => (setName(''), setDob(''), setBg(''))}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable style={s.dimBg} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>{tr("Reading for someone")}</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder={tr("Name")} placeholderTextColor={c.dim} />
        <Text style={s.dim}>{tr("Birth date (optional)")}</Text>
        <DateInput style={s.input} value={dob} onChange={setDob} />
        <TextInput
          style={[s.input, { minHeight: 70 }]}
          value={bg}
          onChangeText={setBg}
          placeholder={tr("Short background (optional)")}
          placeholderTextColor={c.dim}
          multiline
        />
        <Button
          label={tr("Save")}
          primary
          onPress={() => name.trim() && onSave({ name: name.trim(), dob: parseDate(dob), background: bg.trim() || undefined })}
        />
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  question: { color: c.text, fontSize: 20, fontWeight: '700', paddingVertical: 12 },
  stamp: { color: c.dim, fontSize: 13, marginTop: 6, textAlign: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 10 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: c.text, fontSize: 16, fontWeight: '600' },
  label: { color: c.dim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dim: { color: c.dim, marginTop: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pos: { color: c.dim, fontSize: 12 },
  cardLabel: { color: c.text, fontSize: 12, textAlign: 'center' },
  hint: { color: c.dim, fontSize: 12, marginTop: 8 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  answer: { backgroundColor: c.panel, borderRadius: 12, padding: 12, marginTop: 10, borderLeftWidth: 3, borderLeftColor: c.claude },
  answerHead: { color: c.claude, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  answerText: { color: c.text, fontSize: 15, lineHeight: 21 },
  dimBg: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: c.panel, padding: 16, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  h2: { color: c.text, fontSize: 19, fontFamily: F.heading },
}));
