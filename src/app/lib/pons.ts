// On-chain reads against the Pons launchpad on Robinhood Chain.
import type { Address } from 'viem'
import { createPublicClient, erc20Abi, http, parseAbi, parseAbiItem } from 'viem'
import { PONS, RPC_URL, robinhood } from '@/app/config'

export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(RPC_URL, { batch: { wait: 16 } }),
  batch: { multicall: { wait: 16 } },
})

export const launchedEvent = parseAbiItem(
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
)
export const graduatedEvent = parseAbiItem(
  'event PoolGraduated(address indexed token, uint256 positionId, uint256 tokenAmount, uint256 pairTokenAmount)',
)
const v1LaunchedEvent = parseAbiItem(
  'event TokenLaunched(address indexed token, address indexed deployer, address indexed dexFactory, address pairToken, address pool, uint256 dexId, uint256 launchConfigId, uint256 positionId, uint256 restrictionsEndBlock, uint256 initialBuyAmount)',
)
const factoryAbi = parseAbi([
  'function getLaunchedToken(address token) view returns ((address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists))',
])

/** V2 phases observed on-chain: 0 = trading on its bonding curve, 2 = graduated to a DEX pool. */
export type PonsInfo =
  | { isPons: false }
  | { isPons: true; version: 'v2'; phase: 'curve' | 'graduating' | 'graduated'; deployer: Address; curve: Address; pairToken: Address }
  | { isPons: true; version: 'v1'; phase: 'graduated'; deployer: Address }

const phaseName = (p: number) => (p === 0 ? 'curve' : p === 1 ? 'graduating' : 'graduated') as 'curve' | 'graduating' | 'graduated'

/** Is this address a token launched through Pons? Checks the V2 factory, then V1 launch logs. */
export async function getPonsInfo(token: Address): Promise<PonsInfo> {
  const r = await publicClient.readContract({ address: PONS.v2Factory, abi: factoryAbi, functionName: 'getLaunchedToken', args: [token] })
  if (r.exists) return { isPons: true, version: 'v2', phase: phaseName(r.phase), deployer: r.deployer, curve: r.curve, pairToken: r.pairToken }
  const logs = await publicClient.getLogs({ address: PONS.v1Factory, event: v1LaunchedEvent, args: { token }, fromBlock: 0n, toBlock: 'latest' })
  if (logs.length) return { isPons: true, version: 'v1', phase: 'graduated', deployer: logs[0].args.deployer! }
  return { isPons: false }
}

/**
 * Which of these tokens are Pons launches, and are they still on their curve?
 * One multicall to the V2 factory + one filtered V1 log query. Keys are lowercase addresses.
 */
export async function filterPonsTokens(tokens: readonly Address[]): Promise<Map<string, { onCurve: boolean }>> {
  const found = new Map<string, { onCurve: boolean }>()
  if (!tokens.length) return found
  const v2 = await publicClient.multicall({
    contracts: tokens.map((t) => ({ address: PONS.v2Factory, abi: factoryAbi, functionName: 'getLaunchedToken', args: [t] }) as const),
  })
  const rest: Address[] = []
  v2.forEach((res, i) => {
    if (res.status === 'success' && res.result.exists) found.set(tokens[i].toLowerCase(), { onCurve: res.result.phase === 0 })
    else rest.push(tokens[i])
  })
  if (rest.length) {
    const logs = await publicClient.getLogs({ address: PONS.v1Factory, event: v1LaunchedEvent, args: { token: rest }, fromBlock: 0n, toBlock: 'latest' })
    for (const l of logs) if (l.args.token) found.set(l.args.token.toLowerCase(), { onCurve: false })
  }
  return found
}

export type TokenMeta = { name: string; symbol: string; decimals: number; totalSupply: bigint }
export async function getTokenMeta(tokens: readonly Address[]): Promise<Map<string, TokenMeta>> {
  const calls = tokens.flatMap((address) => [
    { address, abi: erc20Abi, functionName: 'name' } as const,
    { address, abi: erc20Abi, functionName: 'symbol' } as const,
    { address, abi: erc20Abi, functionName: 'decimals' } as const,
    { address, abi: erc20Abi, functionName: 'totalSupply' } as const,
  ])
  const res = await publicClient.multicall({ contracts: calls })
  const out = new Map<string, TokenMeta>()
  tokens.forEach((t, i) => {
    const [n, s, d, ts] = res.slice(i * 4, i * 4 + 4)
    out.set(t.toLowerCase(), {
      name: n.status === 'success' ? String(n.result) : 'Unknown',
      symbol: s.status === 'success' ? String(s.result) : '?',
      decimals: d.status === 'success' ? Number(d.result) : 18,
      totalSupply: ts.status === 'success' ? (ts.result as bigint) : 0n,
    })
  })
  return out
}

export type Launch = { token: Address; curve: Address; deployer: Address; pairToken: Address; block: bigint; tx: `0x${string}`; logIndex: number }
export type Graduation = { token: Address; block: bigint; tx: `0x${string}`; logIndex: number }

/** Launch + graduation events from the V2 factory in [fromBlock, toBlock]. */
export async function getFactoryEvents(fromBlock: bigint, toBlock: bigint) {
  const [launchLogs, gradLogs] = await Promise.all([
    publicClient.getLogs({ address: PONS.v2Factory, event: launchedEvent, fromBlock, toBlock }),
    publicClient.getLogs({ address: PONS.v2Factory, event: graduatedEvent, fromBlock, toBlock }),
  ])
  const launches: Launch[] = launchLogs.map((l) => ({
    token: l.args.token!,
    curve: l.args.curve!,
    deployer: l.args.deployer!,
    pairToken: l.args.pairToken!,
    block: l.blockNumber,
    tx: l.transactionHash,
    logIndex: l.logIndex,
  }))
  const graduations: Graduation[] = gradLogs.map((l) => ({ token: l.args.token!, block: l.blockNumber, tx: l.transactionHash, logIndex: l.logIndex }))
  return { launches, graduations }
}

/** Real block timestamps (ms) for a set of blocks; the RPC batches these into one request. */
export async function getBlockTimes(blocks: readonly bigint[]): Promise<Map<bigint, number>> {
  const unique = [...new Set(blocks)]
  const got = await Promise.all(unique.map((b) => publicClient.getBlock({ blockNumber: b })))
  return new Map(got.map((b) => [b.number, Number(b.timestamp) * 1000]))
}
