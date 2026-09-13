"use client";

/**
 * The reading half of the projects map: filters, the list, and the card for
 * whichever project is selected.
 *
 * Split out of `ProjectsMap` because the two halves answer different
 * questions — the map says *where*, this says *what* — and because the mobile
 * layout puts them in different places: the list under the map, the card in a
 * sheet over it.
 *
 * It renders projects that have no map position too. Seven of the thirty-two
 * carry no city in the content, and inventing coordinates for them would put a
 * claim on the map that nothing in the profile supports. They sit in the list,
 * marked as unplaced, and selecting one clears the map's highlight rather than
 * pointing somewhere arbitrary.
 */

import { useState } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Chip } from "@/components/ui/Chip";
import markWhite from "../../../public/brand/wjeen-mark-white.png";
import { useCover, useGallery, altFor } from "@/components/layout/MediaProvider";
import type { MapProject } from "./ProjectsMap";

const CONTROL =
  "rounded-ui px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary/40";

export interface PanelCopy {
  /** "Select a project" — the empty state above the card. */
  choose: string;
  chooseHint: string;
  /** Marks a project the map has no pin for. */
  unplaced: string;
  counted: (shown: number, total: number) => string;
  onMap: (count: number) => string;
}

export function ProjectFilters({
  categories,
  active,
  onChange,
  label,
  tone = "dark",
}: {
  categories: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  label: string;
  /** What the pills sit on: brand navy, or a light section. */
  tone?: "dark" | "light";
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {categories.map((category) => {
        const selected = active === category.key;
        return (
          <button
            key={category.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(category.key)}
            // These sit on brand navy, so the chosen one is the light one. The
            // first version filled the selected pill with navy — on a navy
            // section that made it vanish, and the unselected white pills read
            // as the selected ones instead.
            // On a light section it is the other way round: the chosen pill
            // is the navy one.
            className={`${CONTROL} ${
              tone === "light"
                ? selected
                  ? "bg-primary text-white"
                  : "border border-primary/15 text-primary/80 hover:border-primary/40 hover:text-primary"
                : selected
                  ? "bg-white text-primary"
                  : "border border-white/20 text-white/75 hover:border-white/45 hover:text-white"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProjectList({
  projects,
  selectedKey,
  onSelect,
  onHover,
  copy,
}: {
  projects: MapProject[];
  selectedKey: string | null;
  onSelect: (project: MapProject) => void;
  onHover: (project: MapProject | null) => void;
  copy: PanelCopy;
}) {
  return (
    <ul className="divide-y divide-black/[0.06]">
      {projects.map((project) => {
        const selected = project.key === selectedKey;
        return (
          <li key={project.key}>
            <button
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(project)}
              onPointerEnter={() => onHover(project)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(project)}
              onBlur={() => onHover(null)}
              className={`w-full px-4 py-3.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                selected ? "bg-primary/[0.06]" : "hover:bg-primary/[0.03]"
              }`}
            >
              <span className="flex items-start gap-2">
                {/* A dot, so the eye can pair a row with a marker without
                    reading either. */}
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                    project.pos
                      ? selected
                        ? "bg-primary"
                        : "bg-primary/35"
                      : "bg-black/15"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-bold leading-snug ${
                      selected ? "text-primary" : "text-heading"
                    }`}
                  >
                    {project.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-muted">
                    {project.location}
                    {project.pos ? null : (
                      // The place is on record; the map has no pin for it.
                      <span className="text-gray-muted/70"> · {copy.unplaced}</span>
                    )}
                  </span>
                </span>
                {project.year ? (
                  <span className="shrink-0 text-[11px] font-semibold text-gray-muted">
                    {project.year}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The selected project.
 *
 * Keyed on the project so framer remounts it: the card cross-fades to the next
 * one instead of its text swapping in place, which is what makes moving around
 * the map feel like moving rather than like a table updating.
 */
/**
 * The project's picture, or the panel that stands in for one.
 *
 * The picture is the project's own, and it is asked for in this order:
 *
 *   1. whatever the media library binds as the cover of this project, so an
 *      editor can replace it from the dashboard without anyone touching code;
 *   2. the photograph bundled under `/public/images/projects/`, named by the
 *      content — still correct, and still there if the CMS is unreachable,
 *      mid-migration, or simply has no binding for this project yet;
 *   3. a plain brand panel.
 *
 * Never another project's photograph, and never a stock one: either would put
 * a claim on the card that nothing supports. A file that fails to load steps
 * down the same ladder, so a card is never a broken image — which is also why
 * the state below counts failures per source rather than as one flag.
 *
 * A project's gallery, when the library holds one, leads with the image marked
 * primary; the cover binding is that mark, and the strip inside the frame walks
 * the rest in the order the CMS holds them. The frame's shape is fixed by the
 * layout, not by the picture, so every card is the same height whatever it
 * holds -- gallery or not -- and nothing moves as a picture arrives.
 */
export function ProjectMedia({ project }: { project: MapProject }) {
  // Alternative text is per-language in the library, so the picture needs to
  // know which one is being read. The panel's own copy is passed in as props;
  // this one value is not worth threading through three components.
  const locale = useLocale();
  const [managedFailed, setManagedFailed] = useState(false);
  const [bundledFailed, setBundledFailed] = useState(false);
  const [shown, setShown] = useState(0);

  const path = `items[${project.index}]`;
  const cover = useCover("projectsPage", path);
  const gallery = useGallery("projectsPage", path);

  // `pickGallery` already puts the cover first, so this list is the project's
  // photographs in the order the library holds them, primary leading.
  const photographs = gallery.length > 0 ? gallery : cover ? [cover] : [];
  const chosen = photographs[Math.min(shown, photographs.length - 1)] ?? null;
  const managed = managedFailed ? null : chosen;

  const bundled =
    project.image && !bundledFailed ? `/images/projects/${project.image}.jpg` : null;

  const source = managed ? managed.url : bundled;
  const alt = managed ? altFor(managed, locale) || project.title : project.title;
  // Reset the managed failure when the library hands over a different file:
  // a replacement from the dashboard deserves its own attempt.
  const onError = managed ? () => setManagedFailed(true) : () => setBundledFailed(true);

  return (
    <div
      data-project-media={source ? (managed ? "managed" : "photo") : "fallback"}
      data-gallery-size={photographs.length}
      className="group relative aspect-[16/9] overflow-hidden rounded-ui bg-primary sm:aspect-[4/3] xl:aspect-[16/9]"
    >
      {source ? (
        <Image
          key={source}
          src={source}
          alt={alt}
          fill
          // No custom `quality`: next/image only accepts values declared in
          // `images.qualities`, and an undeclared one is a 400 from the
          // optimiser -- which reads as a broken image and silently drops
          // every managed photograph to its bundled fallback.
          // What the frame is on screen: the full sheet on a phone, a column
          // of it on a tablet, the panel on a wide screen.
          sizes="(min-width: 1280px) 330px, (min-width: 640px) 38vw, calc(100vw - 40px)"
          onError={onError}
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        // Decorative: the card's text says what the project is.
        <div aria-hidden="true" className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <Image
            src={markWhite}
            alt=""
            className="absolute left-1/2 top-1/2 h-9 w-auto -translate-x-1/2 -translate-y-1/2 opacity-25"
          />
        </div>
      )}

      {/* The rest of the project's photographs, when the library holds more
          than one. Drawn inside the frame rather than under it, so a project
          with a gallery and one without are still the same card height.
          Buttons, not a swipe: the order comes from the CMS and every image
          has to be reachable from a keyboard. */}
      {managed && photographs.length > 1 ? (
        <div
          data-project-gallery=""
          className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/55 to-transparent p-2"
        >
          {photographs.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => {
                setShown(index);
                setManagedFailed(false);
              }}
              aria-current={index === Math.min(shown, photographs.length - 1)}
              aria-label={altFor(image, locale) || `${project.title} ${index + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                index === Math.min(shown, photographs.length - 1)
                  ? "bg-white"
                  : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectCard({
  project,
  labels,
  className = "",
  contentClassName = "",
}: {
  project: MapProject;
  labels: { manpower: string; equipment: string };
  className?: string;
  /** Classes for the text beside or below the picture. */
  contentClassName?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={project.key}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      // The picture above the text on a phone and in the wide-screen panel;
      // beside it in the tablet sheet, where a full-width picture would take
      // most of the screen.
      className={`grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start xl:grid-cols-1 ${className}`}
    >
      <ProjectMedia key={project.key} project={project} />
      <div className={contentClassName}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="solid" size="xs">
            {project.categoryLabel}
          </Chip>
          {project.statusLabel ? (
            <Chip tone="muted" size="xs">
              {project.statusLabel}
            </Chip>
          ) : null}
        </div>

        <h3 className="mt-3 t-h5 text-heading">{project.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-muted">{project.location}</p>
        {project.scope ? (
          <p className="mt-2 text-xs leading-relaxed text-body">{project.scope}</p>
        ) : null}

        {project.manpower || project.equipment ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-4">
            {project.manpower ? (
              <div>
                <dt className="text-[11px] text-gray-muted">{labels.manpower}</dt>
                <dd className="text-lg font-extrabold text-heading">{project.manpower}</dd>
              </div>
            ) : null}
            {project.equipment ? (
              <div>
                <dt className="text-[11px] text-gray-muted">{labels.equipment}</dt>
                <dd className="text-lg font-extrabold text-heading">{project.equipment}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </motion.div>
  );
}
