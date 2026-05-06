import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import BottomNav from "../components/BottomNav.jsx";

const MARQUEE =
  "Our customer service will never send any links. Do not trust unofficial messages. Play responsibly.";

const GAMES = [
  {
    key: "wingo",
    name: "WinGo",
    desc: "Color & number · live rounds",
    to: "/game/wingo",
    className: "home-jai__tile--wingo",
  },
];

export default function Home() {
  const { user } = useAuth();
  const bal = Number(user?.walletBalance ?? 0).toFixed(2);

  return (
    <div className="app-shell home-jai">
      <header className="home-jai__header">
        <div className="home-jai__header-left">
          <span className="home-jai__balance">₹{bal}</span>
          <Link to="/wallet" className="home-jai__deposit-plus" aria-label="Deposit">
            +
          </Link>
        </div>
        <div className="home-jai__header-brand" aria-hidden>
          <span className="home-jai__header-crown">♔</span>
          <span className="home-jai__header-title">JAI CLUB</span>
          <span className="home-jai__header-stars">✦</span>
        </div>
        <div className="home-jai__header-right">
          <Link to="/profile" className="home-jai__header-icon" aria-label="Inbox">
            🎁
          </Link>
          <button type="button" className="home-jai__header-lang" aria-label="Language">
            <span>🇺🇸</span> EN
          </button>
        </div>
      </header>

      <section className="home-jai__hero" aria-label="Promotion">
        <div className="home-jai__hero-inner">
          <div className="home-jai__hero-copy">
            <span className="home-jai__hero-kicker">FIRST DEPOSIT BONUS</span>
            <p className="home-jai__hero-amount">₹4888</p>
            <Link to="/wallet" className="home-jai__hero-cta">
              UP TO ₹4888
            </Link>
          </div>
          <div className="home-jai__hero-art" aria-hidden>
            <span className="home-jai__hero-coin">🪙</span>
            <span className="home-jai__hero-coin home-jai__hero-coin--2">🪙</span>
            <span className="home-jai__hero-coin home-jai__hero-coin--3">💵</span>
          </div>
        </div>
      </section>

      <div className="home-jai__notice">
        <span className="home-jai__notice-ico" aria-hidden>
          🔊
        </span>
        <div className="home-jai__notice-marquee" aria-live="polite">
          <div className="home-jai__notice-track">
            <span>{MARQUEE}</span>
            <span aria-hidden>{MARQUEE}</span>
          </div>
        </div>
        <button type="button" className="home-jai__notice-detail">
          Detail
        </button>
      </div>

      <div className="home-jai__cats" role="tablist" aria-label="Categories">
        <button type="button" className="home-jai__cat home-jai__cat--active">
          <span aria-hidden>🔥</span> Popular
        </button>
        <button type="button" className="home-jai__cat" disabled>
          <span aria-hidden>🎱</span> Lottery
        </button>
        <button type="button" className="home-jai__cat" disabled>
          <span aria-hidden>🚀</span> Mini games
        </button>
      </div>

      <section className="home-jai__section" aria-labelledby="home-popular-heading">
        <div className="home-jai__section-head">
          <h2 id="home-popular-heading" className="home-jai__section-title">
            Popular
          </h2>
          <Link to="/game/wingo" className="home-jai__section-all">
            ALL &gt;
          </Link>
        </div>
        <div className="home-jai__tiles">
          {GAMES.map((g) => (
            <Link key={g.key} to={g.to} className={`home-jai__tile ${g.className}`}>
              <div className="home-jai__tile-body">
                <h3 className="home-jai__tile-name">{g.name}</h3>
                <p className="home-jai__tile-desc">{g.desc}</p>
              </div>
              <span className="home-jai__tile-play">Play</span>
            </Link>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
