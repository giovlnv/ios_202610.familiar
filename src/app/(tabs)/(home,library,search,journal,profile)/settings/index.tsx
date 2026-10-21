import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile } from '../../../../tracker';
import { getOnboarding } from '../../../../familiar';
import { activeSystem, SYSTEM_NAME } from '../../../../numerology';
import { HOUSES } from '../../../../astrology';
import { PALETTES, paletteId } from '../../../../theme';
import { getState } from '../../../../sync';
import { MenuRow, Page, ss, when } from '../../../../components/settings-ui';

export default function Settings() {
  const [, tick] = useState(0);
  useFocusEffect(useCallback(() => tick((n) => n + 1), []));
  const p = getProfile();
  const sync = getState();
  return (
    <Page>
      <Text style={ss.label}>Appearance</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="color-palette-outline" title="App" sub={`${PALETTES.find((x) => x.id === paletteId)?.name ?? ''} · mode · app icon`} to="/settings/appearance" />
        <MenuRow icon="person-circle-outline" title="Profile" sub={p.name ? `${p.name}${p.username ? ` · @${p.username}` : ''}` : 'Photo, name, birth details'} to="/settings/profile" />
        <MenuRow icon="paw-outline" title="Familiar" sub="Your familiars, linked paths" to="/familiars" />
      </View>
      <Text style={ss.label}>Paths</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="albums-outline" title="Tarot" sub="Decks: default deck, custom decks" to="/settings/configuration" />
        <MenuRow icon="albums-outline" title="Lenormand" sub="Decks, card names, significator" to="/settings/decks/lenormand" />
        <MenuRow icon="albums-outline" title="Make your own" sub="Your own systems and decks" to="/settings/decks/custom" />
        {(getOnboarding().paths ?? []).includes('astrology') && (
          <MenuRow icon="planet-outline" title="Astrology" sub={`Houses: ${HOUSES.find((h) => h.id === (getOnboarding().houses ?? 'placidus'))?.name}`} to="/settings/astrology" />
        )}
        {(getOnboarding().paths ?? []).includes('numerology') && (
          <MenuRow icon="keypad-outline" title="Numerology" sub={`${SYSTEM_NAME[activeSystem()]} · Y as ${getOnboarding().yVowel ? 'vowel' : 'consonant'}`} to="/settings/numerology" />
        )}
      </View>
      <Text style={ss.label}>Account</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="key-outline" title="Keys" sub="GitHub and Claude" to="/settings/account" />
        <MenuRow icon="cloud-upload-outline" title="Backups" sub={`Last GitHub sync: ${when(sync.lastGithub)}`} to="/settings/backups" />
      </View>
      <Text style={ss.label}>App</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="language-outline" title="Languages" sub="App language, audiobook voices" to="/settings/languages" />
        <MenuRow icon="apps-outline" title="Widget" sub="Home-screen widget colours" to="/settings/widget" />
        <MenuRow icon="server-outline" title="Storage" sub="Audio on this iPhone, temporary files" to="/settings/storage" />
        <MenuRow icon="construct-outline" title="Development" sub="Setup, version" to="/settings/development" />
      </View>
    </Page>
  );
}
