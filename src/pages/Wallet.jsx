import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";
import DepositUpiModal from "../components/DepositUpiModal.jsx";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext.jsx";

const TX_PAGE_SIZE = 15;
const DEPOSIT_TYPES = new Set(["deposit", "deposit_manual"]);
const WITHDRAW_TYPES = new Set(["withdraw", "withdraw_reject"]);

const PRESETS = [
  { value: 500, label: "₹ 500" },
  { value: 2000, label: "₹ 2K" },
  { value: 5000, label: "₹ 5K" },
  { value: 10000, label: "₹ 10K" },
  { value: 50000, label: "₹ 50K" },
  { value: 100000, label: "₹ 100K" },
];

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

function IconBook() {
  return (
    <svg className="wallet-rc-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Wallet() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [rows, setRows] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const txPageRef = useRef(1);
  const [txMeta, setTxMeta] = useState({
    total: 0,
    totalPages: 1,
    pageSize: TX_PAGE_SIZE,
    hasNext: false,
    hasPrev: false,
  });
  const [txLoading, setTxLoading] = useState(false);

  const [ledgerTab, setLedgerTab] = useState("all");
  const [depositRows, setDepositRows] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawRows, setWithdrawRows] = useState([]);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [depAmt, setDepAmt] = useState(2000);
  const [depCustom, setDepCustom] = useState("2000");
  const [depBusy, setDepBusy] = useState(false);
  const [depPayPayload, setDepPayPayload] = useState(null);

  const [msg, setMsg] = useState("");

  useEffect(() => {
    txPageRef.current = txPage;
  }, [txPage]);

  const loadTransactions = useCallback(async (page) => {
    setTxLoading(true);
    try {
      const { data } = await api.get("/wallet/transactions", {
        params: { page, pageSize: TX_PAGE_SIZE },
      });
      setRows(data.items ?? []);
      const p = data.page ?? page;
      setTxPage(p);
      setTxMeta({
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 1,
        pageSize: data.pageSize ?? TX_PAGE_SIZE,
        hasNext: !!data.hasNext,
        hasPrev: !!data.hasPrev,
      });
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadDepositLedger = useCallback(async () => {
    setDepositLoading(true);
    try {
      const { data } = await api.get("/wallet/transactions", { params: { page: 1, pageSize: 100 } });
      setDepositRows((data.items ?? []).filter((r) => DEPOSIT_TYPES.has(r.type)));
    } catch {
      setDepositRows([]);
    } finally {
      setDepositLoading(false);
    }
  }, []);

  const loadWithdrawLedger = useCallback(async () => {
    setWithdrawLoading(true);
    try {
      const { data } = await api.get("/wallet/transactions", { params: { page: 1, pageSize: 100 } });
      setWithdrawRows((data.items ?? []).filter((r) => WITHDRAW_TYPES.has(r.type)));
    } catch {
      setWithdrawRows([]);
    } finally {
      setWithdrawLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions(1).catch(() => {});
  }, [loadTransactions]);

  useEffect(() => {
    const lt = location.state?.ledgerTab;
    if (lt !== "withdraw" && lt !== "deposit" && lt !== "all") return;
    setLedgerTab(lt);
    navigate(".", { replace: true, state: {} });
    requestAnimationFrame(() => {
      document.getElementById("wallet-ledger")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.state, navigate]);

  useEffect(() => {
    if (ledgerTab === "deposit") loadDepositLedger();
    if (ledgerTab === "withdraw") loadWithdrawLedger();
  }, [ledgerTab, loadDepositLedger, loadWithdrawLedger]);

  useEffect(() => {
    if (location.hash !== "#wallet-ledger") return;
    setLedgerTab("deposit");
    const id = window.requestAnimationFrame(() => {
      document.getElementById("wallet-ledger")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname, location.hash]);

  function selectPreset(v) {
    setDepAmt(v);
    setDepCustom(String(v));
  }

  function onDepCustomChange(raw) {
    const digits = raw.replace(/\D/g, "");
    setDepCustom(digits);
    const n = digits === "" ? 0 : Number(digits);
    if (Number.isFinite(n)) setDepAmt(n);
  }

  function clearDepCustom() {
    setDepCustom("");
    setDepAmt(0);
  }

  async function depositReq() {
    setMsg("");
    const n = Number(depAmt);
    if (!Number.isFinite(n) || n < 1) {
      setMsg("Please enter a valid amount.");
      return;
    }
    setDepBusy(true);
    try {
      const { data } = await api.post("/wallet/deposit-request", {
        amount: n,
        reference: "UPI_QR",
        paymentMethod: "paytm",
      });
      const req = data?.request;
      if (req?.id) {
        setDepPayPayload(req);
        setMsg("Pay via UPI, then enter 12-digit UTR below.");
      } else {
        setMsg("Deposit request created (admin will approve).");
        refreshMe().catch(() => {});
        await loadTransactions(txPageRef.current);
        if (ledgerTab === "deposit") await loadDepositLedger();
        if (ledgerTab === "withdraw") await loadWithdrawLedger();
      }
    } catch (e) {
      setMsg(e.response?.data?.error || "Failed");
    } finally {
      setDepBusy(false);
    }
  }

  function onDepositUtrDone() {
    setMsg("UTR submitted. Admin will verify and credit your wallet.");
    refreshMe().catch(() => {});
    loadTransactions(txPageRef.current).catch(() => {});
    if (ledgerTab === "deposit") loadDepositLedger();
    if (ledgerTab === "withdraw") loadWithdrawLedger();
  }

  const displayRows =
    ledgerTab === "deposit" ? depositRows : ledgerTab === "withdraw" ? withdrawRows : rows;
  const listLoading =
    ledgerTab === "deposit" ? depositLoading : ledgerTab === "withdraw" ? withdrawLoading : txLoading;

  function goLedgerTab(tab) {
    return () => setLedgerTab(tab);
  }

  return (
    <div className="app-shell">
      <DepositUpiModal
        open={!!depPayPayload}
        payload={depPayPayload}
        onClose={() => setDepPayPayload(null)}
        onSuccess={onDepositUtrDone}
      />
      <div className="top-logo">
        <h1>Wallet</h1>
        <small>Deposit · Ledger</small>
      </div>

      <div className="card">
        <div className="wallet-rc-card-head">
          <h3 style={{ margin: 0 }}>Deposit</h3>
          <a href="#wallet-ledger" className="wallet-rc-history-link" onClick={goLedgerTab("deposit")}>
            Deposit history
          </a>
        </div>

        <p className="wallet-rc-qr-hint">Deposit opens a UPI QR screen — pay with any app, then enter 12-digit UTR.</p>

        <div className="wallet-rc-head" style={{ marginTop: 8 }}>
          <IconAmount />
          <span>Deposit amount</span>
        </div>
        <div className="wallet-rc-amt-grid">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`wallet-rc-amt ${depAmt === p.value && depCustom === String(p.value) ? "is-selected" : ""}`}
              onClick={() => selectPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="wallet-rc-input-row">
          <span className="wallet-rc-input__rupee">₹</span>
          <input
            className="wallet-rc-input"
            inputMode="numeric"
            value={depCustom}
            onChange={(e) => onDepCustomChange(e.target.value)}
            placeholder="0"
            aria-label="Deposit amount"
          />
          {depCustom ? (
            <button type="button" className="wallet-rc-input__clear" onClick={clearDepCustom} aria-label="Clear">
              ×
            </button>
          ) : null}
        </div>
        <button type="button" className="wallet-rc-deposit-btn" disabled={depBusy} onClick={depositReq}>
          {depBusy ? "Please wait…" : "Deposit"}
        </button>

        <div className="wallet-rc-head" style={{ marginTop: 18 }}>
          <IconBook />
          <span>Recharge instructions</span>
        </div>
        <ul className="wallet-rc-rules">
          <li>
            <span className="wallet-rc-rules__bullet" aria-hidden />
            Scan the QR on the next screen; amount on UPI must match your order.
          </li>
          <li>
            <span className="wallet-rc-rules__bullet" aria-hidden />
            If the timer ends, create a new deposit from this page.
          </li>
          {/* <li>
            <span className="wallet-rc-rules__bullet" aria-hidden />
            The transfer amount must match the order you created, otherwise the money cannot be credited successfully.
          </li>
          <li>
            <span className="wallet-rc-rules__bullet" aria-hidden />
            If you transfer the wrong amount, our company will not be responsible for the lost amount!
          </li> */}
        </ul>
      </div>

      {msg ? (
        <p className={`wallet-rc-msg ${/fail|error|invalid|valid amount|please enter/i.test(msg) ? "is-err" : ""}`}>
          {msg}
        </p>
      ) : null}

      <div className="card" style={{ marginTop: 12 }} id="wallet-ledger">
        <div className="wallet-rc-card-head">
          <h3 style={{ margin: 0 }}>History</h3>
        </div>
        <div className="tabs wallet-ledger-tabs" style={{ marginTop: 4 }}>
          <button
            type="button"
            className={`tab ${ledgerTab === "all" ? "active" : ""}`}
            onClick={() => setLedgerTab("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`tab ${ledgerTab === "deposit" ? "active" : ""}`}
            onClick={() => setLedgerTab("deposit")}
          >
            Deposits
          </button>
          <button
            type="button"
            className={`tab ${ledgerTab === "withdraw" ? "active" : ""}`}
            onClick={() => setLedgerTab("withdraw")}
          >
            Withdrawals
          </button>
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
              {listLoading && displayRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!listLoading && displayRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
                    {ledgerTab === "deposit"
                      ? "No deposit records yet."
                      : ledgerTab === "withdraw"
                        ? "No withdrawal records yet."
                        : "No transactions yet."}
                  </td>
                </tr>
              ) : null}
              {displayRows.map((r) => (
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
        {ledgerTab === "all" ? (
          <div className="pagination-bar">
            <button
              type="button"
              className="pagination-btn"
              disabled={!txMeta.hasPrev || txLoading}
              onClick={() => loadTransactions(txPage - 1)}
            >
              Prev
            </button>
            <span className="pagination-info">
              {txLoading && rows.length > 0 ? (
                <span style={{ display: "block", marginBottom: 4, color: "var(--accent-cyan)" }}>Updating…</span>
              ) : null}
              Page {txMeta.total ? txPage : 0} / {txMeta.totalPages}
              <span className="pagination-total"> · {txMeta.total} entries</span>
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={!txMeta.hasNext || txLoading}
              onClick={() => loadTransactions(txPage + 1)}
            >
              Next
            </button>
          </div>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
            {ledgerTab === "deposit"
              ? "Showing recent deposits (last 100 ledger entries)."
              : "Showing recent withdrawals (last 100 ledger entries)."}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
