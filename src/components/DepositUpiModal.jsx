import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import api from "../api/client";

function DotLabel({ children }) {
  return (
    <p className="dep-upi__dot-label">
      <span className="dep-upi__dot" aria-hidden />
      {children}
    </p>
  );
}

/**
 * ArUpiPay-style deposit: UPI QR only (any app) + 12-digit UTR for admin.
 */
export default function DepositUpiModal({ open, payload, onClose, onSuccess }) {
  const [utr, setUtr] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const amount = payload?.amount ?? 0;
  const amountStr = Number(amount).toFixed(2);
  const discountDisplay = useMemo(() => {
    if (!Number.isFinite(amount) || amount <= 0) return "0.00";
    const d = Math.min(99.99, Math.round(amount * 0.0076 * 100) / 100);
    return d.toFixed(2);
  }, [amount]);

  const upiPa = payload?.upiPa || "";
  const upiPn = payload?.upiPn || "Pay";
  const id = payload?.id;

  const expiresMs = useMemo(() => {
    const t = payload?.expiresAt;
    if (!t) return null;
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [payload?.expiresAt]);

  useEffect(() => {
    if (!open) return;
    setUtr("");
    setErr("");
    setQrDataUrl("");
    setNow(Date.now());
  }, [open, payload?.id]);

  useEffect(() => {
    if (!open || !expiresMs) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open, expiresMs]);

  const countdownLabel = useMemo(() => {
    if (!expiresMs) return "—";
    const sec = Math.max(0, Math.floor((expiresMs - now) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [expiresMs, now]);

  const upiLink = useMemo(() => {
    if (!upiPa) return "";
    const pa = encodeURIComponent(upiPa);
    const pn = encodeURIComponent(upiPn);
    const am = encodeURIComponent(String(amount));
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
  }, [upiPa, upiPn, amount]);

  useEffect(() => {
    if (!open || !upiLink) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(upiLink, {
      width: 260,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, upiLink]);

  const utrDigits = utr.replace(/\D/g, "");
  const utrValid = /^\d{12}$/.test(utrDigits);
  const submitLabel = utrValid ? "Submit" : "Submit (UTR not entered)";

  const copyAmount = useCallback(() => {
    navigator.clipboard?.writeText(amountStr).catch(() => {});
  }, [amountStr]);

  const pasteUtr = useCallback(() => {
    navigator.clipboard?.readText().then((t) => setUtr(t.replace(/\D/g, "").slice(0, 12))).catch(() => {});
  }, []);

  async function submit() {
    if (!id || !utrValid) return;
    setErr("");
    setBusy(true);
    try {
      await api.patch(`/wallet/deposit-request/${id}/utr`, { utr: utrDigits, paymentMethod: "paytm" });
      onSuccess?.();
      onClose?.();
    } catch (e) {
      setErr(e.response?.data?.error || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!id) {
      onClose?.();
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.post(`/wallet/deposit-request/${id}/cancel`);
      onClose?.();
    } catch {
      onClose?.();
    } finally {
      setBusy(false);
    }
  }

  if (!open || !payload) return null;

  return (
    <div className="dep-upi-overlay" role="dialog" aria-modal="true" aria-labelledby="dep-upi-title">
      <div className="dep-upi">
        <header className="dep-upi__header">
          <button type="button" className="dep-upi__back" onClick={cancel} aria-label="Back">
            ‹
          </button>
          <h1 id="dep-upi-title" className="dep-upi__title">
            ArUpiPay
          </h1>
          <a className="dep-upi__cs" href="mailto:support@example.com">
            Customer Service
          </a>
        </header>

        <div className="dep-upi__amount-card">
          <div className="dep-upi__amount-row">
            <div className="dep-upi__amount-left">
              <span className="dep-upi__rupee">₹{amountStr}</span>
              <button type="button" className="dep-upi__copy" onClick={copyAmount} aria-label="Copy amount">
                ⧉
              </button>
            </div>
            <span className="dep-upi__timer">{countdownLabel}</span>
          </div>
          <p className="dep-upi__discount">
            Discount <span className="dep-upi__discount-val">₹{discountDisplay}</span>
          </p>
        </div>

        <div className="dep-upi__qr-panel dep-upi__qr-panel--solo">
          <DotLabel>Use Mobile Scan code to pay</DotLabel>
          <p className="dep-upi__qr-sub">Pay with any UPI app — scan the QR below (no channel selection).</p>
          <div className="dep-upi__qr-wrap dep-upi__qr-wrap--dark">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR code" className="dep-upi__qr dep-upi__qr--lg" width={260} height={260} />
            ) : (
              <div className="dep-upi__qr-fallback">
                {upiPa ? (
                  <>
                    <p className="dep-upi__vpa-label">Pay to UPI ID</p>
                    <p className="dep-upi__vpa">{upiPa}</p>
                    <p className="dep-upi__vpa-note">Set DEPOSIT_UPI_PA in api/.env to show QR.</p>
                  </>
                ) : (
                  <p className="dep-upi__vpa-note">Configure DEPOSIT_UPI_PA in api/.env for QR.</p>
                )}
              </div>
            )}
          </div>
          <ol className="dep-upi__qr-notes">
            <li>Please use another device to scan the QR code with your payment app</li>
            <li>If you scan the QR code from this device&apos;s gallery, the payment amount may be limited (≤2000).</li>
          </ol>
        </div>

        <section className="dep-upi__utr-block" aria-labelledby="dep-upi-utr-heading">
          <DotLabel>
            <span id="dep-upi-utr-heading">Input UTR/ Paste UTR</span>
          </DotLabel>
          <p className="dep-upi__utr-warn">If you do not back fill UTR/ paste UTR, 100% will fail.</p>
          <div className="dep-upi__utr-inner">
            <input
              className="dep-upi__utr-input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Input 12 digits here"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
              maxLength={12}
            />
            <button type="button" className="dep-upi__paste" onClick={pasteUtr}>
              Paste
            </button>
          </div>
        </section>

        <DotLabel>Important reminder:</DotLabel>
        <ul className="dep-upi__reminders">
          <li>Do not pay for the same link repeatedly!</li>
          <li>After UPI payment, paste the 12-digit UTR here for admin verification.</li>
        </ul>

        {err ? <div className="dep-upi__err">{err}</div> : null}

        <div className="dep-upi__footer-btns">
          <button type="button" className="dep-upi__btn dep-upi__btn--ghost" disabled={busy} onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`dep-upi__btn dep-upi__btn--submit ${utrValid ? "is-ready" : ""}`}
            disabled={busy || !utrValid}
            onClick={submit}
          >
            {busy ? "Please wait…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
