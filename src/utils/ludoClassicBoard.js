/**
 * Classic 15×15 Ludo layout — outer ring index 0..51 matches API globalCell.
 * Visual corners: green TL, yellow TR, blue BR, red BL — PATH[0],[13],[26],[39] are starts.
 */

export const GRID = 15;

/** Clockwise outer track (52 cells). Must match server SAFE_CELLS ring indices. */
export const OUTER_RING_PATH = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
];

export const SAFE_RING_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Yard pocket positions (2×2) per player index */
export const YARD_SLOTS = [
  [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ],
  [
    [1, 12],
    [1, 13],
    [2, 12],
    [2, 13],
  ],
  [
    [12, 12],
    [12, 13],
    [13, 12],
    [13, 13],
  ],
  [
    [12, 1],
    [12, 2],
    [13, 1],
    [13, 2],
  ],
];

/** Home colored column toward center (progress 52..56) */
export const HOME_STRETCH = [
  [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
];

export const RC_KEY = (r, c) => `${r},${c}`;

/** Ring index 0..51 → grid cell (matches API globalCell). */
export const RING_INDEX_TO_CELL = OUTER_RING_PATH.map(([r, c]) => ({ r, c }));

/** grid -> ring index (outer only) */
export function buildRcToRing() {
  const m = new Map();
  OUTER_RING_PATH.forEach(([r, c], i) => {
    m.set(RC_KEY(r, c), i);
  });
  return m;
}

/** Corner quadrant ids — matches classic board: green TL, yellow TR, blue BR, red BL */
export function quadrantAt(r, c) {
  if (r < 6 && c < 6) return "green";
  if (r < 6 && c > 8) return "yellow";
  if (r > 8 && c > 8) return "blue";
  if (r > 8 && c < 6) return "red";
  return "cross";
}

/** Ring index → start arrow (clockwise path from green start at PATH[0]). */
export const ENTRY_ARROW_BY_RING = new Map([
  [0, ">"],
  [13, "v"],
  [26, "<"],
  [39, "^"],
]);

/** Ring index → corner color for arrow glyph */
export const ENTRY_RING_COLOR = { 0: "green", 13: "yellow", 26: "blue", 39: "red" };

export const CORNER_COLOR_KEYS = ["green", "yellow", "blue", "red"];

/** Flat reference palette (matches physical boards). */
export const BOARD_PALETTE = {
  green: "#43A047",
  yellow: "#FDD835",
  blue: "#1E88E5",
  red: "#E53935",
  track: "#ffffff",
  grid: "#0a0a0a",
};

export function isCenterZone(r, c) {
  return r >= 6 && r <= 8 && c >= 6 && c <= 8;
}
