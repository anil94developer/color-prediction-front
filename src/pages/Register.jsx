import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

function digitsFromPhoneLocal(phoneLocal) {
  let d = phoneLocal.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  return d;
}

export default function Register() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(true);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function goBack() {
    if (window.history.length > 1) nav(-1);
    else nav("/login");
  }

  async function sendOtp() {
    setErr("");
    const digits = tab === "phone" ? digitsFromPhoneLocal(phoneLocal) : "";
    const phonePayload = tab === "phone" ? (digits ? String(digits) : undefined) : undefined;
    const emailPayload = tab === "email" ? (email.trim() || undefined) : undefined;
    if (tab === "phone" && !phonePayload) {
      setErr("Enter your phone number");
      return;
    }
    if (tab === "email" && !emailPayload) {
      setErr("Enter your email");
      return;
    }
    try {
      const { data } = await api.post("/auth/send-otp", {
        phone: phonePayload,
        email: emailPayload,
      });
      setSent(true);
      if (data.devCode) setOtp(data.devCode);
    } catch (ex) {
      setErr(ex.response?.data?.error || "Could not send verification code");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!agreePrivacy) {
      setErr("Please agree to the Privacy Agreement");
      return;
    }
    const digits = tab === "phone" ? digitsFromPhoneLocal(phoneLocal) : "";
    const phonePayload = tab === "phone" ? (digits ? String(digits) : undefined) : undefined;
    const emailPayload = tab === "email" ? (email.trim() || undefined) : undefined;
    if (tab === "phone" && !phonePayload) {
      setErr("Enter your phone number");
      return;
    }
    if (tab === "email" && !emailPayload) {
      setErr("Enter your email");
      return;
    }
    if (!password || password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    try {
      const { data } = await api.post("/auth/register", {
        phone: phonePayload,
        email: emailPayload,
        password,
        otp: otp || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      await login(data.token);
      nav("/");
    } catch (ex) {
      if (ex.response) {
        setErr(ex.response?.data?.error || `Error ${ex.response.status}`);
      } else if (ex?.message) {
        setErr(ex.message);
      } else {
        setErr("Registration failed");
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
        <h1 className="auth-jai__banner-title">Register</h1>
        <p className="auth-jai__banner-text">Please register by phone number or email</p>
      </section>

      <div className="auth-jai__tabs" role="tablist" aria-label="Register method">
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
          <span>Email</span>
        </button>
      </div>

      <div className="auth-jai__subhead" aria-hidden={false}>
        <span className="auth-jai__subhead-ico" aria-hidden>
          {tab === "phone" ? "📱" : "✉"}
        </span>
        <span className="auth-jai__subhead-text">
          {tab === "phone" ? "Register your phone" : "Register your email"}
        </span>
        <span className="auth-jai__subhead-line" aria-hidden />
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
                placeholder="Please enter the phone number"
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
              placeholder="Please enter your email"
            />
          </div>
        )}

        <div className="auth-jai__field">
          <label className="auth-jai__label">
            <span className="auth-jai__label-ico" aria-hidden>
              🔒
            </span>
            Set password
          </label>
          <div className="auth-jai__pwd-wrap">
            <input
              className="auth-jai__input auth-jai__input--pwd"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set password"
              minLength={6}
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

        <div className="auth-jai__field">
          <label className="auth-jai__label">
            <span className="auth-jai__label-ico" aria-hidden>
              🔒
            </span>
            Confirm password
          </label>
          <div className="auth-jai__pwd-wrap">
            <input
              className="auth-jai__input auth-jai__input--pwd"
              type={showPwd2 ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              minLength={6}
              required
            />
            <button
              type="button"
              className="auth-jai__eye"
              onClick={() => setShowPwd2((v) => !v)}
              aria-label={showPwd2 ? "Hide password" : "Show password"}
            >
              {showPwd2 ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div className="auth-jai__field">
          <label className="auth-jai__label">
            <span className="auth-jai__label-ico" aria-hidden>
              👤
            </span>
            Invite code
          </label>
          <input
            className="auth-jai__input"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Please enter the invitation code"
            autoComplete="off"
          />
        </div>

        <div className="auth-jai__field">
          <label className="auth-jai__label">
            <span className="auth-jai__label-ico" aria-hidden>
              ✉
            </span>
            Verification code
          </label>
          <div className="auth-jai__otp-row">
            <input
              className="auth-jai__input"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder={sent ? "Enter 6-digit code" : "Tap Send code first"}
              maxLength={8}
            />
            <button type="button" className="auth-jai__btn-otp" onClick={sendOtp}>
              {sent ? "Resend" : "Send code"}
            </button>
          </div>
        </div>

        <label className="auth-jai__remember auth-jai__privacy">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="auth-jai__remember-input"
          />
          <span className="auth-jai__remember-box" aria-hidden />
          <span>
            I have read and agree{" "}
            <a
              href="#privacy"
              className="auth-jai__privacy-link"
              onClick={(e) => e.preventDefault()}
            >
              [Privacy Agreement]
            </a>
          </span>
        </label>

        {err ? <div className="auth-jai__err">{err}</div> : null}

        <button type="submit" className="auth-jai__btn auth-jai__btn--primary">
          Register
        </button>
        <Link to="/login" className="auth-jai__btn auth-jai__btn--outline">
          I have an account <strong className="auth-jai__outline-strong">Login</strong>
        </Link>
      </form>
    </div>
  );
}
