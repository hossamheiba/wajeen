/**
 * What the leadership designs share: the letter shown for a person with no
 * portrait yet, and the surface it is shown on.
 */

/**
 * Honorifics that open a name without being part of it. The letter shown for a
 * person is the first of their *name*: "Eng. Ismail" is an I, and
 * "المهندس إسماعيل" an إ — not the E and the ا of the title, which is what
 * taking the first character of the string gave.
 */
const TITLE =
  /^(?:eng|mr|mrs|ms|miss|dr|prof|sheikh|sh)\.?\s+|^(?:المهندس|المهندسة|الأستاذ|الأستاذة|الاستاذ|الاستاذة|الدكتور|الدكتورة|الشيخ|السيد|السيدة)\s+/i;

export function initial(name: string) {
  let rest = name.trim();
  // A name can carry more than one ("Dr. Eng. …"), so peel until none is left,
  // bounded so a pathological string can never loop.
  for (let guard = 0; guard < 4 && TITLE.test(rest); guard += 1) {
    rest = rest.replace(TITLE, "");
  }
  return rest[0] ?? "";
}

/**
 * A faint zigzag, for a frame with nothing in it yet.
 *
 * Rows of triangles, the pattern Najdi walls are painted with, so an empty
 * surface reads as a deliberate one and not as a missing image. Drawn with
 * `color-mix` on the brand variable, the way the rest of the site tints it.
 */
const TINT = "color-mix(in srgb, var(--color-primary) 8%, transparent)";
export const LATTICE = {
  backgroundImage: [
    `linear-gradient(135deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(225deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(315deg, ${TINT} 25%, transparent 25%)`,
    `linear-gradient(45deg, ${TINT} 25%, transparent 25%)`,
  ].join(", "),
  backgroundSize: "18px 18px",
  backgroundPosition: "9px 0, 9px 0, 0 0, 0 0",
} as const;
