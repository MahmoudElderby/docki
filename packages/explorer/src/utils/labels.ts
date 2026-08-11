export function prettifyLabel(name: string): string {
  const stem = name.replace(/\.md$/i, '');
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
