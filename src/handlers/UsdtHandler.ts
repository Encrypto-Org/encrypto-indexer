/**
 * USDT Transfer handler — mirrors USDC. Separate file so Envio's contract
 * mapping can tag the token symbol correctly.
 */
import { UsdtContract } from 'generated';

UsdtContract.Transfer.handler(async ({ event, context }) => {
  const chainId = event.chainId;
  const tokenAddress = event.srcAddress.toLowerCase();
  const fromAddress = event.params.from.toLowerCase();
  const toAddress = event.params.to.toLowerCase();
  const amount = event.params.value;

  // USDT is 6 decimals on Eth/Arb/Op/Poly but 18 on BSC. Resolve per chain.
  const decimals = chainId === 56 ? 18 : 6;
  const tokenSymbol = 'USDT';
  const amountUsd = Number(amount) / Math.pow(10, decimals);

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

  const ZERO = '0x0000000000000000000000000000000000000000';
  if (fromAddress !== ZERO) {
    await updateBalance(context, chainId, tokenAddress, tokenSymbol, decimals, fromAddress, -amount, event.transaction.hash, event.block.timestamp);
  }
  if (toAddress !== ZERO) {
    await updateBalance(context, chainId, tokenAddress, tokenSymbol, decimals, toAddress, amount, event.transaction.hash, event.block.timestamp);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateBalance(context: any, chainId: number, tokenAddress: string, tokenSymbol: string, decimals: number, walletAddress: string, delta: bigint, txHash: string, ts: number) {
  const id = `${chainId}-${tokenAddress}-${walletAddress}`;
  const existing = await context.WalletBalance.get(id);
  const prev = existing?.amount ?? 0n;
  const next = prev + delta;
  const safe = next < 0n ? 0n : next;
  context.WalletBalance.set({
    id, chainId, tokenAddress, tokenSymbol, decimals, walletAddress,
    amount: safe,
    amountUsd: Number(safe) / Math.pow(10, decimals),
    updatedAt: ts, updatedTxHash: txHash,
  });
}
