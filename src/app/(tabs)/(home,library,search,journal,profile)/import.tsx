import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Draft, DrmError, readEpub, readPdf, saveAudioBook, saveTextBook } from '../../../ownBooks';
import { bookLangChoices } from '../../../languages';
import { keepSource } from '../../../reader';
import { importBook } from '../../../storage';
import { syncAudioBooks } from '../../../tracker';
import { t as tr } from '../../../i18n';
import { Chip } from '../../../components/ui';
import { c } from '../../../theme';
import { Btn, Page, ss } from '../../../components/settings-ui';

type Audio = { uri: string; name: string };

type Scan = (page: number, of: number) => boolean;

async function readBookFile(uri: string, name: string, onScan?: Scan) {
  if (/\.pdf$/i.test(name)) {
    const r = await readPdf(uri, onScan);
    return { ...r, title: name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), uri, name };
  }
  if (!/\.epub$/i.test(name)) throw new Error(tr('Choose an EPUB or PDF file.'));
  return { ...readEpub(await new File(uri).bytes()), uri, name };
}

async function pickEpub(onScan?: Scan) {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/epub+zip', 'application/pdf', '*/*'], copyToCacheDirectory: true });
  if (res.canceled) return null;
  return readBookFile(res.assets[0].uri, res.assets[0].name, onScan);
}

const AUDIO = /\.(mp3|m4a|m4b|aac|wav)$/i;

const drmMessage = () =>
  tr(
    'This book is locked with DRM (copy protection), like books bought in Kindle, Apple Books or Kobo stores. Familiar can’t open locked books. DRM-free books, for example from Project Gutenberg or Standard Ebooks, work.',
  );

export default function ImportScreen() {
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState('en');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [audio, setAudio] = useState<Audio[] | null>(null);
  const [epub, setEpub] = useState<Audio | null>(null);
  const stop = useRef(false);
  const [scanning, setScanning] = useState(false);
  const onScan: Scan = (page, of) => {
    if (stop.current) return false;
    setScanning(true);
    setBusy(tr('This PDF is a scan. Recognising text: page {0} of {1}…', { 0: page, 1: of }));
    return true;
  };

  const fail = (e: unknown) => Alert.alert(e instanceof DrmError ? tr('This book is locked') : tr('Import failed'), e instanceof DrmError ? drmMessage() : tr(String((e as Error).message ?? e)));

  const { file } = useLocalSearchParams<{ file?: string }>();

  const startEpub = async (pick = () => pickEpub(onScan)) => {
    try {
      stop.current = false;
      setBusy(tr('Reading the book…'));
      const r = await pick();
      if (!r) return;
      if (!r.drafts.length) throw new Error(tr('No text found in this book.'));
      setTitle(r.title);
      setDrafts(r.drafts);
      setEpub({ uri: r.uri, name: r.name });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      setScanning(false);
    }
  };

  useEffect(() => {
    if (!file) return;
    const name = decodeURIComponent(file.split('/').pop() ?? 'file');
    const t = setTimeout(() => (AUDIO.test(name) ? (setAudio([{ uri: file, name }]), setTitle(name.replace(/\.[^.]+$/, ''))) : startEpub(() => readBookFile(file, name, onScan))), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const startAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const files = res.assets.filter((a) => AUDIO.test(a.name)).map((a) => ({ uri: a.uri, name: a.name }));
    if (!files.length) return Alert.alert(tr('Import failed'), tr('Choose MP3, M4A or M4B files.'));
    setAudio(files);
    if (!title) setTitle(files[0].name.replace(/\.[^.]+$/, '').replace(/^[\d\s._-]+/, '') || tr('Audiobook'));
  };

  const addText = async () => {
    try {
      stop.current = false;
      const r = await pickEpub(onScan);
      if (r) {
        setDrafts(r.drafts);
        setEpub({ uri: r.uri, name: r.name });
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      setScanning(false);
    }
  };

  const create = async () => {
    try {
      let folder: string;
      if (audio) {
        const r = await saveAudioBook(title.trim() || tr('Audiobook'), audio, drafts ?? [], (i) => setBusy(tr('Adding file {0} of {1}…', { 0: i + 1, 1: audio.length })));
        folder = r.folder;
        if (r.unmatched) Alert.alert(tr('Chapters and files don’t match'), tr('The text and the audio files differ by {0}. Text was paired with files in order.', { 0: r.unmatched }));
      } else folder = saveTextBook(title.trim() || tr('Untitled'), lang, drafts!);
      if (epub) keepSource(folder, epub.uri, epub.name);
      syncAudioBooks();
      router.replace({ pathname: '/book/[id]', params: { id: folder } });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      setScanning(false);
    }
  };

  const toggle = (i: number) => setDrafts((d) => d!.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)));
  const kept = drafts?.filter((d) => d.keep).length ?? 0;

  if (busy)
    return (
      <Page>
        <ActivityIndicator color={c.gold} />
        <Text style={[ss.p, { textAlign: 'center' }]}>{busy}</Text>
        {scanning && <Btn label={tr('Stop')} onPress={() => (stop.current = true)} />}
      </Page>
    );

  if (!drafts && !audio)
    return (
      <Page>
        <Text style={ss.p}>{tr('Bring a book you own. It stays on this iPhone and is read aloud by the voices you chose in Settings → Languages.')}</Text>
        <Pressable style={ss.card} onPress={() => startEpub()}>
          <Ionicons name="book-outline" size={22} color={c.gold} />
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{tr('A book to read aloud (EPUB or PDF)')}</Text>
          <Text style={ss.meta}>{tr('Split into chapters from its table of contents. Voiced on this iPhone while you listen.')}</Text>
        </Pressable>
        <Pressable style={ss.card} onPress={startAudio}>
          <Ionicons name="headset-outline" size={22} color={c.gold} />
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{tr('An audiobook (MP3, M4A, M4B)')}</Text>
          <Text style={ss.meta}>{tr('One file per chapter, or one M4B with chapters. You can add the book’s EPUB or PDF to follow the text chapter by chapter.')}</Text>
        </Pressable>
        <Btn
          label={tr('Import a Familiar export (book.json + audio)')}
          onPress={() =>
            importBook()
              .then((m) => m && (syncAudioBooks(), Alert.alert(tr('Import'), m)))
              .catch(fail)
          }
        />
        <Text style={ss.meta}>
          {tr('Only import files you have the right to use. Books locked with DRM (Kindle, Apple Books, Audible, library loans) can’t be opened.')}
        </Text>
      </Page>
    );

  return (
    <Page>
      <Text style={ss.h2}>{tr('Title')}</Text>
      <TextInput style={ss.input} value={title} onChangeText={setTitle} placeholderTextColor={c.dim} />
      {!audio && (
        <>
          <Text style={ss.h2}>{tr('Language')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {bookLangChoices().map((l) => (
              <Chip key={l.book} label={l.native} on={lang === l.book} onPress={() => setLang(l.book)} />
            ))}
          </View>
        </>
      )}
      {audio && (
        <View style={ss.card}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{tr('{0} audio files', { 0: audio.length })}</Text>
          <Text style={ss.meta}>{tr('Sorted by file name: one section per file.')}</Text>
          {!drafts && <Btn label={tr('Add the book’s text (EPUB or PDF, optional)')} onPress={addText} />}
        </View>
      )}
      {drafts && (
        <>
          <Text style={ss.h2}>{tr('Sections · {0} of {1}', { 0: kept, 1: drafts.length })}</Text>
          <Text style={ss.meta}>{tr('Tap to leave a section out (covers, contents, notes).')}</Text>
          <View style={ss.card}>
            {drafts.map((d, i) => (
              <Pressable key={i} onPress={() => toggle(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                <Ionicons name={d.keep ? 'checkbox' : 'square-outline'} size={20} color={d.keep ? c.gold : c.dim} />
                <Text style={{ color: d.keep ? c.text : c.dim, flex: 1 }} numberOfLines={1}>
                  {d.title}
                </Text>
                <Text style={ss.meta}>{tr('{0} words', { 0: d.words })}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Btn label={tr('Add to library')} primary onPress={create} />
      <Btn label={tr('Cancel')} onPress={() => (setDrafts(null), setAudio(null), setEpub(null), setTitle(''))} />
    </Page>
  );
}
