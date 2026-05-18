import { NavLink, useLocation } from "react-router-dom";
import { useId } from "react";
import promotionImg from "../assets/promotion.webp";

const NAV_W = 400;
const NAV_H = 90;
const NAV_MID = NAV_W / 2;
const BOTTOM_R = 14;

/**
 * Left half of top edge (mirror at NAV_MID) — matches reference:
 * outer wing peaks up → dip toward center → deep U at promotion slot.
 */
const TOP_HALF = [
  [0, 42],
  [14, 6],
  [36, 2],
  [62, 12],
  [90, 24],
  [118, 36],
  [146, 48],
  [170, 56],
  [186, 60],
  [NAV_MID, 63],
];

function buildBarPath() {
  const rightHalf = TOP_HALF.slice(0, -1)
    .reverse()
    .map(([x, y]) => [NAV_W - x, y]);

  const top = [...TOP_HALF, ...rightHalf];

  let d = `M ${BOTTOM_R} ${NAV_H}`;
  d += ` Q 0 ${NAV_H} 0 ${NAV_H - BOTTOM_R}`;
  d += ` L 0 ${top[0][1]}`;

  for (let i = 1; i < top.length; i += 1) {
    const [x, y] = top[i];
    const [px, py] = top[i - 1];
    const c1x = px + (x - px) * 0.45;
    const c2x = px + (x - px) * 0.55;
    d += ` C ${c1x} ${py}, ${c2x} ${y}, ${x} ${y}`;
  }

  d += ` L ${NAV_W} ${NAV_H - BOTTOM_R}`;
  d += ` Q ${NAV_W} ${NAV_H} ${NAV_W - BOTTOM_R} ${NAV_H}`;
  d += ` Z`;
  return d;
}

const BAR_PATH = buildBarPath();

export default function BottomNav() {
  const { pathname } = useLocation();
  const uid = useId().replace(/:/g, "");
  const gradId = `bn-grad-${uid}`;
  const rimId = `bn-rim-${uid}`;
  const homeActive = pathname === "/" || pathname.startsWith("/game/");
  const activityActive = pathname === "/activity";
  const walletActive = pathname === "/wallet" || pathname === "/withdraw";
  const accountActive = pathname === "/profile";

  return (
    <nav className="bottom-nav bottom-nav--jai" aria-label="Main">
      <div className="bottom-nav__shell">
        <svg
          className="bottom-nav__bar-svg"
          viewBox={`0 0 ${NAV_W} ${NAV_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8ec5ff" />
              <stop offset="12%" stopColor="#a5b4fc" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="88%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <path d={BAR_PATH} fill={`url(#${gradId})`} fillOpacity="0.96" />
          <path
            d={BAR_PATH}
            fill="none"
            stroke={`url(#${rimId})`}
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="bottom-nav__gloss" aria-hidden />
        <span className="bottom-nav__spark bottom-nav__spark--l" aria-hidden />
        <span className="bottom-nav__spark bottom-nav__spark--r" aria-hidden />

        <div className="bottom-nav__tabs">
          <NavLink to="/" end className={`bottom-nav__tab ${homeActive ? "is-active is-active--home" : ""}`}>
            <span className="bottom-nav__ico bottom-nav__ico--home" aria-hidden />
            <span className="bottom-nav__label">Home</span>
          </NavLink>

          <NavLink to="/activity" className={`bottom-nav__tab ${activityActive ? "is-active" : ""}`}>
            <span className="bottom-nav__ico bottom-nav__ico--activity" aria-hidden />
            <span className="bottom-nav__label">Activity</span>
          </NavLink>

          <div className="bottom-nav__center-gap" aria-hidden />

          <NavLink to="/wallet" className={`bottom-nav__tab ${walletActive ? "is-active" : ""}`}>
            <span className="bottom-nav__ico bottom-nav__ico--wallet" aria-hidden />
            <span className="bottom-nav__label">Wallet</span>
          </NavLink>

          <NavLink to="/profile" className={`bottom-nav__tab ${accountActive ? "is-active" : ""}`}>
            <span className="bottom-nav__ico bottom-nav__ico--account" aria-hidden />
            <span className="bottom-nav__label">Account</span>
          </NavLink>
        </div>

        <NavLink to="/wallet" className="bottom-nav__promo" aria-label="Promotion">
          <img src={promotionImg} alt="" className="bottom-nav__promo-img" width={167} height={146} draggable={false} />
        </NavLink>
      </div>
    </nav>
  );
}
