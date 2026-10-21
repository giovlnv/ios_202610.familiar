import { PRONOUNS, setPronouns, t as tr } from '../../../../i18n';
import { Chip } from '../../../../components/ui';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { getProfile, NameEntry, setProfile } from '../../../../tracker';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { parseDate, showDate } from '../../../../journal';
import { DateInput, TimeInput } from '../../../../components/SplitInput';
import { Avatar, pickPhoto } from '../../../../components/ProfileHeader';
import { Place, PlaceField } from '../../../../components/PlaceField';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function EditProfile() {
  const [p] = useState(getProfile);
  const [ob] = useState(getOnboarding);
  const [photo, setPhoto] = useState(p.photo);
  const [name, setName] = useState(p.name ?? '');
  const [username, setUsername] = useState(p.username ?? '');
  const [pronouns, setPron] = useState(p.pronouns);
  const [dob, setDob] = useState(showDate(p.dob));
  const [time, setTime] = useState(ob.birthTime ?? '');
  const [place, setPlace] = useState<Place | undefined>(
    ob.birthPlace ? { label: ob.birthPlace, lat: ob.birthLat ?? 0, lon: ob.birthLon ?? 0, timezone: ob.birthTz } : undefined,
  );

  const [birthName, setBirthName] = useState(p.birthName ?? '');
  const [names, setNames] = useState<NameEntry[]>(p.names ?? []);
  const last = names.at(-1);
  const [used, setUsed] = useState(last?.name ?? '');
  const [since, setSince] = useState(showDate(last?.since));
  const numerology = (ob.paths ?? []).includes('numerology');

  const save = () => {
    let list = names;
    const u = used.trim().replace(/\s+/g, ' ');
    if (u && u !== last?.name) list = [...names, { name: u, since: parseDate(since) }];
    else if (u && last) list = [...names.slice(0, -1), { ...last, since: parseDate(since) }];
    setPronouns(pronouns);
    setProfile({ name: name.trim(), username, pronouns, dob: parseDate(dob), birthName: birthName.trim().replace(/\s+/g, ' ') || undefined, names: list });
    setOnboarding({ birthTime: time, birthPlace: place?.label, birthLat: place?.lat, birthLon: place?.lon, birthTz: place?.timezone });
    router.back();
  };

  return (
    <Page>
      <Pressable
        style={{ alignSelf: 'center', alignItems: 'center', gap: 6, marginBottom: 8 }}
        onPress={() => pickPhoto().then((ph) => ph && (setProfile({ photo: ph }), setPhoto(ph)))}
      >
        <Avatar photo={photo} name={name} size={96} />
        <Text style={{ color: c.gold, fontWeight: '600' }}>{photo ? tr("Change photo") : tr("Add photo")}</Text>
      </Pressable>
      <View style={ss.card}>
        <Text style={ss.label}>{tr("Name")}</Text>
        <TextInput style={ss.input} value={name} onChangeText={setName} placeholder={tr("Your name")} placeholderTextColor={c.dim} />
        <Text style={ss.label}>{tr("Username")}</Text>
        <TextInput
          style={ss.input}
          value={username}
          onChangeText={(u) => setUsername(u.replace(/[^\w.]/g, '').toLowerCase())}
          placeholder="username"
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={ss.label}>{tr("Pronouns")}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label={tr("No pronouns shown")} on={!pronouns} onPress={() => setPron(undefined)} />
          {PRONOUNS.map((x) => (
            <Chip key={x} label={x} on={pronouns === x} onPress={() => setPron(x)} />
          ))}
        </View>
        <Text style={ss.meta}>{tr("In Portuguese, the app also uses them for words about you (Nascida, Nascido, Nascide).")}</Text>
      </View>
      <View style={ss.card}>
        <Text style={ss.label}>{tr("Birth date")}</Text>
        <DateInput style={ss.input} value={dob} onChange={setDob} />
        <Text style={ss.label}>{tr("Birth time")}</Text>
        <TimeInput style={[ss.input, { maxWidth: 160 }]} value={time} onChange={setTime} />
        <Text style={ss.label}>{tr("Birth place")}</Text>
        <PlaceField value={place?.label ?? ''} onPick={setPlace} language={ob.language} />
        <Text style={ss.meta}>{tr("Used for your element vial, astrology and the personality, essence and year cards in the Journal.")}</Text>
      </View>
      {numerology && (
        <View style={ss.card}>
          <Text style={ss.label}>{tr("Full birth name")}</Text>
          <TextInput style={ss.input} value={birthName} onChangeText={setBirthName} placeholder={tr("As on your birth certificate")} placeholderTextColor={c.dim} autoCorrect={false} />
          <Text style={ss.label}>{tr("Name you use")}</Text>
          <TextInput style={ss.input} value={used} onChangeText={(v) => (setUsed(v), v.trim() !== last?.name && since === showDate(last?.since) && setSince(''))} placeholder={tr("If different, e.g. after marriage")} placeholderTextColor={c.dim} autoCorrect={false} />
          <Text style={ss.label}>{tr("Using it since")}</Text>
          <DateInput style={ss.input} value={since} onChange={setSince} />
          {names.length > 1 && <Text style={ss.label}>{tr("Earlier names")}</Text>}
          {names.slice(0, -1).map((n, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[ss.meta, { flex: 1, color: c.text }]}>
                {n.name}
                {n.since ? tr("  ·  since {0}", { 0: showDate(n.since) }) : ''}
              </Text>
              <Pressable hitSlop={8} onPress={() => setNames(names.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle-outline" size={20} color={c.dim} />
              </Pressable>
            </View>
          ))}
          <Text style={ss.meta}>{tr("Numerology: the birth name gives your core numbers; the name you use gives your current ones. Typing a new name keeps the old one in the history.")}</Text>
        </View>
      )}
      <Btn label={tr("Save")} primary onPress={save} />
    </Page>
  );
}
