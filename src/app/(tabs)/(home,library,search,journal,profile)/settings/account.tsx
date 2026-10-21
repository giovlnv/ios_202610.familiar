import { t as tr } from '../../../../i18n';
import { useCallback, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getToken, setToken } from '../../../../sync';
import { getClaudeLink, setClaudeLink } from '../../../../components/Consults';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Account() {
  const [hasToken, setHasToken] = useState(false);
  const [draft, setDraft] = useState('');
  const [link, setLink] = useState(getClaudeLink);
  const refresh = useCallback(() => void getToken().then((t) => setHasToken(!!t)), []);
  useFocusEffect(refresh);
  const save = (t: string) =>
    setToken(t)
      .then(() => (setDraft(''), refresh()))
      .catch((e) => Alert.alert(tr("Something went wrong"), String(e?.message ?? e)));

  return (
    <Page>
      <Text style={ss.h2}>{tr("GitHub")}</Text>
      <Text style={ss.p}>{tr("The key lets the app back up to your private ios_202610.familiar_library repo and send books to the audiobook pipeline.")}</Text>
      <View style={ss.card}>
        <Text style={ss.meta}>{tr("Status:")}{' '}{hasToken ? 'connected' : tr("not connected")}</Text>
        <TextInput
          style={ss.input}
          placeholder={hasToken ? tr("Saved — paste a new key to replace") : tr("Paste GitHub key (github_pat_…)")}
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={draft}
          onChangeText={setDraft}
        />
        <View style={ss.row}>
          <Btn label={tr("Save key")} primary onPress={() => draft.trim() && save(draft.trim())} />
          {hasToken && <Btn label={tr("Remove key")} onPress={() => save('')} />}
        </View>
      </View>
      <Text style={ss.h2}>{tr("Claude chat")}</Text>
      <Text style={ss.p}>{tr("“Send to Claude” copies the message and opens this chat. Paste it there.")}</Text>
      <View style={ss.card}>
        <TextInput
          style={ss.input}
          placeholder="https://claude.ai/chat/…"
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={link}
          onChangeText={setLink}
        />
        <View style={ss.row}>
          <Btn label={tr("Save link")} primary onPress={() => (setClaudeLink(link), Alert.alert(tr("Saved")))} />
        </View>
      </View>
    </Page>
  );
}
