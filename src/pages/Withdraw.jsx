import { useState } from "react";
import BottomNav from "../components/BottomNav.jsx";
import WalletWithdrawSection from "../components/WalletWithdrawSection.jsx";

export default function Withdraw() {
  const [msg, setMsg] = useState("");

  return (
    <div className="app-shell">
      <div className="top-logo">
        <h1>Withdraw</h1>
        <small>Bank · UPI · Limits</small>
      </div>

      <WalletWithdrawSection setBannerMessage={setMsg} mode="standalone" firstOnPage />

      {msg ? (
        <p className={`wallet-rc-msg ${/fail|error|invalid|valid amount|please enter/i.test(msg) ? "is-err" : ""}`}>
          {msg}
        </p>
      ) : null}

      <BottomNav />
    </div>
  );
}
