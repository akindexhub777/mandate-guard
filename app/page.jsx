"use client";

import { useEffect, useState } from "react";
import { decide, sampleVerdict } from "../lib/policy";

const REPO_URL = "https://github.com/akindexhub777/mandate-guard";
const EXPLORER = "https://explorer-studio.genlayer.com";
const LEVELS = ["continue", "warn", "escalate", "constrain", "revoke"];

const EFFECTS = {
  continue: "The purchase fits the mandate. The agent keeps its spending rights.",
  warn: "Logged and flagged to the owner. Spending continues.",
  escalate: "High-risk spending is paused until a human reviews it.",
  constrain: "The delegation's limits are tightened for future purchases.",
  revoke: "The decision goes to an EVM relayer that ends the ERC-7710 delegation (relay not included in this demo).",
};

// What the MetaMask delegation would look like after each decision (SIMULATED view).
const DELEGATION = {
  continue: { label: "Active", cls: "active", note: "Spending allowed within the cap." },
  warn: { label: "Active", cls: "active", note: "Flagged for the owner." },
  escalate: { label: "Paused", cls: "paused", note: "Waiting for human review." },
  constrain: { label: "Constrained", cls: "constrained", note: "Limits tightened." },
  revoke: { label: "Revoked", cls: "revoked", note: "No further redemptions." },
};

const VERDICT_LABEL = { in_scope: "In scope", borderline: "Borderline", out_of_scope: "Out of scope" };

const short = (a) => (a && a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

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
  const [evidence, setEvidence] = useState([]);
  const [copied, setCopied] = useState(false);

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
      if (data.tx) setEvidence([{ label: "create_mandate", hash: data.tx }]);
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
        if (data.tx) setEvidence((ev) => [...ev, { label: `review_purchase: ${form.merchant} → ${data.decision}`, hash: data.tx }]);
      } else {
        const next = [...history, { merchant: form.merchant, item: form.item, cents: Math.round(amountUsd * 100), verdict: sampleVerdict(form.merchant, form.item), over_cap: amountUsd > parseFloat(cap) }];
        setHistory(next); setDecision(decide(next));
      }
    } catch (e) { setError(e.message); }
    setBusy(null);
  }

  function reset() { setMandateId(null); setHistory([]); setDecision("continue"); setError(""); setEvidence([]); }
  async function copyEvidence() {
    const lines = [contract ? `Contract: ${EXPLORER}/contracts/${contract}` : null, ...evidence.map((e) => `${e.label}: ${EXPLORER}/tx/${e.hash}`)].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(lines); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { setError("Copy failed"); }
  }
  const preset = (m, i, a) => setForm({ merchant: m, item: i, amount: a });

  const started = history.length > 0;
  const last = history[history.length - 1];
  const deleg = DELEGATION[decision];

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
        <div className="bar">
          <a className="pill" href={REPO_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <span className={"pill " + (live ? "live" : "sample")}>
            <i /> {live ? `Live · GenLayer StudioNet${contract ? " · " + short(contract) : ""}` : "Sample mode · not on-chain"}
          </span>
        </div>
      </div>

      <h1>Who watches your <span>AI agent’s wallet?</span></h1>
      <p className="sub">
        Give an agent a mandate in plain words. GenLayer validators read every purchase and must agree on a verdict,
        then decide: continue, warn, escalate, constrain or revoke.
      </p>
      <div className="flow">
        <span className="s">Mandate</span>→<span className="s">Agent purchase</span>→<span className="s gl">GenLayer validators</span>→<span className="s">Decision</span>→<span className="s">MetaMask delegation</span>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <div className="step"><b>1</b> Set the mandate <span className="tag">Plain language</span></div>
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
            <div className="step"><b>2</b> The agent buys something <span className="tag">Receipt</span></div>
            <div className="row">
              <div><label htmlFor="merchant">Merchant</label><input id="merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></div>
              <div><label htmlFor="amount">USD</label><input id="amount" type="number" step="0.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <label htmlFor="item">Item</label>
            <input id="item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
            <div className="chips">
              <button className="chip" onClick={() => preset("SportsWire API", "Premier League live scores, 1 day pass", "3")}><span className="ic">⚽</span>Sports data</button>
              <button className="chip" onClick={() => preset("CelebGossip Daily", "Celebrity gossip premium newsletter", "4")}><span className="ic">📰</span>Gossip</button>
              <button className="chip" onClick={() => preset("LuckyBet", "Casino credit top-up", "12")}><span className="ic">🎰</span>Casino, over cap</button>
            </div>
            <button disabled={busy === "review"} onClick={submitPurchase}>{busy === "review" ? "Validators are deliberating…" : "Agent buys → GenLayer reviews"}</button>
          </div>
        </div>

        <div className="card">
          <div className="step"><b>3</b> The decision <span className="tag">GenLayer verdict</span></div>
          <div className="gauge">
            {LEVELS.map((l) => (
              <div key={l} className={"seg " + (decision === l && (started || !!mandateId) ? "on " + l : "")}>{l}</div>
            ))}
          </div>
          <div className={"big " + (started || mandateId ? decision : "ready")}>{started || mandateId ? decision : "Ready"}</div>
          <p className="effect">
            {started ? EFFECTS[decision] : mandateId ? "Mandate created. Send the first purchase." : "Create a mandate, then let the agent spend."}
          </p>

          {busy === "review" && (
            <div className="think">
              <div className="bars"><span /><span /><span /><span /><span /></div>
              GenLayer validators are reading the purchase and must reach consensus…
            </div>
          )}

          {started && busy !== "review" && last && (
            <div className={"consensus " + (live ? "" : "off")}>
              <span>{live ? "✔" : "○"}</span>
              <div>
                {live ? <><b>Consensus reached on GenLayer.</b> Validators agreed the last purchase is <b>{VERDICT_LABEL[last.verdict].toLowerCase()}</b>.</> : <><b>Sample mode.</b> Verdict from a keyword stand-in, not from validators.</>}
              </div>
            </div>
          )}

          {!started && busy !== "review" ? (
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

          <div className="deleg">
            <div className="hd">
              <Logo name="MetaMask" file="metamask.png" />
              <b style={{ marginLeft: "auto" }}>Delegation (ERC-7710)</b>
            </div>
            <div className="kv">
              <div>Status<strong className={"status " + deleg.cls}>{mandateId ? deleg.label : "—"}</strong></div>
              <div>Cap per purchase<strong>{mandateId ? `$${cap}` : "—"}</strong></div>
            </div>
            <div className="simnote">Simulated view. {mandateId ? deleg.note + " " : ""}The EVM relay that applies the decision on MetaMask is not part of this demo.</div>
          </div>

          {live && (contract || evidence.length > 0) && (
            <div className="evid">
              <div className="evh"><b>On-chain evidence</b><button className="chip" onClick={copyEvidence}>{copied ? "Copied ✔" : "Copy links"}</button></div>
              {contract && <a href={`${EXPLORER}/contracts/${contract}`} target="_blank" rel="noreferrer">Contract {short(contract)} ↗</a>}
              {evidence.map((e, i) => (
                <a key={i} href={`${EXPLORER}/tx/${e.hash}`} target="_blank" rel="noreferrer">{e.label} · {short(e.hash)} ↗</a>
              ))}
            </div>
          )}

          {error && <div className="err">{error}</div>}
          <div className="foot">Open source · <a href={REPO_URL} target="_blank" rel="noreferrer">github.com/akindexhub777/mandate-guard</a></div>
        </div>
      </div>
    </div>
  );
}
