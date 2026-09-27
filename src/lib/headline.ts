/**
 * One field per headline, two weights on screen.
 *
 * Several of the site's big headlines are set in two treatments — a bold
 * opening and an emphasised phrase. That used to be three content fields
 * (`title`, `highlight`, `titleEnd`), which read as three unrelated boxes in
 * the dashboard, in an order that was not the order they appear in, and which
 * could not be reordered or rewritten as one sentence.
 *
 * Now the editor writes the whole line and marks the emphasised phrase with
 * `*asterisks*`. The marker is optional: a line written without one renders
 * whole, in the plain treatment, which is why an older revision — or a hasty
 * edit — can never leave a headline blank.
 */

export interface HeadlineRun {
  text: string;
  /** Inside the asterisks: the section decides what that looks like. */
  marked: boolean;
}

export function headlineRuns(headline: unknown): HeadlineRun[] {
  const text = typeof headline === "string" ? headline : "";
  return text
    .split(/\*([^*]+)\*/g)
    .map((part, index) => ({ text: part, marked: index % 2 === 1 }))
    .filter((run) => run.text.length > 0);
}

/** The line with its markers stripped — for an alt text or a title attribute. */
export function headlinePlain(headline: unknown): string {
  return headlineRuns(headline)
    .map((run) => run.text)
    .join("");
}
