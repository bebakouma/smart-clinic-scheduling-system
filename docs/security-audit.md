# Dependency Risk Review (Task 19)

This document records the dependency vulnerability review for the Smart Clinic
Scheduling System backend, performed as part of Task 19 (Security test suite).

## How to reproduce

```bash
cd backend
npm audit          # human-readable report
npm audit --json   # machine-readable report
```

## Summary

`npm audit` reported **9 vulnerabilities**: 1 critical, 5 high, 3 moderate.
All of them have a fix available via `npm audit fix` and all originate from
transitive dependencies (sub-dependencies of Express, Prisma tooling, and Joi),
not from code we wrote.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 5 |
| Moderate | 3 |
| Low      | 0 |
| **Total**| **9** |

## Findings by package

| Package | Severity | Nature | Fix available |
|---------|----------|--------|---------------|
| proxy-addr | Critical | IP spoofing via IPv4-mapped IPv6 trust subnet (transitive via Express) | Yes |
| body-parser | High | DoS via trailing bytes after a compressed request body | Yes |
| brace-expansion | High | Multiple DoS vectors (exponential expansion, unbounded memory, recursion) | Yes |
| browserslist | High | Unbounded memory growth / crash via untrusted stats (build-time tooling) | Yes |
| joi | High | Quadratic regex backtracking in `isoDate()`; prototype-pollution via message keys | Yes |
| js-yaml | High | Quadratic CPU via merge-key chains and `!!omap` resolution | Yes |
| express | Moderate | Inherited from vulnerable sub-dependencies | Yes |
| qs | Moderate | Array-limit bypass / DoS via attacker-controlled input | Yes |
| baseline-browser-mapping | Moderate | Process termination on invalid input (DoS, build-time tooling) | Yes |

## Risk assessment

- **proxy-addr (critical)** — Only exploitable when the app runs behind a proxy
  and uses `trust proxy` to make decisions from the client IP. This app does not
  currently enable `trust proxy`, so real-world exposure today is low. It should
  still be patched before production deployment, especially once we sit behind a
  managed platform's load balancer (Task 28+).
- **body-parser / express / qs (DoS)** — Mitigated in part by the existing
  hardening work: the `100kb` JSON body limit and the rate limiters added in
  Task 18 reduce the practical impact of request-shaped DoS attacks. Patching
  removes the root cause.
- **brace-expansion / browserslist / baseline-browser-mapping / js-yaml** —
  These are build/tooling-chain dependencies (not on the request hot path), so
  runtime exposure from untrusted user input is minimal. Still worth patching to
  keep the tree clean.
- **joi (regex backtracking / prototype pollution)** — Joi is on the request
  path (all input validation). The `isoDate()` backtracking issue is the most
  relevant to us because several validators use date fields. This is the
  highest-priority runtime patch after proxy-addr.

## Recommended action

1. Run `npm audit fix` and re-run the full test suite to confirm no regressions.
   All 9 findings report `fixAvailable: true`, so a non-breaking fix is expected.
2. Re-run `npm audit` to confirm the tree is clean.
3. Re-audit as a standard step during the capstone production-hardening task
   (Task 31) and before going live.

> Note: dependency advisories change over time, so exact counts may differ on a
> later run. The review process above is what matters; re-run it before each
> release.
