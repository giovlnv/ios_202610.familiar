import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { backupToFile, getState, getToken, pullFromGithub, pushToGithub, restoreFromFile, SyncState } from '../../../../sync';
import { c } from '../../../../theme';
import { Btn, confirmRestore, Page, ss, when } from '../../../../components/settings-ui';
import { refreshStreamingBooks } from '../../../../storage';

export default function Backups() {
  const [state, setState] = useState<SyncState>({});
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    setState(getState());
    getToken().then((t) => setHasToken(!!t));
  }, []);
  useFocusEffect(refresh);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      const r = await fn();
      if (typeof r === 'number') await refreshStreamingBooks().catch(() => 0);
      if (ok) Alert.alert(ok, typeof r === 'number' ? `${r} book(s) restored.` : undefined);
    } catch (e) {
      Alert.alert('Something went wrong', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <Page>
      <Text style={ss.h2}>Automatic · GitHub</Text>
      <Text style={ss.p}>Notes, Claude consults, progress and your familiars are saved to your private ios_202610.familiar_library repo whenever you leave the app.</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>Last sync: {when(state.lastGithub)}</Text>
        {state.lastError && <Text style={[ss.meta, { color: c.claude }]}>Last error: {state.lastError}</Text>}
        {hasToken ? (
          <View style={ss.row}>
            <Btn
              label="Sync now"
              primary
              onPress={() =>
                run(async () => {
                  if (!(await pushToGithub())) throw new Error(getState().lastError ?? 'Sync failed');
                }, 'Synced')
              }
            />
            <Btn label="Restore from GitHub" onPress={() => confirmRestore(() => run(pullFromGithub, 'Restored'))} />
          </View>
        ) : (
          <View style={ss.row}>
            <Btn label="Add your GitHub key" primary onPress={() => router.push('/settings/account')} />
          </View>
        )}
      </View>
      <Text style={ss.h2}>Manual · file</Text>
      <Text style={ss.p}>Save a backup file to Files or iCloud Drive. You’ll get a reminder in the Library after 7 days.</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>Last backup file: {when(state.lastFile)}</Text>
        <View style={ss.row}>
          <Btn label="Back up now" primary onPress={() => run(backupToFile)} />
          <Btn label="Restore from file" onPress={() => confirmRestore(() => run(restoreFromFile, 'Restored'))} />
        </View>
      </View>
      {busy && <Text style={ss.meta}>Working…</Text>}
    </Page>
  );
}
