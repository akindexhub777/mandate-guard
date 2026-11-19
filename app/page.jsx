"use client";

import { useEffect, useState } from "react";
import { decide, sampleVerdict } from "../lib/policy";

const LEVELS = ["continue", "warn", "escalate", "constrain", "revoke"];

const EFFECTS = {
  continue: "The purchase fits the mandate. The agent keeps its spending rights.",
  warn: "Logged and flagged to the owner. Spending continues.",
  escalate: "High-risk spending is paused until a human reviews it.",
  constrain: "The delegation's limits are tightened for future purchases.",
  revoke: "The decision goes to an EVM relayer that ends the ERC-7710 delegation (relay not included in this demo).",
};

const VERDICT_LABEL = { in_scope: "In scope", borderline: "Borderline", out_of_scope: "Out of scope" };

function Logo({ name, file }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = `/logos/${file}`;
  }, [file]);
  return (
    <span className="logo">
      {ok ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/logos/${file}`} alt={name} />
          <span className="lname">{name}</span>
        </>
      ) : (
        <span className="word">{name}</span>
      )}
    </span>
  );
}

export default function Home() {
  const [live, setLive] = useState(false);
  const [contract, setContract] = useState(null);
  const [mandate, setMandate] = useState("Buy sports news and live-score data only. No entertainment, gambling or unrelated services.");
  const [cap, setCap] = useState("5");
  const [mandateId, setMandateId] = useState(null);
  const [lockedMandate, setLockedMandate] = useState("");
  const [form, setForm] = useState({ merchant: "SportsWire API", item: "Premier League live scores, 1 day pass", amount: "3" });
  const [history, setHistory] = useState([]);
  const [decision, setDecision] = useState("continue");
  const [busy, setBusy] = useState(null); // "mandate" | "review" | null
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/state").then((r) => r.json()).then((s) => { setLive(!!s.live); setContract(s.contract); }).catch(() => {});
  }, []);

  async function createMandate() {
    setBusy("mandate"); setError(""); setHistory([]); setDecision("continue");
    try {
      const res = await fetch("/api/mandate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: mandate, capUsd: parseFloat(cap) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "request failed");
      setMandateId(data.mandateId); setLockedMandate(mandate);
    } catch (e) { setError(e.message); }
    setBusy(null);
  }

  async function submitPurchase() {
    setBusy("review"); setError("");
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
    setBusy(null);
  }

  function reset() { setMandateId(null); setHistory([]); setDecision("continue"); setError(""); }
  const preset = (m, i, a) => setForm({ merchant: m, item: i, amount: a });

  return (
    <div className="wrap">
      <div className="top">
        <div className="logos">
          <Logo name="Internet Court" file="internet-court.png" />
          <span className="x">×</span>
          <Logo name="GenLayer" file="genlayer.png" />
          <span className="x">×</span>
          <Logo name="MetaMask" file="metamask.png" />
        </div>
        <span className={"pill " + (live ? "live" : "sample")}>
          <i /> {live ? "Live · GenLayer StudioNet" : "Sample mode · not on-chain"}
        </span>
      </div>

      <h1>Who watches your <span>AI agent’s wallet?</span></h1>
      <p className="sub">
        Give an agent a mandate in plain words. GenLayer validators read every purchase and must agree on a verdict,
        then decide: continue, warn, escalate, constrain or revoke.
      </p>

      <div className="grid">
        <div>
          <div className="card">
            <div className="step"><b>1</b> Set the mandate</div>
            {mandateId ? (
              <>
                <div className="locked"><b>Mandate:</b> {lockedMandate}<br /><b>Cap:</b> ${cap} per purchase</div>
                <button className="reset" onClick={reset}>New mandate</button>
              </>
            ) : (
              <>
                <label htmlFor="mandate">What may the agent buy?</label>
                <textarea id="mandate" value={mandate} onChange={(e) => setMandate(e.target.value)} />
                <label htmlFor="cap">Cap per purchase (USD)</label>
                <input id="cap" type="number" min="1" step="0.5" value={cap} onChange={(e) => setCap(e.target.value)} />
                <button disabled={busy === "mandate"} onClick={createMandate}>{busy === "mandate" ? "Creating on GenLayer…" : "Create mandate"}</button>
              </>
            )}
          </div>

          <div className="card" style={{ opacity: mandateId ? 1 : 0.45, pointerEvents: mandateId ? "auto" : "none" }}>
            <div className="step"><b>2</b> The agent buys something</div>
            <div className="row">
              <div><label htmlFor="merchant">Merchant</label><input id="merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div><label htmlFor="amount">USD</label><input id="amount" type="number" step="0.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <label htmlFor="item">Item</label>
            <input id="item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
            <div className="chips">
              <button className="chip" onClick={() => preset("SportsWire API", "Premier League live scores, 1 day pass", "3")}>Sports data</button>
              <button className="chip" onClick={() => preset("CelebGossip Daily", "Celebrity gossip premium newsletter", "4")}>Gossip</button>
              <button className="chip" onClick={() => preset("LuckyBet", "Casino credit top-up", "12")}>Casino, over cap</button>
            </div>
            <button disabled={busy === "review"} onClick={submitPurchase}>{busy === "review" ? "Validators are deliberating…" : "Agent buys → GenLayer reviews"}</button>
          </div>
        </div>

        <div className="card">
          <div className="step"><b>3</b> The decision</div>
          <div className="gauge">
            {LEVELS.map((l) => (
              <div key={l} className={"seg " + (decision === l && (history.length > 0 || l === "continue") ? "on " + l : "")}>{l}</div>
            ))}
          </div>
          <div className={"big " + decision}>{history.length || mandateId ? decision : "—"}</div>
          <p className="effect">{history.length ? EFFECTS[decision] : "Waiting for the first purchase."}</p>

          {busy === "review" && (
            <div className="think">
              <div className="bars"><span /><span /><span /><span /><span /></div>
              GenLayer validators are reading the purchase and must reach consensus…
            </div>
          )}

          {history.length === 0 && busy !== "review" ? (
            <div className="empty">Purchases reviewed by the validators will appear here.</div>
          ) : (
            <ul className="tl">
              {history.map((r, i) => (
                <li key={i}>
                  <span className={"dot " + r.verdict} />
                  <div>
                    <div className="m">{r.merchant}</div>
                    <div className="i">{r.item}</div>
                  </div>
                  <div className="amt">
                    ${(r.cents / 100).toFixed(2)} {r.over_cap && <span className="over">OVER CAP</span>}
                    <small className={r.verdict}>{VERDICT_LABEL[r.verdict]}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {error && <div className="err">{error}</div>}
          {live && contract && <div className="foot">Contract {contract}</div>}
        </div>
      </div>
    </div>
  );
}
