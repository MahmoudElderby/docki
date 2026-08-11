import { PINNED_FILES } from '../constants';

export interface SortableEntry {
  name: string;
  isFolder: boolean;
  isPinned?: boolean;
}

export function compareTreeEntries(a: SortableEntry, b: SortableEntry): number {
  if (a.isFolder !== b.isFolder) {
    return a.isFolder ? -1 : 1;
  }
  if (!a.isFolder && !b.isFolder) {
    const aPinned = isPinnedFile(a.name);
    const bPinned = isPinnedFile(b.name);
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }
    if (aPinned && bPinned) {
      return pinnedOrder(a.name) - pinnedOrder(b.name);
    }
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function isPinnedFile(name: string): boolean {
  return (PINNED_FILES as readonly string[]).includes(name);
}

function pinnedOrder(name: string): number {
  return PINNED_FILES.indexOf(name as (typeof PINNED_FILES)[number]);
}

export function sortNames(names: string[], isFolder: (n: string) => boolean): string[] {
  return [...names].sort((a, b) =>
    compareTreeEntries(
      { name: a, isFolder: isFolder(a) },
      { name: b, isFolder: isFolder(b) }
    )
  );
}
