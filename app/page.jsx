"use client";

import { useEffect, useState } from "react";
import { decide, sampleVerdict } from "../lib/policy";

const EFFECTS = {
  revoke: "A relayer sends this decision to the EVM revocation controller; the ERC-7710 delegation can then no longer be redeemed (relay not included in this demo).",
  constrain: "The delegation's limits are tightened for future purchases.",
  escalate: "High-risk spending is paused until a human reviews.",
  warn: "Logged; spending continues.",
  continue: "No action needed.",
};

export default function Home() {
  const [live, setLive] = useState(false);
  const [contract, setContract] = useState(null);
  const [mandate, setMandate] = useState("Buy sports news and live-score data only. No entertainment, gambling or unrelated services.");
  const [cap, setCap] = useState("5");
  const [mandateId, setMandateId] = useState(null);
  const [form, setForm] = useState({ merchant: "SportsWire API", item: "Premier League live scores, 1 day pass", amount: "3" });
  const [history, setHistory] = useState([]);
  const [decision, setDecision] = useState("continue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/state").then((r) => r.json()).then((s) => { setLive(!!s.live); setContract(s.contract); }).catch(() => {});
  }, []);

  async function createMandate() {
    setBusy(true); setError(""); setHistory([]); setDecision("continue");
    try {
      const res = await fetch("/api/mandate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: mandate, capUsd: parseFloat(cap) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "request failed");
      setMandateId(data.mandateId);
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function submitPurchase() {
    setBusy(true); setError("");
    const amountUsd = parseFloat(form.amount);
    try {
      if (live) {
        const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mandateId, merchant: form.merchant, item: form.item, amountUsd }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "request failed");
        setHistory(data.reviews.map((r) => ({ merchant: r.merchant, item: r.item, cents: r.amount_usd_cents, verdict: r.verdict, over_cap: r.over_cap })));
        setDecision(data.decision);
      } else {
        const next = [...history, { merchant: form.merchant, item: form.item, cents: Math.round(amountUsd * 100), verdict: sampleVerdict(form.merchant, form.item), over_cap: amountUsd > parseFloat(cap) }];
        setHistory(next); setDecision(decide(next));
      }
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const preset = (m, i, a) => setForm({ merchant: m, item: i, amount: a });

  return (
    <main>
      <h1>Mandate Guard</h1>
      <p className="sub">An AI agent spends under a MetaMask delegation. GenLayer validators check every purchase against its mandate and decide: continue, warn, constrain, revoke or escalate.</p>

      <div className="card">
        <div className="modes">
          <span className={"pill " + (live ? "live" : "sample")}>{live ? "Live · GenLayer StudioNet" : "Sample mode"}</span>
          <span className="note">
            {live ? `Verdicts come from GenLayer validators reaching consensus. Contract ${contract}` : "Illustrative results, not on-chain. Set GENLAYER_PRIVATE_KEY and MANDATE_GUARD_ADDRESS to go live."}
          </span>
        </div>
        <label htmlFor="mandate">Mandate</label>
        <textarea id="mandate" value={mandate} onChange={(e) => setMandate(e.target.value)} />
        <label htmlFor="cap">Cap per purchase (USD)</label>
        <input id="cap" type="number" min="1" step="0.5" value={cap} onChange={(e) => setCap(e.target.value)} />
        <button style={{ marginTop: 14 }} disabled={busy} onClick={createMandate}>{busy && !mandateId ? "Creating…" : "Create mandate"}</button>
      </div>

      {mandateId && (
        <div className="card">
          <div className="row">
            <div><label htmlFor="merchant">Merchant</label><input id="merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
            <div><label htmlFor="item">Item</label><input id="item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></div>
            <div><label htmlFor="amount">USD</label><input id="amount" type="number" step="0.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          </div>
          <div className="presets">
            <button className="ghost" onClick={() => preset("SportsWire API", "Premier League live scores, 1 day pass", "3")}>In scope</button>
            <button className="ghost" onClick={() => preset("CelebGossip Daily", "Celebrity gossip premium newsletter", "4")}>Off topic</button>
            <button className="ghost" onClick={() => preset("LuckyBet", "Casino credit top-up", "12")}>Out of scope + over cap</button>
          </div>
          <button style={{ marginTop: 14 }} disabled={busy} onClick={submitPurchase}>{busy ? "Validators are deliberating…" : "Agent buys → GenLayer reviews"}</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="note">Current decision for this mandate</div>
          <div className={"decision " + decision}>{decision}</div>
          <table>
            <thead><tr><th>Merchant</th><th>Item</th><th>USD</th><th>Verdict</th></tr></thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i}><td>{r.merchant}</td><td>{r.item}</td><td>{(r.cents / 100).toFixed(2)}{r.over_cap ? " ⚠" : ""}</td><td className={"v-" + r.verdict}>{r.verdict.replace("_", " ")}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="note">Effect: {EFFECTS[decision]}</p>
        </div>
      )}
      {error && <div className="err">{error}</div>}

      <div className="logos"><b>Internet Court</b><span>×</span><b>GenLayer</b><span>×</span><b>MetaMask</b></div>
    </main>
  );
}
