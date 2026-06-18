/**
 * End-to-end verification of the on-chain request/approval lifecycle (B-REQ).
 *
 * Exercises the real onchain.ts relayer functions against a running local chain:
 *   register data  ->  submit computation request  ->  auditor approval -> Approved
 *
 * Prereq: a local hardhat node is running and scripts/deploy.cjs has been run
 * (deployments/localhost-*.json present). Run via the orchestration in clicmd.md
 * or:  npx tsx scripts/verify-onchain-request.ts
 */

process.env.ENABLE_ONCHAIN = 'true'
process.env.CONTRACT_NETWORK = process.env.CONTRACT_NETWORK || 'localhost'
process.env.RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545'
process.env.SERVER_PRIVATE_KEY =
  process.env.SERVER_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // hardhat acct #0

async function main() {
  const { registerDataOnChain, submitRequestOnChain, approveRequestOnChain } = await import(
    '../src/lib/contracts/onchain'
  )

  const datasetId = 'verify_' + Math.floor(Date.now() / 1000)

  const reg = await registerDataOnChain({
    datasetId,
    metadataURI: 'ipfs://demo/' + datasetId,
    category: 'health',
    tags: ['verify'],
  })
  console.log('register :', reg.success, reg.txHash || reg.error)
  if (!reg.success || !reg.data?.dataHash) process.exit(1)

  const sub = await submitRequestOnChain({
    datasetId,
    dataHash: reg.data.dataHash,
    computationType: 'aggregation',
    urgent: true,
  })
  console.log('submit   :', sub.success, sub.txHash || sub.error, '| requestId=', sub.data?.requestId)
  if (!sub.success || !sub.data?.requestId) process.exit(1)

  const appr = await approveRequestOnChain(sub.data.requestId)
  console.log('approve  :', appr.success, appr.txHash || appr.error, '| status=', appr.data?.status)

  if (appr.success && appr.data?.status === 'Approved') {
    console.log('\nB-REQ OK — on-chain request lifecycle reached "Approved".')
    process.exit(0)
  }
  console.error('\nB-REQ FAILED — did not reach Approved.')
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
