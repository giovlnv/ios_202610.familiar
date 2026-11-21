import { isPublic } from '../../../../variant';
import { t as tr } from '../../../../i18n';
import { useCallback, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { backupToFile, getAres, getState, pushToAres, restoreFromAres, restoreFromFile, setAres, SyncState } from '../../../../sync';
import { c } from '../../../../theme';
import { Btn, confirmRestore, Page, ss, when } from '../../../../components/settings-ui';
import { refreshStreamingBooks } from '../../../../storage';

export default function Backups() {
  const [state, setState] = useState<SyncState>({});
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [hasAres, setHasAres] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    setState(getState());
    getAres().then((a) => {
      setHasAres(!!a);
      if (a) setUrl((u) => u || a.url);
    });
  }, []);
  useFocusEffect(refresh);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      const r = await fn();
      if (typeof r === 'number') await refreshStreamingBooks().catch(() => 0);
      if (ok) Alert.alert(ok, typeof r === 'number' ? (r === 1 ? tr("1 book restored.") : tr("{0} books restored.", { 0: r })) : undefined);
    } catch (e) {
      Alert.alert(tr("Something went wrong"), String((e as Error).message ?? e));
    } finally {
      setBusy(false);
      refresh();
    }
  };
  const save = () =>
    run(async () => {
      const a = await getAres();
      await setAres(url, token || a?.token || '');
      setToken('');
    }, tr("Saved"));
  const status = state.pending
    ? `${tr("Waiting for ares")}${state.lastError ? ` · ${state.lastError}` : ''}`
    : tr("Last backup: {0}", { 0: when(state.lastAres) });

  return (
    <Page>
      {!isPublic && (
        <>
          <Text accessibilityRole="header" style={ss.h2}>{tr("Automatic · ares")}</Text>
          <Text style={ss.p}>{tr("Notes, readings, progress and your familiars are saved on ares whenever you leave the app and right after a card of the day. Ares keeps 30 daily copies.")}</Text>
          <View style={ss.card}>
            <Text style={ss.meta}>{status}</Text>
            {state.lastError && !state.pending ? <Text style={[ss.meta, { color: c.claude }]}>{tr("Last error:")}{' '}{state.lastError}</Text> : null}
            <TextInput style={ss.input} placeholder={tr("ares address (http://ares:8087)")} placeholderTextColor={c.dim} autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
            <TextInput
              style={ss.input}
              placeholder={hasAres ? tr("Saved — paste a new token to replace") : tr("ares token")}
              placeholderTextColor={c.dim}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={token}
              onChangeText={setToken}
            />
            <View style={ss.row}>
              <Btn label={tr("Save")} onPress={save} />
              {hasAres ? (
                <>
                  <Btn
                    label={tr("Back up now")}
                    primary
                    onPress={() =>
                      run(async () => {
                        if (!(await pushToAres())) throw new Error(getState().lastError ?? 'Backup failed');
                      }, tr("Backed up"))
                    }
                  />
                  <Btn label={tr("Restore from ares")} onPress={() => confirmRestore(() => run(restoreFromAres, tr("Restored")))} />
                </>
              ) : null}
            </View>
          </View>
        </>
      )}
      <Text accessibilityRole="header" style={ss.h2}>{tr("Manual · file")}</Text>
      <Text style={ss.p}>{tr("Save a backup file to Files or iCloud Drive. You’ll get a reminder in the Library after 7 days.")}</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>{tr("Last backup file:")}{' '}{when(state.lastFile)}</Text>
        <View style={ss.row}>
          <Btn label={tr("Back up now")} primary onPress={() => run(backupToFile)} />
          <Btn label={tr("Restore from file")} onPress={() => confirmRestore(() => run(restoreFromFile, tr("Restored")))} />
        </View>
      </View>
      {busy && <Text style={ss.meta}>{tr("Working…")}</Text>}
    </Page>
  );
}
