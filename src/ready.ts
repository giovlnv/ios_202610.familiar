import { t as tr } from './i18n';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { listJobs } from './jobs';
import { read, write } from './theme';

const TASK = 'book-ready-check';

export async function checkReadyBooks() {
  const told = new Set((read('ready-told.txt') ?? '').split(',').filter(Boolean));
  const ready = (await listJobs()).filter((j) => j.stage === 'ready' && !told.has(j.slug));
  for (const j of ready) {
    await Notifications.scheduleNotificationAsync({ content: { title: tr("Book ready"), body: `${j.title} is ready to download in Familiar.` }, trigger: null });
    told.add(j.slug);
  }
  write('ready-told.txt', [...told].join(','));
  return ready.length;
}

TaskManager.defineTask(TASK, async () => {
  try {
    await checkReadyBooks();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function watchForReadyBooks() {
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return;
  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 });
}
