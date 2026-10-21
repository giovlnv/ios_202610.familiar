import { t as tr } from '../../../../i18n';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { load, patchBook } from '../../../../tracker';
import { NumSystem, SYSTEM_NAME, SYSTEMS } from '../../../../numerology';
import { Chip } from '../../../../components/ui';
import { c } from '../../../../theme';
import { Page, ss } from '../../../../components/settings-ui';

function Toggle({ label, value, onChange, note }: { label: string; value: boolean; onChange: (v: boolean) => void; note: string }) {
  return (
    <View style={ss.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>{label}</Text>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: c.gold }} />
      </View>
      <Text style={ss.meta}>{note}</Text>
    </View>
  );
}

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } as const;

export default function NumerologySettings() {
  const [o, setO] = useState(getOnboarding);
  const set = (p: Parameters<typeof setOnboarding>[0]) => (setOnboarding(p), setO(getOnboarding()));
  const [books, setBooks] = useState(() => load().books.filter((b) => b.paths?.includes('numerology')));
  const setBook = (id: string, v?: NumSystem) => (patchBook(id, { numSystem: v }), setBooks(load().books.filter((b) => b.paths?.includes('numerology'))));
  return (
    <Page>
      <Text style={ss.h2}>{tr("System")}</Text>
      <View style={row}>
        <Chip label={tr("Follow my books")} on={!o.numSystem} onPress={() => set({ numSystem: undefined })} />
        {SYSTEMS.map((v) => (
          <Chip key={v} label={SYSTEM_NAME[v]} on={o.numSystem === v} onPress={() => set({ numSystem: v })} />
        ))}
      </View>
      <Text style={ss.meta}>{tr("Follow my books uses the system of your first numerology book, or Pythagorean. Every system can also be viewed on the Numerology page.")}</Text>
      <Toggle
        label={tr("Y counts as a vowel")}
        value={!!o.yVowel}
        onChange={(v) => set({ yVowel: v })}
        note={tr("Off: Y is a consonant. Changes the vowel and consonant numbers.")}
      />
      <Toggle
        label={tr("Accents add to letters (NCT)")}
        value={!!o.numAccents}
        onChange={(v) => set({ numAccents: v })}
        note={tr("Cabalística only. On: acute +2, tilde +3, circumflex and ring +7, grave, diaeresis and cedilla double the letter. Off: Á counts as A.")}
      />
      <Text style={ss.h2}>{tr("Value of X")}</Text>
      <View style={row}>
        {[5, 6, 0].map((v) => (
          <Chip key={v} label={v ? String(v) : tr("Not counted")} on={(o.numX ?? 5) === v} onPress={() => set({ numX: v })} />
        ))}
      </View>
      <Text style={ss.meta}>{tr("Chaldean and Cabalística. Cheiro gives 5; some Brazilian tables give 6 or leave X out.")}</Text>
      <Text style={ss.h2}>{tr("Your numerology books")}</Text>
      {books.length === 0 && <Text style={ss.p}>{tr("Tag a book with the Numerology path to set which system it uses.")}</Text>}
      {books.map((b) => (
        <View key={b.id} style={ss.card}>
          <Text style={{ color: c.text, fontSize: 16 }}>{b.title}</Text>
          <View style={row}>
            <Chip label={tr("Not set")} on={!b.numSystem} onPress={() => setBook(b.id)} />
            {SYSTEMS.map((v) => (
              <Chip key={v} label={SYSTEM_NAME[v]} on={b.numSystem === v} onPress={() => setBook(b.id, v)} />
            ))}
          </View>
        </View>
      ))}
    </Page>
  );
}
