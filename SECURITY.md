# Security Policy

## Scope

This repository is a **research prototype** built for the doctoral thesis
*The Protocol of Privacy Data Trading and Computing with Web3*. It demonstrates a
privacy-preserving data-trading lifecycle (on-chain registration, Shamir/MP-SPDZ
secure aggregation, FHE, Groth16 verification, fee settlement) as a vertical slice.
It is **not a production service**, is not publicly deployed, and holds no user
funds or real user data.

Security review is nevertheless welcome: the code is public precisely so that the
design can be examined and criticised.

## Reporting a vulnerability

Please report vulnerabilities privately rather than through public GitHub issues.

- **Email:** alvin.song@connect.polyu.edu.hk
- **Response time:** I aim to acknowledge reports within 7 days.

Helpful details to include: the affected file and commit, steps to reproduce or a
proof of concept, your assessment of impact, and a suggested fix if you have one.

## No paid bug bounty

There is **no bug bounty program** and no monetary reward for reports. An earlier
version of this file contained an unedited template that advertised reward tiers,
audit reports and contact channels that never existed; that text was removed on
2026-09-11 and should not be relied upon.

Valid reports are credited in the README (see *Security acknowledgements*) and in
the commit message of the fix, unless the reporter prefers to remain anonymous.

## What has been reviewed

No third-party security audit has been performed on this code base.

Fixed reports:

| Date | Reporter | Issue | Fix |
|------|----------|-------|-----|
| 2026-09-11 | [OneDollarAgent](https://github.com/OneDollarAgent) | Wallet login verified the signature over a client-supplied message instead of the server-issued challenge (signature replay / account takeover) | `src/lib/auth/sign-in-challenge.ts`, regression test in `src/app/api/auth/__tests__/login.test.ts` |

## Known limitations (by design of the prototype)

- The backend signs transactions with a single relayer key that holds every
  contract role. Acceptable for a demonstrator, not for production.
- The demo web UI keeps login state in the browser and does not enforce
  server-side sessions on its own pages.
- Development TLS certificates are generated inside the MP-SPDZ node containers.
- FHE runs single-key Microsoft SEAL; multi-key aggregation is simplified.

See §5.8 of the thesis for the evaluated scope.

---

*Last updated: 2026-09-11*
