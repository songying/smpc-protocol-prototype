/**
 * Deploy the snarkjs-generated Groth16 verifier and MEASURE its on-chain
 * verification gas with a real proof (thesis B-ZK / QE2.2). Replaces the cited
 * ~200k–300k estimate with a self-measured number on this circuit.
 *
 * Prereq: scripts/measure ran after the Groth16 pipeline produced
 *   /tmp/groth16/{proof.json,public.json,calldata.txt} and contracts/Groth16Verifier.sol.
 * Run:  npx hardhat run scripts/measure-groth16-gas.cjs
 */
const hre = require("hardhat");
const fs = require("fs");
const { ethers } = hre;

async function main() {
  const raw = fs.readFileSync("/tmp/groth16/calldata.txt", "utf8").trim();
  const [a, b, c, input] = JSON.parse("[" + raw + "]");

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("Groth16Verifier deployed:", await verifier.getAddress());

  const ok = await verifier.verifyProof(a, b, c, input);
  const gas = await verifier.verifyProof.estimateGas(a, b, c, input);
  console.log("verifyProof(valid)   ->", ok, "| gas:", gas.toString());

  // Negative control: corrupt the public input — verification must fail.
  const bad = [...input];
  bad[0] = "0x" + (BigInt(input[0]) + BigInt(1)).toString(16);
  const rejected = await verifier.verifyProof(a, b, c, bad);
  console.log("verifyProof(tampered)->", rejected, "(expected false)");

  if (ok === true && rejected === false) {
    console.log(`\nB-ZK OK — real Groth16 proof verifies on-chain at ${gas.toString()} gas; tampered input rejected.`);
  } else {
    console.error("\nB-ZK UNEXPECTED result");
    process.exitCode = 1;
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
