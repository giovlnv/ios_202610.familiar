import { t as tr } from '../../../../i18n';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Development() {
  const created = Updates.createdAt ? Updates.createdAt.toLocaleString() : 'built-in';
  return (
    <Page>
      <Text style={ss.h2}>{tr("Setup")}</Text>
      <Text style={ss.p}>{tr("Walk through the first-launch setup again: paths, your familiar, Claude and backups.")}</Text>
      <View style={ss.row}>
        <Btn label={tr("Run setup again")} onPress={() => router.push('/onboarding')} />
      </View>
      <Text style={ss.h2}>{tr("Version")}</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>{tr("App")}{' '}{Constants.expoConfig?.version ?? '?'}{' '}{tr("· runtime")}{' '}{Updates.runtimeVersion ?? '?'}</Text>
        <Text style={ss.meta}>{tr("Update:")}{' '}{created}</Text>
        <Text style={ss.meta}>{tr("Channel:")}{' '}{Updates.channel || '—'}</Text>
      </View>
    </Page>
  );
}
