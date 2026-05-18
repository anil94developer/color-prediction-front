import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { GAME_ICONS, RECOMMEND_ICONS } from "../assets/gameCatalog.js";
import BottomNav from "../components/BottomNav.jsx";

const MARQUEE = "Our customer service will never send any links to members—if you receive a link from anyone, do not trust it.";

const GAME_CARDS = [
  { key: "wingo", title: "WINGO", sub: "WIN GO", icon: "wingo", to: "/game/wingo", active: true, cls: "wingo" },
  { key: "aviator-red", title: "AVIATOR", sub: "AVIATOR", icon: "aviator", active: false, cls: "aviator-red" },
  { key: "cricket", title: "CRICKET", sub: "CRICKET", icon: "cricket", active: false, cls: "cricket" },
  { key: "pubg", title: "PUBG MINI", sub: "PUBG MINI", icon: "pubg", active: false, cls: "pubg" },
  { key: "aviator-blue", title: "AVIATOR", sub: "AVIATOR", icon: "aviator", active: false, cls: "aviator-blue" },
  { key: "vortex", title: "VORTEX", sub: "VORTEX", icon: "vortex", active: false, cls: "vortex" },
];

const RECOMMENDED_CARDS = [
  { key: "money-coming", title: "MONEY COMING", cls: "money-coming" },
  { key: "fortune-gems-2", title: "FORTUNE GEMS 2", cls: "fortune-gems-2" },
  { key: "fortune-gems", title: "FORTUNE GEMS", cls: "fortune-gems" },
  { key: "hot-spin", title: "HOT SPIN", cls: "hot-spin" },
  { key: "crazy-777", title: "CRAZY 777", cls: "crazy-777" },
  { key: "wildfire-wins", title: "WILDFIRE WINS", cls: "wildfire-wins" },
];

const EARNERS_TOP3 = [
  { rank: 2, name: "Mem***9BP", amount: 8869009.8, avatar: "👩", cls: "silver" },
  { rank: 1, name: "Mem***7V0", amount: 12592657, avatar: "🧑", cls: "gold" },
  { rank: 3, name: "Mem***8DN", amount: 8368997.14, avatar: "👩", cls: "bronze" },
];

const EARNERS_LIST = [
  { rank: 4, name: "Mem***JWL", amount: 7955640 },
  { rank: 5, name: "Mem***MWV", amount: 6597360 },
  { rank: 6, name: "Mem***SEP", amount: 6566000 },
  { rank: 7, name: "Mem***YBX", amount: 6027980 },
  { rank: 8, name: "Mem***GL1", amount: 5390392 },
];

const PARTNER_BRANDS = ["PG", "JDB", "JILI", "TB", "PLAYACE", "EVO", "CQ9", "CG", "PP"];

const PLATFORM_POINTS = [
  "The platform advocates fairness, justice, and openness. We mainly operate fair lottery, blockchain games, casinos, and slot machine games.",
  "Jai club works with more than 10,000 online live game dealers and slot games, all of which are verified fair games.",
  "Jai club supports fast deposit and withdrawal, and looks forward to your visit.",
];

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

export default function Home() {
  const { user } = useAuth();
  const bal = Number(user?.walletBalance ?? 0).toFixed(2);
  const slides = useMemo(
    () => [
      { id: "s1", src: "/slider/slide-1.png", alt: "Promotion 1" },
      { id: "s2", src: "/slider/slide-2.png", alt: "Promotion 2" },
      { id: "s3", src: "/slider/slide-3.png", alt: "Promotion 3" },
      { id: "s4", src: "/slider/slide-4.png", alt: "Promotion 4" },
    ],
    []
  );
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="app-shell home-match">
      <header className="home-match__topbar">
        <div className="home-match__wallet-pill">
          <span>₹{bal}</span>
          <Link to="/wallet" className="home-match__wallet-plus" aria-label="Deposit">
            +
          </Link>
        </div>
        <div className="home-match__brand" aria-hidden>
          <span className="home-match__brand-crown">✦</span>
          <span className="home-match__brand-text">JAI CLUB</span>
          <span className="home-match__brand-star">★</span>
        </div>
        <button type="button" className="home-match__lang" aria-label="Language">
          <span className="home-match__lang-action" aria-hidden>
            ↓
          </span>
          <span className="home-match__lang-flag" aria-hidden>
            🇺🇸
          </span>
          <span>EN</span>
        </button>
      </header>

      <section className="home-match__slider" aria-label="Promotions">
        <div className="home-match__slider-viewport">
          <div className="home-match__slider-track" style={{ transform: `translateX(-${slideIdx * 100}%)` }}>
            {slides.map((s) => (
              <div className="home-match__slide" key={s.id}>
                <img src={s.src} alt={s.alt} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
        {slides.length > 1 ? (
          <div className="home-match__slider-dots" role="tablist" aria-label="Promotion slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`home-match__slider-dot ${i === slideIdx ? "is-active" : ""}`}
                aria-label={`Slide ${i + 1}`}
                aria-selected={i === slideIdx}
                onClick={() => setSlideIdx(i)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <div className="home-match__cats" role="tablist" aria-label="Categories">
        <button type="button" className="home-match__cat home-match__cat--active">
          <span aria-hidden>🔥</span> Popular
        </button>
        <button type="button" className="home-match__cat">
          <span aria-hidden>🎱</span> Lottery
        </button>
        <button type="button" className="home-match__cat" disabled>
          <span aria-hidden>🚀</span> Mini games
        </button>
      </div>

      <div className="home-match__notice">
        <span className="home-match__notice-ico" aria-hidden>
          🔊
        </span>
        <div className="home-match__notice-marquee">
          <div className="home-match__notice-track">
            <span>{MARQUEE}</span>
            <span aria-hidden>{MARQUEE}</span>
          </div>
        </div>
        <button type="button" className="home-match__notice-btn">
          Detail
        </button>
      </div>

      <section className="home-match__panel">
        <div className="home-match__panel-head">
          <div className="home-match__panel-pill">Popular</div>
          <button type="button" className="home-match__panel-all" aria-label="View all popular games">
            ALL <span aria-hidden>›</span>
          </button>
        </div>
        <div className="home-match__game-grid">
          {GAME_CARDS.map((g) =>
            g.active ? (
              <Link key={g.key} to={g.to}  >
                <span  aria-hidden>
                  {GAME_ICONS[g.icon] ? (
                    <img src={GAME_ICONS[g.icon]} alt="" className="home-match__game-img" />
                  ) : null}
                </span>
                 
              </Link>
            ) : (
              <article key={g.key}  aria-disabled>
                <span  aria-hidden>
                  {GAME_ICONS[g.icon] ? (
                    <img src={GAME_ICONS[g.icon]} alt="" className="home-match__game-img" />
                  ) : null}
                </span>
                 
              </article>
            )
          )}
        </div>
      </section>

      <section className="home-match__panel home-match__panel--recommend">
        <div className="home-match__panel-head">
          <div className="home-match__panel-pill">Recommended Games</div>
        </div>
        <div className="home-match__recommend-grid">
          {RECOMMENDED_CARDS.map((g, i) => (
            <article key={g.key} className={`home-match__recommend-card home-match__recommend-card--${g.cls}`}>
              <span className="home-match__recommend-jili">JILI</span>
              <span className="home-match__recommend-art" aria-hidden>
                {RECOMMEND_ICONS[i] ? (
                  <img src={RECOMMEND_ICONS[i]} alt="" className="home-match__recommend-img" />
                ) : null}
              </span>
              <span className="home-match__recommend-title">{g.title}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="home-match__feature">
        <div className="home-match__feature-art" aria-hidden>
          <span>🐙</span>
          <strong>POWER OF THE KRAKEN</strong>
        </div>
        <div className="home-match__feature-content">
          <h3>Power Of The Kraken</h3>
          <div className="home-match__feature-stars">★★★★★ <span>5.0 | Score</span></div>
          <p>
            Slot Game <span>#01 | Rank</span>
          </p>
          <p>
            300K Winner <span>1500x | Max Win</span>
          </p>
          <button type="button" className="home-match__feature-btn">
            Play Now
          </button>
        </div>
      </section>

      <section className="home-match__earnings">
        <div className="home-match__earnings-head">
          <div className="home-match__panel-pill">Today&apos;s earnings chart</div>
        </div>

        <div className="home-match__earnings-podium">
          {EARNERS_TOP3.map((u) => (
            <article key={u.rank} className={`home-match__podium-card home-match__podium-card--${u.cls}`}>
              <div className="home-match__podium-avatar" aria-hidden>
                {u.avatar}
              </div>
              <div className="home-match__podium-name">{u.name}</div>
              <div className="home-match__podium-amount">₹{formatInr(u.amount)}</div>
              <div className="home-match__podium-rank">{String(u.rank).padStart(2, "0")}</div>
            </article>
          ))}
        </div>

        <div className="home-match__earnings-list" aria-label="Top earners list">
          {EARNERS_LIST.map((u) => (
            <article key={u.rank} className="home-match__earn-row">
              <div className="home-match__earn-rank">{u.rank}</div>
              <div className="home-match__earn-user">
                <span className="home-match__earn-avatar" aria-hidden>
                  👩
                </span>
                <span>{u.name}</span>
              </div>
              <div className="home-match__earn-amount">₹{formatInr(u.amount)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-match__partners">
        <div className="home-match__partners-grid">
          {PARTNER_BRANDS.map((brand) => (
            <article key={brand} className="home-match__partner-box">
              {brand}
            </article>
          ))}
        </div>

        <ul className="home-match__partners-points">
          {PLATFORM_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <p className="home-match__partners-warning">Gambling can be addictive, please play rationally.</p>
        <p className="home-match__partners-warning">Jai club only accepts customers above the age of 18.</p>
      </section>

      <div className="home-match__float-tools" aria-hidden>
        <button type="button" className="home-match__float-btn home-match__float-btn--tg">
          ➤
        </button>
        <button type="button" className="home-match__float-btn home-match__float-btn--bot">
          🤖
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
