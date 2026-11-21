import { t as tr } from '../../../../i18n';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { getClaudeLink, setClaudeLink } from '../../../../components/Consults';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Account() {
  const [link, setLink] = useState(getClaudeLink);

  return (
    <Page>
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
