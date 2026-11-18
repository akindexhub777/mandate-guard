---
name: mandate-guard
description: Check an AI agent's purchase against its spending mandate using the MandateGuard GenLayer contract. Use before or after an agent spends under a MetaMask delegation, or when a user asks whether an agent stayed within its mandate.
---

# Mandate Guard

Use this skill to have GenLayer validators judge whether a purchase fits a natural-language mandate.

## Steps
1. Make sure the contract is deployed (`npm run deploy`) and `MANDATE_GUARD_ADDRESS` is set.
2. Create a mandate: `create_mandate(agent_address, mandate_text, max_usd_cents)`.
3. For each purchase call `review_purchase(mandate_id, merchant, item, amount_usd_cents)`.
4. Read `get_decision(mandate_id)`: `continue | warn | constrain | revoke | escalate`.
5. Act on it:
   - `continue`: proceed. `warn`: log it and tell the owner.
   - `constrain`: lower limits. `escalate`: pause and ask a human.
   - `revoke`: stop spending. The EVM delegation is only revoked if a relayer consumes the decision
     (see docs/DESIGN.md). Never claim the delegation was revoked unless that was done.

## Rules
- Report the receipt honestly; the verdict is only as good as the description.
- Amounts are in US cents. Verdicts: `in_scope`, `borderline`, `out_of_scope`.
- Use a throwaway testnet key, never a real wallet.
