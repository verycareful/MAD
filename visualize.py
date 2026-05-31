#!/usr/bin/env python3
"""
MAD Algorithm — Trajectory Visualizer
Reads the JSON output from the C++ optimizer and renders:
  - Contour heatmap of the loss landscape
  - Full trajectory colored by phase
  - Pass points (branch nodes of the traversal tree)
  - Discovered minima
"""

import json
import sys
import os
import math
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.colors import LogNorm
from matplotlib.lines import Line2D
from matplotlib.collections import LineCollection

# ── Loss functions (Python mirror for contour) ────────────────────────────────

def himmelblau(X, Y):
    return (X**2 + Y - 11)**2 + (X + Y**2 - 7)**2

def rastrigin(X, Y):
    return 20 + X**2 - 10*np.cos(2*np.pi*X) + Y**2 - 10*np.cos(2*np.pi*Y)

def ackley(X, Y):
    s1 = 0.5 * (X**2 + Y**2)
    s2 = 0.5 * (np.cos(2*np.pi*X) + np.cos(2*np.pi*Y))
    return -20 * np.exp(-0.2 * np.sqrt(s1)) - np.exp(s2) + 20 + math.e

def beale(X, Y):
    a = 1.5   - X + X*Y
    b = 2.25  - X + X*Y**2
    c = 2.625 - X + X*Y**3
    return a**2 + b**2 + c**2

def quadratic(X, Y):
    return X**2 + Y**2

def double_well(X, Y):
    return (X**2 - 1)**2 + Y**2

FUNCTIONS = {
    "himmelblau":  (himmelblau,  (-5, 5, -5, 5)),
    "rastrigin":   (rastrigin,   (-5.12, 5.12, -5.12, 5.12)),
    "ackley":      (ackley,      (-5, 5, -5, 5)),
    "beale":       (beale,       (-4.5, 4.5, -4.5, 4.5)),
    "quadratic":   (quadratic,   (-3, 3, -3, 3)),
    "double_well": (double_well, (-2, 2, -2, 2)),
}

# ── Color palette ─────────────────────────────────────────────────────────────

COLORS = {
    "bg":         "#0f0e0c",
    "surface":    "#161412",
    "border":     "#2a2620",
    "accent":     "#c8a96e",
    "phase1":     "#7eb8d4",   # descent  — blue
    "phase2":     "#d47e7e",   # ascent   — red
    "phase3":     "#b07ed4",   # backtrack — purple
    "minima":     "#7ed4a0",   # minima   — green
    "best":       "#f0c060",   # best     — gold
    "passpoint":  "#ffffff",   # pass pts — white
    "text":       "#e2d8c8",
}

# ─────────────────────────────────────────────────────────────────────────────

def load_result(path):
    with open(path) as f:
        return json.load(f)

def build_contour(fn_name, bounds, resolution=400):
    xmin, xmax, ymin, ymax = bounds
    X = np.linspace(xmin, xmax, resolution)
    Y = np.linspace(ymin, ymax, resolution)
    Xg, Yg = np.meshgrid(X, Y)
    fn, _ = FUNCTIONS[fn_name]
    Z = fn(Xg, Yg)
    return Xg, Yg, Z

def phase_color_for_segment(i, phase_log, traj_len):
    """Return the phase color for trajectory index i."""
    # Default to descent
    color = COLORS["phase1"]
    step_frac = i / max(traj_len - 1, 1)
    # Check phase_log for nearest event
    for ev in reversed(phase_log):
        ev_frac = ev["step"] / max(traj_len - 1, 1)
        if ev_frac <= step_frac:
            ph = ev["phase"]
            if ph == "DESCENT":    color = COLORS["phase1"]
            elif ph == "ASCENT":   color = COLORS["phase2"]
            elif ph == "BACKTRACK":color = COLORS["phase3"]
            break
    return color

def plot(result_path, out_image=None, animate=False):
    data = load_result(result_path)
    fn_name   = data["function"]
    traj      = data["trajectory"]
    minima    = data["minima"]
    best      = data.get("best")
    pass_pts  = data["pass_points"]
    phase_log = data["phase_log"]
    cfg       = data["config"]

    if fn_name not in FUNCTIONS:
        print(f"Unknown function '{fn_name}', cannot plot contour.")
        return

    _, bounds = FUNCTIONS[fn_name]
    Xg, Yg, Z = build_contour(fn_name, bounds)

    # ── Figure setup ──────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 9))
    fig.patch.set_facecolor(COLORS["bg"])
    ax.set_facecolor(COLORS["bg"])

    # Contour heatmap
    Z_plot = np.log1p(Z)  # log scale for better contrast
    ax.contourf(Xg, Yg, Z_plot, levels=60, cmap="inferno", alpha=0.75)
    ax.contour(Xg, Yg, Z_plot, levels=20, colors=COLORS["border"],
               linewidths=0.3, alpha=0.4)

    # ── Trajectory (colored by phase) ─────────────────────────────────────────
    if len(traj) > 1:
        tx = [p[0] for p in traj]
        ty = [p[1] for p in traj]

        colors = [phase_color_for_segment(i, phase_log, len(traj))
                  for i in range(len(traj) - 1)]
        segments = [[(tx[i], ty[i]), (tx[i+1], ty[i+1])]
                    for i in range(len(traj) - 1)]
        lc = LineCollection(segments, colors=colors, linewidths=0.8, alpha=0.7,
                            capstyle="round")
        ax.add_collection(lc)

    # ── Pass points ───────────────────────────────────────────────────────────
    if pass_pts:
        ppx = [p[0] for p in pass_pts]
        ppy = [p[1] for p in pass_pts]
        ax.scatter(ppx, ppy, s=55, c=COLORS["passpoint"], marker="o",
                   edgecolors=COLORS["bg"], linewidths=1.2, zorder=5,
                   label=f"Pass points ({len(pass_pts)})")

    # ── Minima ────────────────────────────────────────────────────────────────
    for i, m in enumerate(minima):
        is_best = (best and abs(m["pos"][0] - best["pos"][0]) < 1e-6
                         and abs(m["pos"][1] - best["pos"][1]) < 1e-6)
        color  = COLORS["best"] if is_best else COLORS["minima"]
        marker = "★" if is_best else "✦"
        ax.scatter(m["pos"][0], m["pos"][1],
                   s=180 if is_best else 100,
                   c=color, marker="*", edgecolors="white",
                   linewidths=0.8, zorder=8)
        ax.annotate(f"#{i+1}  f={m['loss']:.4f}",
                    xy=(m["pos"][0], m["pos"][1]),
                    xytext=(6, 6), textcoords="offset points",
                    fontsize=7, color=color, fontfamily="monospace",
                    path_effects=[pe.withStroke(linewidth=2, foreground=COLORS["bg"])])

    # Start marker
    if traj:
        ax.scatter(traj[0][0], traj[0][1], s=80, c=COLORS["accent"],
                   marker="^", zorder=9, label="Start")

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_items = [
        Line2D([0],[0], color=COLORS["phase1"], lw=2, label="Descent"),
        Line2D([0],[0], color=COLORS["phase2"], lw=2, label="Ascent"),
        Line2D([0],[0], color=COLORS["phase3"], lw=2, label="Backtrack"),
        Line2D([0],[0], color=COLORS["minima"], marker="*", markersize=9,
               lw=0, label=f"Minima ({len(minima)})"),
        Line2D([0],[0], color=COLORS["passpoint"], marker="o", markersize=7,
               lw=0, label=f"Pass points ({len(pass_pts)})"),
    ]
    leg = ax.legend(handles=legend_items, loc="upper right",
                    facecolor=COLORS["surface"], edgecolor=COLORS["border"],
                    labelcolor=COLORS["text"], fontsize=8)

    # ── Labels ────────────────────────────────────────────────────────────────
    ax.set_title(f"MAD  —  {fn_name}  |  {len(minima)} minima  |  {data['total_steps']} steps",
                 color=COLORS["text"], fontsize=12, pad=12)
    ax.set_xlabel("x", color=COLORS["text"], fontsize=10)
    ax.set_ylabel("y", color=COLORS["text"], fontsize=10)
    ax.tick_params(colors=COLORS["text"], labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor(COLORS["border"])

    # Config annotation
    cfg_str = (f"γ={cfg['gamma']}  ε={cfg['epsilon']}  δ={cfg['delta']}  "
               f"α={cfg['alpha']}  τ={cfg['tau']}  τ_excl={cfg['tau_excl']}°  "
               f"lazy={cfg['lazy']}")
    ax.text(0.01, 0.01, cfg_str, transform=ax.transAxes,
            fontsize=6.5, color=COLORS["text"], alpha=0.6,
            fontfamily="monospace",
            bbox=dict(facecolor=COLORS["surface"], edgecolor="none", alpha=0.7))

    plt.tight_layout()

    if out_image:
        plt.savefig(out_image, dpi=150, bbox_inches="tight",
                    facecolor=COLORS["bg"])
        print(f"Saved: {out_image}")
    else:
        plt.show()

# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default: look for any JSON in output/
        out_dir = "output"
        files = [f for f in os.listdir(out_dir) if f.endswith("_result.json")]
        if not files:
            print("Usage: python visualize.py <result.json> [output_image.png]")
            sys.exit(1)
        files.sort()
        for jf in files:
            path = os.path.join(out_dir, jf)
            img  = path.replace(".json", ".png")
            print(f"Plotting {path} -> {img}")
            plot(path, img)
    else:
        result_path = sys.argv[1]
        out_image   = sys.argv[2] if len(sys.argv) > 2 else None
        plot(result_path, out_image)
