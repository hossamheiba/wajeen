/**
 * The Kingdom as a real 3D object, built from Wjeen's own map data.
 *
 * Every region is an extrusion of the same province paths `saudiMap.ts`
 * already ships — no model file, no external asset, no second copy of the
 * geography. City positions come from `SAUDI_CITY_PINS` in the same
 * coordinate space, so a marker lands where the flat map puts it.
 *
 * This module is the only place three.js is imported, and it is only ever
 * loaded through a dynamic `import()` from the projects page. Nothing else on
 * the site pays for it.
 *
 * Plain TypeScript, not React: the scene owns a render loop and raw pointer
 * input, and routing either through React state would re-render the page on
 * every frame.
 */

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { SAUDI_MAP_VIEWBOX, SAUDI_REGIONS } from "./saudiMap";

// ---------------------------------------------------------------- space

const [, , VIEW_W, VIEW_H] = SAUDI_MAP_VIEWBOX.split(" ").map(Number);
/** SVG units → world units. The map ends up roughly 14.6 × 12 across. */
const S = 0.02;
/** Slab thickness in SVG units — enough to read as a solid object. */
const DEPTH = 14;

/**
 * Rings smaller than this, in square SVG units, are islands. The smallest
 * province's mainland is over 1,100; the largest island, Farasan, about 42.
 */
const ISLAND_MAX_AREA = 200;

/** Map coordinates (x east, y south, both in SVG units) → world. */
function toWorld(x: number, y: number, height = 0) {
  return new THREE.Vector3((x - VIEW_W / 2) * S, height, (y - VIEW_H / 2) * S);
}

const MAP_HALF_X = (VIEW_W / 2) * S;
const MAP_HALF_Z = (VIEW_H / 2) * S;

// ---------------------------------------------------------------- palette

/**
 * The site's own colours, as three.js wants them. Brand navy is the ground,
 * the periwinkle `--color-primary-on-dark` is the light.
 */
const C = {
  top: new THREE.Color("#2a3399"),
  /** A region with visible projects in it: a shade prouder, no more. */
  topWork: new THREE.Color("#2e38a2"),
  topHover: new THREE.Color("#3843b5"),
  topActive: new THREE.Color("#4a55cc"),
  topDim: new THREE.Color("#1f2780"),
  side: new THREE.Color("#0d1256"),
  /** The walls a raised region shows, catching the light. */
  sideLit: new THREE.Color("#2b3391"),
  edge: new THREE.Color("#979ef7"),
  edgeActive: new THREE.Color("#c8ccff"),
  /** The soft shading just inside every border, which parts the provinces. */
  shade: new THREE.Color("#050830"),
  marker: new THREE.Color("#979ef7"),
  markerActive: new THREE.Color("#ffffff"),
  trail: new THREE.Color("#c9ccff"),
};

/**
 * How far a region rises, in world units, against a slab 0.28 deep. Every
 * value comes from what is on the map: a region is raised because it is
 * pointed at or because it is chosen — never for its own sake. At rest the
 * provinces sit level with one another and the ground's own relief does the
 * rest; see `RELIEF`.
 */
const LIFT = { work: 0, hover: 0.085, selected: 0.16 };

/**
 * The ground's relief.
 *
 * Not elevation data: the project holds none, and this is not presented as
 * any. It is a visual treatment, the kind a physical relief model has, made
 * from the map's own geometry. The land rises gently from the coast and the
 * outer border, leans a little higher towards the west, and rolls in long,
 * low swells hundreds of kilometres across. It is one continuous height over
 * the whole Kingdom, so provinces meet at the same height and the surface
 * reads as one piece of ground — and the outlines themselves are untouched.
 */
const RELIEF = {
  /** The highest rise, in world units — a little under a chosen province's lift. */
  height: 0.18,
  /** How far inland the ground takes to rise from the edge, in SVG units (~160 km). */
  shore: 55,
  /** The ground's grid, in SVG units (~20 km). */
  cell: 7,
};

/**
 * The light the relief is shaded by: low and from the north-west, as relief
 * maps are drawn, so a rise reads as a rise at a glance.
 */
const HILLSHADE_LIGHT = new THREE.Vector3(-0.54, 0.64, -0.54).normalize();

/**
 * Border width in CSS pixels, and opacity, for each state a region can be
 * in. Widths are measured across a border seen square-on; one running across
 * the view lies back with the ground and reads a little finer, as a line
 * drawn on a real surface would.
 */
const BORDER = {
  calm: { width: 1.2, opacity: 0.3 },
  work: { width: 1.2, opacity: 0.42 },
  quiet: { width: 1.1, opacity: 0.16 },
  hover: { width: 1.7, opacity: 0.75 },
  selected: { width: 2, opacity: 0.95 },
};

// ---------------------------------------------------------------- types

export interface SceneLocation {
  /** City id from `SAUDI_CITY_PINS`. */
  id: string;
  x: number;
  y: number;
  regionId: string;
  /** How many projects sit at this spot. */
  count: number;
}

/** Where a marker is on the canvas, in CSS pixels from its top-left. */
export interface ScreenPoint {
  /** The marker's dot. */
  x: number;
  y: number;
  /** Where a label sits above it, clear of the beam. */
  labelY: number;
  /** False when the marker is behind the camera or outside the canvas. */
  visible: boolean;
  /** 0 → 1 as the marker takes its selected state; labels follow it in. */
  emphasis: number;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  reduceMotion: boolean;
  onPick: (locationId: string) => void;
  onHover: (locationId: string | null) => void;
  /** Called after every rendered frame, so HTML labels can follow markers. */
  onFrame: () => void;
  /**
   * The visitor took hold of the map — a press, a drag, a pinch, a zoom.
   * Anything automatic, like a tour, must give way at once.
   */
  onInteract?: () => void;
}

/** What the scene is doing, for the end-to-end suite. Read-only. */
export interface SceneState {
  selectedRegion: string | null;
  /** Each region's current rise, in world units. */
  lifts: Record<string, number>;
  /** The relief's height under each placed location, in world units. */
  ground: Record<string, number>;
  /** The location trail in progress, if any. */
  trail: { locationId: string; stages: string[]; t: number } | null;
  flying: boolean;
}

export interface SceneController {
  setLocations(locations: SceneLocation[]): void;
  /** Selects a location and flies the camera to it. `null` returns to the overview. */
  setSelected(locationId: string | null): void;
  setHighlightedRegion(regionId: string | null): void;
  zoomBy(factor: number): void;
  /** Moves the camera back to the overview. The selection is left alone. */
  resetView(): void;
  /** Plays the way in, once. Call when the map is first properly on screen. */
  enter(): void;
  /**
   * Room taken by UI floating over the map's inline end, in CSS pixels. The
   * camera frames the Kingdom in what is left, so nothing important sits
   * under the panel. `rtl` flips which side that is.
   */
  setInset(endPx: number, rtl: boolean): void;
  project(locationId: string): ScreenPoint | null;
  inspect(): SceneState;
  setActive(active: boolean): void;
  dispose(): void;
}

// ---------------------------------------------------------------- helpers

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Frame-rate independent approach toward a target. */
const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * Eases a colour toward its target and says whether it is still on its way.
 * The last, invisible step is snapped: a lerp approaches for ever without
 * arriving, and a render loop that waits for it to arrive never sleeps.
 */
function approach(color: THREE.Color, target: THREE.Color, blend: number) {
  color.lerp(target, blend);
  const gap =
    Math.abs(color.r - target.r) + Math.abs(color.g - target.g) + Math.abs(color.b - target.b);
  if (gap < 0.002) {
    color.copy(target);
    return false;
  }
  return true;
}

const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Whether a point lies inside a ring (even-odd rule). */
function pointInRing(point: THREE.Vector2, ring: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** A repeatable pseudo-random value in [0, 1) for a point of the integer lattice. */
function lattice(ix: number, iy: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]: rolling, with no creases and no visible grid. */
function valueNoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = lattice(ix, iy);
  const b = lattice(ix + 1, iy);
  const c = lattice(ix, iy + 1);
  const d = lattice(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

type Segment = [THREE.Vector2, THREE.Vector2];

function distanceToSegmentSq(x: number, y: number, [a, b]: Segment) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len > 0 ? clamp(((x - a.x) * dx + (y - a.y) * dy) / len, 0, 1) : 0;
  const px = a.x + t * dx - x;
  const py = a.y + t * dy - y;
  return px * px + py * py;
}

/** Segments sorted into square bins, for asking which lie near a point. */
function binSegments(segments: Segment[], size: number) {
  const bins = new Map<string, Segment[]>();
  for (const seg of segments) {
    const [a, b] = seg;
    for (
      let bx = Math.floor(Math.min(a.x, b.x) / size);
      bx <= Math.floor(Math.max(a.x, b.x) / size);
      bx++
    ) {
      for (
        let by = Math.floor(Math.min(a.y, b.y) / size);
        by <= Math.floor(Math.max(a.y, b.y) / size);
        by++
      ) {
        const key = `${bx},${by}`;
        const bin = bins.get(key);
        if (bin) bin.push(seg);
        else bins.set(key, [seg]);
      }
    }
  }
  /** Every segment in the bins within `reach` of a point. */
  return (x: number, y: number, reach: number) => {
    const found: Segment[] = [];
    const r = Math.ceil(reach / size);
    const bx = Math.floor(x / size);
    const by = Math.floor(y / size);
    for (let i = bx - r; i <= bx + r; i++) {
      for (let j = by - r; j <= by + r; j++) {
        const bin = bins.get(`${i},${j}`);
        if (bin) found.push(...bin);
      }
    }
    return found;
  };
}

/**
 * The Kingdom's own edge — its coast and its outer border — as segments:
 * every province edge that no neighbouring province runs alongside. The
 * provinces' shared borders do not coincide vertex for vertex in the source
 * data, so "alongside" means within a couple of units.
 */
function outerEdge(provinces: THREE.Vector2[][][]) {
  const all = provinces.map((rings, owner) =>
    rings.flatMap((ring) =>
      ring.map((a, i) => ({ owner, seg: [a, ring[(i + 1) % ring.length]] as Segment })),
    ),
  );
  const near = binSegments(
    all.flat().map(({ seg }) => seg),
    8,
  );
  const ownerOf = new Map(all.flat().map(({ owner, seg }) => [seg, owner]));
  const edge: Segment[] = [];
  for (const { owner, seg } of all.flat()) {
    const mx = (seg[0].x + seg[1].x) / 2;
    const my = (seg[0].y + seg[1].y) / 2;
    const shared = near(mx, my, 2).some(
      (other) => ownerOf.get(other) !== owner && distanceToSegmentSq(mx, my, other) < 4,
    );
    if (!shared) edge.push(seg);
  }
  return edge;
}

/**
 * The relief as a function of a map position (SVG units), in world units:
 * zero on the Kingdom's edge, rising inland, leaning west, gently rolling.
 */
function makeRelief(edge: Segment[]) {
  const near = binSegments(edge, 20);
  const shoreDistance = (x: number, y: number) => {
    let best = RELIEF.shore * RELIEF.shore;
    for (const seg of near(x, y, RELIEF.shore))
      best = Math.min(best, distanceToSegmentSq(x, y, seg));
    return Math.sqrt(best);
  };
  return (x: number, y: number) => {
    const shore = smoothstep(0, RELIEF.shore, shoreDistance(x, y));
    const west = 0.62 + 0.38 * clamp(1 - x / VIEW_W, 0, 1);
    // Three octaves: long swells, rolling ground, and a finer grain of
    // relief across them — each quieter than the last.
    const swell =
      0.5 * valueNoise(x / 200 + 3.1, y / 200 + 7.7) +
      0.32 * valueNoise(x / 85 - 5.3, y / 85 + 1.9) +
      0.18 * valueNoise(x / 38 + 11.7, y / 38 - 6.4);
    return RELIEF.height * shore * west * (0.3 + 0.7 * swell);
  };
}

/** A ring cut to an axis-aligned box (Sutherland–Hodgman). */
function clipRingToBox(ring: THREE.Vector2[], x0: number, y0: number, x1: number, y1: number) {
  const planes: [(p: THREE.Vector2) => number][] = [
    [(p) => p.x - x0],
    [(p) => x1 - p.x],
    [(p) => p.y - y0],
    [(p) => y1 - p.y],
  ];
  let out = ring;
  for (const [side] of planes) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i];
      const b = input[(i + 1) % input.length];
      const da = side(a);
      const db = side(b);
      if (da >= 0) out.push(a);
      if (da >= 0 !== db >= 0) out.push(a.clone().lerp(b, da / (da - db)));
    }
    if (out.length < 3) return [];
  }
  return out;
}

/**
 * A province's solid: its ground and its walls, as one geometry with two
 * groups — ground (0) and walls (1) — as the flat extrusion had.
 *
 * The ground is a regular grid cut exactly to the province's outline and
 * lifted by the relief. Cells wholly inside are plain squares; cells the
 * outline crosses are cut to it, so the outline is kept to the point. Every
 * vertex takes its normal from the relief itself rather than from the
 * triangles around it, so the shading is smooth whatever the grid, and a
 * little relief shading rides in the vertex colour. The walls run down the
 * outline from wherever the ground has risen to the slab's underside, so a
 * province lifted clear of its neighbours never shows a gap.
 */
function reliefGeometry(rings: THREE.Vector2[][], heightAt: (x: number, y: number) => number) {
  const position: number[] = [];
  const normal: number[] = [];
  const color: number[] = [];
  const index: number[] = [];

  const e = RELIEF.cell / 4;
  const up = new THREE.Vector3();
  const addGround = (x: number, y: number) => {
    const h = heightAt(x, y);
    const dx = (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e * S);
    const dz = (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e * S);
    up.set(-dx, 1, -dz).normalize();
    const shade = clamp(1 + 3.2 * (up.dot(HILLSHADE_LIGHT) - HILLSHADE_LIGHT.y), 0.68, 1.32);
    position.push((x - VIEW_W / 2) * S, h, (y - VIEW_H / 2) * S);
    normal.push(up.x, up.y, up.z);
    color.push(shade, shade, shade);
    return position.length / 3 - 1;
  };
  /** A triangle facing up, whichever way its corners were given. */
  const face = (a: number, b: number, c: number) => {
    const ax = position[a * 3];
    const az = position[a * 3 + 2];
    const cross =
      (position[b * 3 + 2] - az) * (position[c * 3] - ax) -
      (position[b * 3] - ax) * (position[c * 3 + 2] - az);
    if (cross >= 0) index.push(a, b, c);
    else index.push(a, c, b);
  };

  // Which cells the outline passes through.
  const cell = RELIEF.cell;
  const crossed = new Set<string>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y);
      maxX = Math.max(maxX, a.x);
      maxY = Math.max(maxY, a.y);
      for (
        let gx = Math.floor(Math.min(a.x, b.x) / cell);
        gx <= Math.floor(Math.max(a.x, b.x) / cell);
        gx++
      ) {
        for (
          let gy = Math.floor(Math.min(a.y, b.y) / cell);
          gy <= Math.floor(Math.max(a.y, b.y) / cell);
          gy++
        ) {
          crossed.add(`${gx},${gy}`);
        }
      }
    }
  }

  const corners = new Map<string, number>();
  const corner = (gx: number, gy: number) => {
    const key = `${gx},${gy}`;
    let i = corners.get(key);
    if (i === undefined) {
      i = addGround(gx * cell, gy * cell);
      corners.set(key, i);
    }
    return i;
  };
  const centre = new THREE.Vector2();
  for (let gx = Math.floor(minX / cell); gx <= Math.floor(maxX / cell); gx++) {
    for (let gy = Math.floor(minY / cell); gy <= Math.floor(maxY / cell); gy++) {
      const x0 = gx * cell;
      const y0 = gy * cell;
      if (!crossed.has(`${gx},${gy}`)) {
        centre.set(x0 + cell / 2, y0 + cell / 2);
        if (!rings.some((ring) => pointInRing(centre, ring))) continue;
        const a = corner(gx, gy);
        const b = corner(gx + 1, gy);
        const c = corner(gx + 1, gy + 1);
        const d = corner(gx, gy + 1);
        face(a, b, c);
        face(a, c, d);
        continue;
      }
      for (const ring of rings) {
        const piece = clipRingToBox(ring, x0, y0, x0 + cell, y0 + cell);
        if (piece.length < 3 || Math.abs(THREE.ShapeUtils.area(piece)) < 1e-6) continue;
        const ids = piece.map((p) => addGround(p.x, p.y));
        for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(piece, [])) {
          face(ids[i], ids[j], ids[k]);
        }
      }
    }
  }
  const groundCount = index.length;

  // The walls: straight down from the ground's edge to the underside.
  const bottom = -DEPTH * S;
  const a3 = new THREE.Vector3();
  const b3 = new THREE.Vector3();
  const across = new THREE.Vector3();
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      a3.copy(toWorld(a.x, a.y, heightAt(a.x, a.y)));
      b3.copy(toWorld(b.x, b.y, heightAt(b.x, b.y)));
      across.set(b3.z - a3.z, 0, a3.x - b3.x).normalize();
      const start = position.length / 3;
      for (const [v, y] of [
        [a3, a3.y],
        [b3, b3.y],
        [b3, bottom],
        [a3, bottom],
      ] as const) {
        position.push(v.x, y, v.z);
        normal.push(across.x, across.y, across.z);
        color.push(1, 1, 1);
      }
      index.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
  geometry.setIndex(index);
  geometry.addGroup(0, groundCount, 0);
  geometry.addGroup(groundCount, index.length - groundCount, 1);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Andrew's monotone chain. Returns the hull's vertices, counter-clockwise. */
function convexHull(points: THREE.Vector2[]): THREE.Vector2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: THREE.Vector2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Extrudes map shapes downward from the ground, in world units. */
function slab(shapes: THREE.Shape[], depth: number) {
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  // Shape space (x, y, depth) → map space (x east, height, y south). A
  // rotation rather than an axis swap, so faces keep their winding and the
  // top of the slab faces up.
  geometry.rotateX(Math.PI / 2);
  geometry.scale(S, S, S);
  geometry.translate(-MAP_HALF_X, 0, -MAP_HALF_Z);
  return geometry;
}

/** Width of the shading inside each border, in SVG units. */
const SHADE_WIDTH = 2.6;

/**
 * A soft band just inside a ring's edge: opaque at the border, clear a few
 * units in. Two provinces side by side each shade their own side of the line
 * they share, so the border reads as a seam between two pieces rather than a
 * line drawn across one. Alpha rides in the vertex colour.
 */
function shadeRing(
  points: THREE.Vector2[],
  out: { positions: number[]; colors: number[] },
  heightAt: (x: number, y: number) => number,
) {
  const n = points.length;
  if (n < 3) return;
  // Which side is inside: the sign of the ring's area says which way it winds.
  const inward = THREE.ShapeUtils.area(points) > 0 ? 1 : -1;
  const normals = points.map((_, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const here = points[i];
    const a = new THREE.Vector2(here.x - prev.x, here.y - prev.y).normalize();
    const b = new THREE.Vector2(next.x - here.x, next.y - here.y).normalize();
    // Left normal of the travel direction, turned inward.
    const normal = new THREE.Vector2(-(a.y + b.y), a.x + b.x).multiplyScalar(inward);
    return normal.lengthSq() > 1e-8
      ? normal.normalize()
      : new THREE.Vector2(-a.y * inward, a.x * inward);
  });
  // On the ground, wherever the relief has taken it.
  const on = (x: number, y: number) => toWorld(x, y, heightAt(x, y) + 0.003);
  const outer = (i: number) => on(points[i].x, points[i].y);
  const inner = (i: number) =>
    on(points[i].x + normals[i].x * SHADE_WIDTH, points[i].y + normals[i].y * SHADE_WIDTH);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const quad = [outer(i), outer(j), inner(j), outer(i), inner(j), inner(i)];
    const alpha = [1, 1, 0, 1, 0, 0];
    quad.forEach((v, k) => {
      out.positions.push(v.x, v.y, v.z);
      out.colors.push(1, 1, 1, alpha[k]);
    });
  }
}

/**
 * A line drawn as a flat ribbon lying on the map, a set number of pixels
 * wide at any zoom.
 *
 * WebGL's own lines are one device pixel — half a CSS pixel on a retina
 * screen — so a border drawn with them shimmers rather than reads. three's
 * screen-space "fat lines" fix that, but measured under software rendering
 * (what a browser falls back to without a usable GPU) they cost more than the
 * whole rest of the map. A ribbon is an ordinary mesh: each vertex carries
 * the direction it may be pushed sideways, and one line of vertex shader
 * pushes it by the width for the current zoom. Corners are mitred, so the
 * ribbon is one unbroken strip with no overlaps to double up its alpha.
 */
function ribbonGeometry(points: THREE.Vector3[], closed: boolean) {
  const pts = points.filter((p, i) => i === 0 || p.distanceToSquared(points[i - 1]) > 1e-12);
  if (closed && pts.length > 2 && pts[0].distanceToSquared(pts[pts.length - 1]) < 1e-12) pts.pop();
  const n = pts.length;
  const position = new Float32Array(n * 6);
  const side = new Float32Array(n * 4);
  /** 0 → 1 along the line, for anything that travels it. */
  const along = new Float32Array(n * 2);

  let total = 0;
  const distance = pts.map((p, i) => (i === 0 ? 0 : (total += p.distanceTo(pts[i - 1]))));
  const dirIn = new THREE.Vector2();
  const dirOut = new THREE.Vector2();
  const miter = new THREE.Vector2();
  for (let i = 0; i < n; i++) {
    const here = pts[i];
    const prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)];
    const next = closed ? pts[(i + 1) % n] : pts[Math.min(i + 1, n - 1)];
    dirIn.set(here.x - prev.x, here.z - prev.z);
    dirOut.set(next.x - here.x, next.z - here.z);
    if (dirIn.lengthSq() < 1e-12) dirIn.copy(dirOut);
    if (dirOut.lengthSq() < 1e-12) dirOut.copy(dirIn);
    dirIn.normalize();
    dirOut.normalize();
    const normalOut = new THREE.Vector2(-dirOut.y, dirOut.x);
    miter.set(-dirIn.y - dirOut.y, dirIn.x + dirOut.x);
    if (miter.lengthSq() < 1e-8) miter.copy(normalOut);
    miter.normalize();
    // Longer at a corner so the width holds, but not without limit: a
    // hairpin on the coast would otherwise throw a spike.
    miter.multiplyScalar(1 / Math.max(miter.dot(normalOut), 0.4));
    position.set([here.x, here.y, here.z, here.x, here.y, here.z], i * 6);
    side.set([miter.x, miter.y, -miter.x, -miter.y], i * 4);
    const t = total > 0 ? distance[i] / total : 0;
    along.set([t, t], i * 2);
  }
  const index: number[] = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = i * 2;
    const b = ((i + 1) % n) * 2;
    index.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("side", new THREE.BufferAttribute(side, 2));
  geometry.setIndex(index);
  return { geometry, along };
}

/** Several rings as one ribbon geometry, so a region's border is one draw. */
function mergeRibbons(parts: THREE.BufferGeometry[]) {
  let vertices = 0;
  const position: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  for (const part of parts) {
    position.push(...(part.getAttribute("position").array as Float32Array));
    side.push(...(part.getAttribute("side").array as Float32Array));
    for (const i of part.getIndex()!.array) index.push(i + vertices);
    vertices += part.getAttribute("position").count;
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("side", new THREE.Float32BufferAttribute(side, 2));
  geometry.setIndex(index);
  return geometry;
}

/** A material that widens a ribbon by `halfWidth` world units each side. */
function ribbonMaterial(params: THREE.MeshBasicMaterialParameters) {
  const halfWidth = { value: 0.01 };
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    ...params,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.halfWidth = halfWidth;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 side;\nuniform float halfWidth;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.xz += side * halfWidth;",
      );
  };
  // Every ribbon shares one compiled program; only its uniforms differ.
  material.customProgramCacheKey = () => "wjeen-ribbon";
  return { material, halfWidth };
}

// ---------------------------------------------------------------- scene

export function createSaudiScene(opts: SceneOptions): SceneController {
  const { canvas, reduceMotion } = opts;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);

  // Light from the north-west and above, so the eastern walls fall into
  // shadow and the slab reads as having thickness.
  scene.add(new THREE.HemisphereLight(0xc9ccff, 0x05072a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-6, 12, -4);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x979ef7, 0.7);
  rim.position.set(8, 3, 10);
  scene.add(rim);

  // ------------------------------------------------------------ the map

  const loader = new SVGLoader();
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  interface RegionView {
    id: string;
    mesh: THREE.Mesh;
    top: THREE.MeshStandardMaterial;
    side: THREE.MeshStandardMaterial;
    borderMat: THREE.MeshBasicMaterial;
    /** World units each side of the border's centre line, set every frame. */
    borderHalfWidth: { value: number };
    shadeMat: THREE.MeshBasicMaterial;
    /** The mainland's outline, in SVG units — the path a trail runs along. */
    loop: THREE.Vector2[];
    lift: number;
    liftTarget: number;
    colorTarget: THREE.Color;
    sideTarget: THREE.Color;
    edgeColorTarget: THREE.Color;
    border: { width: number; opacity: number };
    borderTarget: { width: number; opacity: number };
  }
  const regions: RegionView[] = [];
  const disposables: { dispose(): void }[] = [];
  /** Every outline vertex, flat on the ground — the camera frames these. */
  const outline: THREE.Vector2[] = [];

  // First every province's outline, so the relief can know where the
  // Kingdom's edge is before any ground is laid.
  const parsed = SAUDI_REGIONS.flatMap((region) => {
    const data = loader.parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${region.path}"/></svg>`,
    );

    // Coastal provinces carry dozens of islands, several of them degenerate
    // (a "0,0" move with no area). Extruding those produces NaN normals, so
    // anything with no real surface is dropped.
    const sized = data.paths
      .flatMap((p) => p.toShapes())
      .map((shape) => ({ shape, area: Math.abs(THREE.ShapeUtils.area(shape.getPoints())) }))
      .filter(({ area }) => area > 0.5);
    if (!sized.length) return [];
    // Largest first, so the outline a trail follows is the mainland's.
    sized.sort((a, b) => b.area - a.area);
    const rings = sized.map(({ shape }) =>
      shape.getPoints().map((pt) => new THREE.Vector2(pt.x, pt.y)),
    );
    return [{ region, sized, rings }];
  });
  const heightAt = makeRelief(outerEdge(parsed.map(({ rings }) => rings)));

  for (const { region, sized, rings: allRings } of parsed) {
    const mainland = allRings.filter((_, i) => sized[i].area >= ISLAND_MAX_AREA);
    const islands = sized.filter(({ area }) => area < ISLAND_MAX_AREA);

    const geometry = reliefGeometry(mainland, heightAt);

    const top = new THREE.MeshStandardMaterial({
      color: C.top.clone(),
      roughness: 0.82,
      metalness: 0.08,
      // The relief shading, multiplied into whatever colour the province is.
      vertexColors: true,
    });
    const side = new THREE.MeshStandardMaterial({
      color: C.side.clone(),
      roughness: 0.9,
      // The walls are built one quad at a time and face whichever way the
      // outline runs; both sides light correctly.
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, [top, side]);
    mesh.userData.regionId = region.id;
    mapGroup.add(mesh);
    disposables.push(geometry);

    // An island a few pixels across, extruded as deep as the mainland, stands
    // up out of the sea like a pillar. Each is as deep as it is wide — a flat
    // rock at the scale of the map — and rides with its province.
    for (const { shape, area } of islands) {
      const islandGeometry = slab([shape], clamp(Math.sqrt(area) * 1.2, 1.5, DEPTH));
      // Flat and unshaded: an island sits at the water's edge, where the
      // relief is nothing.
      islandGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          new Array(islandGeometry.getAttribute("position").count * 3).fill(1),
          3,
        ),
      );
      mesh.add(new THREE.Mesh(islandGeometry, [top, side]));
      disposables.push(islandGeometry);
    }

    // The border, drawn a hair above the top face so it never z-fights, and
    // as a child of the region so it rises with it.
    const rings: THREE.BufferGeometry[] = [];
    const shade = { positions: [] as number[], colors: [] as number[] };
    sized.forEach(({ area }, i) => {
      const pts = allRings[i];
      outline.push(...pts);
      rings.push(
        ribbonGeometry(
          pts.map((pt) => toWorld(pt.x, pt.y, heightAt(pt.x, pt.y) + 0.005)),
          true,
        ).geometry,
      );
      // Islands are too small to shade; a band wider than the island would
      // swallow it.
      if (area >= ISLAND_MAX_AREA) shadeRing(pts, shade, heightAt);
    });
    const borderGeo = mergeRibbons(rings);
    const { material: borderMat, halfWidth: borderHalfWidth } = ribbonMaterial({
      color: C.edge.clone(),
      opacity: BORDER.calm.opacity,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.renderOrder = 2;
    mesh.add(border);

    const shadeGeo = new THREE.BufferGeometry();
    shadeGeo.setAttribute("position", new THREE.Float32BufferAttribute(shade.positions, 3));
    shadeGeo.setAttribute("color", new THREE.Float32BufferAttribute(shade.colors, 4));
    const shadeMat = new THREE.MeshBasicMaterial({
      color: C.shade.clone(),
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadeMesh = new THREE.Mesh(shadeGeo, shadeMat);
    shadeMesh.renderOrder = 1;
    mesh.add(shadeMesh);

    disposables.push(top, side, borderGeo, borderMat, shadeGeo, shadeMat);
    regions.push({
      id: region.id,
      mesh,
      top,
      side,
      borderMat,
      borderHalfWidth,
      shadeMat,
      loop: allRings[0],
      lift: 0,
      liftTarget: 0,
      colorTarget: C.top.clone(),
      sideTarget: C.side.clone(),
      edgeColorTarget: C.edge.clone(),
      border: { ...BORDER.calm },
      borderTarget: { ...BORDER.calm },
    });
  }

  // The Kingdom's convex hull, top and bottom of the slab. A perspective
  // projection keeps a convex set's extremes on its vertices, so framing
  // these few points frames the whole map — the corners of its bounding box
  // would waste the empty north-west and south-east.
  const hull = convexHull(outline).flatMap((pt) => [
    toWorld(pt.x, pt.y, RELIEF.height),
    toWorld(pt.x, pt.y, -DEPTH * S),
  ]);

  // A soft pool of light under the slab. Without it the map floats on
  // nothing; with it the thickness has somewhere to cast.
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 256;
  const g = glowCanvas.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(151,158,247,0.35)");
  grad.addColorStop(0.5, "rgba(151,158,247,0.10)");
  grad.addColorStop(1, "rgba(151,158,247,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    depthWrite: false,
  });
  const glowGeo = new THREE.PlaneGeometry(MAP_HALF_X * 3.2, MAP_HALF_Z * 3.2);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -DEPTH * S - 0.02;
  scene.add(glow);
  disposables.push(glowTex, glowMat, glowGeo);

  // ------------------------------------------------------------ markers

  interface MarkerView {
    loc: SceneLocation;
    group: THREE.Group;
    dot: THREE.Mesh;
    dotMat: THREE.MeshBasicMaterial;
    ring: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    beam: THREE.Mesh;
    beamMat: THREE.MeshBasicMaterial;
    /** The ground's height under the marker, from the relief. */
    ground: number;
    phase: number;
    emphasis: number;
    emphasisTarget: number;
  }
  let markers: MarkerView[] = [];

  /**
   * The location mark: the open map pin, drawn once into a canvas and worn by
   * every marker as a billboard.
   *
   * It is the site's own icon language — a 24-unit grid, 2.2 stroke, round
   * caps and joins, hollow — rather than a sphere, which read as a bead
   * rather than as a place. Painted white so the existing tint survives:
   * `dotMat.color` still lerps `C.marker` → `C.markerActive`, and multiplies
   * through the texture untouched.
   */
  // A 24-wide icon grid, the site's own. The canvas is taller than the icon
  // on purpose: the plane is centred on its own middle, and the anchor below
  // wants the pin's TIP 0.09 under that centre — so the empty grid rows under
  // the tip are what put the point on the ground without moving the anchor.
  const PIN_GRID_W = 24;
  const PIN_GRID_H = 30;
  const PIN_TIP = 21;
  const PIN_STROKE = 2.2;
  const pinCanvas = document.createElement("canvas");
  pinCanvas.width = 256;
  pinCanvas.height = (256 * PIN_GRID_H) / PIN_GRID_W;
  {
    const g = pinCanvas.getContext("2d")!;
    const k = pinCanvas.width / PIN_GRID_W;
    g.scale(k, k);
    g.strokeStyle = "#fff";
    g.lineWidth = PIN_STROKE;
    g.lineCap = "round";
    g.lineJoin = "round";
    const cx = 12;
    const cy = 10;
    const r = 7;
    // Head: a circle at (12,10). Body: its two tangents run down to the tip,
    // so head and body are one closed teardrop rather than a circle sitting
    // on a triangle.
    const beta = Math.acos(r / (PIN_TIP - cy));
    g.beginPath();
    g.moveTo(cx, PIN_TIP);
    g.lineTo(cx + r * Math.sin(beta), cy + r * Math.cos(beta));
    g.arc(cx, cy, r, Math.PI / 2 - beta, Math.PI / 2 + beta, false);
    g.closePath();
    g.stroke();
    // The hollow centre that makes it read as a pin and not as a balloon.
    g.beginPath();
    g.arc(cx, cy, 3, 0, Math.PI * 2);
    g.stroke();
  }
  const pinTex = new THREE.CanvasTexture(pinCanvas);
  pinTex.colorSpace = THREE.SRGBColorSpace;
  pinTex.anisotropy = 4;
  /** World units per grid unit, solved so the tip sits 0.09 below the centre. */
  const PIN_UNIT = 0.09 / (PIN_TIP - PIN_GRID_H / 2);
  const dotGeo = new THREE.PlaneGeometry(PIN_GRID_W * PIN_UNIT, PIN_GRID_H * PIN_UNIT);
  const ringGeo = new THREE.RingGeometry(0.1, 0.13, 40);
  ringGeo.rotateX(-Math.PI / 2);
  const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8, 1, true);
  beamGeo.translate(0, 0.5, 0);
  // What pins a marker to the ground: a short stem down from the dot, and a
  // soft contact shadow where it meets the surface.
  const stemGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.09, 6, 1, true);
  stemGeo.translate(0, 0.045, 0);
  const stemMat = new THREE.MeshBasicMaterial({
    color: C.marker,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const contactCanvas = document.createElement("canvas");
  contactCanvas.width = contactCanvas.height = 64;
  const cg = contactCanvas.getContext("2d")!;
  const contactGrad = cg.createRadialGradient(32, 32, 0, 32, 32, 32);
  contactGrad.addColorStop(0, "rgba(3,5,30,0.55)");
  contactGrad.addColorStop(1, "rgba(3,5,30,0)");
  cg.fillStyle = contactGrad;
  cg.fillRect(0, 0, 64, 64);
  const contactTex = new THREE.CanvasTexture(contactCanvas);
  const contactGeo = new THREE.PlaneGeometry(0.3, 0.3);
  contactGeo.rotateX(-Math.PI / 2);
  const contactMat = new THREE.MeshBasicMaterial({
    map: contactTex,
    transparent: true,
    depthWrite: false,
  });
  disposables.push(
    dotGeo,
    pinTex,
    ringGeo,
    beamGeo,
    stemGeo,
    stemMat,
    contactTex,
    contactGeo,
    contactMat,
  );

  const markerLayer = new THREE.Group();
  scene.add(markerLayer);

  function clearMarkers() {
    for (const m of markers) {
      markerLayer.remove(m.group);
      m.dotMat.dispose();
      m.ringMat.dispose();
      m.beamMat.dispose();
    }
    markers = [];
  }

  /** Regions holding at least one visible, placed project. */
  let workRegions = new Set<string>();

  function setLocations(locations: SceneLocation[]) {
    clearMarkers();
    workRegions = new Set(locations.map((l) => l.regionId));
    locations.forEach((loc, index) => {
      const group = new THREE.Group();
      group.position.copy(toWorld(loc.x, loc.y, 0));

      const dotMat = new THREE.MeshBasicMaterial({
        color: C.marker.clone(),
        map: pinTex,
        transparent: true,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.y = 0.09;
      // A flat icon has to keep facing the reader while the map turns under
      // it. Done here rather than in the frame loop so it costs nothing when
      // the scene is still.
      dot.onBeforeRender = (_r, _s, cam) => {
        dot.quaternion.copy(cam.quaternion);
      };

      const ringMat = new THREE.MeshBasicMaterial({
        color: C.marker.clone(),
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.01;

      const beamMat = new THREE.MeshBasicMaterial({
        color: C.markerActive.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.scale.y = 0.001;

      const contact = new THREE.Mesh(contactGeo, contactMat);
      contact.position.y = 0.006;
      const stem = new THREE.Mesh(stemGeo, stemMat);

      group.add(contact, ring, beam, stem, dot);
      markerLayer.add(group);

      markers.push({
        loc,
        group,
        dot,
        dotMat,
        ring,
        ringMat,
        beam,
        beamMat,
        // Standing on the ground, wherever the relief has taken it there.
        ground: heightAt(loc.x, loc.y),
        // Staggered, so the pulses breathe rather than blink in unison.
        phase: (index * 0.37) % 1,
        emphasis: 0,
        emphasisTarget: 0,
      });
    });
    applyEmphasis();
    dirty = true;
  }

  // ------------------------------------------------------------ camera

  /**
   * The overview: the whole Kingdom, seen from the south at a tilt. Target
   * and distance are solved for the canvas in `fitHome`.
   */
  const HOME = {
    polar: 0.9,
    azimuth: 0,
    target: new THREE.Vector3(),
    distance: 16,
  };
  const view = {
    target: new THREE.Vector3(),
    distance: 16,
    polar: HOME.polar,
    azimuth: HOME.azimuth,
  };
  const MIN_DISTANCE = 3.2;
  let maxDistance = 22;

  // Parallax: the scene leans toward the pointer. Small, and eased, so it
  // feels like looking around rather than like the map sliding away.
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  // Pan momentum after a drag is released.
  /** World units per second, along the ground. */
  const drift = new THREE.Vector3();

  interface Pose {
    target: THREE.Vector3;
    distance: number;
    polar: number;
    azimuth: number;
  }
  interface Flight {
    from: Pose;
    to: Pose;
    t: number;
    duration: number;
    /** Bound for the overview, which moves whenever the canvas is re-fitted. */
    home: boolean;
    /**
     * How far the camera rises at mid-flight, in world units. Between two
     * distant sites the camera lifts to show the ground it is crossing, then
     * settles; a short hop, or a dive in from the overview, stays flat.
     */
    arc: number;
  }
  let flight: Flight | null = null;
  /** The tilt the camera settles at when no flight is steering it. */
  let restPolar = HOME.polar;

  function flyTo(
    target: THREE.Vector3,
    distance: number,
    polar: number,
    { home = false, duration }: { home?: boolean; duration?: number } = {},
  ) {
    drift.set(0, 0, 0);
    restPolar = polar;
    if (reduceMotion) {
      view.target.copy(target);
      view.distance = distance;
      view.polar = polar;
      view.azimuth = HOME.azimuth;
      flight = null;
      dirty = true;
      return;
    }
    // Short and in proportion: a neighbour is a quick hop, a coast-to-coast
    // move takes a moment longer, and nothing keeps anyone waiting.
    const travel = Math.hypot(target.x - view.target.x, target.z - view.target.z);
    const zoomChange = Math.abs(distance - view.distance);
    const arc = clamp(travel * 0.45 - zoomChange * 0.5, 0, Math.max(distance, view.distance) * 0.5);
    flight = {
      from: {
        target: view.target.clone(),
        distance: view.distance,
        polar: view.polar,
        azimuth: view.azimuth,
      },
      to: { target: target.clone(), distance, polar, azimuth: HOME.azimuth },
      t: 0,
      duration: duration ?? clamp(0.8 + travel * 0.05 + zoomChange * 0.012, 0.8, 1.3),
      home,
      arc,
    };
  }

  function flyHome(duration?: number) {
    flyTo(HOME.target, HOME.distance, HOME.polar, { home: true, duration });
  }

  // The way in. Until the map is first properly on screen the camera waits
  // high above it and turned a little away; `enter` then brings it down into
  // the overview, so arriving at the map feels like arriving in it.
  let entered = false;
  function placeAtEntrance() {
    view.target.copy(HOME.target);
    view.distance = HOME.distance * 1.55;
    view.polar = 0.42;
    view.azimuth = HOME.azimuth - 0.32;
  }

  function clampTarget() {
    view.target.x = clamp(view.target.x, -MAP_HALF_X, MAP_HALF_X);
    view.target.z = clamp(view.target.z, -MAP_HALF_Z, MAP_HALF_Z);
  }

  function placeCamera() {
    const az = view.azimuth + parallax.x * 0.07;
    const polar = clamp(view.polar - parallax.y * 0.05, 0.35, 1.2);
    const r = view.distance;
    camera.position.set(
      view.target.x + r * Math.sin(polar) * Math.sin(az),
      view.target.y + r * Math.cos(polar),
      view.target.z + r * Math.sin(polar) * Math.cos(az),
    );
    camera.lookAt(view.target);
  }

  /**
   * The camera where the view says it is now, not where the last frame put
   * it — a reset or a flight's end lands between frames, and anything that
   * asks where a marker is must not get the answer from before.
   */
  function syncCamera() {
    placeCamera();
    camera.updateMatrixWorld();
  }

  let insetPx = 0;
  let insetRtl = false;
  let canvasW = 1;
  let canvasH = 1;

  /**
   * Shift the projection so the map centres in the space the panel leaves.
   * A view offset rather than moving the camera: the map still extends
   * under the panel, which is what makes the panel feel like it floats over
   * the Kingdom rather than sitting beside a picture of it.
   */
  function applyViewOffset() {
    if (insetPx > 0) {
      const shift = ((insetRtl ? -1 : 1) * insetPx) / 2;
      camera.setViewOffset(canvasW, canvasH, shift, 0, canvasW, canvasH);
    } else {
      camera.clearViewOffset();
    }
  }

  /** Pixel bounds of the map's hull from a given overview camera. */
  const scratch = new THREE.Vector3();
  function hullBounds(target: THREE.Vector3, distance: number) {
    const { polar, azimuth } = HOME;
    camera.position.set(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of hull) {
      scratch.copy(pt).project(camera);
      const x = ((scratch.x + 1) / 2) * canvasW;
      const y = ((1 - scratch.y) / 2) * canvasH;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY };
  }

  /**
   * Solve the overview so the whole Kingdom sits in the part of the canvas
   * the panel leaves free, as large as it will go. Solved numerically
   * against the real outline: the tilt and perspective make a closed form
   * either wrong or wasteful, and this runs only on resize.
   */
  function fitHome() {
    const margin = Math.max(16, Math.min(canvasW, canvasH) * 0.05);
    const left = (insetRtl ? insetPx : 0) + margin;
    const right = canvasW - (insetRtl ? 0 : insetPx) - margin;
    // The geographic context line sits along the top edge, the controls
    // along the bottom.
    const top = margin + 24;
    const bottom = canvasH - margin - 44;
    if (right - left < 40 || bottom - top < 40) return;

    const target = new THREE.Vector3();
    let distance = HOME.distance;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    for (let pass = 0; pass < 4; pass++) {
      let lo = 1;
      let hi = 120;
      for (let i = 0; i < 26; i++) {
        const mid = (lo + hi) / 2;
        const b = hullBounds(target, mid);
        const fits = b.minX >= left && b.maxX <= right && b.minY >= top && b.maxY <= bottom;
        if (fits) hi = mid;
        else lo = mid;
      }
      distance = hi;
      // Recentre in the free area, then fit again from there.
      const b = hullBounds(target, distance);
      const worldPerPixel = (2 * distance * tanHalf) / canvasH;
      target.x += ((b.minX + b.maxX) / 2 - (left + right) / 2) * worldPerPixel;
      target.z +=
        (((b.minY + b.maxY) / 2 - (top + bottom) / 2) * worldPerPixel) / Math.cos(HOME.polar);
    }
    HOME.target.copy(target);
    HOME.distance = distance;
  }

  // ------------------------------------------------------------ sizing

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    canvasW = w;
    canvasH = h;
    camera.aspect = w / h;
    applyViewOffset();
    camera.updateProjectionMatrix();

    const wasHome =
      !flight &&
      Math.abs(view.distance - HOME.distance) < 0.01 &&
      view.target.distanceTo(HOME.target) < 0.01;
    fitHome();
    maxDistance = HOME.distance * 1.25;
    if (wasHome) view.target.copy(HOME.target);
    const waiting = !entered && !reduceMotion && !flight && !selectedId;
    if (waiting) placeAtEntrance();
    // A flight home that is already under way lands on the new overview,
    // not the one it set out for — the panel is measured after the first
    // flight starts, and a window can be resized mid-flight.
    if (flight?.home) {
      flight.to.target.copy(HOME.target);
      flight.to.distance = HOME.distance;
    }
    if (!waiting && (wasHome || view.distance > maxDistance)) view.distance = HOME.distance;
    // Fitting moved the camera about; put it back where the view says, so
    // `project` is right even while the loop is asleep.
    syncCamera();
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  // ------------------------------------------------------------ picking

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function toNdc(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  /**
   * The marker nearest a screen point, within a radius in CSS pixels.
   * Measured on screen rather than by ray: a dot a few pixels across on a
   * tilted map is a poor target, and a finger needs more room than a mouse
   * whatever the zoom.
   */
  function pickMarker(clientX: number, clientY: number, radius = 16): string | null {
    syncCamera();
    const rect = canvas.getBoundingClientRect();
    let best: string | null = null;
    let bestDistance = radius;
    for (const m of markers) {
      scratch.copy(m.group.position);
      scratch.y += m.dot.position.y * markerScale;
      scratch.project(camera);
      if (scratch.z > 1) continue;
      const x = rect.left + ((scratch.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - scratch.y) / 2) * rect.height;
      const distance = Math.hypot(x - clientX, y - clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = m.loc.id;
      }
    }
    return best;
  }

  function pickRegion(clientX: number, clientY: number): string | null {
    toNdc(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(
      regions.map((r) => r.mesh),
      false,
    );
    return hits.length ? (hits[0].object.userData.regionId as string) : null;
  }

  // ------------------------------------------------------------ state

  let selectedId: string | null = null;
  let hoveredId: string | null = null;
  let hoveredRegion: string | null = null;
  let externalRegion: string | null = null;

  function applyEmphasis() {
    const selected = markers.find((m) => m.loc.id === selectedId);
    const selectedRegion = selected?.loc.regionId ?? null;
    const hoverRegion = externalRegion ?? hoveredRegion;

    for (const region of regions) {
      // One state per region, in order of precedence. The chosen region
      // stands tallest; the one being pointed at rises a little; regions
      // with work in them sit a hair proud; and while something is chosen,
      // everything else steps back so the choice has the stage.
      const state =
        region.id === selectedRegion
          ? "selected"
          : region.id === hoverRegion
            ? "hover"
            : selectedRegion
              ? "quiet"
              : workRegions.has(region.id)
                ? "work"
                : "calm";

      region.liftTarget =
        state === "selected"
          ? LIFT.selected
          : state === "hover"
            ? LIFT.hover
            : workRegions.has(region.id)
              ? LIFT.work
              : 0;
      region.colorTarget.copy(
        state === "selected"
          ? C.topActive
          : state === "hover"
            ? C.topHover
            : state === "quiet"
              ? C.topDim
              : state === "work"
                ? C.topWork
                : C.top,
      );
      region.sideTarget.copy(state === "selected" ? C.sideLit : C.side);
      region.edgeColorTarget.copy(state === "selected" ? C.edgeActive : C.edge);
      Object.assign(region.borderTarget, BORDER[state]);
    }
    for (const marker of markers) {
      marker.emphasisTarget =
        marker.loc.id === selectedId ? 1 : marker.loc.id === hoveredId ? 0.55 : 0;
    }
    dirty = true;
  }

  function setSelected(locationId: string | null) {
    const previous = selectedId;
    const previousRegion = markers.find((m) => m.loc.id === previous)?.loc.regionId ?? null;
    selectedId = locationId;
    applyEmphasis();
    const marker = markers.find((m) => m.loc.id === locationId);
    if (marker) {
      // A selection made before the map was on screen replaces the way in.
      entered = true;
      const p = marker.group.position;
      const distance = Math.max(MIN_DISTANCE * 1.6, HOME.distance * 0.5);
      // Aimed a touch north of the marker, so the marker sits a little below
      // the middle and its beam and title have the middle to rise into.
      flyTo(new THREE.Vector3(p.x, 0, p.z - distance * 0.035), distance, 0.78);
      // Played for a new place only. The same place again — the list or a
      // filter re-announcing it — has already been introduced.
      if (locationId !== previous) {
        startTrail(marker, marker.loc.regionId === previousRegion ? "region-kept" : "new-region");
      }
    } else {
      endTrail();
      if (previous) {
        // Only a real deselection goes back to the overview. Being told again
        // that nothing is selected — a filter changed — leaves the view where
        // the visitor put it.
        flyHome();
      }
    }
  }

  // ------------------------------------------------------------ trail

  /**
   * The location trail, played once when a project is chosen: light runs
   * around the region's border, crosses from that border to the city, closes
   * a ring on it, and the marker's beam rises to the project's name —
   * Kingdom, region, city, project, in one gesture.
   *
   * It is a connector, not a route. The arc to the city rises off the ground
   * precisely so it cannot be read as a road; the data holds no routes and
   * the map does not pretend to. It is drawn only while it plays, then
   * removed, so a settled map draws nothing extra.
   */
  interface Stage {
    name: "border" | "connector" | "ring";
    start: number;
    end: number;
  }
  interface Trail {
    locationId: string;
    region: RegionView;
    marker: MarkerView;
    t: number;
    stages: Stage[];
    /** When the beam may rise: the moment the trail reaches the city. */
    arrival: number;
    /** When the light has been all the way round the region's border. */
    borderEnd: number;
    total: number;
    border?: TrailLine;
    connector?: TrailLine;
    ring: THREE.Mesh;
  }
  let trail: Trail | null = null;

  interface TrailLine {
    mesh: THREE.Mesh;
    colors: Float32Array;
    along: Float32Array;
    halfWidth: { value: number };
    /** Width in CSS pixels. */
    width: number;
  }

  const trailRingGeo = new THREE.RingGeometry(0.94, 1, 72);
  trailRingGeo.rotateX(-Math.PI / 2);
  disposables.push(trailRingGeo);

  function trailLine(
    points: THREE.Vector3[],
    closed: boolean,
    parent: THREE.Object3D,
    width: number,
  ): TrailLine {
    const { geometry, along } = ribbonGeometry(points, closed);
    const colors = new Float32Array(along.length * 3);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const { material, halfWidth } = ribbonMaterial({
      vertexColors: true,
      // Added light: where it is dark it adds nothing, so the tail can fade
      // simply by dimming its colour.
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 3;
    parent.add(mesh);
    return { mesh, colors, along, halfWidth, width };
  }

  function disposeLine(entry?: TrailLine) {
    if (!entry) return;
    entry.mesh.removeFromParent();
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
  }

  function endTrail() {
    if (!trail) return;
    disposeLine(trail.border);
    disposeLine(trail.connector);
    trail.ring.removeFromParent();
    (trail.ring.material as THREE.Material).dispose();
    trail = null;
    dirty = true;
  }

  function startTrail(marker: MarkerView, kind: "new-region" | "region-kept") {
    endTrail();
    if (reduceMotion) return;
    const region = regions.find((r) => r.id === marker.loc.regionId);
    if (!region) return;

    // Where the region's border comes nearest the city: the trail sets out
    // from there and returns there before it crosses.
    const city = new THREE.Vector2(marker.loc.x, marker.loc.y);
    let nearest = 0;
    region.loop.forEach((pt, i) => {
      if (pt.distanceToSquared(city) < region.loop[nearest].distanceToSquared(city)) nearest = i;
    });

    // Stage timings, in seconds. A new region gets the whole gesture; within
    // the same region the border is already lit, so the trail starts at the
    // crossing.
    const stages: Stage[] =
      kind === "new-region"
        ? [
            { name: "border", start: 0, end: 0.8 },
            { name: "connector", start: 0.62, end: 0.98 },
            { name: "ring", start: 0.9, end: 1.3 },
          ]
        : [
            { name: "connector", start: 0, end: 0.36 },
            { name: "ring", start: 0.28, end: 0.68 },
          ];
    const ringStage = stages[stages.length - 1];

    const ringMat = new THREE.MeshBasicMaterial({
      color: C.trail,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(trailRingGeo, ringMat);
    ring.position.copy(toWorld(city.x, city.y, marker.ground + 0.012));
    ring.visible = false;
    region.mesh.add(ring);

    trail = {
      locationId: marker.loc.id,
      region,
      marker,
      t: 0,
      stages,
      arrival: ringStage.start + (ringStage.end - ringStage.start) * 0.55,
      borderEnd: stages.find((s) => s.name === "border")?.end ?? 0,
      total: ringStage.end + 0.35,
      ring,
    };

    if (kind === "new-region") {
      const n = region.loop.length;
      const points: THREE.Vector3[] = [];
      // Once round, ending back where it began — open, so the run has a
      // start and an end rather than wrapping on itself.
      for (let k = 0; k <= n; k++) {
        const pt = region.loop[(nearest + k) % n];
        points.push(toWorld(pt.x, pt.y, heightAt(pt.x, pt.y) + 0.008));
      }
      trail.border = trailLine(points, false, region.mesh, 2.2);
    }
    const edgePoint = region.loop[nearest];
    const from = toWorld(edgePoint.x, edgePoint.y, heightAt(edgePoint.x, edgePoint.y) + 0.008);
    const to = toWorld(city.x, city.y, marker.ground + 0.06);
    // Up and over: high enough to read as a leap, never as a road.
    const apex = from
      .clone()
      .lerp(to, 0.5)
      .setY(Math.max(from.y, to.y) + clamp(from.distanceTo(to) * 0.45, 0.14, 0.9));
    const curve = new THREE.QuadraticBezierCurve3(from, apex, to);
    trail.connector = trailLine(curve.getPoints(40), false, region.mesh, 1.6);
    dirty = true;
  }

  /** A bright head with a tail that fades behind it, along one line. */
  function paintComet(entry: TrailLine, head: number, tail: number, fade: number) {
    const { colors, along } = entry;
    for (let i = 0; i < along.length; i++) {
      const behind = head - along[i];
      const v = behind < 0 || behind > tail ? 0 : (1 - behind / tail) ** 1.6 * fade;
      colors[i * 3] = C.trail.r * v;
      colors[i * 3 + 1] = C.trail.g * v;
      colors[i * 3 + 2] = C.trail.b * v;
    }
    entry.mesh.geometry.getAttribute("color").needsUpdate = true;
  }

  function advanceTrail(dt: number, worldPerPixel: number) {
    if (!trail) return false;
    trail.t += dt;
    for (const line of [trail.border, trail.connector]) {
      if (line) line.halfWidth.value = (line.width * worldPerPixel) / 2;
    }
    const { t } = trail;
    const progress = (stage?: Stage) =>
      stage ? clamp((t - stage.start) / (stage.end - stage.start), 0, 1) : 0;
    const stage = (name: Stage["name"]) => trail!.stages.find((s) => s.name === name);

    const border = stage("border");
    if (trail.border && border) {
      // The head runs once round and back to where it started; the tail
      // follows it home and is gone.
      const tail = 0.28;
      paintComet(trail.border, easeInOut(progress(border)) * (1 + tail), tail, 1);
    }
    const connector = stage("connector");
    if (trail.connector && connector) {
      const p = progress(connector);
      // It draws itself toward the city, holds a moment, then lets go.
      const fade = t < connector.end ? 1 : clamp(1 - (t - connector.end) / 0.3, 0, 1);
      paintComet(trail.connector, easeInOut(p) * 1.5, 1.5, fade);
    }
    const ring = stage("ring");
    if (ring) {
      const p = progress(ring);
      trail.ring.visible = p > 0 && p < 1;
      // Closing in from about the size of a town onto the marker.
      const radius = THREE.MathUtils.lerp(1.1, 0.14, 1 - (1 - p) ** 3) * markerScale;
      trail.ring.scale.setScalar(Math.max(radius, 0.01));
      (trail.ring.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * p) * 0.75;
    }

    if (t >= trail.total) endTrail();
    return true;
  }

  // ------------------------------------------------------------ input

  interface Pointer {
    x: number;
    y: number;
  }
  const pointers = new Map<number, Pointer>();
  let dragStart: { x: number; y: number; time: number; moved: number } | null = null;
  let pinchStart: { dist: number; distance: number } | null = null;
  let lastHoverPoint: { x: number; y: number } | null = null;

  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const grabFrom = new THREE.Vector3();
  const grabTo = new THREE.Vector3();
  let lastDragAt = 0;

  function groundAt(clientX: number, clientY: number, out: THREE.Vector3) {
    toNdc(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(ground, out) !== null;
  }

  /**
   * Moves the view so the ground under one screen point ends up under
   * another: the map stays under the finger, at every zoom and tilt, instead
   * of sliding at some average rate.
   */
  function grab(fromX: number, fromY: number, toX: number, toY: number) {
    if (!groundAt(fromX, fromY, grabFrom) || !groundAt(toX, toY, grabTo)) return;
    const delta = grabFrom.sub(grabTo);
    delta.y = 0;
    view.target.add(delta);
    clampTarget();
    placeCamera();
    camera.updateMatrixWorld();

    // Keep the release speed, so a flick carries on a little.
    const now = performance.now();
    const seconds = Math.max(0.008, (now - lastDragAt) / 1000);
    lastDragAt = now;
    drift.lerp(delta.divideScalar(seconds), 0.6);
    const cap = HOME.distance * 1.4;
    if (drift.length() > cap) drift.setLength(cap);
  }

  function onPointerDown(event: PointerEvent) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragStart = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        moved: 0,
      };
      drift.set(0, 0, 0);
      lastDragAt = performance.now();
      // Someone who reaches for the map before the way in has played has
      // taken the camera; the entrance must not snatch it back.
      entered = true;
      flight = null;
      opts.onInteract?.();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        distance: view.distance,
      };
      dragStart = null;
    }
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    const previous = pointers.get(event.pointerId);

    // Parallax follows a mouse, not a finger.
    if (event.pointerType === "mouse" && !reduceMotion) {
      const rect = canvas.getBoundingClientRect();
      parallax.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      parallax.ty = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    }

    if (!previous) {
      lastHoverPoint = { x: event.clientX, y: event.clientY };
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;

    if (pointers.size === 2 && pinchStart) {
      const [a0, b0] = [...pointers.values()];
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      view.distance = clamp(
        pinchStart.distance * (pinchStart.dist / Math.max(dist, 1)),
        MIN_DISTANCE,
        maxDistance,
      );
      placeCamera();
      camera.updateMatrixWorld();
      // The midpoint between the fingers drags the map, as one finger does.
      grab((a0.x + b0.x) / 2, (a0.y + b0.y) / 2, (a.x + b.x) / 2, (a.y + b.y) / 2);
      drift.set(0, 0, 0);
      dirty = true;
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (dragStart) {
      dragStart.moved += Math.hypot(dx, dy);
      if (dragStart.moved > 4) {
        grab(previous.x, previous.y, event.clientX, event.clientY);
        canvas.style.cursor = "grabbing";
        dirty = true;
      }
    }
  }

  function onPointerUp(event: PointerEvent) {
    const touch = event.pointerType !== "mouse";
    const wasTap =
      dragStart && dragStart.moved <= (touch ? 10 : 6) && performance.now() - dragStart.time < 500;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;

    if (wasTap && pointers.size === 0) {
      const id = pickMarker(event.clientX, event.clientY, touch ? 26 : 16);
      if (id) opts.onPick(id);
    }
    if (pointers.size === 0) {
      dragStart = null;
      canvas.style.cursor = "";
      // A drag that stopped before it was let go has no flick in it.
      if (reduceMotion || performance.now() - lastDragAt > 90) drift.set(0, 0, 0);
    }
  }

  function onPointerLeave() {
    parallax.tx = 0;
    parallax.ty = 0;
    lastHoverPoint = null;
    if (hoveredId || hoveredRegion) {
      hoveredId = null;
      hoveredRegion = null;
      opts.onHover(null);
      applyEmphasis();
    }
    canvas.style.cursor = "";
  }

  /**
   * Plain wheel scrolls the page. Zooming on every wheel turn would trap the
   * reader inside a section that sits above the project grid, so the wheel
   * zooms only with Ctrl or ⌘ held — which is also what a trackpad pinch
   * sends, so pinching a trackpad zooms without anyone being told how.
   */
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    flight = null;
    entered = true;
    opts.onInteract?.();
    const factor = Math.exp(event.deltaY * 0.0022);
    view.distance = clamp(view.distance * factor, MIN_DISTANCE, maxDistance);
    dirty = true;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ------------------------------------------------------------ loop

  let dirty = true;
  let active = true;
  let raf = 0;
  let markerScale = 1;
  let last = performance.now();
  let clock = 0;

  function frame(now: number) {
    raf = 0;
    // Never negative: a frame's timestamp can fall just before the moment
    // the loop was woken, and easing run backwards overshoots wildly.
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    clock += dt;
    let animating = false;

    // Hover is resolved once a frame, not once per pointer event.
    if (lastHoverPoint && pointers.size === 0) {
      const id = pickMarker(lastHoverPoint.x, lastHoverPoint.y);
      const region = id ? null : pickRegion(lastHoverPoint.x, lastHoverPoint.y);
      canvas.style.cursor = id ? "pointer" : "grab";
      if (id !== hoveredId || region !== hoveredRegion) {
        hoveredId = id;
        hoveredRegion = region;
        opts.onHover(id);
        applyEmphasis();
      }
      lastHoverPoint = null;
    }

    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      const k = easeInOut(flight.t);
      view.target.lerpVectors(flight.from.target, flight.to.target, k);
      // The rise follows a sine over the eased progress, so it peaks as the
      // camera is fastest and is gone by the time it arrives.
      const rise = Math.sin(Math.PI * k);
      view.distance =
        THREE.MathUtils.lerp(flight.from.distance, flight.to.distance, k) + flight.arc * rise;
      // Higher up, it looks a little more straight down, as a person would.
      view.polar =
        THREE.MathUtils.lerp(flight.from.polar, flight.to.polar, k) -
        (flight.arc / Math.max(flight.to.distance, 1)) * 0.14 * rise;
      view.azimuth = THREE.MathUtils.lerp(flight.from.azimuth, flight.to.azimuth, k);
      if (flight.t >= 1) flight = null;
      animating = true;
    } else {
      if (!dragStart && drift.lengthSq() > 1e-4) {
        view.target.addScaledVector(drift, dt);
        clampTarget();
        drift.multiplyScalar(Math.exp(-5 * dt));
        animating = true;
      }
      // A flight the visitor cut short — a drag during the way in — leaves
      // the camera mid-turn. Ease the angles to where that flight was going
      // rather than leave the map askew. Not before the way in, though: the
      // camera is meant to be waiting up there.
      const settleRate = entered ? 3 : 0;
      const az = damp(view.azimuth, HOME.azimuth, settleRate, dt);
      const po = damp(view.polar, restPolar, settleRate, dt);
      const di =
        view.distance > maxDistance
          ? damp(view.distance, maxDistance, settleRate, dt)
          : view.distance;
      if (
        Math.abs(az - view.azimuth) > 1e-4 ||
        Math.abs(po - view.polar) > 1e-4 ||
        Math.abs(di - view.distance) > 1e-4
      ) {
        animating = true;
      }
      view.azimuth = az;
      view.polar = po;
      view.distance = di;
    }

    const px = damp(parallax.x, parallax.tx, 4, dt);
    const py = damp(parallax.y, parallax.ty, 4, dt);
    if (Math.abs(px - parallax.x) > 1e-4 || Math.abs(py - parallax.y) > 1e-4) animating = true;
    parallax.x = px;
    parallax.y = py;

    // What one CSS pixel measures on the ground at the camera's target, so
    // ribbons keep their width in pixels as the camera closes in.
    const worldPerPixel =
      (2 * view.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / canvasH;

    for (const region of regions) {
      // A chosen region rises over the length of the camera's flight rather
      // than snapping up before it: the ground lifts to meet the camera.
      const rate = region.liftTarget === LIFT.selected ? 4.5 : 8;
      const lift = damp(region.lift, region.liftTarget, rate, dt);
      if (Math.abs(lift - region.lift) > 1e-4) animating = true;
      region.lift = lift;
      region.mesh.position.y = lift;

      const blend = 1 - Math.exp(-7 * dt);
      const topMoving = approach(region.top.color, region.colorTarget, blend);
      const sideMoving = approach(region.side.color, region.sideTarget, blend);
      // While the trail's light is running round a region, the light is what
      // draws its border: the border itself brightens only once it has gone
      // all the way round.
      const tracing = trail?.region === region && trail.border && trail.t < trail.borderEnd;
      const borderTarget = tracing ? BORDER.work : region.borderTarget;
      const edgeMoving = approach(
        region.borderMat.color,
        tracing ? C.edge : region.edgeColorTarget,
        blend,
      );
      const settle = (value: number, target: number) => {
        const next = damp(value, target, 8, dt);
        return Math.abs(next - target) < 1e-3 ? target : next;
      };
      const width = settle(region.border.width, borderTarget.width);
      const opacity = settle(region.border.opacity, borderTarget.opacity);
      if (
        topMoving ||
        sideMoving ||
        edgeMoving ||
        tracing ||
        width !== region.border.width ||
        opacity !== region.border.opacity
      ) {
        animating = true;
      }
      region.border.width = width;
      region.border.opacity = opacity;
      region.borderHalfWidth.value = (width * worldPerPixel) / 2;
      region.borderMat.opacity = opacity;
    }

    if (advanceTrail(dt, worldPerPixel)) animating = true;

    // Markers keep roughly their size on screen as the camera closes in;
    // left to perspective, a pin at street level would be the size of a city.
    markerScale = clamp((view.distance / HOME.distance) ** 0.8, 0.36, 1);

    for (const m of markers) {
      m.group.scale.setScalar(markerScale);
      // The beam waits for the trail to reach the city, then rises.
      const waiting = trail && trail.marker === m && trail.t < trail.arrival;
      const e = damp(
        m.emphasis,
        waiting ? Math.min(m.emphasisTarget, 0.3) : m.emphasisTarget,
        10,
        dt,
      );
      if (Math.abs(e - m.emphasis) > 1e-3) animating = true;
      m.emphasis = e;

      const region = regions.find((r) => r.id === m.loc.regionId);
      m.group.position.y = (region ? region.lift : 0) + m.ground;

      m.dot.scale.setScalar(1 + e * 0.9);
      m.dotMat.color.copy(C.marker).lerp(C.markerActive, e);

      m.beam.scale.y = 0.001 + e * 0.9;
      m.beamMat.opacity = e * 0.55;

      if (reduceMotion) {
        m.ring.scale.setScalar(1.4);
        m.ringMat.opacity = 0.35 + e * 0.4;
      } else {
        // A slow breath outward. The selected marker breathes faster and
        // brighter, which is what draws the eye to it on a busy coast.
        const speed = 0.55 + e * 0.5;
        const t = (clock * speed + m.phase) % 1;
        m.ring.scale.setScalar(1 + t * (1.6 + e * 1.4));
        m.ringMat.opacity = (1 - t) * (0.5 + e * 0.45);
        animating = true;
      }
    }

    if (dirty || animating) {
      placeCamera();
      renderer.render(scene, camera);
      opts.onFrame();
      dirty = false;
    }

    if (active) raf = requestAnimationFrame(frame);
  }

  function setActive(next: boolean) {
    if (next === active) return;
    active = next;
    if (active && !raf) {
      last = performance.now();
      dirty = true;
      raf = requestAnimationFrame(frame);
    }
  }

  resize();
  raf = requestAnimationFrame(frame);

  // ------------------------------------------------------------ api

  return {
    setLocations,
    setSelected,
    setHighlightedRegion(regionId) {
      externalRegion = regionId;
      applyEmphasis();
    },
    zoomBy(factor) {
      flight = null;
      entered = true;
      view.distance = clamp(view.distance * factor, MIN_DISTANCE, maxDistance);
      dirty = true;
    },
    resetView() {
      // The camera only. What is selected belongs to the page, and the card
      // beside the map still shows it.
      entered = true;
      flyHome();
    },
    enter() {
      if (entered) return;
      entered = true;
      // A visitor who picked from the list before scrolling here is already
      // on their way somewhere; the entrance would only fight that.
      if (flight || selectedId) return;
      if (reduceMotion) {
        view.target.copy(HOME.target);
        view.distance = HOME.distance;
        view.polar = HOME.polar;
        view.azimuth = HOME.azimuth;
        dirty = true;
      } else {
        flyHome(2.1);
      }
    },
    setInset(endPx, rtl) {
      if (endPx === insetPx && rtl === insetRtl) return;
      insetPx = Math.max(0, endPx);
      insetRtl = rtl;
      resize();
    },
    project(locationId) {
      const marker = markers.find((m) => m.loc.id === locationId);
      if (!marker) return null;
      syncCamera();
      const rect = canvas.getBoundingClientRect();
      const dot = marker.group.position.clone();
      dot.y += marker.dot.position.y * markerScale;
      dot.project(camera);
      const label = marker.group.position.clone();
      label.y += (0.25 + marker.emphasis * 0.55) * markerScale;
      label.project(camera);
      return {
        x: ((dot.x + 1) / 2) * rect.width,
        y: ((1 - dot.y) / 2) * rect.height,
        labelY: ((1 - label.y) / 2) * rect.height,
        visible: dot.z < 1 && Math.abs(dot.x) <= 1.05 && Math.abs(dot.y) <= 1.05,
        emphasis: marker.emphasis,
      };
    },
    inspect() {
      return {
        selectedRegion: markers.find((m) => m.loc.id === selectedId)?.loc.regionId ?? null,
        lifts: Object.fromEntries(regions.map((r) => [r.id, r.lift])),
        ground: Object.fromEntries(markers.map((m) => [m.loc.id, m.ground])),
        trail: trail
          ? { locationId: trail.locationId, stages: trail.stages.map((s) => s.name), t: trail.t }
          : null,
        flying: flight !== null,
      };
    },
    setActive,
    dispose() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      endTrail();
      clearMarkers();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
