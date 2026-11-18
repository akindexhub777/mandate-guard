// Mirror of decide() in contracts/mandate_guard.py (the contract is the source of truth).
export function decide(history) {
  const out = history.filter((r) => r.verdict === "out_of_scope").length;
  const border = history.filter((r) => r.verdict === "borderline").length;
  const over = history.filter((r) => r.over_cap).length;
  if (out >= 2 || (out >= 1 && over >= 1)) return "revoke";
  if (out === 1 || over >= 2) return "constrain";
  if (border >= 2) return "escalate";
  if (border === 1 || over === 1) return "warn";
  return "continue";
}

// Keyword stand-in used ONLY in sample mode. It is not produced by GenLayer.
export function sampleVerdict(merchant, item) {
  const t = `${merchant} ${item}`.toLowerCase();
  if (/casino|bet|poker|lotto|gambl/.test(t)) return "out_of_scope";
  if (/gossip|celeb|entertain|movie|music/.test(t)) return "borderline";
  return /sport|score|match|league|basket|football|stat/.test(t) ? "in_scope" : "borderline";
}
