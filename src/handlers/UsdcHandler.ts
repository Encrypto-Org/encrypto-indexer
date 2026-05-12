/**
 * USDC Transfer handler — same shape used for USDT (separate file just so
 * Envio can attach a different token symbol). Updates two entities per event:
 *   1. Transfer            — one immutable row per ERC-20 Transfer event
 *   2. WalletBalance       — running balance per (chain, token, wallet)
 *
 * Multi-chain Encrypto-aware: we index every chain in config.yaml, so a
 * wallet address that holds USDC on Eth + Base + Arb shows three separate
 * WalletBalance rows, all queryable by `walletAddress`.
 */
import { UsdcContract, type UsdcContract_Transfer_event } from 'generated';

UsdcContract.Transfer.handler(async ({ event, context }) => {
  const chainId = event.chainId;
  const tokenAddress = event.srcAddress.toLowerCase();
  const fromAddress = event.params.from.toLowerCase();
  const toAddress = event.params.to.toLowerCase();
  const amount = event.params.value;

  const decimals = 6;
  const tokenSymbol = 'USDC';
  const amountUsd = Number(amount) / Math.pow(10, decimals); // USDC ≈ $1

  // 1. Persist the transfer
  context.Transfer.set({
    id: `${chainId}-${event.transaction.hash}-${event.logIndex}`,
    chainId,
    tokenAddress,
    tokenSymbol,
    decimals,
    fromAddress,
    toAddress,
    amount,
    amountUsd,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    logIndex: event.logIndex,
  });

  // 2. Update both wallets' balances (skip the zero address — mint/burn).
  const ZERO = '0x0000000000000000000000000000000000000000';
  if (fromAddress !== ZERO) {
    await updateBalance({ context, chainId, tokenAddress, tokenSymbol, decimals, walletAddress: fromAddress, delta: -amount, txHash: event.transaction.hash, ts: event.block.timestamp });
  }
  if (toAddress !== ZERO) {
    await updateBalance({ context, chainId, tokenAddress, tokenSymbol, decimals, walletAddress: toAddress, delta: amount, txHash: event.transaction.hash, ts: event.block.timestamp });
  }
});

interface BalanceUpdate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  walletAddress: string;
  delta: bigint;
  txHash: string;
  ts: number;
}

async function updateBalance(u: BalanceUpdate) {
  const id = `${u.chainId}-${u.tokenAddress}-${u.walletAddress}`;
  const existing = await u.context.WalletBalance.get(id);
  const prev = existing?.amount ?? 0n;
  const next = prev + u.delta;
  // Guard against negative balances from out-of-order reorgs — clamp to 0.
  const safe = next < 0n ? 0n : next;
  u.context.WalletBalance.set({
    id,
    chainId: u.chainId,
    tokenAddress: u.tokenAddress,
    tokenSymbol: u.tokenSymbol,
    decimals: u.decimals,
    walletAddress: u.walletAddress,
    amount: safe,
    amountUsd: Number(safe) / Math.pow(10, u.decimals),
    updatedAt: u.ts,
    updatedTxHash: u.txHash,
  });
}
