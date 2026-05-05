import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";
import BottomNav from "../components/BottomNav.jsx";
import airplaneImg from "../assets/airplane.png";

const BET_PRESETS = [1, 2, 5, 10];

/** PNG is already drawn climbing toward top‑right; subtract from path tangent (deg) */
const PLANE_HEADING_ADJ = 22;
/** Size in SVG viewBox units (0–100) */
const PLANE_SIZE = 11;
const PLANE_SIZE_DUAL = 9;

/** Quadratic Bezier: matches SVG path M 8 88 Q 35 55 92 8 (viewBox 0–100) */
const BEZ = {
  p0: { x: 8, y: 88 },
  p1: { x: 35, y: 55 },
  p2: { x: 92, y: 8 },
};

const FLIGHT_PATH_D = "M 8 88 Q 35 55 92 8";

function quadPoint(t, p0, p1, p2) {
  const u = 1 - t;
  const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  return { x, y };
}

function quadTangentDeg(t, p0, p1, p2) {
  const u = 1 - t;
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Map multiplier → progress along curve (0–1); slightly eased so high mult still reaches top */
function multToT(mult) {
  const m = Math.max(1, Number(mult) || 1);
  return Math.min(1, (m - 1) / 18);
}

/** Closed path: area under the bezier from t=0..tMax, vertical cut at the tip, bottom y=100 */
function buildUnderCurvePath(p0, p1, p2, tMax, samples = 72) {
  if (tMax < 0.001) return "";
  const n = Math.max(4, Math.ceil(samples * tMax));
  const tip = quadPoint(tMax, p0, p1, p2);
  const chunks = [`M ${p0.x} 100 L ${p0.x} ${p0.y}`];
  for (let i = 1; i <= n; i += 1) {
    const u = (i / n) * tMax;
    const pt = quadPoint(u, p0, p1, p2);
    chunks.push(`L ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`);
  }
  chunks.push(`L ${tip.x.toFixed(3)} 100 Z`);
  return chunks.join(" ");
}

function PlaneSprite({ cx, cy, tangentDeg, className, size = PLANE_SIZE }) {
  const half = size / 2;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${tangentDeg - PLANE_HEADING_ADJ})`}>
      <image
        href={airplaneImg}
        className={className}
        x={-half}
        y={-half}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

function stakeDefaults() {
  return { bet: 1 };
}

export default function Aviator() {
  const { user, refreshMe } = useAuth();
  const [slot0, setSlot0] = useState(stakeDefaults);
  const [slot1, setSlot1] = useState(stakeDefaults);
  const [globalRound, setGlobalRound] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("all");
  const [recentCrashes, setRecentCrashes] = useState([]);
  const [liveBets, setLiveBets] = useState([]);
  const [panelTab0, setPanelTab0] = useState("bet");
  const [panelTab1, setPanelTab1] = useState("bet");
  const [curveLen, setCurveLen] = useState(0);
  const [auto0, setAuto0] = useState({ enabledCash: false, cashAt: 2 });
  const [auto1, setAuto1] = useState({ enabledCash: false, cashAt: 2 });
  const [crashFlash, setCrashFlash] = useState(false);
  const [msg0, setMsg0] = useState("");
  const [msg1, setMsg1] = useState("");
  const [cashBusy0, setCashBusy0] = useState(false);
  const [cashBusy1, setCashBusy1] = useState(false);
  const [betBusy0, setBetBusy0] = useState(false);
  const [betBusy1, setBetBusy1] = useState(false);
  const [uiTick, setUiTick] = useState(0);

  const slot0Ref = useRef(slot0);
  const slot1Ref = useRef(slot1);
  slot0Ref.current = slot0;
  slot1Ref.current = slot1;
  const prevPhaseRef = useRef(null);
  const autoCashSent0 = useRef(false);
  const autoCashSent1 = useRef(false);
  const pathRef = useRef(null);

  const fetchGlobal = useCallback(async () => {
    try {
      const { data } = await api.get("/aviator/global/state");
      setGlobalRound(data);
      const prev = prevPhaseRef.current;
      if (prev === "flying" && data.phase === "intermission") setCrashFlash(true);
      prevPhaseRef.current = data.phase;
    } catch {
      /* ignore */
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const { data } = await api.get("/aviator/feed");
      setRecentCrashes(data?.recentCrashes ?? []);
      setLiveBets(data?.liveBets ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchGlobal();
    fetchFeed();
    refreshMe();
  }, [fetchGlobal, fetchFeed, refreshMe]);

  useEffect(() => {
    const id = window.setInterval(fetchGlobal, 140);
    return () => window.clearInterval(id);
  }, [fetchGlobal]);

  useEffect(() => {
    const id = window.setInterval(fetchFeed, 1800);
    return () => window.clearInterval(id);
  }, [fetchFeed]);

  useEffect(() => {
    const id = window.setInterval(() => refreshMe(), 5000);
    return () => window.clearInterval(id);
  }, [refreshMe]);

  const phase = globalRound?.phase ?? "betting";
  const anyFlying = phase === "flying";
  const bettingEndsAt = globalRound?.bettingEndsAt ?? 0;
  const bettingPlacesCloseAt =
    globalRound?.bettingPlacesCloseAt ?? globalRound?.bettingEndsAt ?? 0;
  const mult = Number(globalRound?.multiplier) || 1;
  const slotsMeta = globalRound?.slots ?? [
    { hasBet: false },
    { hasBet: false },
  ];
  const betSlot0 = globalRound?.slots?.[0];
  const betSlot1 = globalRound?.slots?.[1];

  useEffect(() => {
    const need =
      phase === "betting" || phase === "intermission" || crashFlash || anyFlying;
    if (!need) return undefined;
    const tid = window.setInterval(() => setUiTick((x) => x + 1), 200);
    return () => window.clearInterval(tid);
  }, [phase, crashFlash, anyFlying]);

  useEffect(() => {
    if (!crashFlash) return undefined;
    const id = window.setTimeout(() => setCrashFlash(false), 900);
    return () => window.clearTimeout(id);
  }, [crashFlash]);

  const startRound = useCallback(
    async (slot) => {
      const snap = slot === 0 ? slot0Ref.current : slot1Ref.current;
      const setMsg = slot === 0 ? setMsg0 : setMsg1;
      const setBusy = slot === 0 ? setBetBusy0 : setBetBusy1;
      if (slot === 0) autoCashSent0.current = false;
      else autoCashSent1.current = false;
      setMsg("");
      setBusy(true);
      try {
        await api.post("/aviator/global/bet", { amount: snap.bet, slot });
        await refreshMe();
        await fetchGlobal();
      } catch (e) {
        setMsg(e.response?.data?.error || "Could not place bet.");
      } finally {
        setBusy(false);
      }
    },
    [refreshMe, fetchGlobal]
  );

  const cashOut = useCallback(
    async (slot) => {
      const setBusy = slot === 0 ? setCashBusy0 : setCashBusy1;
      const setMsg = slot === 0 ? setMsg0 : setMsg1;
      setBusy(true);
      setMsg("");
      try {
        await api.post("/aviator/global/cashout", { slot });
        await refreshMe();
        await fetchGlobal();
      } catch (e) {
        setMsg(e.response?.data?.error || "Cash out failed.");
      } finally {
        setBusy(false);
      }
    },
    [refreshMe, fetchGlobal]
  );

  useEffect(() => {
    if (phase !== "flying" || !auto0.enabledCash || !auto0.cashAt || auto0.cashAt < 1.01) {
      autoCashSent0.current = false;
      return;
    }
    if (
      betSlot0?.hasBet &&
      !betSlot0?.cashedOut &&
      mult + 1e-9 >= auto0.cashAt &&
      !autoCashSent0.current &&
      !cashBusy0
    ) {
      autoCashSent0.current = true;
      cashOut(0);
    }
  }, [phase, mult, betSlot0?.hasBet, betSlot0?.cashedOut, auto0.enabledCash, auto0.cashAt, cashBusy0, cashOut]);

  useEffect(() => {
    if (phase !== "flying" || !auto1.enabledCash || !auto1.cashAt || auto1.cashAt < 1.01) {
      autoCashSent1.current = false;
      return;
    }
    if (
      betSlot1?.hasBet &&
      !betSlot1?.cashedOut &&
      mult + 1e-9 >= auto1.cashAt &&
      !autoCashSent1.current &&
      !cashBusy1
    ) {
      autoCashSent1.current = true;
      cashOut(1);
    }
  }, [phase, mult, betSlot1?.hasBet, betSlot1?.cashedOut, auto1.enabledCash, auto1.cashAt, cashBusy1, cashOut]);

  function setBet(slot, value) {
    const patch = slot === 0 ? setSlot0 : setSlot1;
    patch((s) => ({ ...s, bet: value }));
  }

  const displayMults = useMemo(() => {
    if (phase !== "flying") return [];
    const out = [];
    if (slotsMeta[0]?.hasBet && !slotsMeta[0]?.cashedOut) out.push({ slot: 0, m: mult });
    if (slotsMeta[1]?.hasBet && !slotsMeta[1]?.cashedOut) out.push({ slot: 1, m: mult });
    return out;
  }, [phase, mult, slotsMeta]);

  const heroMult =
    displayMults.length === 0 ? (phase === "flying" ? mult : 1) : displayMults.length === 1
      ? displayMults[0].m
      : Math.max(displayMults[0].m, displayMults[1].m);

  const trailT = anyFlying ? multToT(heroMult) : 0;

  const planeMarks = useMemo(() => {
    if (phase !== "flying") return [];
    const marks = [];
    const pushAt = (k, slotClass) => {
      const t = multToT(mult);
      marks.push({
        k,
        slotClass,
        ...quadPoint(t, BEZ.p0, BEZ.p1, BEZ.p2),
        deg: quadTangentDeg(t, BEZ.p0, BEZ.p1, BEZ.p2),
      });
    };
    if (slotsMeta[0]?.hasBet && !slotsMeta[0]?.cashedOut) pushAt("s0", "aviator-pro-plane-sprite--slot0");
    if (slotsMeta[1]?.hasBet && !slotsMeta[1]?.cashedOut) pushAt("s1", "aviator-pro-plane-sprite--slot1");
    if (marks.length === 0) pushAt("spectator", "");
    return marks;
  }, [phase, mult, slotsMeta]);

  const anyIntermission = phase === "intermission";
  const showWaitScreen = anyIntermission && !anyFlying;

  const waitSeconds = useMemo(() => {
    if (phase !== "intermission" || !globalRound?.intermissionEndsAt) return 0;
    return Math.max(0, Math.ceil((globalRound.intermissionEndsAt - Date.now()) / 1000));
  }, [phase, globalRound?.intermissionEndsAt, uiTick]);

  const betSecsLeft = useMemo(() => {
    if (phase !== "betting" || !bettingEndsAt) return 0;
    return Math.max(0, Math.ceil((bettingEndsAt - Date.now()) / 1000));
  }, [phase, bettingEndsAt, uiTick]);

  const bettingLockedNow = useMemo(() => {
    if (phase !== "betting" || !bettingEndsAt || !bettingPlacesCloseAt) return false;
    const now = Date.now();
    return now >= bettingPlacesCloseAt && now < bettingEndsAt;
  }, [phase, bettingEndsAt, bettingPlacesCloseAt, uiTick]);

  const svgUid = useId().replace(/:/g, "");
  const gradId = `avi-g-${svgUid}`;
  const fillGradId = `avi-fill-${svgUid}`;

  const fillPathD = useMemo(
    () => buildUnderCurvePath(BEZ.p0, BEZ.p1, BEZ.p2, trailT),
    [trailT]
  );

  const socialCount = useMemo(() => {
    const base = 72 + liveBets.length * 4 + recentCrashes.length * 2;
    return Math.min(999, Math.max(12, base));
  }, [liveBets.length, recentCrashes.length]);

  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    if (len > 0) setCurveLen(len);
  }, []);

  const sidebarRows = useMemo(() => {
    if (sidebarTab === "all") {
      return liveBets.map((row, i) => ({ key: `l-${i}`, ...row }));
    }
    if (sidebarTab === "previous") {
      return recentCrashes.map((m, i) => ({
        key: `p-${i}`,
        player: "—",
        bet: "—",
        mult: m,
        win: "—",
        kind: "crash",
      }));
    }
    const top = [...liveBets]
      .filter((x) => Number(x.win) > 0)
      .sort((a, b) => Number(b.win) - Number(a.win))
      .slice(0, 20)
      .map((row, i) => ({ key: `t-${i}`, ...row }));
    return top;
  }, [sidebarTab, liveBets, recentCrashes]);

  function pillClass(m) {
    const v = Number(m);
    if (v >= 10) return "aviator-pro-pill aviator-pro-pill--hot";
    if (v >= 2) return "aviator-pro-pill aviator-pro-pill--mid";
    return "aviator-pro-pill aviator-pro-pill--low";
  }

  function renderBetPanel(slot) {
    const state = slot === 0 ? slot0 : slot1;
    const tab = slot === 0 ? panelTab0 : panelTab1;
    const setTab = slot === 0 ? setPanelTab0 : setPanelTab1;
    const auto = slot === 0 ? auto0 : auto1;
    const setAuto = slot === 0 ? setAuto0 : setAuto1;
    const meta = slotsMeta[slot] || {};
    const panelMsg = slot === 0 ? msg0 : msg1;
    const cashBusy = slot === 0 ? cashBusy0 : cashBusy1;
    const betBusy = slot === 0 ? betBusy0 : betBusy1;

    const now = Date.now();
    const stakeLocked =
      meta.hasBet ||
      phase === "intermission" ||
      (phase === "betting" && !meta.hasBet && now >= bettingPlacesCloseAt && bettingPlacesCloseAt > 0);
    const showCashout =
      phase === "flying" && meta.hasBet && !meta.cashedOut;
    const showWon = meta.hasBet && meta.cashedOut && phase === "flying";

    void uiTick;

    return (
      <div className="aviator-pro-panel">
        <div className="aviator-pro-panel-tabs">
          <button
            type="button"
            className={`aviator-pro-panel-tab ${tab === "bet" ? "is-on" : ""}`}
            onClick={() => setTab("bet")}
          >
            Bet
          </button>
          <button
            type="button"
            className={`aviator-pro-panel-tab ${tab === "auto" ? "is-on" : ""}`}
            onClick={() => setTab("auto")}
          >
            Auto
          </button>
        </div>

        {tab === "auto" ? (
          <div className="aviator-pro-auto-body">
            <p className="aviator-pro-auto-desc">
              The server runs one shared round for everyone: place your stake during the <strong>betting countdown</strong>,
              then cash out while the multiplier climbs.
            </p>
            <div className="aviator-pro-auto-row">
              <span>Auto cash out</span>
              <button
                type="button"
                className={`aviator-pro-toggle ${auto.enabledCash ? "is-on" : ""}`}
                onClick={() => setAuto((a) => ({ ...a, enabledCash: !a.enabledCash }))}
              >
                {auto.enabledCash ? "On" : "Off"}
              </button>
            </div>
            <div className="aviator-pro-auto-row aviator-pro-auto-row--cash">
              <label htmlFor={`avi-auto-cash-${slot}`}>Cash out at</label>
              <input
                id={`avi-auto-cash-${slot}`}
                type="number"
                step="0.01"
                min="1.01"
                className="aviator-pro-auto-cash-input"
                value={auto.cashAt}
                onChange={(e) =>
                  setAuto((a) => ({
                    ...a,
                    cashAt: Math.max(1.01, Number(e.target.value) || 1.01),
                  }))
                }
              />
              <span className="aviator-pro-auto-x">×</span>
            </div>
            <p className="aviator-pro-auto-foot">Use the Bet tab for stake & chips.</p>
          </div>
        ) : (
          <>
            <div className="aviator-pro-stake">
              <button
                type="button"
                className="aviator-pro-stake-btn"
                onClick={() => setBet(slot, Math.max(1, Number((state.bet - 1).toFixed(2))))}
                aria-label="Decrease stake"
              >
                −
              </button>
              <input
                type="number"
                className="aviator-pro-stake-input"
                min={1}
                step={1}
                value={state.bet}
                onChange={(e) => setBet(slot, Number(e.target.value) || 1)}
                disabled={stakeLocked}
              />
              <button
                type="button"
                className="aviator-pro-stake-btn"
                onClick={() => setBet(slot, Number((state.bet + 1).toFixed(2)))}
                aria-label="Increase stake"
              >
                +
              </button>
            </div>
            <div className="aviator-pro-chips">
              {BET_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`aviator-pro-chip ${state.bet === n ? "is-on" : ""}`}
                  onClick={() => setBet(slot, n)}
                  disabled={stakeLocked}
                >
                  {n}
                </button>
              ))}
            </div>

            {phase === "betting" && !meta.hasBet ? (
              <div
                className={`aviator-pro-wait-panel ${bettingLockedNow ? "aviator-pro-wait-panel--locked" : ""}`}
              >
                <span className="aviator-pro-wait-panel-n">{betSecsLeft}s</span>
                <span className="aviator-pro-wait-panel-t">
                  {bettingLockedNow
                    ? "Betting closed · flight soon"
                    : "Betting — tap Bet to fly"}
                </span>
              </div>
            ) : null}

            {phase === "betting" && meta.hasBet ? (
              <div className="aviator-pro-wait-panel aviator-pro-wait-panel--locked">
                <span className="aviator-pro-wait-panel-t">Bet locked · flight starts soon</span>
              </div>
            ) : null}

            {phase === "flying" && !meta.hasBet ? (
              <div className="aviator-pro-wait-panel">
                <span className="aviator-pro-wait-panel-n">{mult.toFixed(2)}×</span>
                <span className="aviator-pro-wait-panel-t">Flying — tap Bet to join this round</span>
              </div>
            ) : null}

            {!meta.hasBet ? (
              <button
                type="button"
                className="aviator-pro-bet-go"
                onClick={() => startRound(slot)}
                disabled={betBusy}
              >
                <span className="aviator-pro-bet-go-t">{betBusy ? "…" : "Bet"}</span>
                <span className="aviator-pro-bet-go-amt">₹{Number(state.bet).toFixed(2)}</span>
              </button>
            ) : null}

            {showCashout ? (
              <button
                type="button"
                className="aviator-pro-cashout"
                onClick={() => cashOut(slot)}
                disabled={cashBusy}
              >
                <span className="aviator-pro-cashout-t">{cashBusy ? "…" : "Cash out"}</span>
                <span className="aviator-pro-cashout-mult">{mult.toFixed(2)}×</span>
                <span className="aviator-pro-cashout-win">
                  ₹
                  {(
                    (meta.amount * mult) /
                    (meta.entryMult && meta.entryMult > 0 ? meta.entryMult : 1)
                  ).toFixed(2)}
                </span>
              </button>
            ) : null}

            {showWon ? (
              <p className="aviator-pro-panel-msg aviator-pro-win">
                Cashed ₹{Number(meta.payout ?? 0).toFixed(2)} at {meta.cashMult?.toFixed(2)}×
              </p>
            ) : null}

            {panelMsg ? <p className="aviator-pro-panel-msg">{panelMsg}</p> : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell aviator-pro">
      <header className="aviator-pro-header">
        <div className="aviator-pro-brand">
          <Link to="/" className="aviator-pro-logo">
            Aviator
          </Link>
        </div>
        <div className="aviator-pro-header-right">
          <span className="aviator-pro-balance">
            ₹{Number(user?.walletBalance ?? 0).toFixed(2)}
          </span>
          <Link to="/" className="aviator-pro-menu" aria-label="Home">
            ☰
          </Link>
        </div>
      </header>

      <div className="aviator-pro-history">
        <div className="aviator-pro-history-inner">
          {recentCrashes.length === 0 ? (
            <span className="aviator-pro-history-empty">Round history appears here</span>
          ) : (
            recentCrashes.map((m, i) => (
              <span key={`${m}-${i}`} className={pillClass(m)}>
                {Number(m).toFixed(2)}×
              </span>
            ))
          )}
        </div>
      </div>

      <div className="aviator-pro-grid">
        <aside className="aviator-pro-sidebar">
          <div className="aviator-pro-side-tabs">
            {["all", "previous", "top"].map((id) => (
              <button
                key={id}
                type="button"
                className={`aviator-pro-side-tab ${sidebarTab === id ? "is-on" : ""}`}
                onClick={() => setSidebarTab(id)}
              >
                {id === "all" ? "All bets" : id === "previous" ? "Previous" : "Top"}
              </button>
            ))}
          </div>
          <div className="aviator-pro-side-meta">
            Round #{globalRound?.roundSeq ?? "—"} · {liveBets.length} feed · {recentCrashes.length} crashes
          </div>
          <div className="aviator-pro-table-wrap">
            <table className="aviator-pro-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Bet</th>
                  <th>×</th>
                  <th>Win</th>
                </tr>
              </thead>
              <tbody>
                {sidebarRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="aviator-pro-table-empty">
                      No entries yet
                    </td>
                  </tr>
                ) : (
                  sidebarRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.player}</td>
                      <td>{row.bet === "—" ? "—" : `₹${Number(row.bet).toFixed(2)}`}</td>
                      <td
                        className={
                          row.kind === "crash"
                            ? ""
                            : row.mult != null
                              ? "aviator-pro-win"
                              : ""
                        }
                      >
                        {row.kind === "crash"
                          ? `${Number(row.mult).toFixed(2)}×`
                          : row.mult != null
                            ? `${Number(row.mult).toFixed(2)}×`
                            : "—"}
                      </td>
                      <td
                        className={row.win !== "—" && Number(row.win) > 0 ? "aviator-pro-win" : ""}
                      >
                        {row.win === "—" ? "—" : row.win != null ? `₹${Number(row.win).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="aviator-pro-fair">Shared round · server clock</p>
        </aside>

        <section className="aviator-pro-stage-wrap">
          <div className="aviator-pro-fun">
            {phase === "betting"
              ? bettingLockedNow
                ? `Betting locked ${betSecsLeft}s`
                : `Betting ${betSecsLeft}s`
              : phase === "flying"
                ? "Flying"
                : "Break"}
          </div>
          <div className={`aviator-pro-stage ${anyFlying ? "is-live" : ""} ${crashFlash ? "is-crash-flash" : ""}`}>
            <div className="aviator-pro-stage-bg" aria-hidden />
            <svg
              className="aviator-pro-flight-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#ff2b3d" />
                </linearGradient>
                <linearGradient
                  id={fillGradId}
                  x1="50"
                  y1="0"
                  x2="50"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
                  <stop offset="45%" stopColor="#b91c1c" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {fillPathD ? (
                <path d={fillPathD} fill={`url(#${fillGradId})`} className="aviator-pro-area-fill" />
              ) : null}
              <path
                ref={pathRef}
                d={FLIGHT_PATH_D}
                fill="none"
                stroke="rgba(180, 30, 50, 0.12)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d={FLIGHT_PATH_D}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={curveLen || 1000}
                strokeDashoffset={curveLen ? curveLen * (1 - trailT) : 1000}
                className="aviator-pro-trail-active"
              />
              {planeMarks.length === 0 ? (
                <PlaneSprite
                  cx={BEZ.p0.x}
                  cy={BEZ.p0.y}
                  tangentDeg={quadTangentDeg(0, BEZ.p0, BEZ.p1, BEZ.p2)}
                  className="aviator-pro-plane-sprite aviator-pro-plane-sprite--idle"
                />
              ) : (
                planeMarks.map((p) => (
                  <PlaneSprite
                    key={p.k}
                    cx={p.x}
                    cy={p.y}
                    tangentDeg={p.deg}
                    size={planeMarks.length > 1 ? PLANE_SIZE_DUAL : PLANE_SIZE}
                    className={`aviator-pro-plane-sprite ${planeMarks.length > 1 ? p.slotClass : ""}`}
                  />
                ))
              )}
            </svg>
            <div className={`aviator-pro-mult-wrap ${showWaitScreen ? "is-wait-screen" : ""}`}>
              {showWaitScreen ? (
                <div className="aviator-pro-wait-brand">
                  <span className="aviator-pro-wait-kicker">
                    Crashed {globalRound?.lastCrashMultiplier?.toFixed(2) ?? "—"}×
                  </span>
                  <h2 className="aviator-pro-wait-title">Aviator</h2>
                  <p className="aviator-pro-wait-sub">
                    Next betting in <strong>{waitSeconds}</strong>s
                  </p>
                  <span className="aviator-pro-wait-badge">Shared round · place bets on the next countdown</span>
                </div>
              ) : (
                <>
                  <div className="aviator-pro-mult-halo" aria-hidden />
                  {displayMults.length <= 1 ? (
                    <div className="aviator-pro-mult">{Number(heroMult).toFixed(2)}×</div>
                  ) : (
                    <div className="aviator-pro-mult-split">
                      <div className="aviator-pro-mult aviator-pro-mult--sm">
                        L {(displayMults.find((d) => d.slot === 0) || displayMults[0]).m.toFixed(2)}×
                      </div>
                      <div className="aviator-pro-mult aviator-pro-mult--sm">
                        R {(displayMults.find((d) => d.slot === 1) || displayMults[1]).m.toFixed(2)}×
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="aviator-pro-social" aria-hidden>
              <span className="aviator-pro-social-dot" />
              <span className="aviator-pro-social-dot aviator-pro-social-dot--b" />
              <span className="aviator-pro-social-dot aviator-pro-social-dot--c" />
              <span className="aviator-pro-social-count">{socialCount}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="aviator-pro-bet-row">
        {renderBetPanel(0)}
        {renderBetPanel(1)}
      </div>

      <p className="aviator-pro-foot-hint">
        One shared flight for all players: bet during the countdown, then cash out before the crash. Two panels = two
        independent stakes on the same flight.
      </p>

      <BottomNav />
    </div>
  );
}
