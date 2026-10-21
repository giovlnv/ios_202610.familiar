import * as Updates from 'expo-updates';
import { getLangPrefs, setLangPrefs } from '../languages';
import { t as tr, uiLang } from '../i18n';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EYES, Familiar, getOnboarding, allPaths, saveFamiliar, setOnboarding, setWithYou, withYou } from '../familiar';
import { EyesMarkStep, FamiliarArt, Label, NameStep, ShapeCoatStep, SpeciesStep, s as fs } from '../components/Familiar';
import { getClaudeLink, setClaudeLink } from '../components/Consults';
import { backupToFile, getState, getToken, setToken } from '../sync';
import { getProfile, setProfile } from '../tracker';
import { parseDate, showDate } from '../journal';
import { c, F, themed } from '../theme';
import { DateInput, TimeInput } from '../components/SplitInput';
import { Place, PlaceField } from '../components/PlaceField';

const STEPS = ['welcome', 'paths', 'species', 'shape', 'eyes', 'name', 'claude', 'about', 'backups', 'book'] as const;
type Step = (typeof STEPS)[number];
const GOALS = ['Learn the cards', 'Read for others', 'Know myself', 'Daily practice', 'Go deeper'];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const band = height * 0.7;
  const heroH = Math.max((width * 600) / 393, band);
  const saved = getOnboarding();
  const [i, setI] = useState(0);
  const [f, setF] = useState<Familiar>(withYou);
  const [paths, setPaths] = useState<string[]>(saved.paths ?? ['tarot']);
  const [hasKey, setHasKey] = useState(false);
  const [key, setKey] = useState('');
  const [link, setLink] = useState(getClaudeLink());
  const [dob, setDob] = useState(showDate(getProfile().dob));
  const [birthTime, setBirthTime] = useState(saved.birthTime ?? '');
  const [place, setPlace] = useState<Place | undefined>(saved.birthPlace ? { label: saved.birthPlace, lat: saved.birthLat ?? 0, lon: saved.birthLon ?? 0, timezone: saved.birthTz } : undefined);
  const [language, setLanguage] = useState(saved.language ?? 'en');
  const [goals, setGoals] = useState<string[]>(saved.goals ?? []);
  useEffect(() => {
    getToken().then((t) => setHasKey(!!t));
  }, []);

  const step: Step = STEPS[i];
  const go = (to: Step) => setI(STEPS.indexOf(to));
  const next = () => {
    if (step === 'name') {
      const named = { ...f, name: f.name.trim() || 'Shadow' };
      saveFamiliar(named);
      setWithYou(named.id);
      setF(named);
    }
    if (step === 'paths') setOnboarding({ paths });
    if (step === 'claude') {
      if (key.trim()) setToken(key.trim()).then(() => setHasKey(true));
      if (link.trim()) setClaudeLink(link.trim());
    }
    if (step === 'about') {
      const iso = parseDate(dob);
      if (dob.trim() && iso) setProfile({ dob: iso });
      setOnboarding({ birthTime, birthPlace: place?.label, birthLat: place?.lat, birthLon: place?.lon, birthTz: place?.timezone, language, goals });
    }
    if (step === 'species' && f.species !== 'cat') return go('eyes');
    setI(Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => (step === 'eyes' && f.species !== 'cat' ? go('species') : setI(Math.max(0, i - 1)));
  const finish = (to: '/add' | '/') => {
    setOnboarding({ done: Date.now() });
    router.replace(to);
    if (language !== uiLang()) {
      setLangPrefs({ ...getLangPrefs(), ui: language });
      Updates.reloadAsync().catch(() => {});
    }
  };
  const set = (patch: Partial<Familiar>) => setF((x) => ({ ...x, ...patch }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (step === 'welcome')
    return (
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={st.wrap} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }} bounces={false}>
        <View style={{ height: band, overflow: 'hidden' }}>
          <Image source={require('../../assets/hero.jpg')} style={[st.hero, { height: heroH, width: (heroH * 393) / 600, left: (width - (heroH * 393) / 600) / 2 }]} />
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.7" stopColor={c.bg} stopOpacity={0} />
                <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="1" height="1" fill="url(#fade)" />
          </Svg>
        </View>
        <View style={st.brand}>
          <Text style={st.word}>{tr("Familiar")}</Text>
          <Text style={st.tagline}>{tr("your familiar knows the way.")}</Text>
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={st.pad}>
          <Primary label={tr("Begin")} onPress={next} />
          <Link label={tr("I’m already set up — skip")} onPress={() => finish('/')} />
        </View>
      </ScrollView>
    );

  const familiarStep = ['species', 'shape', 'eyes', 'name'].includes(step);
  const content = (() => {
    switch (step) {
      case 'paths':
        return (
          <>
            <Head title={tr("What do you study?")} sub={tr("Pick the paths your familiar will walk with you. You can change this later.")} />
            {allPaths().map((p) => {
              const on = paths.includes(p.id);
              return (
                <Pressable key={p.id} style={st.row} onPress={() => setPaths(toggle(paths, p.id))} accessibilityState={{ checked: on }}>
                  <View style={[st.chip, { backgroundColor: p.color + '29' }]}>
                    <View style={[st.dot, { backgroundColor: p.color }]} />
                  </View>
                  <Text style={[st.rowTitle, { flex: 1 }]}>{p.name}</Text>
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? c.gold : c.line} />
                </Pressable>
              );
            })}
          </>
        );
      case 'species':
        return (
          <>
            <Head title={tr("Who walks with you?")} sub={tr("Choose your familiar. {0} is waiting if you’d rather skip.", { 0: withYou().name })} />
            <SpeciesStep f={f} set={set} />
          </>
        );
      case 'shape':
        return (
          <>
            <Head title={tr("Shape and coat")} />
            <ShapeCoatStep f={f} set={set} />
          </>
        );
      case 'eyes':
        return (
          <>
            <Head title={f.species === 'cat' ? tr("Eyes and mark") : tr("Colour and eyes")} />
            {f.species !== 'cat' && <ShapeCoatStep f={f} set={set} />}
            {f.species === 'cat' ? <EyesMarkStep f={f} set={set} /> : <EyesOnly f={f} set={set} />}
          </>
        );
      case 'name':
        return (
          <>
            <Head title={tr("What shall we call them?")} sub={tr("Your familiar answers to any name.")} />
            <NameStep f={f} set={set} />
          </>
        );
      case 'claude':
        return (
          <>
            <Head title={tr("Your study helpers")} sub={tr("Claude writes the explanations; GitHub makes the voices and keeps your backups.")} />
            <Label>{tr("GITHUB KEY")}</Label>
            <TextInput
              style={fs.input}
              value={key}
              onChangeText={setKey}
              placeholder={hasKey ? tr("Saved — type to replace") : tr("github_pat_…")}
              placeholderTextColor={c.dim}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Label>{tr("CLAUDE CHAT FOR QUESTIONS")}</Label>
            <TextInput
              style={fs.input}
              value={link}
              onChangeText={setLink}
              placeholder="https://claude.ai/chat/…"
              placeholderTextColor={c.dim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Note text={tr("Books you add are split here, explained by Claude in the FAMILIAR project, and voiced on GitHub.")} />
          </>
        );
      case 'about':
        return (
          <>
            <Head title={tr("A little about you")} sub={tr("Optional. Used for astrology and numerology, never shared.")} />
            <Label>{tr("BIRTH DATE")}</Label>
            <DateInput style={fs.input} value={dob} onChange={setDob} />
            <Label>{tr("BIRTH TIME")}</Label>
            <TimeInput style={[fs.input, { maxWidth: 160 }]} value={birthTime} onChange={setBirthTime} />
            <Label>{tr("BIRTH PLACE")}</Label>
            <PlaceField value={place?.label ?? ''} onPick={setPlace} language={language} />
            <Label>{tr("LANGUAGE")}</Label>
            <View style={fs.row}>
              {[
                ['en', 'English'],
                ['pt', 'Português'],
              ].map(([id, name]) => (
                <Pill key={id} label={name} on={language === id} onPress={() => setLanguage(id)} />
              ))}
            </View>
            <Label>{tr("WHAT ARE YOU HOPING FOR?")}</Label>
            <View style={[fs.row, { flexWrap: 'wrap' }]}>
              {GOALS.map((g) => (
                <Pill key={g} label={g} on={goals.includes(g)} onPress={() => setGoals(toggle(goals, g))} />
              ))}
            </View>
          </>
        );
      case 'backups': {
        const sync = getState();
        return (
          <>
            <Head title={tr("Backups are on")} sub={tr("Your library syncs to your private GitHub repo whenever you leave the app.")} />
            <Status icon="logo-github" title={tr("GitHub sync")} text={sync.lastGithub ? tr("Last sync {0}", { 0: new Date(sync.lastGithub).toLocaleString() }) : hasKey ? tr("Runs when you leave the app") : tr("Add your GitHub key to turn it on")} />
            <Status icon="document-outline" title={tr("Backup file")} text={tr("Saved to Files or iCloud Drive; you get a reminder every 7 days.")} />
            <Pressable style={st.secondary} onPress={() => backupToFile().catch((e) => Alert.alert(tr("Backup failed"), String(e?.message ?? e)))}>
              <Text style={st.secondaryText}>{tr("Save a backup file now")}</Text>
            </Pressable>
          </>
        );
      }
      case 'book':
        return (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <FamiliarArt familiar={f} pose="reading" size={240} vial alive />
            <Head title={tr("{0} is ready to read", { 0: f.name || 'Shadow' })} sub={tr("Add your next book and you’ll study it together.")} center />
          </View>
        );
    }
  })();

  return (
    <KeyboardAvoidingView behavior="padding" style={st.wrap}>
      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        <Pressable hitSlop={12} onPress={back} accessibilityLabel={tr("Back")}>
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
        <View style={st.dots}>
          {STEPS.slice(1).map((x, k) => (
            <View key={x} style={[st.stepDot, k + 1 < i && { backgroundColor: c.gold }, k + 1 === i && st.stepOn]} />
          ))}
        </View>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={[st.pad, { gap: 14, paddingBottom: 24 }]} keyboardShouldPersistTaps="handled">
        {content}
      </ScrollView>
      <View style={[st.pad, { paddingBottom: insets.bottom + 12, gap: 6 }]}>
        {step === 'book' ? (
          <>
            <Primary label={tr("Add a book")} onPress={() => finish('/add')} />
            <Link label={tr("Explore first")} onPress={() => finish('/')} />
          </>
        ) : (
          <>
            <Primary label={tr("Continue")} onPress={next} />
            {familiarStep && <Link label={tr("Skip — keep {0}", { 0: withYou().name })} onPress={() => (setF(withYou()), go('claude'))} />}
            {(step === 'about' || step === 'claude') && <Link label={tr("Skip")} onPress={() => setI(i + 1)} />}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function EyesOnly({ f, set }: { f: Familiar; set: (p: Partial<Familiar>) => void }) {
  return (
    <>
      <Label>{tr("EYES")}</Label>
      <View style={fs.swatches}>
        {EYES.map((e) => (
          <Pressable key={e.hex} accessibilityLabel={e.name} onPress={() => set({ eyes: e.hex })} style={[fs.swatch, { backgroundColor: e.hex }, f.eyes === e.hex && fs.swatchOn]} />
        ))}
      </View>
    </>
  );
}

function Head({ title, sub, center }: { title: string; sub?: string; center?: boolean }) {
  return (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Text style={[st.h1, center && { textAlign: 'center' }]}>{title}</Text>
      {!!sub && <Text style={[st.sub, center && { textAlign: 'center' }]}>{sub}</Text>}
    </View>
  );
}
function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={st.primary} onPress={onPress}>
      <Text style={st.primaryText}>{label}</Text>
    </Pressable>
  );
}
function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8 }}>
      <Text style={st.link}>{label}</Text>
    </Pressable>
  );
}
function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.pill, on && st.pillOn]}>
      <Text style={[st.pillText, on && { color: c.bg }]}>{label}</Text>
    </Pressable>
  );
}
function Note({ text }: { text: string }) {
  return (
    <View style={[st.row, { alignItems: 'flex-start' }]}>
      <Text style={{ color: c.gold, fontSize: 16 }}>✦</Text>
      <Text style={[st.sub, { flex: 1, fontSize: 13 }]}>{text}</Text>
    </View>
  );
}
function Status({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={st.row}>
      <Ionicons name={icon} size={22} color={c.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.rowTitle}>{title}</Text>
        <Text style={st.sub}>{text}</Text>
      </View>
    </View>
  );
}

const st = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg },
  hero: { position: 'absolute', bottom: 0 },
  brand: { alignItems: 'center', gap: 6, marginTop: -28 },
  word: { color: c.gold, fontSize: 46, fontWeight: '500' },
  tagline: { color: c.text, fontStyle: 'italic', fontSize: 17 },
  pad: { paddingHorizontal: 22 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.line },
  stepOn: { width: 18, backgroundColor: c.gold },
  h1: { color: c.text, fontSize: 28, fontFamily: F.heading },
  sub: { color: c.dim, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 14, padding: 12 },
  rowTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
  chip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  primary: { backgroundColor: c.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: c.bg, fontSize: 16, fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: c.text, fontSize: 15, fontWeight: '600' },
  link: { color: c.dim, fontSize: 14, fontWeight: '500' },
  pill: { backgroundColor: c.raised, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillOn: { backgroundColor: c.gold },
  pillText: { color: c.text, fontSize: 14 },
}));
