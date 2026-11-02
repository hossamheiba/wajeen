/**
 * Which leaders the masthead shows.
 *
 * The CMS never deletes a row — a list that shrinks is refused as key loss —
 * so the way to take someone off the page is to clear their name and role. A
 * row with no name is therefore "not there", and is skipped. The row keeps its
 * original position: a portrait is bound to `leadership.members[n]` by the
 * row's place in the list, so the person who is third in the list is still
 * looked up as `members[2]` however many rows before them are hidden.
 */

export interface LeaderRow {
  name: string;
  role: string;
}

export interface ShownLeader<T extends LeaderRow = LeaderRow> {
  member: T;
  /** Position in the stored list — what the portrait binding is keyed on. */
  index: number;
}

export function shownLeaders<T extends LeaderRow>(raw: unknown): ShownLeader<T>[] {
  if (!Array.isArray(raw)) return [];
  const shown: ShownLeader<T>[] = [];
  raw.forEach((entry, index) => {
    const member = entry as T | null;
    if (member && typeof member.name === "string" && member.name.trim() !== "") {
      shown.push({ member, index });
    }
  });
  return shown;
}
