import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";

const ACT_ICONS = [
  { label: "Activity Award", emoji: "🥇", to: "/activity", hint: "Activity hub" },
  { label: "Invitation bonus", emoji: "👥", to: "/profile", hint: "Referrals on profile" },
  { label: "Betting rebate", emoji: "💰", to: "/wallet", hint: "Wallet & history" },
  { label: "Super Jackpot", emoji: "🏆", to: "/game/aviator", hint: "Aviator" },
  { label: "First gift", emoji: "🎁", to: "/wallet", hint: "Deposit & rewards" },
];

const GAMES = [
  {
    slug: "wingo",
    title: "WinGo",
    tagline: "Color & number · live rounds",
    to: "/game/wingo",
    className: "act-jai__game-banner--wingo",
  },
  {
    slug: "aviator",
    title: "Aviator",
    tagline: "Cash out before the plane flies away",
    to: "/game/aviator",
    className: "act-jai__game-banner--aviator",
  },
  {
    slug: "ludo",
    title: "Ludo",
    tagline: "Classic board fun",
    to: "/game/ludo",
    className: "act-jai__game-banner--ludo",
  },
];

export default function Activity() {
  return (
    <div className="app-shell act-jai">
      <header className="act-jai__top">
        <div className="act-jai__brand" aria-hidden>
          <span className="act-jai__brand-crown">♔</span>
          <span className="act-jai__brand-text">JAI CLUB</span>
          <span className="act-jai__brand-stars">✦</span>
        </div>
      </header>

      <section className="act-jai__bonus" aria-label="Bonus summary">
        <div className="act-jai__bonus-cols">
          <div className="act-jai__bonus-cell">
            <span className="act-jai__bonus-label">Today&apos;s bonus</span>
            <strong className="act-jai__bonus-amt">₹0.00</strong>
          </div>
          <div className="act-jai__bonus-cell">
            <span className="act-jai__bonus-label">Total bonus</span>
            <strong className="act-jai__bonus-amt">₹0.00</strong>
          </div>
        </div>
        <Link to="/wallet" className="act-jai__bonus-pill">
          Bonus details
        </Link>
      </section>

      <div className="act-jai__icon-grid">
        {ACT_ICONS.map((it) => (
          <Link key={it.label} to={it.to} className="act-jai__icon-cell" title={it.hint}>
            <span className="act-jai__icon-orb" aria-hidden>
              {it.emoji}
            </span>
            <span className="act-jai__icon-label">{it.label}</span>
          </Link>
        ))}
      </div>

      <div className="act-jai__promo-row">
        <Link to="/wallet" className="act-jai__promo-card">
          <div className="act-jai__promo-art act-jai__promo-art--gift" aria-hidden>
            🧧
          </div>
          <h3 className="act-jai__promo-title">Gifts</h3>
          <p className="act-jai__promo-desc">Enter the redemption code to receive gift rewards</p>
        </Link>
        <button type="button" className="act-jai__promo-card act-jai__promo-card--btn">
          <div className="act-jai__promo-art act-jai__promo-art--cal" aria-hidden>
            📅
          </div>
          <h3 className="act-jai__promo-title">Attendance bonus</h3>
          <p className="act-jai__promo-desc">The more consecutive days you sign in, the higher the reward will be.</p>
        </button>
      </div>

      <section className="act-jai__games" aria-labelledby="act-games-heading">
        <h2 id="act-games-heading" className="act-jai__games-heading">
          Games
        </h2>
        <p className="act-jai__games-sub">Tap a banner to play</p>
        <div className="act-jai__game-list">
          {GAMES.map((g) => (
            <Link key={g.slug} to={g.to} className={`act-jai__game-banner ${g.className}`}>
              <div className="act-jai__game-banner__art" aria-hidden />
              <div className="act-jai__game-banner__text">
                <span className="act-jai__game-banner__tag">{g.tagline}</span>
                <span className="act-jai__game-banner__title">{g.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
