import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

export const WITHDRAW_MIN = 1000;
export const WITHDRAW_MAX = 100000;

const WITHDRAW_TYPES = new Set(["withdraw", "withdraw_reject"]);

function IconAmount() {
  return (
    <svg className="wallet-rc-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M8 7h6a2 2 0 010 4H8a2 2 0 000 4h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBank() {
  return (
    <svg className="wallet-rc-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10h18M5 10V8l7-4 7 4v2M7 10v9M17 10v9M10 19h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDocList() {
  return (
    <svg className="wallet-rc-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h12M8 12h12M8 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 6h.01M5 12h.01M5 18h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function maskAccountNumber(raw) {
  const s = String(raw || "").replace(/\s/g, "");
  if (!s) return "";
  if (s.length <= 4) return "****";
  return `****${s.slice(-4)}`;
}

const WALLET_LEDGER_LINK = { pathname: "/wallet", hash: "wallet-ledger", state: { ledgerTab: "withdraw" } };

/**
 * @param {{ setBannerMessage: (s: string) => void, onWithdrawSuccess?: () => void | Promise<void>, mode?: 'wallet' | 'standalone', onWithdrawHistoryClick?: () => void, firstOnPage?: boolean }} props
 */
export default function WalletWithdrawSection({
  setBannerMessage,
  onWithdrawSuccess,
  mode = "wallet",
  onWithdrawHistoryClick,
  firstOnPage = false,
}) {
  const { user, refreshMe } = useAuth();
  const [wAmt, setWAmt] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const hasBank = Boolean(String(user?.bank?.accountNumber || "").trim());

  const loadWithdrawHistory = useCallback(async () => {
    if (mode !== "standalone") return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/wallet/transactions", { params: { page: 1, pageSize: 100 } });
      setHistoryRows((data.items ?? []).filter((r) => WITHDRAW_TYPES.has(r.type)));
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadWithdrawHistory();
  }, [loadWithdrawHistory]);

  async function withdraw() {
    setBannerMessage("");
    if (!hasBank) {
      setBannerMessage("Add bank details in Profile to withdraw.");
      return;
    }
    const n = Number(wAmt);
    if (!Number.isFinite(n) || n < 1) {
      setBannerMessage("Please enter a valid amount.");
      return;
    }
    if (n < WITHDRAW_MIN || n > WITHDRAW_MAX) {
      setBannerMessage(
        `Amount must be between ₹${WITHDRAW_MIN.toLocaleString("en-IN")} and ₹${WITHDRAW_MAX.toLocaleString("en-IN")}.`
      );
      return;
    }
    setWBusy(true);
    try {
      await api.post("/wallet/withdraw", { amount: n, method: "upi" });
      setBannerMessage("Withdrawal requested");
      await refreshMe().catch(() => {});
      await loadWithdrawHistory();
      await onWithdrawSuccess?.();
    } catch (e) {
      setBannerMessage(e.response?.data?.error || "Failed");
    } finally {
      setWBusy(false);
    }
  }

  const historyLinkWallet = (
    <a href="#wallet-ledger" className="wallet-rc-history-link" onClick={() => onWithdrawHistoryClick?.()}>
      Withdrawal history
    </a>
  );
  return (
    <>
      <div className="card" style={{ marginTop: firstOnPage ? 0 : 12 }}>
      <div className="wallet-rc-card-head">
        <h3 style={{ margin: 0 }}>Withdraw</h3>
        {mode === "wallet" ? historyLinkWallet : null}
      </div>

      <div className="wallet-rc-head">
        <IconBank />
        <span>Beneficiary account</span>
      </div>
      <Link to="/profile" className={`wallet-wd-bank-box ${hasBank ? "wallet-wd-bank-box--filled" : ""}`}>
        {hasBank ? (
          <>
            <span className="wallet-wd-bank-label">Linked bank account</span>
            <span className="wallet-wd-bank-num">{maskAccountNumber(user?.bank?.accountNumber)}</span>
            <span className="wallet-wd-bank-meta">
              {(user?.bank?.accountName || "—").trim()} · {(user?.bank?.ifsc || "—").toUpperCase()}
            </span>
            <span className="wallet-wd-bank-edit">Tap to edit in Profile</span>
          </>
        ) : (
          <span className="wallet-wd-bank-placeholder">Add a bank account number</span>
        )}
      </Link>
      {!hasBank ? (
        <p className="wallet-wd-warn">Need to add beneficiary information to be able to withdraw money</p>
      ) : null}

      <div className="wallet-rc-head" style={{ marginTop: 14 }}>
        <IconAmount />
        <span>Withdrawal amount</span>
      </div>
      <div className="wallet-wd-input-row">
        <span className="wallet-wd-input__rupee">₹</span>
        <input
          className="wallet-wd-input"
          inputMode="decimal"
          value={wAmt}
          onChange={(e) => setWAmt(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="Please enter the amount"
          aria-label="Withdrawal amount"
        />
      </div>
      <button type="button" className="wallet-wd-submit" disabled={wBusy || !hasBank} onClick={withdraw}>
        {wBusy ? "Please wait…" : "Withdraw"}
      </button>

      <ul className="wallet-wd-rules">
        {/* <li>
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Need to bet <span className="wallet-wd-em">₹ 0.00</span> to be able to withdraw
        </li>
        <li>
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Withdraw time <span className="wallet-wd-em">00:00–23:59</span>
        </li>
        <li>
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Today remaining withdrawal times <span className="wallet-wd-em">1</span>
        </li>
        <li>
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Withdrawal amount range{" "}
          <span className="wallet-wd-em">
            ₹{WITHDRAW_MIN.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} – ₹
            {WITHDRAW_MAX.toLocaleString("en-IN")}
          </span>
        </li>
        <li className="wallet-wd-rules__note">
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Please confirm your beneficial account information before withdrawing. If your information is incorrect,
          our company will not be liable for the amount of loss.
        </li> */}
        <li className="wallet-wd-rules__highlight">
          <span className="wallet-rc-rules__bullet" aria-hidden />
          Once deposit 6700 after withdrawal complete successfully
        </li>
      </ul>

      {mode === "wallet" ? (
        <div className="wallet-wd-ledger-teaser">
          <IconDocList />
          <a href="#wallet-ledger" className="wallet-wd-ledger-teaser__link" onClick={() => onWithdrawHistoryClick?.()}>
            Withdrawal history
          </a>
        </div>
      ) : null}
    </div>

      {mode === "standalone" ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="wallet-rc-head">
            <IconDocList />
            <span>Withdrawal history</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amt</th>
                  <th>Balance</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading && historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!historyLoading && historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                      No withdrawal records yet.
                    </td>
                  </tr>
                ) : null}
                {historyRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.type}</td>
                    <td>{r.amount}</td>
                    <td>{r.balanceAfter}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
            Last 100 ledger entries ·{" "}
            <Link to={WALLET_LEDGER_LINK} className="wallet-rc-history-link" style={{ fontSize: "inherit" }}>
              Full wallet ledger
            </Link>
          </p>
        </div>
      ) : null}
    </>
  );
}
