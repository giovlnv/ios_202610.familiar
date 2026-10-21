import { Alert, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { patchSubject, removeSubject, SUBJECT_COLORS, updateStudy, useStudy } from '../../../../study';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { promptSubject } from '../../../../components/StudyEditors';
import { Chip } from '../../../../components/ui';
import { Btn, Page, ss } from '../../../../components/settings-ui';
import { t as tr } from '../../../../i18n';
import { c } from '../../../../theme';

export default function StudySettings() {
  const d = useStudy();
  const remove = (id: string, name: string) => {
    const n = d.notes.filter((x) => x.subject === id).length;
    const k = d.cards.filter((x) => x.subject === id).length;
    Alert.alert(tr('Delete {0}?', { 0: name }), tr('Its {0} notes and {1} flashcards are deleted too. Books stay in your library.', { 0: n, 1: k }), [
      { text: tr('Cancel'), style: 'cancel' },
      {
        text: tr('Delete'),
        style: 'destructive',
        onPress: () => {
          removeSubject(id);
          setOnboarding({ paths: (getOnboarding().paths ?? []).filter((p) => p !== id) });
        },
      },
    ]);
  };
  return (
    <Page>
      <Text style={ss.p}>
        {tr('A study subject is a path of your own for anything you learn from books: notes and flashcards in the Journal tab, books tagged to it in the Library.')}
      </Text>
      {d.subjects.map((x) => (
        <View key={x.id} style={ss.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="book-outline" size={20} color={x.color} />
            <Pressable style={{ flex: 1 }} onPress={() => Alert.prompt(tr('Rename'), undefined, (n) => n?.trim() && patchSubject(x.id, { name: n.trim() }), 'plain-text', x.name)}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{x.name}</Text>
              <Text style={ss.meta}>
                {tr('{0} notes · {1} flashcards', { 0: d.notes.filter((n) => n.subject === x.id).length, 1: d.cards.filter((k) => k.subject === x.id).length })}
              </Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => remove(x.id, x.name)} accessibilityLabel={tr('Delete')}>
              <Ionicons name="trash-outline" size={18} color={c.dim} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {SUBJECT_COLORS.map((col) => (
              <Pressable key={col} onPress={() => patchSubject(x.id, { color: col })} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: col, borderWidth: 2, borderColor: x.color === col ? c.text : 'transparent' }} />
            ))}
          </View>
        </View>
      ))}
      <Btn label={tr('New subject')} primary onPress={() => promptSubject()} />
      <Text style={ss.h2}>{tr('Flashcard review')}</Text>
      <View style={ss.row}>
        <Chip label={tr('Spaced')} on={d.review === 'spaced'} onPress={() => updateStudy((x) => (x.review = 'spaced'))} />
        <Chip label={tr('Simple')} on={d.review === 'simple'} onPress={() => updateStudy((x) => (x.review = 'simple'))} />
      </View>
      <Text style={ss.meta}>
        {d.review === 'spaced'
          ? tr('Cards you get right come back later and later (1, 3, 7… days); cards you miss come back today.')
          : tr('Every card of the subject, shuffled, each time you review. Missed cards come back at the end.')}
      </Text>
    </Page>
  );
}
