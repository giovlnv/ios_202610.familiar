import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Development() {
  const created = Updates.createdAt ? Updates.createdAt.toLocaleString() : 'built-in';
  return (
    <Page>
      <Text style={ss.h2}>Setup</Text>
      <Text style={ss.p}>Walk through the first-launch setup again: paths, your familiar, Claude and backups.</Text>
      <View style={ss.row}>
        <Btn label="Run setup again" onPress={() => router.push('/onboarding')} />
      </View>
      <Text style={ss.h2}>Version</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>App {Constants.expoConfig?.version ?? '?'} · runtime {Updates.runtimeVersion ?? '?'}</Text>
        <Text style={ss.meta}>Update: {created}</Text>
        <Text style={ss.meta}>Channel: {Updates.channel || '—'}</Text>
      </View>
    </Page>
  );
}
