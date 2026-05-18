import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";
import { betSheetThemeClass } from "../utils/betSheetTheme.js";
import BottomNav from "../components/BottomNav.jsx";
import NumberImage from "../components/NumberImage.jsx";

const MODES = [
  { key: "WinGo_30S", label: "WinGo 30sec" },
  { key: "WinGo_1M", label: "WinGo 1 Min" },
  { key: "WinGo_3M", label: "WinGo 3 Min" },
  { key: "WinGo_5M", label: "WinGo 5 Min" },
];

/** Headline slug + timing copy for “How to play” modal */
const MODE_RULE_HELP = {
  WinGo_30S: { headSlug: "wingo30s", periodSec: 30, orderSec: 25, waitSec: 5 },
  WinGo_1M: { headSlug: "wingo1m", periodSec: 60, orderSec: 55, waitSec: 5 },
  WinGo_3M: { headSlug: "wingo3m", periodSec: 180, orderSec: 175, waitSec: 5 },
  WinGo_5M: { headSlug: "wingo5m", periodSec: 300, orderSec: 295, waitSec: 5 },
};

const MULTS = [1, 5, 10, 20, 50, 100];
const BALANCE_CHIPS = [1, 10, 100, 1000];
const HISTORY_PAGE_SIZE = 15;

function formatRemaining(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function selectionTitle(betType, numberSel) {
  if (betType === "color_green") return "Green";
  if (betType === "color_red") return "Red";
  if (betType === "color_violet") return "Violet";
  if (betType === "big") return "Big";
  if (betType === "small") return "Small";
  if (betType === "number") return String(numberSel ?? "");
  return "—";
}

export default function Game() {
  const { user, refreshMe } = useAuth();
  const [gameMode, setGameMode] = useState("WinGo_30S");
  const [round, setRound] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [stripResults, setStripResults] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageRef = useRef(1);
  const [historyMeta, setHistoryMeta] = useState({
    total: 0,
    totalPages: 1,
    pageSize: HISTORY_PAGE_SIZE,
    hasNext: false,
    hasPrev: false,
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartPreview, setChartPreview] = useState([]);
  const [tab, setTab] = useState("game");
  const [myBets, setMyBets] = useState([]);
  const [notices, setNotices] = useState([]);
  const [howOpen, setHowOpen] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetBetType, setSheetBetType] = useState(null);
  const [sheetNumber, setSheetNumber] = useState(null);
  const [chipBase, setChipBase] = useState(10);
  const [qty, setQty] = useState(1);
  const [sheetMult, setSheetMult] = useState(1);
  const [agreeRules, setAgreeRules] = useState(true);
  const [sheetMsg, setSheetMsg] = useState("");
  const [tapHint, setTapHint] = useState("");
  const tapHintTimer = useRef(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const pushToast = useCallback((text, variant = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ text, variant });
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const effectiveNow = useMemo(() => Date.now() + serverOffset, [tick, serverOffset]);

  const timerState = useMemo(() => {
    if (!round) {
      return {
        label: "—",
        phase: "idle",
        msBettingLeft: 0,
        closingSeconds: 0,
        msToClose: 0,
      };
    }
    const lockAt = new Date(round.lockAt).getTime();
    const closeAt = new Date(round.closesAt).getTime();

    let phase = "betting";
    if (effectiveNow >= closeAt) phase = "drawing";
    else if (effectiveNow >= lockAt) phase = "locked";
    else phase = "betting";

    const msBettingLeft =
      phase === "betting" ? Math.max(0, lockAt - effectiveNow) : 0;

    let msRemaining = 0;
    if (phase === "betting") msRemaining = msBettingLeft;
    else if (phase === "locked") msRemaining = Math.max(0, closeAt - effectiveNow);
    else msRemaining = 0;

    /** Last 5s of betting window — ms-based so UI matches timer */
    const closingSeconds =
      msBettingLeft > 0 && msBettingLeft <= 5000 ? Math.ceil(msBettingLeft / 1000) : 0;

    return {
      label: formatRemaining(msRemaining),
      phase,
      msBettingLeft,
      closingSeconds,
      msToClose: closeAt - effectiveNow,
    };
  }, [round, effectiveNow]);

  const showClosingOverlay =
    timerState.phase === "betting" &&
    timerState.msBettingLeft > 0 &&
    timerState.msBettingLeft <= 5000;

  const canInteractBetting = timerState.phase === "betting" && timerState.msBettingLeft > 5000;

  const modeLabel = MODES.find((m) => m.key === gameMode)?.label ?? "WinGo";

  const ruleHelp = MODE_RULE_HELP[gameMode] ?? MODE_RULE_HELP.WinGo_30S;
  const issuesPerDay = Math.max(1, Math.floor(86400 / ruleHelp.periodSec));

  useEffect(() => {
    historyPageRef.current = historyPage;
  }, [historyPage]);

  const syncCurrent = useCallback(async () => {
    const { data } = await api.get("/game/current", { params: { gameMode } });
    setRound(data.round);
    setServerOffset(data.serverTime - Date.now());
  }, [gameMode]);

  const loadStrip = useCallback(async () => {
    const { data } = await api.get("/game/history", {
      params: { gameMode, page: 1, pageSize: 5 },
    });
    setStripResults(data.items ?? []);
  }, [gameMode]);

  const loadHistoryPage = useCallback(
    async (page) => {
      setHistoryLoading(true);
      try {
        const { data } = await api.get("/game/history", {
          params: { gameMode, page, pageSize: HISTORY_PAGE_SIZE },
        });
        setHistoryItems(data.items ?? []);
        const p = data.page ?? page;
        setHistoryPage(p);
        setHistoryMeta({
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 1,
          pageSize: data.pageSize ?? HISTORY_PAGE_SIZE,
          hasNext: !!data.hasNext,
          hasPrev: !!data.hasPrev,
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [gameMode]
  );

  useEffect(() => {
    api.get("/notices/active").then(({ data }) => setNotices(data)).catch(() => {});
  }, []);

  useEffect(() => {
    historyPageRef.current = 1;
    syncCurrent().catch(() => {});
    loadStrip().catch(() => {});
    loadHistoryPage(1).catch(() => {});
  }, [syncCurrent, loadStrip, loadHistoryPage]);

  useEffect(() => {
    const id = setInterval(() => {
      syncCurrent().catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [syncCurrent]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socketBase = (import.meta.env.VITE_SOCKET_URL || "").trim() || undefined;
    const socket = io(socketBase, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
    });

    socket.emit("game:subscribe", { gameMode }, () => {});

    socket.on("game:round", (payload) => {
      if (payload.gameMode !== gameMode) return;
      if (payload.round) {
        setRound(payload.round);
        if (typeof payload.serverTime === "number") {
          setServerOffset(payload.serverTime - Date.now());
        }
      }
      if (payload.phase === "result") {
        loadStrip().catch(() => {});
        loadHistoryPage(historyPageRef.current).catch(() => {});
      }
    });

    socket.on("wallet:balance", () => refreshMe?.());

    socket.on("bet:win", (payload) => {
      const p = Number(payload?.payout ?? 0);
      const amt = Number.isFinite(p) ? p.toFixed(2) : payload?.payout;
      const period = payload?.periodId ?? "";
      const ball = payload?.resultNumber;
      pushToast(
        `You won ₹${amt}!${period ? ` Period ${period}` : ""}${ball !== undefined && ball !== null ? ` · Result ${ball}` : ""}`,
        "win"
      );
      refreshMe?.();
      api
        .get("/game/my-bets", { params: { gameMode } })
        .then(({ data }) => setMyBets(data))
        .catch(() => {});
    });

    return () => socket.disconnect();
  }, [gameMode, loadStrip, loadHistoryPage, refreshMe, pushToast]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/game/my-bets", { params: { gameMode } })
      .then(({ data }) => setMyBets(data))
      .catch(() => {});
  }, [user, gameMode, round?.periodId]);

  useEffect(() => {
    if (!sheetOpen) return;
    if (!canInteractBetting && timerState.phase === "betting") {
      setSheetMsg("Round closing — cannot place order.");
    } else {
      setSheetMsg("");
    }
  }, [sheetOpen, canInteractBetting, timerState.phase, timerState.msBettingLeft]);

  useEffect(() => {
    if (tab !== "chart") return;
    api
      .get("/game/history", { params: { gameMode, page: 1, pageSize: 48 } })
      .then(({ data }) => setChartPreview(data.items ?? []))
      .catch(() => setChartPreview([]));
  }, [tab, gameMode]);

  function openBetSheet(type, num = null, presets = null) {
    if (!canInteractBetting) {
      setTapHint(
        timerState.phase !== "betting"
          ? "Wait for the next round to open bets."
          : "Last 5 seconds — betting locked."
      );
      if (tapHintTimer.current) clearTimeout(tapHintTimer.current);
      tapHintTimer.current = window.setTimeout(() => setTapHint(""), 2200);
      return;
    }
    setSheetBetType(type);
    setSheetNumber(num);
    setChipBase(presets?.chipBase ?? 10);
    setQty(presets?.qty ?? 1);
    setSheetMult(presets?.sheetMult ?? 1);
    setAgreeRules(true);
    setSheetMsg("");
    setSheetOpen(true);
  }

  function randomBetOpen() {
    const types = ["color_green", "color_red", "color_violet", "big", "small", "number"];
    const t = types[Math.floor(Math.random() * types.length)];
    const num = t === "number" ? Math.floor(Math.random() * 10) : null;
    openBetSheet(t, num, {
      chipBase: BALANCE_CHIPS[Math.floor(Math.random() * BALANCE_CHIPS.length)],
      sheetMult: MULTS[Math.floor(Math.random() * MULTS.length)],
      qty: 1 + Math.floor(Math.random() * 3),
    });
  }

  function closeBetSheet() {
    setSheetOpen(false);
    setSheetBetType(null);
    setSheetNumber(null);
  }

  const sheetTotal = chipBase * qty * sheetMult;

  async function confirmBetSheet() {
    setSheetMsg("");
    if (!agreeRules) {
      setSheetMsg("Please agree to the rules.");
      return;
    }
    if (!canInteractBetting) {
      setSheetMsg("Betting closed for this round.");
      return;
    }
    if (!sheetBetType || sheetTotal < 1) return;

    try {
      await api.post("/game/bet", {
        gameMode,
        betType: sheetBetType,
        selection: sheetBetType === "number" ? sheetNumber : undefined,
        amount: sheetTotal,
      });
      pushToast(`Bet placed successfully · ₹${sheetTotal.toFixed(2)}`, "success");
      refreshMe();
      const { data } = await api.get("/game/my-bets", { params: { gameMode } });
      setMyBets(data);
      closeBetSheet();
    } catch (e) {
      setSheetMsg(e.response?.data?.error || "Bet failed");
    }
  }

  const recentBalls = stripResults;

  return (
    <div className="app-shell">
      {toast ? (
        <div className={`toast-banner toast-banner--${toast.variant}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      ) : null}

      <div className="top-logo">
        <h1>Star CLUB</h1>
        <small>Live WinGo</small>
      </div>

      <div className="card wallet-strip" style={{ display: "block" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="balance-pill">₹ {Number(user?.walletBalance ?? 0).toFixed(2)}</div>
          <button type="button" className="btn-icon" onClick={() => refreshMe()} title="Refresh">
            ↻
          </button>
        </div>
        <div className="btn-row">
          <Link to="/withdraw" className="btn btn-withdraw" style={{ textAlign: "center" }}>
            Withdraw
          </Link>
          <Link to="/wallet" className="btn btn-deposit" style={{ textAlign: "center" }}>
            Deposit
          </Link>
        </div>
        {notices[0] ? (
          <div className="announce">
            <span aria-hidden>📣</span>
            <span>{notices[0].text}</span>
          </div>
        ) : null}
      </div>

      <div className="mode-scroll">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`mode-chip ${gameMode === m.key ? "active" : ""}`}
            onClick={() => setGameMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card game-panel-wrap" style={{ marginTop: 12 }}>
        {showClosingOverlay ? (
          <div className="lock-overlay" aria-live="assertive" aria-label="Betting closing countdown">
            <span className="lock-overlay__label">Closing in</span>
            <div className="lock-overlay__digit">{timerState.closingSeconds}</div>
          </div>
        ) : null}

        <div className="game-status">
          <div>
            <button type="button" className="how-btn" onClick={() => setHowOpen(true)}>
              How to play
            </button>
            <div className="result-strip">
              {recentBalls.map((h) => (
                <div key={h.periodId} className="result-ball result-ball--img">
                  <NumberImage value={h.number} />
                </div>
              ))}
            </div>
          </div>
          <div className="timer-box">
            <div className="timer-label">Time remaining</div>
            <div className="timer-value">{timerState.label}</div>
            <div className="period-id">{round?.periodId}</div>
          </div>
        </div>

        <div className="color-row">
          <button
            type="button"
            className="color-big cb-green"
            onClick={() => openBetSheet("color_green")}
          >
            Green
          </button>
          <button
            type="button"
            className="color-big cb-violet"
            onClick={() => openBetSheet("color_violet")}
          >
            Violet
          </button>
          <button type="button" className="color-big cb-red" onClick={() => openBetSheet("color_red")}>
            Red
          </button>
        </div>

        <div className="num-grid">
          {Array.from({ length: 10 }).map((_, n) => (
            <button
              key={n}
              type="button"
              className="num-ball num-ball--img"
              onClick={() => openBetSheet("number", n)}
            >
              <NumberImage value={n} />
            </button>
          ))}
        </div>

        <div className="mult-row">
          <button type="button" className="mult-chip active" onClick={randomBetOpen}>
            Random
          </button>
        </div>

        <div className="size-row">
          <button type="button" className="size-btn size-big" onClick={() => openBetSheet("big")}>
            Big
          </button>
          <button type="button" className="size-btn size-small" onClick={() => openBetSheet("small")}>
            Small
          </button>
        </div>

        <p style={{ margin: "12px 0 0", fontSize: "0.78rem", color: "var(--muted)", textAlign: "center" }}>
          Tap a color, number, Big or Small to choose stake in the order sheet.
        </p>
      </div>

      <div className="tabs">
        <button type="button" className={`tab ${tab === "game" ? "active" : ""}`} onClick={() => setTab("game")}>
          Game history
        </button>
        <button type="button" className={`tab ${tab === "chart" ? "active" : ""}`} onClick={() => setTab("chart")}>
          Chart
        </button>
        <button type="button" className={`tab ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>
          My history
        </button>
      </div>

      {tab === "game" ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Number</th>
                  <th>Big/Small</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading && historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!historyLoading && historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                      No completed rounds yet for this mode.
                    </td>
                  </tr>
                ) : null}
                {historyItems.map((h) => (
                  <tr key={h.periodId}>
                    <td>{h.periodId}</td>
                    <td>
                      <span className="result-ball result-ball--img result-ball--sm">
                        <NumberImage value={h.number} />
                      </span>
                    </td>
                    <td>{h.bigSmall}</td>
                    <td>
                      <span className="result-ball result-ball--img result-ball--sm">
                        <NumberImage value={h.number} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button
              type="button"
              className="pagination-btn"
              disabled={!historyMeta.hasPrev || historyLoading}
              onClick={() => loadHistoryPage(historyPage - 1)}
            >
              Prev
            </button>
            <span className="pagination-info">
              {historyLoading && historyItems.length > 0 ? (
                <span style={{ display: "block", marginBottom: 4, color: "var(--accent-cyan)" }}>Updating…</span>
              ) : null}
              Page {historyMeta.total ? historyPage : 0} / {historyMeta.totalPages}
              <span className="pagination-total"> · {historyMeta.total} rounds</span>
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={!historyMeta.hasNext || historyLoading}
              onClick={() => loadHistoryPage(historyPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {tab === "chart" ? (
        <div className="card">
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Latest 48 results (newest first). Charts can be layered here later.
          </p>
          <div className="result-strip" style={{ flexWrap: "wrap", marginTop: 12 }}>
            {chartPreview.map((h) => (
              <div key={h.periodId} className="result-ball result-ball--img">
                <NumberImage value={h.number} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "mine" ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Type</th>
                  <th>Amt</th>
                  <th>Result</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {myBets.map((b) => (
                  <tr key={b._id}>
                    <td>{b.periodId}</td>
                    <td>{b.betType}</td>
                    <td>{b.amount}</td>
                    <td>{b.status}</td>
                    <td>{b.payout || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tapHint ? <div className="tap-hint">{tapHint}</div> : null}

      <BottomNav />

      {sheetOpen ? (
        <div className="bet-sheet-backdrop" role="presentation" onClick={closeBetSheet}>
          <div
            className={["bet-sheet", betSheetThemeClass(sheetBetType, sheetNumber)].filter(Boolean).join(" ")}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bet-sheet__gradient-head">{modeLabel}</div>
            <div className="bet-sheet__pick">
              {sheetBetType === "number" && sheetNumber !== null && sheetNumber !== undefined ? (
                <span className="bet-sheet__pick-ball result-ball result-ball--img" aria-hidden>
                  <NumberImage value={sheetNumber} />
                </span>
              ) : null}
              {sheetBetType === "color_green" ? (
                <span className="bet-sheet__pick-badge bet-sheet__pick-badge--green" aria-hidden />
              ) : null}
              {sheetBetType === "color_red" ? (
                <span className="bet-sheet__pick-badge bet-sheet__pick-badge--red" aria-hidden />
              ) : null}
              {sheetBetType === "color_violet" ? (
                <span className="bet-sheet__pick-badge bet-sheet__pick-badge--violet" aria-hidden />
              ) : null}
              {sheetBetType === "big" ? (
                <span className="bet-sheet__pick-badge bet-sheet__pick-badge--big" aria-hidden />
              ) : null}
              {sheetBetType === "small" ? (
                <span className="bet-sheet__pick-badge bet-sheet__pick-badge--small" aria-hidden />
              ) : null}
              <span className="bet-sheet__pick-text">
                Select {selectionTitle(sheetBetType, sheetNumber)}
              </span>
            </div>

            <div className="bet-sheet__section">
              <div className="bet-sheet__label">Balance</div>
              <div className="balance-chip-row">
                {BALANCE_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`balance-chip ${chipBase === c ? "is-on" : ""}`}
                    onClick={() => setChipBase(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="bet-sheet__section">
              <div className="bet-sheet__label">Quantity</div>
              <div className="qty-row">
                <button type="button" className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span className="qty-val">{qty}</span>
                <button type="button" className="qty-btn" onClick={() => setQty((q) => Math.min(9999, q + 1))}>
                  +
                </button>
              </div>
            </div>

            <div className="bet-sheet__section">
              <div className="bet-sheet__label">Multiplier</div>
              <div className="sheet-mult-row">
                {MULTS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`sheet-mult ${sheetMult === m ? "is-on" : ""}`}
                    onClick={() => setSheetMult(m)}
                  >
                    X{m}
                  </button>
                ))}
              </div>
            </div>

            <label className="bet-sheet__agree">
              <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} />
              <span>
                I agree{" "}
                <button type="button" className="linkish" onClick={() => setHowOpen(true)}>
                  《Pre-sale rules》
                </button>
              </span>
            </label>

            {sheetMsg ? <div className="error" style={{ padding: "0 16px" }}>{sheetMsg}</div> : null}

            <div className="bet-sheet__footer">
              <button type="button" className="btn-sheet-cancel" onClick={closeBetSheet}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-sheet-total"
                onClick={confirmBetSheet}
                disabled={!agreeRules || !canInteractBetting}
              >
                Total amount ₹{sheetTotal.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {howOpen ? (
        <div className="modal-backdrop rules-modal-backdrop" role="presentation" onClick={() => setHowOpen(false)}>
          <div className="rules-modal" role="dialog" onClick={(e) => e.stopPropagation()} aria-labelledby="rules-modal-title">
            <div className="rules-modal__head" id="rules-modal-title">
              · {ruleHelp.headSlug} ·
            </div>
            <div className="rules-modal__body">
              <p className="rules-modal__lead">
                {ruleHelp.periodSec} seconds 1 issue, {ruleHelp.orderSec} seconds to order, {ruleHelp.waitSec}{" "}
                seconds waiting for the draw. It opens all day. The total number of trade is {issuesPerDay} issues.
              </p>
              <p className="rules-modal__lead">
                If you spend <strong>100</strong> to trade, after deducting <strong>2</strong> service fee, your contract
                amount is <strong>98</strong>:
              </p>
              <ol className="rules-modal__list">
                <li>
                  Select <strong className="rules-accent-green">green</strong>: if the result shows{" "}
                  <strong>1, 3, 7, 9</strong> you will get (98 × 2) <strong>196</strong>; if the result shows{" "}
                  <strong>5</strong>, you will get (98 × 1.5) <strong>147</strong>.
                </li>
                <li>
                  Select <strong className="rules-accent-red">red</strong>: if the result shows{" "}
                  <strong>2, 4, 6, 8</strong> you will get (98 × 2) <strong>196</strong>; if the result shows{" "}
                  <strong>0</strong>, you will get (98 × 1.5) <strong>147</strong>.
                </li>
                <li>
                  Select <strong className="rules-accent-violet">violet</strong>: if the result shows{" "}
                  <strong>0</strong> or <strong>5</strong>, you will get (98 × 4.5) <strong>441</strong>.
                </li>
                <li>
                  Select <strong>number</strong>: if the result is the same as the number you selected, you will get
                  (98 × 9) <strong>882</strong>.
                </li>
                <li>
                  Select <strong className="rules-accent-big">big</strong>: if the result shows{" "}
                  <strong>5, 6, 7, 8, 9</strong> you will get (98 × 2) <strong>196</strong>.
                </li>
                <li>
                  Select <strong className="rules-accent-small">small</strong>: if the result shows{" "}
                  <strong>0, 1, 2, 3, 4</strong> you will get (98 × 2) <strong>196</strong>.
                </li>
              </ol>
              <p className="rules-modal__note">
                Fee % and multipliers follow admin settings; numbers above use a 2% fee example on the contract amount.
              </p>
            </div>
            <button type="button" className="rules-modal__close" onClick={() => setHowOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
