# Design

## Problem
An agent holding a MetaMask ERC-7710 delegation can keep spending even when it drifts from what
its owner intended. Caps and allowlists catch numbers and addresses, not *meaning*
("is a gossip newsletter still sports news?").

## Why GenLayer
Whether a purchase fits a natural-language mandate is a subjective judgement. A normal smart
contract cannot make it. In MandateGuard each purchase is judged by GenLayer validators, each
running its own LLM, and the verdict only counts when they agree (`gl.eq_principle.strict_eq`).
The verdict is limited to three values so agreement is realistic.

## Flow
```
mandate (text + cap) --create_mandate--> MandateGuard
agent purchase       --review_purchase-> validators judge: in_scope | borderline | out_of_scope
plain code (decide)  -----------------> continue | warn | constrain | revoke | escalate
```
The policy in `decide()` is deterministic and unit-tested; only the verdict uses an LLM.

## Honest scope: who enforces the decision?
GenLayer produces a decision. It does not itself cancel an ERC-7710 delegation. For the EVM
side, Internet Court's connector pattern (`genlayer-erc7710-connector`) describes the real
path: decision -> relayer/bridge -> EVM `RevocationController` -> delegation manager rejects
or constrains future redemptions.

This repo implements the GenLayer half, the demo UI and the CLI. The EVM relay is **not**
implemented here; in a demo it would be a manual relay of the decision. Do not read this
repo as proof that a delegation was revoked on-chain.

## Limits
- Receipts are reported by the agent. A lying agent can describe a purchase as innocent;
  production use needs receipts from the payment rail (e.g. x402 facilitator logs).
- The mandate text is the only rubric. Vague mandates produce `borderline` verdicts.
- Reviews are stored as JSON strings and re-read each time; fine for a demo, not for volume.
