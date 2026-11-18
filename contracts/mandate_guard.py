# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
MandateGuard - a GenLayer Intelligent Contract that supervises an AI agent.

A delegator (a person or a MetaMask smart account holding an ERC-7710
delegation) gives an agent a natural-language MANDATE, for example
"sports news only". The agent then reports each purchase. GenLayer validators
read the mandate and the purchase and must AGREE on a verdict. Plain code then
turns the verdicts into one of five decisions:

    continue | warn | constrain | revoke | escalate

GenLayer only produces the decision. Something on the EVM side (a revocation
controller or a delegation-manager hook) must consume it. See docs/DESIGN.md.
"""
import json

from genlayer import *

VERDICTS = ("in_scope", "borderline", "out_of_scope")
MAX_MANDATE_CHARS = 1000


def decide(history: list) -> str:
    """
    Deterministic policy (no LLM): verdicts -> decision.
      - 2+ out_of_scope, or 1 out_of_scope plus 1 over-cap  -> revoke
      - 1 out_of_scope, or 2+ over-cap                      -> constrain
      - 2+ borderline                                       -> escalate
      - 1 borderline, or 1 over-cap                         -> warn
      - otherwise                                           -> continue
    """
    out = sum(1 for r in history if r["verdict"] == "out_of_scope")
    border = sum(1 for r in history if r["verdict"] == "borderline")
    over = sum(1 for r in history if r["over_cap"])

    if out >= 2 or (out >= 1 and over >= 1):
        return "revoke"
    if out == 1 or over >= 2:
        return "constrain"
    if border >= 2:
        return "escalate"
    if border == 1 or over == 1:
        return "warn"
    return "continue"


class MandateGuard(gl.Contract):
    # mandate_id -> JSON {"delegator", "agent", "text", "max_usd_cents"}
    mandates: TreeMap[str, str]
    # mandate_id -> JSON list of reviewed purchases (most recent last)
    reviews: TreeMap[str, str]
    # mandate_id -> current decision
    decisions: TreeMap[str, str]
    mandate_count: u256

    def __init__(self):
        self.mandate_count = u256(0)

    @gl.public.write
    def create_mandate(self, agent: str, text: str, max_usd_cents: int) -> str:
        """Register a mandate. Returns its id (m1, m2, ...)."""
        if len(text.strip()) < 10:
            raise gl.vm.UserError("mandate_too_short")
        if len(text) > MAX_MANDATE_CHARS:
            raise gl.vm.UserError("mandate_too_long")
        if max_usd_cents <= 0:
            raise gl.vm.UserError("invalid_cap")

        self.mandate_count = u256(int(self.mandate_count) + 1)
        mandate_id = "m" + str(int(self.mandate_count))
        self.mandates[mandate_id] = json.dumps(
            {
                "delegator": gl.message.sender_address.as_hex,
                "agent": agent,
                "text": text.strip(),
                "max_usd_cents": max_usd_cents,
            }
        )
        self.reviews[mandate_id] = "[]"
        self.decisions[mandate_id] = "continue"
        return mandate_id

    @gl.public.write
    def review_purchase(
        self, mandate_id: str, merchant: str, item: str, amount_usd_cents: int
    ) -> str:
        """
        Review one purchase against the mandate. Validators must agree on the
        verdict. Returns the updated decision for the mandate.
        """
        if mandate_id not in self.mandates:
            raise gl.vm.UserError("unknown_mandate")
        if amount_usd_cents < 0:
            raise gl.vm.UserError("invalid_amount")

        mandate = json.loads(self.mandates[mandate_id])
        caller = gl.message.sender_address.as_hex.lower()
        if caller not in (mandate["delegator"].lower(), mandate["agent"].lower()):
            raise gl.vm.UserError("not_authorized")
        if self.decisions[mandate_id] == "revoke":
            raise gl.vm.UserError("mandate_revoked")

        receipt = "merchant=%s; item=%s" % (merchant[:200], item[:600])
        mandate_text = mandate["text"]
        over_cap = amount_usd_cents > mandate["max_usd_cents"]

        def judge() -> str:
            prompt = (
                "You supervise an AI agent that spends money for a person.\n"
                "MANDATE (what the agent is allowed to buy):\n"
                + mandate_text
                + "\n\nPURCHASE REPORTED BY THE AGENT:\n"
                + receipt
                + "\n\nDoes this purchase fall within the mandate? Judge only the "
                "kind of purchase, not its price. Answer with JSON only: "
                '{"verdict": "in_scope" | "borderline" | "out_of_scope"}'
            )
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            verdict = raw.get("verdict") if isinstance(raw, dict) else None
            return verdict if verdict in VERDICTS else "borderline"

        # Validators re-run judge() and must return exactly the same verdict.
        verdict = gl.eq_principle.strict_eq(judge)

        history = json.loads(self.reviews[mandate_id])
        history.append(
            {
                "merchant": merchant[:200],
                "item": item[:600],
                "amount_usd_cents": amount_usd_cents,
                "verdict": verdict,
                "over_cap": over_cap,
            }
        )
        self.reviews[mandate_id] = json.dumps(history)

        decision = decide(history)
        self.decisions[mandate_id] = decision
        return decision

    @gl.public.view
    def get_mandate_count(self) -> int:
        return int(self.mandate_count)

    @gl.public.view
    def get_decision(self, mandate_id: str) -> str:
        if mandate_id not in self.decisions:
            raise gl.vm.UserError("unknown_mandate")
        return self.decisions[mandate_id]

    @gl.public.view
    def get_mandate(self, mandate_id: str) -> str:
        if mandate_id not in self.mandates:
            raise gl.vm.UserError("unknown_mandate")
        return self.mandates[mandate_id]

    @gl.public.view
    def get_reviews(self, mandate_id: str) -> str:
        if mandate_id not in self.reviews:
            raise gl.vm.UserError("unknown_mandate")
        return self.reviews[mandate_id]
