export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.startsWith('file://')) return `/import?file=${encodeURIComponent(path)}`;
  return path;
}
