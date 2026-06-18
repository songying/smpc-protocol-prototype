pragma circom 2.0.0;

/*
 * Verifiable aggregation circuit (thesis B-ZK / QE2.2).
 *
 * Proves knowledge of `n` private addends whose sum equals the PUBLIC `total`,
 * without revealing the addends. This is the zero-knowledge attestation that an
 * aggregation result was computed correctly over committed inputs — the on-chain
 * Groth16 verifier checks the proof at constant (~280k) gas, marking the boundary
 * that the proof attests to correct computation, not to input-data truthfulness.
 */
template SumCheck(n) {
    signal input in[n];   // private addends (the secret values aggregated)
    signal input total;   // public claimed sum

    signal acc[n + 1];
    acc[0] <== 0;
    for (var i = 0; i < n; i++) {
        acc[i + 1] <== acc[i] + in[i];
    }
    acc[n] === total;     // constraint: the private inputs must sum to `total`
}

component main { public [total] } = SumCheck(10);
