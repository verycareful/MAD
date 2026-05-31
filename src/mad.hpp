#pragma once
#include "types.hpp"
#include <functional>
#include <vector>

// MAD optimizer for 2D differentiable loss functions.
// Implements the four-phase Minimum Ascent Descent algorithm:
//   Phase 1 — Steepest descent with trajectory abort
//   Phase 2 — Minimum ascent with pass-point detection
//   Phase 3 — Backtracking through pass-point stack
//   Phase 4 — Termination (stack empty)
class MAD {
public:
    explicit MAD(MADConfig config) : cfg_(std::move(config)) {}

    // Run the optimizer. f must be differentiable (numerical gradient used).
    MADResult run(const std::function<double(Vec2)>& f, Vec2 theta_init);

private:
    MADConfig cfg_;

    // ── Geometry helpers ──────────────────────────────────────────────────────

    // Unit vectors from theta toward each known minimum
    std::vector<Vec2> exclusion_set(const std::vector<MinNode>& V, Vec2 theta) const;

    // True if direction v falls within the exclusion cone of any d in D
    bool is_excluded(Vec2 v, const std::vector<Vec2>& D) const;

    // Priority for a candidate descent direction:
    // Higher = more orthogonal to all exclusion directions (farther from V)
    double candidate_priority(Vec2 v, const std::vector<Vec2>& D) const;

    // ── Sweep (core of Phase 2) ───────────────────────────────────────────────
    struct SweepResult {
        std::vector<Candidate> descent_candidates; // g·v < 0, not excluded
        Vec2   ascent_dir;   // shallowest valid ascent direction
        bool   ascent_valid; // false if ALL directions are excluded (edge case)
    };

    SweepResult sweep(Vec2 grad, const std::vector<Vec2>& D) const;

    // ── Trajectory check (Phase 1) ────────────────────────────────────────────
    bool trajectory_converging(const std::vector<Vec2>& history,
                                int w, Vec2 target) const;

    // ── Phase 1: one full descent run ─────────────────────────────────────────
    enum class P1Exit { MINIMUM, ABORT_LAZY, ABORT_BACKTRACK };

    struct P1Result {
        P1Exit exit;
        Vec2   theta;        // final position
        double grad_norm;
    };

    P1Result phase1(const std::function<double(Vec2)>& f,
                    Vec2 start,
                    const std::vector<MinNode>& V,
                    std::vector<Vec2>& history,
                    std::vector<PhaseEvent>& log,
                    int& steps) const;
};
