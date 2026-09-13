"use client";

/**
 * The projects page's map: the same `SaudiReach` the home page renders,
 * given the whole page instead of a section.
 *
 * `SaudiReach` is imported and used unchanged. Its props were already the
 * right shape — pins in, selection and hover out — so the difference between
 * the two pages is entirely in what wraps it: the home page drives selection
 * from a scroll track, this drives it from clicks, a list, and the keyboard.
 *
 * Seven of the thirty-two projects carry no city in the content. They are not
 * given invented coordinates: they stay in the list, marked as unplaced, and
 * selecting one dims the map rather than pointing at somewhere they are not.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { SaudiReach, type ReachPin } from "./SaudiReach";
import { CITY_REGION, SAUDI_CITY_PINS, SAUDI_REGIONS } from "@/lib/saudiMap";
import {
  ProjectCard,
  ProjectFilters,
  ProjectList,
  type PanelCopy,
} from "./ProjectsMapPanel";
import { ProjectsMap3D, type Map3DCopy, type MapTour } from "./ProjectsMap3D";
import type { SceneLocation } from "@/lib/saudiMap3d";

interface ProjectItem {
  city: string;
  category: string;
  /** "ongoing" or "delivered", as the profile's two project tables have it. */
  status?: string;
  title: string;
  location: string;
  /** The profile's own brief description of the work. */
  scope?: string;
  year?: string;
  /** Purchase order and contract type, as the profile records them. */
  po?: string;
  contract?: string;
  manpower?: number;
  equipment?: number;
  image?: string;
}

export interface MapProject extends ProjectItem {
  /** Stable across filtering, unlike an array index. */
  key: string;
  /**
   * Where this project sits in `projectsPage.items`, which is the address the
   * media library binds its photographs to. Carried here because filtering
   * and sorting mean the panel cannot recover it, and because the alternative
   * — parsing it back out of `key` — would couple two unrelated formats.
   */
  index: number;
  categoryLabel: string;
  /** "Ongoing" or "Delivered", in the reader's language. */
  statusLabel?: string;
  /** Absent for the projects the content gives no city for. */
  pos?: { x: number; y: number };
  regionId?: string;
}

/**
 * Copy this section needs that the content does not carry.
 *
 * Not added to `src/messages/*.json`: that file is the CMS's content, pinned
 * at 962 key paths by tests on both sides, and four labels for one component
 * are not worth moving that baseline. They join the rest when the content
 * work reaches this page.
 */
const COPY: Record<
  "en" | "ar",
  PanelCopy & {
    heading: string;
    filterLabel: string;
    close: string;
    back: string;
    map: Map3DCopy;
    /**
     * Province names for the map's context line. English uses the names the
     * map data already carries; Arabic needs its own, which are the
     * provinces' official names.
     */
    regionNames?: Record<string, string>;
  }
> = {
  en: {
    heading: "Explore by location",
    filterLabel: "Filter projects by sector",
    choose: "Pick a project",
    chooseHint: "Choose a marker on the map, or a project from the list.",
    unplaced: "Not on the map",
    counted: (shown, total) => `${shown} of ${total}`,
    onMap: (count) => `${count} on the map`,
    close: "Close",
    back: "Back to all projects",
    map: {
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      reset: "Show the whole Kingdom",
      hint: "Drag to explore · pinch or Ctrl + scroll to zoom · click a location",
      hintTouch: "Swipe to explore · pinch to zoom · tap a location",
      description:
        "A three-dimensional map of Saudi Arabia with Wjeen's project locations. Every project is also listed beside it.",
      projectsHere: (count) => `${count} projects here`,
      country: "Saudi Arabia",
      controls: "Map controls",
      explore: "Explore projects",
      stopExplore: "Stop",
      tourProgress: (step, total) => `${step} / ${total}`,
    },
  },
  ar: {
    heading: "استكشف حسب الموقع",
    filterLabel: "تصفية المشاريع حسب القطاع",
    choose: "اختر مشروعًا",
    chooseHint: "اختر علامة على الخريطة، أو مشروعًا من القائمة.",
    unplaced: "غير محدَّد على الخريطة",
    counted: (shown, total) => `${shown} من ${total}`,
    onMap: (count) => `${count} على الخريطة`,
    close: "إغلاق",
    back: "كل المشاريع",
    map: {
      zoomIn: "تكبير",
      zoomOut: "تصغير",
      reset: "عرض المملكة كاملة",
      hint: "اسحب للاستكشاف · قرّب بإصبعين أو Ctrl مع التمرير · اضغط على موقع",
      hintTouch: "اسحب للاستكشاف · قرّب بإصبعين · المس موقعًا",
      description:
        "خريطة ثلاثية الأبعاد للمملكة العربية السعودية تُظهر مواقع مشاريع وجين. كل المشاريع مدرجة أيضًا في القائمة المجاورة.",
      // Arabic counts agree with their noun: a dual at two, a plural to ten,
      // a singular accusative beyond.
      projectsHere: (count) =>
        count === 2
          ? "مشروعان هنا"
          : count <= 10
            ? `${count} مشاريع هنا`
            : `${count} مشروعًا هنا`,
      country: "المملكة العربية السعودية",
      controls: "أدوات الخريطة",
      explore: "استكشف المشاريع",
      stopExplore: "إيقاف",
      // In words, not a slash: "3 / 25" in a right-to-left line is laid out
      // as "25 / 3".
      tourProgress: (step, total) => `${step} من ${total}`,
    },
    regionNames: {
      ryiadh: "منطقة الرياض",
      mecca: "منطقة مكة المكرمة",
      medina: "منطقة المدينة المنورة",
      "eastern-province": "المنطقة الشرقية",
      "al-qassim": "منطقة القصيم",
      hail: "منطقة حائل",
      tabuk: "منطقة تبوك",
      "northern-borders": "منطقة الحدود الشمالية",
      jizan: "منطقة جازان",
      najran: "منطقة نجران",
      "al-bahah": "منطقة الباحة",
      "al-jawf": "منطقة الجوف",
      asir: "منطقة عسير",
    },
  },
};

const REGION_NAMES_EN = Object.fromEntries(SAUDI_REGIONS.map((r) => [r.id, r.name]));

/** How long the tour stays on a stop, in milliseconds. */
const TOUR_DWELL = {
  /** A new place: the flight, the trail, and time to read the card. */
  arrive: 4200,
  /** Another project at the same place: no flight, only the card changes. */
  stay: 2600,
};

/** The tour runs where the panel shows each stop beside the map. */
const WIDE = "(min-width: 1280px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function ProjectsMap() {
  const t = useTranslations("projectsPage");
  const locale = useLocale();
  const copy = COPY[locale === "ar" ? "ar" : "en"];
  const reduce = useReducedMotion();

  const items = t.raw("items") as ProjectItem[];
  const filters = t.raw("filters") as Record<string, string>;
  const statusLabels = t.raw("statusLabels") as Record<string, string>;

  /** Every project, with a map position where the content records one. */
  const projects = useMemo<MapProject[]>(
    () =>
      items.map((item, index) => ({
        ...item,
        key: `${item.city || "unplaced"}-${index}`,
        index,
        categoryLabel: filters[item.category] ?? item.category,
        statusLabel: item.status ? statusLabels[item.status] : undefined,
        pos: SAUDI_CITY_PINS[item.city],
        regionId: CITY_REGION[item.city],
      })),
    [items, filters, statusLabels],
  );

  const categories = useMemo(
    () => Object.entries(filters).map(([key, label]) => ({ key, label })),
    [filters],
  );

  /** 3D until proven otherwise; the scene reports back if it cannot run. */
  const [use3D, setUse3D] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The presentation tour's current stop, or null when it is not running. */
  const [tourStep, setTourStep] = useState<number | null>(null);
  const stopTour = useCallback(() => setTourStep(null), []);
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );

  const visible = useMemo(
    () => (category === "all" ? projects : projects.filter((p) => p.category === category)),
    [projects, category],
  );

  /** Only the placed ones reach the map; the rest have nowhere to go. */
  const placed = useMemo(() => visible.filter((p) => p.pos), [visible]);

  const pins = useMemo<ReachPin[]>(
    () =>
      placed.map((p) => ({
        city: p.city,
        title: p.title,
        location: p.location,
        pos: p.pos!,
        regionId: p.regionId ?? "",
      })),
    [placed],
  );

  const selected = useMemo(
    () => visible.find((p) => p.key === selectedKey) ?? null,
    [visible, selectedKey],
  );

  /** The map addresses pins by index, so selection is translated at the edge. */
  const activeIdx = useMemo(
    () => (selected ? placed.findIndex((p) => p.key === selected.key) : -1),
    [placed, selected],
  );

  /**
   * One scene location per city. Thirteen projects share four cities, and
   * each city is one place on the ground — so it is one marker, and repeated
   * clicks step through what is there.
   */
  const projectsAt = useMemo(() => {
    const map = new Map<string, MapProject[]>();
    for (const project of placed) {
      map.set(project.city, [...(map.get(project.city) ?? []), project]);
    }
    return map;
  }, [placed]);

  const locations = useMemo<SceneLocation[]>(
    () =>
      [...projectsAt.entries()].map(([city, list]) => ({
        id: city,
        x: list[0].pos!.x,
        y: list[0].pos!.y,
        regionId: list[0].regionId ?? "",
        count: list.length,
      })),
    [projectsAt],
  );

  const select = useCallback((project: MapProject | null) => {
    setSelectedKey(project?.key ?? null);
    setSheetOpen(Boolean(project));
  }, []);

  /** A click on a city: its first project, or the next one if already there. */
  const pickLocation = useCallback(
    (city: string) => {
      setTourStep(null);
      const stack = projectsAt.get(city) ?? [];
      if (!stack.length) return;
      const current = stack.findIndex((p) => p.key === selectedKey);
      select(stack[current === -1 ? 0 : (current + 1) % stack.length]);
    },
    [projectsAt, selectedKey, select],
  );

  const hoverLabel = useCallback(
    (city: string) => {
      const stack = projectsAt.get(city) ?? [];
      const place = stack[0]?.location.split(" — ")[0] ?? city;
      return stack.length > 1 ? `${place} · ${copy.map.projectsHere(stack.length)}` : place;
    },
    [projectsAt, copy],
  );

  const onHoverLocation = useCallback(
    (city: string | null) => {
      setHoverRegion(city ? projectsAt.get(city)?.[0]?.regionId ?? null : null);
    },
    [projectsAt],
  );

  const selectPin = useCallback(
    (index: number) => select(placed[index] ?? null),
    [placed, select],
  );

  /**
   * Hovering a row lights its region on the map, and hovering a marker lights
   * it too — one highlight, driven from either side, so the two halves read as
   * one thing rather than two lists that happen to agree.
   */
  const hoverProject = useCallback((project: MapProject | null) => {
    setHoverRegion(project?.regionId ?? null);
  }, []);

  const changeCategory = useCallback(
    (next: string) => {
      setTourStep(null);
      setCategory(next);
      // The selection may not survive the filter; dropping it is better than
      // leaving a card for something no longer in the list.
      setSelectedKey(null);
      setSheetOpen(false);
    },
    [],
  );

  /**
   * The spotlight: everything but the chosen project dims, and the clear
   * circle glides from one project to the next.
   *
   * Positioned from the rendered marker itself rather than from its map
   * coordinates. `SaudiReach` tilts the whole map in 3D, so a pin's place on
   * screen is not a linear function of its x and y — measuring the element is
   * the only way to land on it exactly, and it keeps `SaudiReach` untouched.
   *
   * Written straight to the DOM through refs: this is layout, not state, and
   * routing it through React would re-render the map on every resize.
   */
  const frameRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const spot = spotRef.current;
    if (!frame || !spot) return;

    if (activeIdx < 0) {
      spot.style.opacity = "0";
      return;
    }

    const place = () => {
      const marker = frame.querySelector<SVGGElement>('g[aria-current="true"]');
      if (!marker) return;
      const f = frame.getBoundingClientRect();
      const m = marker.getBoundingClientRect();
      const x = m.left + m.width / 2 - f.left;
      const y = m.top + m.height / 2 - f.top;
      spot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      spot.style.opacity = "1";
    };

    // After the marker has taken its selected state, which lands a frame on.
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, [activeIdx, placed]);

  /**
   * Pointer picking by geometry, not by the browser's hit-test.
   *
   * Under `SaudiReach`'s 3D tilt the browser's hit-test and its painting
   * disagree: the upper part of the map is drawn where the eye sees it but is
   * not hit where the eye sees it. Measured on the home page, only 5 of 25
   * markers answer a mouse click. Rather than fight that from outside a file
   * this change may not touch, the frame takes every pointer event itself and
   * asks which painted marker is nearest.
   *
   * It also answers a question the hit-test never could. Thirteen projects
   * share four locations — five at Ras Tanura alone — so their markers sit
   * exactly on top of one another and only the top one could ever be clicked.
   * A second click on the same spot now steps to the next project there.
   *
   * The keyboard is untouched: focus and Enter never depended on hit-testing,
   * and every marker is still reached with Tab.
   */
  const PICK_RADIUS = 26;
  const lastHover = useRef<number>(-1);

  const markerCentres = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return [];
    return [...frame.querySelectorAll<SVGGElement>('svg g[role="button"]')].map((g) => {
      const r = g.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }, []);

  /** Every marker within reach of a point, nearest first. */
  const markersNear = useCallback(
    (x: number, y: number) =>
      markerCentres()
        .map((c, index) => ({ index, d: Math.hypot(c.x - x, c.y - y), c }))
        .filter((m) => m.d <= PICK_RADIUS)
        .sort((a, b) => a.d - b.d),
    [markerCentres],
  );

  const pickAt = useCallback(
    (x: number, y: number) => {
      const near = markersNear(x, y);
      if (!near.length) return;

      // Everything drawn at the same spot as the nearest marker.
      const spot = near[0].c;
      const stack = near
        .filter((m) => Math.hypot(m.c.x - spot.x, m.c.y - spot.y) < 3)
        .map((m) => m.index)
        .sort((a, b) => a - b);

      const current = stack.indexOf(activeIdx);
      const next = current === -1 ? stack[0] : stack[(current + 1) % stack.length];
      selectPin(next);
    },
    [markersNear, activeIdx, selectPin],
  );

  const hoverAt = useCallback(
    (x: number, y: number) => {
      const frame = frameRef.current;
      const near = markersNear(x, y);
      const index = near.length ? near[0].index : -1;
      if (frame) frame.style.cursor = index === -1 ? "" : "pointer";
      // Only when it changes: a pointermove fires far too often to re-render on.
      if (index === lastHover.current) return;
      lastHover.current = index;
      setHoverRegion(index === -1 ? null : placed[index]?.regionId ?? null);
    },
    [markersNear, placed],
  );

  /** A choice from the list is the visitor's, and ends any tour. */
  const chooseFromList = useCallback(
    (project: MapProject) => {
      setTourStep(null);
      select(project);
    },
    [select],
  );

  /**
   * The tour's stops: every placed project, a place at a time. Places are
   * visited in one sweep across the Kingdom — each next place the nearest
   * one not yet seen, starting from the far west — so the camera travels
   * like a guide would rather than zig-zagging between coasts. Projects
   * sharing a place follow one another without the camera moving.
   */
  const tourStops = useMemo(() => {
    const cities = [...projectsAt.keys()];
    if (!cities.length) return [];
    const at = (city: string) => projectsAt.get(city)![0].pos!;
    const remaining = new Set(cities);
    let current = cities.reduce((a, b) => (at(a).x <= at(b).x ? a : b));
    const order: string[] = [];
    while (remaining.size) {
      order.push(current);
      remaining.delete(current);
      let best = "";
      let bestDistance = Infinity;
      for (const city of remaining) {
        const d = Math.hypot(at(city).x - at(current).x, at(city).y - at(current).y);
        if (d < bestDistance) {
          bestDistance = d;
          best = city;
        }
      }
      current = best;
    }
    return order.flatMap((city) =>
      projectsAt.get(city)!.map((project, index) => ({
        project,
        dwell: index === 0 ? TOUR_DWELL.arrive : TOUR_DWELL.stay,
      })),
    );
  }, [projectsAt]);

  const goToStop = useCallback(
    (step: number) => {
      const stop = tourStops[step];
      if (!stop) return;
      setTourStep(step);
      // The key only: the tour runs beside the panel, never behind a sheet.
      setSelectedKey(stop.project.key);
    },
    [tourStops],
  );

  // Each stop holds for its dwell, then the next. At the end the map goes
  // back to the whole Kingdom, the way a presentation returns to its title.
  useEffect(() => {
    if (tourStep === null || !wide) return;
    const stop = tourStops[tourStep];
    if (!stop) return;
    const timer = window.setTimeout(() => {
      if (tourStep + 1 < tourStops.length) {
        goToStop(tourStep + 1);
      } else {
        setTourStep(null);
        setSelectedKey(null);
      }
    }, stop.dwell);
    return () => window.clearTimeout(timer);
  }, [tourStep, tourStops, goToStop, wide]);

  // A tour is only offered where it can be followed. Leaving that width, or
  // pressing Escape, ends it.
  const touring = tourStep !== null && wide;
  useEffect(() => {
    if (!touring) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTourStep(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [touring]);

  const tour: MapTour = {
    available: wide && tourStops.length > 1,
    running: touring,
    step: tourStep ?? 0,
    total: tourStops.length,
    dwell: tourStops[tourStep ?? 0]?.dwell ?? TOUR_DWELL.arrive,
    onStart: () => goToStop(0),
    onStop: stopTour,
  };

  const regionName = useCallback(
    (regionId: string) => copy.regionNames?.[regionId] ?? REGION_NAMES_EN[regionId] ?? regionId,
    [copy],
  );

  // Escape closes the sheet on a phone; the selection itself survives it.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const highlighted = selected?.regionId ?? hoverRegion ?? null;
  const labels = { manpower: t("manpowerLabel"), equipment: t("equipmentLabel") };

  const sheet = (
    <>
      {/* ── mobile sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && sheetOpen ? (
          <motion.div
            role="dialog"
            aria-label={selected.title}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-frame border-t border-black/10 bg-white p-5 shadow-[var(--shadow-float)] xl:hidden"
          >
            {/* Above the card, on a pill of its own: on a phone it sits over
                the corner of the project's picture. */}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="absolute end-7 top-7 z-10 rounded-ui bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-muted shadow-[var(--shadow-card-flat)] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:end-4 sm:top-4"
            >
              {copy.close}
            </button>
            <ProjectCard project={selected} labels={labels} contentClassName="sm:pe-16" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );

  const cardBody = selected ? (
    <ProjectCard key={selected.key} project={selected} labels={labels} />
  ) : (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <p className="t-h5 text-heading">{copy.choose}</p>
      <p className="mt-1 text-xs text-gray-muted">{copy.chooseHint}</p>
    </motion.div>
  );

  const filtersEl = (
    <ProjectFilters
      categories={categories}
      active={category}
      onChange={changeCategory}
      label={copy.filterLabel}
      tone="light"
    />
  );

  const listEl = (
    <ProjectList
      projects={visible}
      selectedKey={selectedKey}
      onSelect={chooseFromList}
      onHover={hoverProject}
      copy={copy}
    />
  );

  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="t-eyebrow text-primary">{t("tag")}</p>
        <h2 className="mt-2 t-h2 text-heading">{copy.heading}</h2>
      </div>
      <p className="text-xs font-semibold text-gray-muted">
        {copy.counted(visible.length, projects.length)} · {copy.onMap(placed.length)}
      </p>
    </div>
  );

  /**
   * The immersive layout. The stage runs edge to edge with no frame, so the
   * Kingdom is the page rather than a picture on it; on wide screens the
   * panel floats over the map instead of beside it, and the camera frames the
   * map around the panel.
   *
   * The section sits on the site's own light ground (`off-white`, as the
   * other light sections do), and the navy Kingdom stands on it like a model
   * on a table.
   */
  if (use3D) {
    return (
      <section className="relative overflow-hidden bg-off-white">
        <div className="container-page relative pt-14 lg:pt-20">{heading}</div>

        {/* Under `xl` the stage is sized from its width: the Kingdom is about
            twice as wide as it is deep at this tilt, so a height taken from
            the viewport left a portrait screen mostly empty sky. */}
        <div className="relative mt-6 h-[clamp(20rem,72vw,66vh)] xl:h-[80vh] xl:max-h-[900px] xl:min-h-[640px]">
          <ProjectsMap3D
            locations={locations}
            selectedLocationId={selected?.pos ? selected.city : null}
            selectedTitle={selected?.pos ? selected.title : null}
            highlightedRegion={hoverRegion}
            hoverLabel={hoverLabel}
            onPick={pickLocation}
            onHover={onHoverLocation}
            onUnavailable={() => setUse3D(false)}
            onInteract={stopTour}
            onSleep={stopTour}
            copy={copy.map}
            context={{
              regionName,
              selectedRegion: selected?.pos ? (selected.regionId ?? null) : null,
              city: selected?.pos ? selected.location.split(" — ")[0] : null,
            }}
            tour={tour}
            insetRef={panelRef}
            rtl={locale === "ar"}
          />

          <div
            ref={panelRef}
            data-map-panel
            className="pointer-events-none absolute inset-y-6 end-6 hidden w-[23rem] flex-col gap-3 xl:flex"
          >
            <div className="pointer-events-auto">{filtersEl}</div>
            <div className="pointer-events-auto rounded-ui bg-white/95 p-5 shadow-[var(--shadow-lift)] backdrop-blur">
              <AnimatePresence mode="wait">{cardBody}</AnimatePresence>
            </div>
            <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-ui bg-white/95 shadow-[var(--shadow-lift)] backdrop-blur">
              {listEl}
            </div>
          </div>
        </div>

        <div className="container-page relative flex flex-col gap-4 pb-14 pt-6 xl:hidden">
          {filtersEl}
          <div className="max-h-[46vh] overflow-y-auto overscroll-contain rounded-ui border border-black/5 bg-white shadow-[var(--shadow-card-flat)]">
            {listEl}
          </div>
        </div>
        <div aria-hidden="true" className="hidden h-14 xl:block" />

        {sheet}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-primary">
      {/* The map's own ground: brand navy, the same surface the home page
          renders it on, so the two read as the same object. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="container-page relative py-14 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-eyebrow text-primary-on-dark">{t("tag")}</p>
            <h2 className="mt-2 t-h2 text-white">{copy.heading}</h2>
          </div>
          <p className="text-xs font-semibold text-white/60">
            {copy.counted(visible.length, projects.length)} · {copy.onMap(placed.length)}
          </p>
        </div>

        {/* Two columns from `xl`, not `lg`. At 1024 a 24rem panel left the map
            536px wide and the panel outgrew it, which stretched the frame into
            empty space below the drawing. Under 1280 the map takes the full
            width and the list sits beneath it. */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
          {/* ── the map ───────────────────────────────────────────── */}
          {/* The frame takes pointer input itself and picks by geometry — see
              `pickAt`. The map's SVG is made inert to the pointer so its
              markers' own handlers never fire alongside and double-step a
              stack; they still take focus and Enter for the keyboard. */}
          <div
            ref={frameRef}
            onClick={(event) => pickAt(event.clientX, event.clientY)}
            onPointerMove={(event) => hoverAt(event.clientX, event.clientY)}
            onPointerLeave={() => {
              lastHover.current = -1;
              setHoverRegion(null);
            }}
            className="relative overflow-hidden rounded-frame border border-white/10 bg-white/[0.03] px-2 py-4 [&_svg]:pointer-events-none"
          >
            {/* `SaudiReach` lays out at the map's flat, untilted height and then
                tilts it back, so it paints far less than it occupies — measured,
                about 15% of its width sits empty above the drawing and 13%
                below, at every breakpoint. Percentage margins resolve against
                width, so these two numbers remove that dead space exactly as
                the map scales, and the frame ends up hugging what is drawn. */}
            <div className="-mb-[11%] -mt-[13%]">
              <SaudiReach
                pins={pins}
                activeIdx={activeIdx}
                highlightedRegion={highlighted}
                onSelect={selectPin}
                onHoverRegion={setHoverRegion}
              />
            </div>

            {/* The spotlight. A clear circle whose enormous shadow is the dimmed
                surround — one element, one `transform`, so gliding between
                projects is a compositor-only move. `pointer-events: none`
                keeps every other marker clickable through it. */}
            <div
              ref={spotRef}
              aria-hidden="true"
              // Styled inline on purpose: globals.css is outside this change's
              // scope, and nothing else on the site needs these values.
              className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full opacity-0 ring-1 ring-white/25 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:h-32 sm:w-32 lg:h-40 lg:w-40"
              style={{
                // The blur softens the circle's inner edge, so it reads as
                // light falling off rather than a hole cut in the map. Deep
                // navy on navy is subtle, so it needs real weight to register
                // as the rest of the map receding.
                boxShadow:
                  "0 0 48px 200vmax color-mix(in srgb, var(--color-primary-deep) 70%, transparent)",
              }}
            />

            {/* A quiet prompt until something is chosen, so the map is not a
                picture with no visible way in. */}
            <AnimatePresence>
              {!selected ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3 }}
                  className="pointer-events-none absolute bottom-4 start-4 max-w-[16rem] text-xs leading-relaxed text-white/55"
                >
                  {copy.chooseHint}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ── filters, list, card ───────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <ProjectFilters
              categories={categories}
              active={category}
              onChange={changeCategory}
              label={copy.filterLabel}
            />

            {/* Beside the map only when there is room beside the map; below
                that the card is a sheet instead. */}
            <div className="hidden rounded-ui border border-white/10 bg-white p-5 xl:block">
              <AnimatePresence mode="wait">
                {selected ? (
                  <ProjectCard key={selected.key} project={selected} labels={labels} />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    <p className="t-h5 text-heading">{copy.choose}</p>
                    <p className="mt-1 text-xs text-gray-muted">{copy.chooseHint}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="max-h-[46vh] overflow-y-auto overscroll-contain rounded-ui border border-white/10 bg-white xl:max-h-[40vh]">
              <ProjectList
                projects={visible}
                selectedKey={selectedKey}
                onSelect={select}
                onHover={hoverProject}
                copy={copy}
              />
            </div>
          </div>
        </div>
      </div>

      {sheet}
    </section>
  );
}
