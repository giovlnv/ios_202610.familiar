import { isPublic } from '../../../variant';
import { t as tr } from '../../../i18n';
import { Alert, Pressable, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c } from '../../../theme';
import { router } from 'expo-router';
import SearchView from '../../../components/SearchView';
import { fetchGenres, setGenres } from '../../../genres';
import { getBook, OLResult, patchBook, syncAudioBooks } from '../../../tracker';

const apply = (id: string, r: OLResult) => {
  patchBook(id, { title: r.title, authors: r.authors, year: r.year, pages: r.pages, coverId: r.coverId, olKey: r.olKey });
  const b = getBook(id);
  if (b && !b.genres?.length) fetchGenres(b).then(({ top }) => top.length && setGenres(id, top, false)).catch(() => {});
  router.push({ pathname: '/title/[id]', params: { id } });
};

export default function Search() {
  return (
    <SearchView
      header={
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }} onPress={() => router.push('/booksearch')}>
          <Ionicons name="document-text-outline" size={18} color={c.gold} />
          <Text style={{ color: c.gold, fontSize: 15, fontWeight: '600', flex: 1 }}>{tr("Search in books and notes")}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      }
      onPick={(r) => {
        const books = syncAudioBooks().books;
        const match = books.find((b) => b.olKey === r.olKey);
        if (match) return router.push({ pathname: '/title/[id]', params: { id: match.id } });
        Alert.alert(r.title, tr("Use these details for one of your audiobooks, or upload this book to make it one."), [
          ...books.map((b) => ({ text: b.title, onPress: () => apply(b.id, r) })),
          isPublic
            ? { text: tr("Import a book or audiobook"), onPress: () => router.push('/import') }
            : { text: tr("Upload this book…"), onPress: () => router.push({ pathname: '/add', params: { title: r.title } }) },
          { text: tr("Cancel"), style: 'cancel' as const },
        ]);
      }}
    />
  );
}
