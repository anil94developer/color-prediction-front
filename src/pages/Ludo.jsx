import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";
import BottomNav from "../components/BottomNav.jsx";
import LudoClassicBoard from "../components/LudoClassicBoard.jsx";
import LudoDieVisual from "../components/LudoDieVisual.jsx";

const TOKEN_LABELS = ["①", "②", "③", "④"];

export default function Ludo() {
  const { user } = useAuth();
  const [myRoom, setMyRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [msg, setMsg] = useState("");
  const [copyFlash, setCopyFlash] = useState(false);

  const loadMyRoom = useCallback(async () => {
    try {
      const { data } = await api.get("/ludo/my-room");
      setMyRoom(data);
    } catch (e) {
      setMyRoom(null);
      if (e.response?.status === 401) setMsg("Sign in again to play Ludo.");
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ludo/rooms");
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setMsg("Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyRoom().catch(() => {});
    const id = window.setInterval(() => loadMyRoom().catch(() => {}), 2000);
    return () => window.clearInterval(id);
  }, [loadMyRoom]);

  useEffect(() => {
    loadRooms().catch(() => {});
    const id = window.setInterval(() => loadRooms().catch(() => {}), 5000);
    return () => window.clearInterval(id);
  }, [loadRooms]);

  const isHost = useMemo(
    () => myRoom && user?.id && String(myRoom.hostId) === String(user.id),
    [myRoom, user?.id]
  );

  async function copyRoomCode(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyFlash(true);
      window.setTimeout(() => setCopyFlash(false), 2000);
    } catch {
      setMsg("Could not copy — select the code and copy manually.");
    }
  }

  async function createRoom() {
    setMsg("");
    setCreating(true);
    try {
      await api.post("/ludo/rooms", { maxPlayers });
      await loadMyRoom();
      await loadRooms();
      setMsg("Room ready — share the code below with friends.");
    } catch (e) {
      setMsg(e.response?.data?.error || "Failed to create room.");
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom(roomId) {
    setMsg("");
    try {
      await api.post(`/ludo/rooms/${roomId}/join`);
      await loadMyRoom();
      await loadRooms();
      setMsg("You're in the room. Wait for the host to start.");
    } catch (e) {
      setMsg(e.response?.data?.error || "Unable to join room.");
    }
  }

  async function leaveRoom(roomId) {
    setMsg("");
    try {
      await api.post(`/ludo/rooms/${roomId}/leave`);
      await loadMyRoom();
      await loadRooms();
      setMsg("Left room.");
    } catch (e) {
      setMsg(e.response?.data?.error || "Unable to leave room.");
    }
  }

  async function startGame() {
    if (!myRoom?._id) return;
    setMsg("");
    setStarting(true);
    try {
      await api.post(`/ludo/rooms/${myRoom._id}/start`);
      await loadMyRoom();
      setMsg("");
    } catch (e) {
      setMsg(e.response?.data?.error || "Could not start game.");
    } finally {
      setStarting(false);
    }
  }

  async function rollDice() {
    if (!myRoom?._id) return;
    setRolling(true);
    setMsg("");
    const t0 = Date.now();
    const MIN_ROLL_MS = 1200;
    try {
      await api.post(`/ludo/rooms/${myRoom._id}/roll`);
      await loadMyRoom();
    } catch (e) {
      setMsg(e.response?.data?.error || "Roll failed.");
    } finally {
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, MIN_ROLL_MS - elapsed);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      setRolling(false);
    }
  }

  async function choosePawn(pawnIndex) {
    if (!myRoom?._id) return;
    setMoving(true);
    setMsg("");
    try {
      await api.post(`/ludo/rooms/${myRoom._id}/move`, { pawnIndex });
      await loadMyRoom();
    } catch (e) {
      setMsg(e.response?.data?.error || "Move failed.");
    } finally {
      setMoving(false);
    }
  }

  const game = myRoom?.game;
  const inPlay = myRoom && (myRoom.status === "active" || myRoom.status === "finished");

  const showRoll =
    game?.yourTurn && myRoom.status === "active" && game.phase === "roll" && !game.winnerId;
  const showPawnChoice =
    game?.yourTurn && myRoom.status === "active" && game.phase === "move" && !game.winnerId;

  const currentTurnName = useMemo(() => {
    if (!game?.currentTurnUserId) return "";
    return game.players.find((p) => String(p.userId) === String(game.currentTurnUserId))?.name || "Player";
  }, [game]);

  const statusBanner = useMemo(() => {
    if (!game) {
      return { mood: "neutral", title: "Ludo", sub: "Classic cross board · same rules as tabletop" };
    }
    if (game.winnerId) {
      const youWon = String(game.winnerId) === String(user?.id);
      return {
        mood: "done",
        title: youWon ? "You won!" : "Game over",
        sub: youWon ? "All four tokens reached home." : "Another player got all four tokens home first.",
      };
    }
    if (myRoom?.status !== "active") {
      return { mood: "neutral", title: "Table", sub: "Waiting…" };
    }
    if (game.yourTurn && game.phase === "roll") {
      return {
        mood: "your-roll",
        title: "Your turn",
        sub: "Roll the dice — you need a 6 to bring a token out of your yard.",
      };
    }
    if (game.yourTurn && game.phase === "move") {
      return {
        mood: "your-move",
        title: "Choose a token",
        sub: `Use your roll of ${game.pendingDice ?? "—"}. Tap a glowing piece on the board or a token button.`,
      };
    }
    return {
      mood: "wait",
      title: `Waiting for ${currentTurnName || "…"}`,
      sub: "Watch the board — your color will show “Turn” when it’s you.",
    };
  }, [game, myRoom?.status, user?.id, currentTurnName]);

  const yourColor = useMemo(() => game?.players?.find((p) => p.isYou)?.color || "#94a3b8", [game]);

  return (
    <div className="app-shell ludo-page">
      <header className="ludo-page-header">
        <div>
          <h1 className="ludo-page-title">Ludo</h1>
          <p className="ludo-page-tagline">Classic cross board · same rules as the tabletop game</p>
        </div>
      </header>

      {inPlay && game ? (
        <section className="card ludo-game-card ludo-experience">
          <div className={`ludo-status-banner ludo-status-banner--${statusBanner.mood}`}>
            <p className="ludo-status-banner__title">{statusBanner.title}</p>
            <p className="ludo-status-banner__sub">{statusBanner.sub}</p>
          </div>

          {game.lastMessage ? (
            <p className="ludo-game-msg ludo-game-msg--accent">{game.lastMessage}</p>
          ) : null}

          <div className="ludo-room-bar">
            <span className="ludo-room-bar__label">Room</span>
            <code className="ludo-room-code">{myRoom.code}</code>
            <button type="button" className="ludo-btn-copy" onClick={() => copyRoomCode(myRoom.code)}>
              {copyFlash ? "Copied" : "Copy code"}
            </button>
          </div>

          <div className="ludo-turn-roster" role="list" aria-label="Players and colors">
            {game.players.map((pl) => {
              const isTurn = String(pl.userId) === String(game.currentTurnUserId);
              return (
                <div
                  key={pl.userId}
                  role="listitem"
                  className={`ludo-turn-seat ${isTurn ? "ludo-turn-seat--active" : ""}`}
                >
                  <span className="ludo-turn-seat__dot" style={{ background: pl.color }} />
                  <span className="ludo-turn-seat__name">{pl.name}</span>
                  {pl.isYou ? <span className="ludo-turn-seat__you">You</span> : null}
                  {isTurn ? <span className="ludo-turn-seat__turn">Turn</span> : null}
                </div>
              );
            })}
          </div>

          <div className="ludo-classic-wrap ludo-classic-wrap--table">
            <p className="ludo-board-caption">Board · tap a glowing token when you must choose</p>
            <LudoClassicBoard
              game={game}
              pickMode={showPawnChoice}
              legalPawnIndices={game.legalPawnIndices || []}
              onPawnSelect={choosePawn}
              moving={moving}
            />
          </div>

          <div className="ludo-control-dock">
            <div className="ludo-dice-tower" aria-live="polite">
              <span className="ludo-dice-label">Last roll</span>
              <LudoDieVisual rolling={rolling} faceValue={game.lastDice ?? null} size="sm" />
              {game.phase === "move" && game.pendingDice != null ? (
                <span className="ludo-dice-pending">Using {game.pendingDice} for this move</span>
              ) : null}
            </div>

            <div className="ludo-actions">
              {showRoll ? (
                <button
                  type="button"
                  className="ludo-dice-roll-btn"
                  onClick={rollDice}
                  disabled={rolling}
                  aria-label={rolling ? "Rolling dice" : "Roll dice"}
                >
                  <LudoDieVisual rolling={rolling} faceValue={game.lastDice ?? null} size="lg" />
                  <span className="ludo-dice-roll-btn__text">{rolling ? "Rolling…" : "Roll dice"}</span>
                </button>
              ) : null}

              {showPawnChoice ? (
                <div className="ludo-pawn-pick ludo-pawn-pick--classic">
                  <span className="ludo-pawn-pick-label">Or choose token</span>
                  <div className="ludo-pawn-pick-row">
                    {[0, 1, 2, 3].map((i) => {
                      const legal = game.legalPawnIndices?.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`ludo-pawn-pick-btn ludo-pawn-pick-btn--classic ${legal ? "is-legal" : ""}`}
                          style={{ "--token-color": yourColor }}
                          disabled={!legal || moving}
                          onClick={() => choosePawn(i)}
                          aria-label={`Move token ${i + 1}`}
                        >
                          <span className="ludo-pawn-pick-icon">{TOKEN_LABELS[i]}</span>
                          <span className="ludo-pawn-pick-num">{i + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!showRoll && !showPawnChoice && myRoom.status === "active" && !game.winnerId ? (
                <p className="ludo-wait-card">Relax — it’s not your turn yet.</p>
              ) : null}
            </div>
          </div>

          <div className="btn-row ludo-footer-actions">
            <button type="button" className="btn btn-withdraw" onClick={() => leaveRoom(myRoom._id)}>
              Leave table
            </button>
            <Link to="/" className="btn btn-deposit" style={{ textAlign: "center" }}>
              Home menu
            </Link>
          </div>

          <details className="ludo-rules-details">
            <summary>How to play (classic rules)</summary>
            <ul>
              <li>Roll a 6 to move a token out of your yard onto the track.</li>
              <li>Move clockwise on the white path. Star squares are safe — no captures.</li>
              <li>Land on another player’s token on the track to send them home.</li>
              <li>Reach your colored lane, then roll exactly enough to enter the center.</li>
              <li>Three sixes in a row forfeits your turn.</li>
            </ul>
          </details>
        </section>
      ) : null}

      {!inPlay ? (
        <section className="card ludo-lobby-card">
          <div className="home-head">
            <h2>Open a table</h2>
            <span>{loading ? "Syncing…" : `${rooms.length} waiting`}</span>
          </div>
          <div className="ludo-create-row">
            <label className="ludo-label" htmlFor="ludo-max">
              Max players
            </label>
            <select
              id="ludo-max"
              className="ludo-select"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            <button type="button" className="btn btn-deposit" onClick={createRoom} disabled={creating}>
              {creating ? "Creating…" : "New room"}
            </button>
          </div>
        </section>
      ) : null}

      {!inPlay && myRoom ? (
        <section className="card ludo-lobby-room">
          <div className="home-head">
            <h2>Your table</h2>
          </div>
          <div className="ludo-room-bar ludo-room-bar--large">
            <span className="ludo-room-bar__label">Invite friends with code</span>
            <div className="ludo-room-bar__row">
              <code className="ludo-room-code">{myRoom.code}</code>
              <button type="button" className="ludo-btn-copy" onClick={() => copyRoomCode(myRoom.code)}>
                {copyFlash ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="ludo-players">
            {myRoom.players.map((p) => (
              <span key={p.userId} className={`ludo-player-pill ${p.isYou ? "is-you" : ""}`}>
                {p.name}
              </span>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-withdraw" onClick={() => leaveRoom(myRoom._id)}>
              Leave
            </button>
            <button
              type="button"
              className="btn btn-deposit"
              disabled={!isHost || starting || myRoom.players.length < 2}
              onClick={startGame}
            >
              {starting ? "Starting…" : "Start classic game"}
            </button>
          </div>
          {isHost && myRoom.players.length < 2 ? (
            <p className="ludo-msg">Share your code — you need two players at the table.</p>
          ) : null}
          {!isHost ? <p className="ludo-msg">Wait for the host to start the game.</p> : null}
        </section>
      ) : null}

      {msg ? (
        <p className="ludo-msg ludo-msg--toast" style={{ marginTop: 10 }}>
          {msg}
        </p>
      ) : null}

      {!inPlay ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="home-head">
            <h2>Join a room</h2>
            <Link to="/" style={{ fontSize: "0.78rem" }}>
              Back to menu
            </Link>
          </div>
          {!rooms.length ? (
            <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>No open tables right now.</p>
          ) : (
            <div className="ludo-room-list">
              {rooms.map((room) => {
                const inRoom = room.players.some((p) => p.isYou);
                return (
                  <div key={room._id} className="ludo-room-item">
                    <div>
                      <div className="ludo-room-title">
                        Code <strong>{room.code}</strong>
                      </div>
                      <div className="ludo-room-sub">
                        Host {room.hostName} · {room.players.length}/{room.maxPlayers} seated
                      </div>
                    </div>
                    {inRoom ? (
                      <button type="button" className="btn btn-withdraw" onClick={() => leaveRoom(room._id)}>
                        Leave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-deposit"
                        disabled={!room.canJoin}
                        onClick={() => joinRoom(room._id)}
                      >
                        {room.canJoin ? "Sit" : "Full"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <BottomNav />
    </div>
  );
}
