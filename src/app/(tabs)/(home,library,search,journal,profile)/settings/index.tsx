import { isPublic } from '../../../../variant';
import { t as tr } from '../../../../i18n';
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
      <Text style={ss.label}>{tr("Appearance")}</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="color-palette-outline" title={tr("App")} sub={tr("{0} · mode · app icon", { 0: PALETTES.find((x) => x.id === paletteId)?.name ?? '' })} to="/settings/appearance" />
        <MenuRow icon="person-circle-outline" title={tr("Profile")} sub={p.name ? `${p.name}${p.username ? ` · @${p.username}` : ''}` : tr("Photo, name, birth details")} to="/settings/profile" />
        <MenuRow icon="paw-outline" title={tr("Familiar")} sub={tr("Your familiars, linked paths")} to="/familiars" />
      </View>
      <Text style={ss.label}>{tr("Paths")}</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="albums-outline" title={tr("Tarot")} sub={tr("Decks: default deck, custom decks")} to="/settings/configuration" />
        <MenuRow icon="albums-outline" title={tr("Lenormand")} sub={tr("Decks, card names, significator")} to="/settings/decks/lenormand" />
        <MenuRow icon="albums-outline" title={tr("Make your own")} sub={tr("Your own systems and decks")} to="/settings/decks/custom" />
        {(getOnboarding().paths ?? []).includes('astrology') && (
          <MenuRow icon="planet-outline" title={tr("Astrology")} sub={tr("Houses: {0}", { 0: HOUSES.find((h) => h.id === (getOnboarding().houses ?? 'placidus'))?.name })} to="/settings/astrology" />
        )}
        {(getOnboarding().paths ?? []).includes('numerology') && (
          <MenuRow icon="keypad-outline" title={tr("Numerology")} sub={tr("{0} · Y as {1}", { 0: SYSTEM_NAME[activeSystem()], 1: tr(getOnboarding().yVowel ? 'vowel' : 'consonant') })} to="/settings/numerology" />
        )}
      </View>
      <Text style={ss.label}>{tr("Account")}</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        {!isPublic && <MenuRow icon="key-outline" title={tr("Keys")} sub={tr("GitHub and Claude")} to="/settings/account" />}
        <MenuRow icon="cloud-upload-outline" title={tr("Backups")} sub={isPublic ? tr("Backup file") : tr("Last GitHub sync: {0}", { 0: when(sync.lastGithub) })} to="/settings/backups" />
      </View>
      <Text style={ss.label}>{tr("App")}</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="language-outline" title={tr("Languages")} sub={tr("App language, audiobook voices")} to="/settings/languages" />
        <MenuRow icon="apps-outline" title={tr("Widget")} sub={tr("Home-screen widget colours")} to="/settings/widget" />
        <MenuRow icon="server-outline" title={tr("Storage")} sub={tr("Audio on this iPhone, temporary files")} to="/settings/storage" />
        <MenuRow icon="construct-outline" title={tr("Development")} sub={tr("Setup, version")} to="/settings/development" />
      </View>
    </Page>
  );
}
