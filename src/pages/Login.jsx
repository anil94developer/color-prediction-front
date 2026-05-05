import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

const REMEMBER_KEY = "colorpredict_login_remember";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (o.tab === "email" && o.email) {
        setTab("email");
        setEmail(o.email);
      } else if (o.phoneLocal) {
        setTab("phone");
        setPhoneLocal(o.phoneLocal);
        if (o.countryCode) setCountryCode(o.countryCode);
      }
      if (typeof o.remember === "boolean") setRemember(o.remember);
    } catch {
      /* ignore */
    }
  }, []);

  function goBack() {
    if (window.history.length > 1) nav(-1);
    else nav("/");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    let digits = phoneLocal.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    const phonePayload =
      tab === "phone" ? (digits ? String(digits) : undefined) : undefined;
    const emailPayload = tab === "email" ? (email.trim() || undefined) : undefined;
    if (tab === "phone" && !phonePayload) {
      setErr("Enter your phone number");
      return;
    }
    if (tab === "email" && !emailPayload) {
      setErr("Enter your email");
      return;
    }
    if (!password) {
      setErr("Enter password");
      return;
    }
    try {
      const { data } = await api.post("/auth/login", {
        phone: phonePayload,
        email: emailPayload,
        password,
      });
      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            remember: true,
            tab,
            phoneLocal: tab === "phone" ? phoneLocal : "",
            countryCode,
            email: tab === "email" ? email : "",
          })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      await login(data.token);
      nav("/");
    } catch (ex) {
      if (ex.response) {
        setErr(ex.response?.data?.error || `Error ${ex.response.status}`);
      } else if (ex?.message) {
        setErr(ex.message);
      } else {
        setErr("Server not reachable. Start API (api folder: npm run dev) and MongoDB.");
      }
    }
  }

  return (
    <div className="auth-jai">
      <header className="auth-jai__topbar">
        <button type="button" className="auth-jai__iconbtn" onClick={goBack} aria-label="Back">
          ‹
        </button>
        <div className="auth-jai__brand" aria-hidden>
          <span className="auth-jai__brand-crown">♔</span>
          <span className="auth-jai__brand-text">JAI CLUB</span>
          <span className="auth-jai__brand-stars">✦</span>
        </div>
        <button type="button" className="auth-jai__lang" aria-label="Language">
          <span className="auth-jai__lang-flag">🇺🇸</span> EN
        </button>
      </header>

      <section className="auth-jai__banner">
        <h1 className="auth-jai__banner-title">Log in</h1>
        <p className="auth-jai__banner-text">Please log in with your phone number or email</p>
        <p className="auth-jai__banner-text">If you forget your password, please contact customer service</p>
      </section>

      <div className="auth-jai__tabs" role="tablist" aria-label="Login method">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "phone"}
          className={`auth-jai__tab ${tab === "phone" ? "is-active" : ""}`}
          onClick={() => setTab("phone")}
        >
          <span className="auth-jai__tab-ico" aria-hidden>
            📱
          </span>
          <span>Phone number</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "email"}
          className={`auth-jai__tab ${tab === "email" ? "is-active" : ""}`}
          onClick={() => setTab("email")}
        >
          <span className="auth-jai__tab-ico" aria-hidden>
            ✉
          </span>
          <span>Email Login</span>
        </button>
      </div>

      <form className="auth-jai__form" onSubmit={onSubmit}>
        {tab === "phone" ? (
          <div className="auth-jai__field">
            <label className="auth-jai__label">
              <span className="auth-jai__label-ico" aria-hidden>
                📱
              </span>
              Phone number
            </label>
            <div className="auth-jai__phone-row">
              <select
                className="auth-jai__cc"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <input
                className="auth-jai__input auth-jai__input--phone"
                inputMode="numeric"
                autoComplete="tel"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        ) : (
          <div className="auth-jai__field">
            <label className="auth-jai__label">
              <span className="auth-jai__label-ico" aria-hidden>
                ✉
              </span>
              Mail
            </label>
            <input
              className="auth-jai__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="please input your email"
            />
          </div>
        )}

        <div className="auth-jai__field">
          <label className="auth-jai__label">
            <span className="auth-jai__label-ico" aria-hidden>
              🔒
            </span>
            Password
          </label>
          <div className="auth-jai__pwd-wrap">
            <input
              className="auth-jai__input auth-jai__input--pwd"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button
              type="button"
              className="auth-jai__eye"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <label className="auth-jai__remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="auth-jai__remember-input"
          />
          <span className="auth-jai__remember-box" aria-hidden />
          <span>Remember password</span>
        </label>

        {err ? <div className="auth-jai__err">{err}</div> : null}

        <button type="submit" className="auth-jai__btn auth-jai__btn--primary">
          Log in
        </button>
        <Link to="/register" className="auth-jai__btn auth-jai__btn--outline">
          Register
        </Link>
      </form>

      <footer className="auth-jai__footer">
        <a className="auth-jai__footlink" href="mailto:support@example.com">
          <span className="auth-jai__foot-ico" aria-hidden>
            🔒
          </span>
          Forgot password
        </a>
        <a className="auth-jai__footlink" href="mailto:support@example.com">
          <span className="auth-jai__foot-ico" aria-hidden>
            🎧
          </span>
          Customer Service
        </a>
      </footer>
    </div>
  );
}
