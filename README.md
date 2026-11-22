# Mandate Guard

**GenLayer × MetaMask × Internet Court**: an AI agent spends under a MetaMask (ERC-7710) delegation.
GenLayer validators check every purchase against the agent's natural-language mandate and decide:
`continue`, `warn`, `constrain`, `revoke` or `escalate`.

Built for the Internet Court Builders Working Group mission.

## Why GenLayer is needed
"Does this purchase fit the mandate *sports news only*?" is a judgement, not a number. A normal smart
contract can't answer it. Here each purchase is judged by GenLayer validators running different LLMs;
the verdict (`in_scope`, `borderline`, `out_of_scope`) only counts when they all agree. Plain,
unit-tested code then turns verdicts into a decision.

## What is in this repo
| Path | What it is |
|------|------------|
| `contracts/mandate_guard.py` | The GenLayer Intelligent Contract |
| `app/` | Next.js app: the demo page and the API routes (`/api/mandate`, `/api/review`, `/api/state`) |
| `lib/` | GenLayer client helper and the decision policy mirror |
| `scripts/deploy.mjs`, `scripts/demo.mjs` | Deploy the contract and replay the demo from the command line |
| `skills/mandate-guard/SKILL.md` | Agent skill so other agents can reuse it |
| `tests/test_policy.py` | Unit tests of the decision policy |
| `docs/DESIGN.md` | Design and honest scope |

## Run it
Requires Node 20+ and Python 3.10+.
```bash
npm install
npm run deploy:contract   # deploys to GenLayer StudioNet, writes .env with a throwaway key + address
npm run demo              # one mandate, four purchases, decisions printed in order
npm run dev               # http://localhost:3000, live mode when .env is set
```
Without `.env` the page runs in a clearly labeled **sample mode** (keyword stand-in, not on-chain).

## Deploy on Vercel
1. Import this repo in Vercel (framework: Next.js, nothing to configure).
2. Add two environment variables: `GENLAYER_PRIVATE_KEY` (a **throwaway testnet key**, never a real wallet)
   and `MANDATE_GUARD_ADDRESS` (printed by `npm run deploy:contract`).
3. Deploy. The server signs the transactions, so visitors need no wallet. The key never reaches the browser.

API routes allow up to 60 s because validator consensus can take a while; check your Vercel plan's limit.

## Checks
```bash
pip install genvm-linter pytest
npm run lint:contract
npm test
```

## Decision policy
| Verdicts so far | Decision |
|---|---|
| none out of scope, none borderline, none over cap | `continue` |
| 1 borderline, or 1 purchase over the cap | `warn` |
| 2+ borderline | `escalate` |
| 1 out of scope, or 2+ over the cap | `constrain` |
| 2+ out of scope, or 1 out of scope plus 1 over the cap | `revoke` (sticky) |

## Honest scope
- GenLayer produces the **decision**. This repo does **not** include the EVM relay that makes a MetaMask
  delegation reject spending after `revoke`. Internet Court's `genlayer-erc7710-connector` describes
  that path (relayer → `RevocationController` → delegation manager). See `docs/DESIGN.md`.
- Purchases are reported by the agent; production use needs receipts from the payment rail.
- The contract passes `genvm-lint` (3 checks), the policy has unit tests, and the Next.js app builds.
  A live run on StudioNet is the thing to verify first with the commands above.
- Anyone who can reach the deployed site can send reviews through the server key; keep it a throwaway
  testnet key and expect to rate-limit before any public launch.

## License
MIT
