/** Leftovers of the GitHub library: the "book ready" background check and the GitHub key. Defined so a last firing is harmless, then removed. */
import * as BackgroundTask from 'expo-background-task';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';

const TASK = 'book-ready-check';

TaskManager.defineTask(TASK, async () => BackgroundTask.BackgroundTaskResult.Success);

export async function retireGithubLeftovers() {
  if (await TaskManager.isTaskRegisteredAsync(TASK).catch(() => false)) await BackgroundTask.unregisterTaskAsync(TASK).catch(() => {});
  await SecureStore.deleteItemAsync('github-token').catch(() => {});
}
