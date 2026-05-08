import { NavLink, useLocation } from "react-router-dom";

export default function BottomNav() {
  const { pathname } = useLocation();
  const homeActive = pathname === "/" || pathname.startsWith("/game/");
  const activityActive = pathname === "/activity";
  const walletActive = pathname === "/wallet" || pathname === "/withdraw";
  const accountActive = pathname === "/profile";

  return (
    <nav className="bottom-nav bottom-nav--jai" aria-label="Main">
      <div className="bottom-nav__inner bottom-nav__inner--jai">
        <NavLink to="/" end className={`bottom-nav__item ${homeActive ? "is-active" : ""}`}>
          <span className="bottom-nav__ico bottom-nav__ico--home" aria-hidden />
          <span>Home</span>
        </NavLink>

        <NavLink to="/activity" className={`bottom-nav__item ${activityActive ? "is-active" : ""}`}>
          <span className="bottom-nav__ico bottom-nav__ico--activity" aria-hidden />
          <span>Activity</span>
        </NavLink>

        <div className="bottom-nav__fab-slot">
          <NavLink to="/wallet" className={`bottom-nav__fab ${walletActive ? "is-active" : ""}`} aria-label="Promotion">
            <span className="bottom-nav__fab-gem" aria-hidden>
              💎
            </span>
          </NavLink>
          <span className="bottom-nav__fab-label">Promotion</span>
        </div>

        <NavLink to="/wallet" className={`bottom-nav__item ${walletActive ? "is-active" : ""}`}>
          <span className="bottom-nav__ico bottom-nav__ico--wallet" aria-hidden />
          <span>Wallet</span>
        </NavLink>

        <NavLink to="/profile" className={`bottom-nav__item ${accountActive ? "is-active" : ""}`}>
          <span className="bottom-nav__ico bottom-nav__ico--account" aria-hidden />
          <span>Account</span>
        </NavLink>
      </div>
    </nav>
  );
}
