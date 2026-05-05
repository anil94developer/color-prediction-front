import {
  GRID,
  SAFE_RING_INDICES,
  YARD_SLOTS,
  HOME_STRETCH,
  RC_KEY,
  buildRcToRing,
  quadrantAt,
  isCenterZone,
  RING_INDEX_TO_CELL,
  ENTRY_ARROW_BY_RING,
  ENTRY_RING_COLOR,
  CORNER_COLOR_KEYS,
} from "../utils/ludoClassicBoard.js";

const rcToRing = buildRcToRing();

function cornerIndexForEntry(entry) {
  if (entry === 0) return 0;
  if (entry === 13) return 1;
  if (entry === 26) return 2;
  if (entry === 39) return 3;
  if (entry === 17) return 1;
  if (entry === 34) return 2;
  return 0;
}

function homeArmIndex(r, c) {
  for (let i = 0; i < HOME_STRETCH.length; i++) {
    if (HOME_STRETCH[i].some(([sr, sc]) => sr === r && sc === c)) return i;
  }
  return -1;
}

function yardCornerFromSlot(r, c) {
  for (let ci = 0; ci < YARD_SLOTS.length; ci++) {
    for (let j = 0; j < 4; j++) {
      const [yr, yc] = YARD_SLOTS[ci][j];
      if (yr === r && yc === c) return ci;
    }
  }
  return -1;
}

function cellBaseClass(r, c) {
  const classes = ["ludo-cl-cell"];

  if (isCenterZone(r, c)) {
    classes.push("ludo-cl-cell--center");
    return classes.join(" ");
  }

  const armIdx = homeArmIndex(r, c);
  if (armIdx >= 0) {
    classes.push("ludo-cl-arm", `ludo-cl-arm--${CORNER_COLOR_KEYS[armIdx]}`);
    return classes.join(" ");
  }

  const ringI = rcToRing.get(RC_KEY(r, c));
  if (ringI !== undefined) {
    classes.push("ludo-cl-track");
    if (SAFE_RING_INDICES.has(ringI)) classes.push("ludo-cl-track--safe");
    return classes.join(" ");
  }

  const yardCi = yardCornerFromSlot(r, c);
  if (yardCi >= 0) {
    classes.push("ludo-cl-yard-slot", `ludo-cl-yard-slot--${CORNER_COLOR_KEYS[yardCi]}`);
    return classes.join(" ");
  }

  const q = quadrantAt(r, c);
  if (q === "green") {
    if (r >= 1 && r <= 4 && c >= 1 && c <= 4) classes.push("ludo-cl-pocket-mat");
    else classes.push("ludo-cl-base", "ludo-cl-base--green");
  } else if (q === "yellow") {
    if (r >= 1 && r <= 4 && c >= 10 && c <= 13) classes.push("ludo-cl-pocket-mat");
    else classes.push("ludo-cl-base", "ludo-cl-base--yellow");
  } else if (q === "blue") {
    if (r >= 10 && r <= 13 && c >= 10 && c <= 13) classes.push("ludo-cl-pocket-mat");
    else classes.push("ludo-cl-base", "ludo-cl-base--blue");
  } else if (q === "red") {
    if (r >= 10 && r <= 13 && c >= 1 && c <= 4) classes.push("ludo-cl-pocket-mat");
    else classes.push("ludo-cl-base", "ludo-cl-base--red");
  } else {
    classes.push("ludo-cl-cross");
  }

  return classes.join(" ");
}

function aggregatePawns(game) {
  /** @type {Map<string, Array<{color:string, pawnIndex:number, isYou:boolean, userId:string, name:string}>>} */
  const map = new Map();
  const entries = game.entries || [0, 13, 26, 39];

  function push(key, meta) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(meta);
  }

  game.players.forEach((pl, pi) => {
    const ci = cornerIndexForEntry(entries[pi]);
    pl.pawns.forEach((pawn) => {
      const meta = {
        color: pl.color,
        pawnIndex: pawn.index,
        isYou: pl.isYou,
        userId: pl.userId,
        name: pl.name,
      };
      if (pawn.inYard) {
        const slot = YARD_SLOTS[ci][pawn.index];
        if (slot) push(RC_KEY(slot[0], slot[1]), meta);
      } else if (pawn.finished) {
        push("__center__", meta);
      } else if (pawn.inHome && pawn.progress >= 52 && pawn.progress <= 56) {
        const stretch = HOME_STRETCH[ci][pawn.progress - 52];
        if (stretch) push(RC_KEY(stretch[0], stretch[1]), meta);
      } else if (pawn.globalCell != null && RING_INDEX_TO_CELL[pawn.globalCell]) {
        const { r, c } = RING_INDEX_TO_CELL[pawn.globalCell];
        push(RC_KEY(r, c), meta);
      }
    });
  });

  return map;
}

function PawnPin({ color, isYou, selectable, onSelect, disabled, label }) {
  const cls = `ludo-cl-pin ${isYou ? "ludo-cl-pin--you" : ""} ${selectable ? "ludo-cl-pin--selectable" : ""}`;
  if (selectable && onSelect) {
    return (
      <button
        type="button"
        className={cls}
        style={{ "--pin-color": color }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        disabled={disabled}
        aria-label={`Move token ${label}`}
      />
    );
  }
  return <span className={cls} style={{ "--pin-color": color }} aria-hidden />;
}

/**
 * @param {{
 *   game: object,
 *   pickMode?: boolean,
 *   legalPawnIndices?: number[],
 *   onPawnSelect?: (idx: number) => void,
 *   moving?: boolean,
 * }} props
 */
export default function LudoClassicBoard({ game, pickMode = false, legalPawnIndices = [], onPawnSelect, moving = false }) {
  const byCell = aggregatePawns(game);
  const legalSet = new Set((legalPawnIndices || []).filter((n) => Number.isInteger(n)));

  const cells = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const key = RC_KEY(r, c);
      const pawnsHere = byCell.get(key) || [];
      const ringI = rcToRing.get(key);
      const hasSelectable = pickMode && pawnsHere.some((p) => p.isYou && legalSet.has(p.pawnIndex));
      const showArrow = ringI !== undefined && ENTRY_ARROW_BY_RING.has(ringI);
      const arrowColor = showArrow ? ENTRY_RING_COLOR[ringI] : null;
      const arrowCh = showArrow ? ENTRY_ARROW_BY_RING.get(ringI) : null;

      cells.push(
        <div
          key={key}
          className={`${cellBaseClass(r, c)}${hasSelectable ? " ludo-cl-cell--pick-hint" : ""}`}
          style={{ gridRow: r + 1, gridColumn: c + 1 }}
        >
          {ringI !== undefined && SAFE_RING_INDICES.has(ringI) ? (
            <span className="ludo-cl-star" aria-hidden>
              ★
            </span>
          ) : null}
          {arrowCh && arrowColor ? (
            <span className={`ludo-cl-entry-arrow ludo-cl-entry-arrow--${arrowColor}`} aria-hidden>
              {arrowCh}
            </span>
          ) : null}
          <div className="ludo-cl-pin-stack">
            {pawnsHere.map((p, i) => {
              const selectable = Boolean(
                pickMode && onPawnSelect && p.isYou && legalSet.has(p.pawnIndex)
              );
              const label = String(p.pawnIndex + 1);
              return (
                <PawnPin
                  key={`${p.userId}-${p.pawnIndex}-${i}`}
                  color={p.color}
                  isYou={p.isYou}
                  selectable={selectable}
                  onSelect={selectable ? () => onPawnSelect(p.pawnIndex) : undefined}
                  disabled={moving}
                  label={label}
                />
              );
            })}
          </div>
        </div>
      );
    }
  }

  const centerPawns = byCell.get("__center__") || [];

  return (
    <div className="ludo-classic-board">
      <div className="ludo-classic-grid">{cells}</div>
      <div className="ludo-classic-center-overlay" aria-hidden />
      <div className="ludo-classic-center-pins">
        {centerPawns.map((p, i) => (
          <PawnPin key={`c-${p.userId}-${p.pawnIndex}-${i}`} color={p.color} isYou={p.isYou} />
        ))}
      </div>
    </div>
  );
}
