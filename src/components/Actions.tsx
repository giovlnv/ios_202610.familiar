import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { ExtensionStorage } from '@bacons/apple-targets';
import { usePlayback } from '../playback';
import { getBook } from '../storage';
import { read } from '../theme';
import { APP_GROUP, syncWidget } from '../widget';

const store = new ExtensionStorage(APP_GROUP);

/** Runs what Siri or a Shortcut asked for, and refreshes the widget when the app opens. */
export default function Actions() {
  const pb = usePlayback();
  const latest = useRef(pb);
  useEffect(() => {
    latest.current = pb;
  });

  useEffect(() => {
    const listen = (sleep?: number) => {
      const folder = read('last-book.txt');
      const item = folder ? getBook(folder) : null;
      if (!item) return router.push('/library');
      router.push({ pathname: '/player/[id]', params: { id: item.folder } });
      latest.current.open(item, undefined, true);
      if (sleep) setTimeout(() => latest.current.setSleep(sleep), 1500);
    };
    const run = () => {
      syncWidget().catch(() => {});
      const a = store.get('action');
      if (!a) return;
      store.remove('action');
      if (a === 'continue') listen();
      else if (a === 'log') router.push({ pathname: '/reading/[id]', params: { id: 'draft' } });
      else if (a.startsWith('sleep:')) listen(Number(a.slice(6)) || 30);
    };
    const t = setTimeout(run, 800);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    return () => (clearTimeout(t), sub.remove());
  }, []);
  return null;
}
