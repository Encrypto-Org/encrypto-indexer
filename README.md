# encrypto-indexer

Encrypto's own blockchain indexer (Envio HyperIndex) for USDC + USDT Transfer events across 8 EVM chains. Powers instant balance + tx history on the Encrypto app without relying on Zerion's stale stablecoin cache.

## Chains indexed

| Chain | ID | Tokens |
|---|---|---|
| Ethereum | 1 | USDC, USDT |
| Base | 8453 | USDC |
| Arbitrum | 42161 | USDC, USDT |
| Optimism | 10 | USDC, USDT |
| Polygon | 137 | USDC, USDT |
| Avalanche | 43114 | USDC |
| Celo | 42220 | USDC |
| BSC | 56 | USDC, USDT |

## What it indexes

- `Transfer` — every ERC-20 Transfer event on the configured contracts. One row per (chainId, txHash, logIndex). Used for tx history + ledger reconciliation.
- `WalletBalance` — running per-(chain, token, wallet) balance, updated on every Transfer touching the wallet. Queryable by wallet address for instant balance display.

## Deploy

1. Push to GitHub
2. Connect this repo in Envio UI: https://envio.dev/app/brandon-encrypto → Connect Repository
3. Envio will autodeploy + backfill historical events
4. Wire `https://indexer.bigdevenergy.link/<id>/graphql` (or your Envio Cloud URL) into Encrypto backend as the new source of truth for known-token balances

## Local dev

```bash
pnpm install
pnpx envio@latest dev
```
