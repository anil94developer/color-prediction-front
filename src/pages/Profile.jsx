import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

function profileInitial(user, nameDraft) {
  const s = (nameDraft || user?.name || user?.phone || user?.email || "?").trim();
  return s ? s[0].toUpperCase() : "?";
}

const LEDGER = { pathname: "/wallet", hash: "wallet-ledger" };

export default function Profile() {
  const { user, logout, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState({ accountName: "", accountNumber: "", ifsc: "" });
  const [refs, setRefs] = useState(null);
  const [supportContacts, setSupportContacts] = useState({
    callNumber: "",
    whatsappNumber: "",
    telegramUrl: "",
  });
  const [msg, setMsg] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [uidCopy, setUidCopy] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setUpi(user.upiId || "");
    setBank(user.bank || { accountName: "", accountNumber: "", ifsc: "" });
  }, [user]);

  useEffect(() => {
    api
      .get("/user/referrals")
      .then(({ data }) => setRefs(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/support/contacts")
      .then(({ data }) => setSupportContacts(data || {}))
      .catch(() => {});
  }, []);

  const uidFull = user?.id ? String(user.id) : "";
  const uidShow = uidFull ? uidFull.replace(/-/g, "").slice(-7) : "—";

  const copyReferral = useCallback(async () => {
    const code = user?.referralCode || refs?.referralCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyHint("Copied!");
      setTimeout(() => setCopyHint(""), 2000);
    } catch {
      setCopyHint("Copy");
      setTimeout(() => setCopyHint(""), 2000);
    }
  }, [user?.referralCode, refs?.referralCode]);

  const copyUid = useCallback(async () => {
    if (!uidFull) return;
    try {
      await navigator.clipboard.writeText(uidFull);
      setUidCopy("Copied");
      setTimeout(() => setUidCopy(""), 2000);
    } catch {
      setUidCopy("");
    }
  }, [uidFull]);

  async function save() {
    setMsg("");
    try {
      await api.patch("/user/profile", { name, upiId: upi, bank });
      setMsg("Saved");
      refreshMe();
    } catch {
      setMsg("Could not save");
    }
  }

  const displayName = (name || user?.name || "").trim() || "Player";
  const bankOk =
    Boolean(String(bank.accountName || "").trim()) &&
    Boolean(String(bank.accountNumber || "").trim()) &&
    Boolean(String(bank.ifsc || "").trim());
  const upiOk = Boolean(String(upi || "").trim());
  const joined =
    user?.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : null;

  const callHref = supportContacts.callNumber
    ? `tel:${String(supportContacts.callNumber).replace(/\s+/g, "")}`
    : "";
  const waDigits = String(supportContacts.whatsappNumber || "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "";

  const notifs = Array.isArray(user?.notifications) ? user.notifications.slice(0, 6) : [];

  return (
    <div className="app-shell">
      <section className="prof-banner">
        <div className="prof-banner__avatar" aria-hidden>
          {profileInitial(user, name)}
        </div>
        <div className="prof-banner__main">
          <div className="prof-banner__name-row">
            <h1 className="prof-banner__name">{displayName.toUpperCase()}</h1>
            <span className="prof-banner__vip">VIP0</span>
          </div>
          <div className="prof-banner__uid">
            <span>UID</span>
            <code>| {uidShow}</code>
            <button type="button" className="prof-banner__uid-copy" onClick={copyUid}>
              {uidCopy || "Copy"}
            </button>
          </div>
          <p className="prof-banner__meta">
            {joined ? <>Member since {joined}</> : null}
            {joined && (user?.phone || user?.email) ? <br /> : null}
            {user?.phone ? <>{user.phone}</> : null}
            {user?.phone && user?.email ? " · " : null}
            {user?.email ? <>{user.email}</> : null}
          </p>
        </div>
      </section>

      <section className="prof-wallet-panel">
        <div className="prof-wallet-panel__label">Total balance</div>
        <div className="prof-wallet-panel__row">
          <span className="prof-wallet-panel__bal">₹ {Number(user?.walletBalance ?? 0).toFixed(2)}</span>
          <button type="button" className="prof-wallet-panel__refresh" onClick={() => refreshMe()} title="Refresh">
            ↻
          </button>
        </div>
        <div className="prof-rings">
          <Link to="/wallet" className="prof-ring prof-ring--ar">
            <span className="prof-ring__circle">₹</span>
            <span>ARWallet</span>
          </Link>
          <Link to="/wallet" className="prof-ring prof-ring--dep">
            <span className="prof-ring__circle">+</span>
            <span>Deposit</span>
          </Link>
          <Link to="/withdraw" className="prof-ring prof-ring--wd">
            <span className="prof-ring__circle">→</span>
            <span>Withdraw</span>
          </Link>
          <div className="prof-ring prof-ring--vip prof-ring--muted">
            <span className="prof-ring__circle">◆</span>
            <span>VIP</span>
          </div>
        </div>
      </section>

      <div className="prof-hist">
        <Link to="/game/wingo" className="prof-hist-tile">
          <span className="prof-hist-tile__ico prof-hist-tile__ico--blue" aria-hidden>
            ◎
          </span>
          <span className="prof-hist-tile__title">Game history</span>
          <span className="prof-hist-tile__sub">My game history</span>
        </Link>
        <Link to={{ ...LEDGER, state: { ledgerTab: "all" } }} className="prof-hist-tile">
          <span className="prof-hist-tile__ico prof-hist-tile__ico--green" aria-hidden>
            ≡
          </span>
          <span className="prof-hist-tile__title">Transaction</span>
          <span className="prof-hist-tile__sub">My transaction history</span>
        </Link>
        <Link to={{ ...LEDGER, state: { ledgerTab: "deposit" } }} className="prof-hist-tile">
          <span className="prof-hist-tile__ico prof-hist-tile__ico--red" aria-hidden>
            ↓
          </span>
          <span className="prof-hist-tile__title">Deposit</span>
          <span className="prof-hist-tile__sub">My deposit history</span>
        </Link>
        <Link to="/withdraw" className="prof-hist-tile">
          <span className="prof-hist-tile__ico prof-hist-tile__ico--orange" aria-hidden>
            ↑
          </span>
          <span className="prof-hist-tile__title">Withdraw</span>
          <span className="prof-hist-tile__sub">My withdraw history</span>
        </Link>
      </div>

      <nav className="prof-menu" aria-label="Shortcuts">
        <a href="#profile-notifs" className="prof-menu-row">
          <span className="prof-menu-row__ico" aria-hidden>
            ✉
          </span>
          <div className="prof-menu-row__text">
            <div className="prof-menu-row__label">Notification</div>
            <div className="prof-menu-row__sub">System &amp; promo messages</div>
          </div>
          <span className="prof-menu-row__chev">›</span>
        </a>
        <button type="button" className="prof-menu-row prof-menu-row--native">
          <span className="prof-menu-row__ico" aria-hidden>
            🎁
          </span>
          <div className="prof-menu-row__text">
            <div className="prof-menu-row__label">Gifts</div>
            <div className="prof-menu-row__sub">Rewards &amp; bonuses</div>
          </div>
          <span className="prof-menu-row__chev">›</span>
        </button>
        <Link to="/game/wingo" className="prof-menu-row">
          <span className="prof-menu-row__ico" aria-hidden>
            ▤
          </span>
          <div className="prof-menu-row__text">
            <div className="prof-menu-row__label">Game statistics</div>
            <div className="prof-menu-row__sub">WinGo &amp; more</div>
          </div>
          <span className="prof-menu-row__chev">›</span>
        </Link>
        <div className="prof-menu-row">
          <span className="prof-menu-row__ico" aria-hidden>
            ◐
          </span>
          <div className="prof-menu-row__text">
            <div className="prof-menu-row__label">Language</div>
            <div className="prof-menu-row__sub">App display language</div>
          </div>
          <span className="prof-menu-row__right">English</span>
          <span className="prof-menu-row__chev">›</span>
        </div>
      </nav>

      <div className="prof-svc-head">Service center</div>
      <div className="prof-svc-grid">
        {[
          { cap: "Settings", ico: "⚙", href: "#profile-account" },
          { cap: "Feedback", ico: "✎", href: "mailto:support@example.com" },
          { cap: "Announcement", ico: "📣", href: "#profile-notifs" },
          { cap: "Help & Contact", ico: "💬", href: "#profile-help" },
          { cap: "Beginner's guide", ico: "?", href: "/" },
          { cap: "About us", ico: "i", href: "#profile-account" },
        ].map((s) => (
          <a key={s.cap} href={s.href} className="prof-svc-item">
            <span className="prof-svc-item__ico">{s.ico}</span>
            <span className="prof-svc-item__cap">{s.cap}</span>
          </a>
        ))}
      </div>

      <div className="card profile-card" id="profile-help">
        <h2 className="profile-card__title">Help &amp; Contact</h2>
        <p className="profile-card__hint">For support, use call/WhatsApp/Telegram.</p>

        <div className="profile-readonly-grid">
          <div>
            <span className="profile-readonly__label">Call</span>
            <span className="profile-readonly__value">
              {callHref ? (
                <a href={callHref} className="link">
                  {supportContacts.callNumber}
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div>
            <span className="profile-readonly__label">WhatsApp</span>
            <span className="profile-readonly__value">
              {waHref ? (
                <a href={waHref} target="_blank" rel="noreferrer" className="link">
                  {supportContacts.whatsappNumber}
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div>
            <span className="profile-readonly__label">Telegram</span>
            <span className="profile-readonly__value">
              {supportContacts.telegramUrl ? (
                <a href={supportContacts.telegramUrl} target="_blank" rel="noreferrer" className="link">
                  Open
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="card profile-card" id="profile-account">
        <h2 className="profile-card__title">Account &amp; payout</h2>
        <p className="profile-card__hint">Edit your details and save. Used for games and withdrawals.</p>
        <div className="profile-readonly-grid">
          <div>
            <span className="profile-readonly__label">Phone</span>
            <span className="profile-readonly__value">{user?.phone || "—"}</span>
          </div>
          <div>
            <span className="profile-readonly__label">Email</span>
            <span className="profile-readonly__value">{user?.email || "—"}</span>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="profile-payout-status" style={{ marginTop: 12 }}>
          <span className={`profile-chip ${upiOk ? "profile-chip--ok" : ""}`}>UPI {upiOk ? "✓" : "…"}</span>
          <span className={`profile-chip ${bankOk ? "profile-chip--ok" : ""}`}>Bank {bankOk ? "✓" : "…"}</span>
        </div>
        <div className="field">
          <label>UPI ID</label>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bankupi" />
        </div>
        <div className="profile-subhead">Bank account</div>
        <div className="field">
          <label>Account holder name</label>
          <input
            value={bank.accountName || ""}
            onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
            placeholder="As per bank passbook"
          />
        </div>
        <div className="field">
          <label>Account number</label>
          <input
            value={bank.accountNumber || ""}
            onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
            placeholder="Account number"
          />
        </div>
        <div className="field">
          <label>IFSC</label>
          <input
            value={bank.ifsc || ""}
            onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })}
            placeholder="e.g. SBIN0001234"
          />
        </div>
        <button type="button" className="profile-save-btn" onClick={save}>
          Save changes
        </button>
        {msg ? (
          <p className={`profile-msg ${msg === "Saved" ? "profile-msg--ok" : "profile-msg--err"}`}>{msg}</p>
        ) : null}
      </div>

      <div className="card profile-card" style={{ marginTop: 12 }}>
        <h2 className="profile-card__title">Referrals</h2>
        <p className="profile-card__hint">Share your code with friends.</p>
        <div className="profile-ref-box">
          <div>
            <span className="profile-ref-box__label">Your code</span>
            <span className="profile-ref-box__code">{user?.referralCode || refs?.referralCode || "—"}</span>
          </div>
          <button type="button" className="profile-copy-btn" onClick={copyReferral}>
            {copyHint || "Copy"}
          </button>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {(refs?.invited || []).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: "var(--muted)", textAlign: "center", padding: "18px" }}>
                    No invites yet.
                  </td>
                </tr>
              ) : null}
              {(refs?.invited || []).map((u) => (
                <tr key={u._id}>
                  <td>{u.name || "—"}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {notifs.length > 0 ? (
        <div className="card profile-card" style={{ marginTop: 12 }} id="profile-notifs">
          <h2 className="profile-card__title">Announcements</h2>
          <ul className="profile-notif-list">
            {notifs.map((n, i) => (
              <li key={n.createdAt ? `${n.createdAt}-${i}` : i} className="profile-notif-item">
                <span className="profile-notif-item__dot" aria-hidden />
                <div>
                  <div className="profile-notif-item__title">{n.title || "Notice"}</div>
                  {n.body ? <div className="profile-notif-item__body">{n.body}</div> : null}
                  {n.createdAt ? (
                    <div className="profile-notif-item__time">{new Date(n.createdAt).toLocaleString()}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div id="profile-notifs" style={{ height: 1, overflow: "hidden" }} aria-hidden />
      )}

      <button type="button" className="profile-logout" onClick={() => setLogoutConfirmOpen(true)}>
        <span className="profile-logout__ico" aria-hidden>
          ⏻
        </span>{" "}
        Log out
      </button>

      {logoutConfirmOpen ? (
        <div
          className="prof-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prof-logout-title"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div className="prof-confirm-box" onClick={(e) => e.stopPropagation()}>
            <h2 id="prof-logout-title" className="prof-confirm-title">
              Log out?
            </h2>
            <p className="prof-confirm-text">You will need to sign in again to use your account.</p>
            <div className="prof-confirm-actions">
              <button
                type="button"
                className="prof-confirm-btn prof-confirm-btn--ghost"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="prof-confirm-btn prof-confirm-btn--danger"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  logout();
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
