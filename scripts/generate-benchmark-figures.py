#!/usr/bin/env python3
"""
Generate thesis figures from the real benchmark + audit data (B1 / B4).

Inputs:
  prototype/benchmarks/results/bench_summary.csv   (mean ± 95% CI per cell)
  prototype/reports/audit-tamper-demo.json         (audit intact vs tampered)

Outputs (prototype/reports/figures/):
  fig1_latency_bars.png      latency by backend across payloads (sum), log y + CI
  fig2_latency_scaling.png   latency vs payload, log-log (sum & mean)
  fig3_privacy_overhead.png  privacy cost factor vs plaintext, by payload
  fig4_coverage_matrix.png   backend x query capability/correctness matrix
  fig5_audit_tamper.png      per-record validity, intact vs tampered (break point)

Run:  python3 scripts/generate-benchmark-figures.py
"""
import csv
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUMMARY = os.path.join(ROOT, "prototype/benchmarks/results/bench_summary.csv")
AUDIT = os.path.join(ROOT, "prototype/reports/audit-tamper-demo.json")
OUT = os.path.join(ROOT, "prototype/reports/figures")
os.makedirs(OUT, exist_ok=True)

PAYLOADS = [1000, 10000, 100000, 500000]
QUERIES = ["sum", "mean", "max", "quantile(0.95)", "logreg"]
BACKENDS = ["centralized", "our-protocol", "fhe"]
COLORS = {"centralized": "#64748b", "our-protocol": "#0ea5e9", "fhe": "#f59e0b"}
LABELS = {
    "centralized": "centralized (plaintext)",
    "our-protocol": "our-protocol (Shamir, info-theoretic)",
    "fhe": "fhe (SEAL BFV, computational)",
}


def load_summary():
    data = {}  # data[backend][query][payload] = (mean, ci)
    with open(SUMMARY) as f:
        for row in csv.DictReader(f):
            b, q, p = row["backend"], row["query"], int(row["payload"])
            data.setdefault(b, {}).setdefault(q, {})[p] = (
                float(row["mean_ms"]),
                float(row["ci95_ms"]),
            )
    return data


def fig1_bars(data):
    fig, ax = plt.subplots(figsize=(8, 5))
    n = len(BACKENDS)
    width = 0.8 / n
    x = range(len(PAYLOADS))
    for i, b in enumerate(BACKENDS):
        means = [data[b]["sum"][p][0] for p in PAYLOADS]
        cis = [data[b]["sum"][p][1] for p in PAYLOADS]
        offs = [xi + (i - (n - 1) / 2) * width for xi in x]
        ax.bar(offs, means, width, yerr=cis, capsize=3, label=LABELS[b], color=COLORS[b])
    ax.set_yscale("log")
    ax.set_xticks(list(x))
    ax.set_xticklabels([f"{p:,}" for p in PAYLOADS])
    ax.set_xlabel("Dataset size (records)")
    ax.set_ylabel("Latency (ms, log scale)")
    ax.set_title("Secure-aggregation latency by backend (sum), mean ± 95% CI, n=10")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig1_latency_bars.png"), dpi=150)
    plt.close(fig)


def fig2_scaling(data):
    fig, ax = plt.subplots(figsize=(8, 5))
    for b in BACKENDS:
        for q, ls in (("sum", "-"), ("mean", "--")):
            ys = [data[b][q][p][0] for p in PAYLOADS]
            ax.plot(PAYLOADS, ys, ls, marker="o", color=COLORS[b],
                    label=f"{b} · {q}", linewidth=1.6, markersize=4)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Dataset size (records, log)")
    ax.set_ylabel("Latency (ms, log)")
    ax.set_title("Latency scaling with dataset size (log–log)")
    ax.grid(True, which="both", ls=":", alpha=0.4)
    ax.legend(fontsize=7, ncol=2)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig2_latency_scaling.png"), dpi=150)
    plt.close(fig)


def fig3_overhead(data):
    fig, ax = plt.subplots(figsize=(8, 5))
    base = {p: data["centralized"]["sum"][p][0] for p in PAYLOADS}
    for b in ("fhe", "our-protocol"):
        factor = [data[b]["sum"][p][0] / base[p] for p in PAYLOADS]
        ax.plot(PAYLOADS, factor, marker="o", color=COLORS[b], label=LABELS[b], linewidth=1.8)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Dataset size (records, log)")
    ax.set_ylabel("Privacy cost factor vs plaintext (×, log)")
    ax.set_title("Cost of privacy: latency relative to the plaintext baseline (sum)")
    ax.grid(True, which="both", ls=":", alpha=0.4)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig3_privacy_overhead.png"), dpi=150)
    plt.close(fig)


def fig4_coverage(data):
    fig, ax = plt.subplots(figsize=(8, 3.2))
    grid = []
    for b in BACKENDS:
        row = []
        for q in QUERIES:
            # 1 = supported & correct (present in summary), 0 = unsupported
            row.append(1 if q in data.get(b, {}) else 0)
        grid.append(row)
    ax.imshow(grid, cmap="Greens", vmin=0, vmax=1, aspect="auto")
    ax.set_xticks(range(len(QUERIES)))
    ax.set_xticklabels(QUERIES, rotation=20, ha="right", fontsize=8)
    ax.set_yticks(range(len(BACKENDS)))
    ax.set_yticklabels([LABELS[b] for b in BACKENDS], fontsize=8)
    for i in range(len(BACKENDS)):
        for j in range(len(QUERIES)):
            ax.text(j, i, "✓" if grid[i][j] else "—", ha="center", va="center",
                    color="white" if grid[i][j] else "#475569", fontsize=11)
    ax.set_title("Query coverage & correctness (✓ = supported and matches plaintext oracle)")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig4_coverage_matrix.png"), dpi=150)
    plt.close(fig)


def fig5_audit():
    with open(AUDIT) as f:
        a = json.load(f)
    intact = [1 if v else 0 for v in a["intact"]["perRecordValid"]]
    tampered = [1 if v else 0 for v in a["tampered"]["perRecordValid"]]
    k = a["tampered"]["atIndex"]
    parties = [p["party"] for p in a["parties"]]
    grid = [intact, tampered]
    fig, ax = plt.subplots(figsize=(9, 2.8))
    ax.imshow(grid, cmap="RdYlGn", vmin=0, vmax=1, aspect="auto")
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["intact chain", f"tampered @ record {k}"], fontsize=9)
    ax.set_xticks(range(len(parties)))
    ax.set_xticklabels([f"{i}\n{p}" for i, p in enumerate(parties)], fontsize=7)
    for j in range(len(parties)):
        for i in range(2):
            ax.text(j, i, "valid" if grid[i][j] else "BROKEN", ha="center", va="center",
                    color="black", fontsize=7)
    ax.axvline(k - 0.5, color="black", ls="--", lw=1)
    ax.set_title("Audit hash-chain tamper detection: a single edit invalidates record k onward")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig5_audit_tamper.png"), dpi=150)
    plt.close(fig)


def fig6_stress():
    path = os.path.join(ROOT, "prototype/benchmarks/results/stress_matrix.csv")
    if not os.path.exists(path):
        print("  (stress_matrix.csv not found — run stress.ts first; skipping fig6)")
        return
    data = {}
    concs, pays, backends = set(), set(), []
    with open(path) as f:
        for row in csv.DictReader(f):
            b, c, p = row["backend"], int(row["concurrency"]), int(row["payload"])
            data.setdefault(b, {})[(c, p)] = float(row["throughput_qps"])
            concs.add(c)
            pays.add(p)
            if b not in backends:
                backends.append(b)
    concs = sorted(concs)
    pays = sorted(pays)
    fig, axes = plt.subplots(1, len(backends), figsize=(4 * len(backends), 3.4), squeeze=False)
    for ax, b in zip(axes[0], backends):
        grid = [[data[b].get((c, p), float("nan")) for p in pays] for c in concs]
        im = ax.imshow(grid, cmap="viridis", aspect="auto")
        ax.set_title(b, fontsize=9)
        ax.set_xticks(range(len(pays)))
        ax.set_xticklabels([f"{p // 1000}k" for p in pays], fontsize=7)
        ax.set_yticks(range(len(concs)))
        ax.set_yticklabels([str(c) for c in concs], fontsize=7)
        ax.set_xlabel("payload")
        ax.set_ylabel("concurrency")
        for i in range(len(concs)):
            for j in range(len(pays)):
                v = grid[i][j]
                if v == v:
                    ax.text(j, i, f"{v:.0f}", ha="center", va="center", color="white", fontsize=6)
        fig.colorbar(im, ax=ax, fraction=0.046, label="q/s")
    fig.suptitle("Throughput (q/s) under concurrency × payload (sum)", fontsize=10)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "fig6_stress_matrix.png"), dpi=150)
    plt.close(fig)


def main():
    data = load_summary()
    fig1_bars(data)
    fig2_scaling(data)
    fig3_overhead(data)
    fig4_coverage(data)
    fig5_audit()
    fig6_stress()
    print("Wrote figures to", OUT)
    for fn in sorted(os.listdir(OUT)):
        print("  -", fn)


if __name__ == "__main__":
    main()
