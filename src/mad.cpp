#include "mad.hpp"
#include "functions.hpp"
#include <cmath>
#include <algorithm>
#include <stack>
#include <set>
#include <iostream>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Minimum Euclidean distance between two positions to be considered distinct minima
static constexpr double DEDUP_RADIUS      = 1e-2;
// Minimum gradient norm before Phase 2 starts scanning for descent candidates.
static constexpr double ASCENT_SCAN_THRESHOLD = 0.05;
// Minimum distance we must ascend away from the last minimum before
// a pass point is allowed. Prevents immediately branching inside the basin.

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

std::vector<Vec2> MAD::exclusion_set(const std::vector<MinNode>& V, Vec2 theta) const {
    std::vector<Vec2> D;
    D.reserve(V.size());
    for (const auto& m : V) {
        double dist = (m.position - theta).norm();
        if (dist > 1e-9) // only guard against exact zero (div-by-zero)
            D.push_back((m.position - theta).normalized());
    }
    return D;
}

bool MAD::is_excluded(Vec2 v, const std::vector<Vec2>& D) const {
    const double cos_thr = std::cos(cfg_.tau_excl * M_PI / 180.0);
    for (const auto& d : D)
        if (v.dot(d) > cos_thr) return true;
    return false;
}

double MAD::candidate_priority(Vec2 v, const std::vector<Vec2>& D) const {
    if (D.empty()) return 1.0;
    double min_dot = 1.0;
    for (const auto& d : D)
        min_dot = std::min(min_dot, v.dot(d));
    return -min_dot; // higher = farther from all known minima directions
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 angular sweep
// ─────────────────────────────────────────────────────────────────────────────

MAD::SweepResult MAD::sweep(Vec2 grad, const std::vector<Vec2>& D) const {
    SweepResult result;
    result.ascent_valid = false;

    // Ascent: steepest valid uphill direction not excluded by D.
    // Candidates: downhill AND not within tau_excl of any known minimum direction.
    double best_asc_dot = -std::numeric_limits<double>::infinity();

    const int N = cfg_.n_sweep;
    for (int i = 0; i < N; ++i) {
        double angle = (2.0 * M_PI * i) / N;
        Vec2   v     = {std::cos(angle), std::sin(angle)};

        double gv = grad.dot(v);
        if (gv < 0.0 && !is_excluded(v, D)) {
            // Downhill and not pointing toward a known minimum → valid candidate.
            result.descent_candidates.push_back({angle, candidate_priority(v, D)});
        } else if (gv > best_asc_dot && !is_excluded(v, D)) {
            // Steepest valid uphill direction not toward a known minimum.
            best_asc_dot        = gv;
            result.ascent_dir   = v;
            result.ascent_valid = true;
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory convergence check
// ─────────────────────────────────────────────────────────────────────────────

bool MAD::trajectory_converging(const std::vector<Vec2>& history,
                                 int w, Vec2 target) const {
    if (w < 2) return false;
    int n = static_cast<int>(history.size()) - 1;
    if (n < w) return false;

    Vec2 disp      = history[n] - history[n - w];
    double dn      = disp.norm();
    if (dn < 1e-10) return false;

    Vec2 toward    = target - history[n];
    double tn      = toward.norm();
    if (tn < DEDUP_RADIUS) return true; // We ARE at the target

    return (disp / dn).dot(toward / tn) > cfg_.tau;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Steepest Descent
// ─────────────────────────────────────────────────────────────────────────────

MAD::P1Result MAD::phase1(const std::function<double(Vec2)>& f,
                           Vec2 start,
                           const std::vector<MinNode>& V,
                           std::vector<Vec2>& history,
                           std::vector<PhaseEvent>& log,
                           int& steps) const {
    Vec2 theta = start;
    log.push_back({steps, MADPhase::DESCENT, theta});

    while (steps < cfg_.max_steps) {
        Vec2   grad = numerical_gradient(f, theta);
        double gn   = grad.norm();

        if (gn < cfg_.epsilon)
            return {P1Exit::MINIMUM, theta, gn};

        // Trajectory abort: are we heading toward a known minimum?
        for (const auto& m : V) {
            double dist = (theta - m.position).norm();
            if (dist < cfg_.delta) {
                int w = static_cast<int>(cfg_.alpha * dist / cfg_.gamma);
                if (trajectory_converging(history, w, m.position)) {
                    if (cfg_.lazy)
                        return {P1Exit::ABORT_LAZY, theta, gn};
                    else
                        return {P1Exit::ABORT_BACKTRACK, theta, gn};
                }
            }
        }

        theta = theta - cfg_.gamma * grad;
        history.push_back(theta);
        ++steps;
    }

    return {P1Exit::ABORT_BACKTRACK, theta, numerical_gradient(f, theta).norm()};
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MAD run
// ─────────────────────────────────────────────────────────────────────────────

MADResult MAD::run(const std::function<double(Vec2)>& f, Vec2 theta_init) {
    MADResult result;
    std::vector<MinNode>&   V    = result.all_minima;
    std::vector<Vec2>&      traj = result.trajectory;
    std::vector<PhaseEvent>& log = result.phase_log;

    std::stack<PassPoint> P;

    Vec2              theta           = theta_init;
    std::vector<Vec2> history         = {theta};
    Vec2              last_min_pos    = theta_init;
    Vec2              ascent_init_dir = {1.0, 0.0};
    std::set<size_t>  reascended;      // indices into V already used as re-ascent origins
    int               steps           = 0;

    enum class State { DESCENT, ASCENT, BACKTRACK, DONE };
    State state = State::DESCENT;

    auto near_known = [&](Vec2 pos) -> bool {
        for (const auto& m : V)
            if ((pos - m.position).norm() < DEDUP_RADIUS) return true;
        return false;
    };

    while (state != State::DONE && steps < cfg_.max_steps) {

        // ── PHASE 1: Steepest Descent ─────────────────────────────────────────
        if (state == State::DESCENT) {
            auto [exit, final_theta, gnorm] = phase1(f, theta, V, history, log, steps);
            theta = final_theta;
            for (const auto& p : history) traj.push_back(p);

            if (exit == P1Exit::MINIMUM) {
                if (near_known(theta)) {
                    // Find which known minimum we landed on
                    size_t best_idx = 0;
                    double best_d   = std::numeric_limits<double>::infinity();
                    for (size_t i = 0; i < V.size(); ++i) {
                        double d = (theta - V[i].position).norm();
                        if (d < best_d) { best_d = d; best_idx = i; }
                    }
                    if (reascended.count(best_idx) == 0) {
                        // First re-encounter: ascend from here to expose passes on the other side.
                        // Initial direction = direction most orthogonal to all known minima,
                        // so we explore unexplored territory rather than retracing known paths.
                        reascended.insert(best_idx);
                        {
                            Vec2 reascent_pos = V[best_idx].position;
                            auto D_ra = exclusion_set(V, reascent_pos);
                            // Exclude direction back toward the pass point we came from,
                            // so the highest-priority direction points into unexplored territory.
                            if (!P.empty()) {
                                Vec2 back = (P.top().position - reascent_pos).normalized();
                                if (back.norm() > 1e-10) D_ra.push_back(back);
                            }
                            double best_pri = -std::numeric_limits<double>::infinity();
                            for (int ai = 0; ai < cfg_.n_sweep; ++ai) {
                                double ang = (2.0 * M_PI * ai) / cfg_.n_sweep;
                                Vec2 v = {std::cos(ang), std::sin(ang)};
                                double pri = candidate_priority(v, D_ra);
                                if (pri > best_pri) { best_pri = pri; ascent_init_dir = v; }
                            }
                        }
                        last_min_pos = V[best_idx].position;
                        theta        = V[best_idx].position;
                        std::cout << "[MAD] Re-ascending from known min #" << (best_idx + 1)
                                  << "  pos=(" << theta.x << ", " << theta.y << ")\n";
                        state   = State::ASCENT;
                        history = {theta};
                    } else {
                        state   = State::BACKTRACK;
                        history = {theta};
                    }
                } else {
                    MinNode mn{theta, f(theta)};
                    V.push_back(mn);
                    last_min_pos = theta;
                    if (!result.best || mn.loss < result.best->loss) result.best = mn;
                    std::cout << "[MAD] Minimum #" << V.size()
                              << "  pos=(" << theta.x << ", " << theta.y
                              << ")  f=" << mn.loss << "\n";
                    if (!std::isnan(cfg_.lambda) && mn.loss < cfg_.lambda) {
                        result.total_steps = steps; return result;
                    }
                    // Negate last descent step → initial uphill direction
                    if (history.size() >= 2) {
                        Vec2 last_step = history.back() - history[history.size() - 2];
                        double ln = last_step.norm();
                        if (ln > 1e-10) ascent_init_dir = (last_step / ln) * -1.0;
                    }
                    state   = State::ASCENT;
                    history = {theta};
                }
            } else if (exit == P1Exit::ABORT_LAZY) {
                state = State::ASCENT;
            } else {
                state   = State::BACKTRACK;
                history = {theta};
            }
        }

        // ── PHASE 2: Minimum Ascent ───────────────────────────────────────────
        while (state == State::ASCENT && steps < cfg_.max_steps) {
            Vec2   grad = numerical_gradient(f, theta);
            double gn   = grad.norm();
            auto   D    = exclusion_set(V, theta);

            // Always sweep for candidates — saddles have small gradient and must not be skipped.
            auto sw = sweep(grad, D);

            double dist_from_last_min = (theta - last_min_pos).norm();
            bool far_enough = dist_from_last_min >= cfg_.min_ascent_dist;

            // Pass point: far enough from last minimum AND non-excluded descent candidates exist.
            if (far_enough && !sw.descent_candidates.empty()) {
                std::priority_queue<Candidate> pq;
                for (const auto& c : sw.descent_candidates) pq.push(c);

                Candidate best_c = pq.top(); pq.pop();

                bool dup = !P.empty() &&
                           (P.top().position - theta).norm() < DEDUP_RADIUS;
                if (!dup) {
                    PassPoint pp;
                    pp.position         = theta;
                    pp.history_snapshot = history;
                    pp.queue            = std::move(pq);
                    P.push(std::move(pp));
                    result.pass_point_positions.push_back(theta);
                    log.push_back({steps, MADPhase::ASCENT, theta});
                    std::cout << "[MAD] Pass point @ (" << theta.x
                              << ", " << theta.y << ")  candidates="
                              << (P.top().queue.size() + 1) << "\n";
                }

                Vec2 v_best = {std::cos(best_c.angle), std::sin(best_c.angle)};
                theta = theta + cfg_.gamma * v_best;
                history.push_back(theta);
                traj.push_back(theta);
                ++steps;
                state = State::DESCENT;
                break;
            }

            // Choose ascent direction based on gradient magnitude.
            if (gn >= ASCENT_SCAN_THRESHOLD && sw.ascent_valid) {
                // Shallowest valid uphill direction.
                theta = theta + cfg_.gamma * sw.ascent_dir;
            } else {
                // Gradient too small (near minimum or saddle): escape using stored direction.
                Vec2 step_dir = (dist_from_last_min > 1e-10)
                                ? (theta - last_min_pos).normalized()
                                : ascent_init_dir;
                if (is_excluded(step_dir, D)) {
                    Vec2 perp = {-step_dir.y, step_dir.x};
                    step_dir = is_excluded(perp, D) ? Vec2{-perp.x, -perp.y} : perp;
                }
                if (!sw.ascent_valid && gn >= ASCENT_SCAN_THRESHOLD) {
                    std::cerr << "[MAD] All directions excluded, backtracking.\n";
                    state = State::BACKTRACK;
                    break;
                }
                theta = theta + cfg_.gamma * step_dir;
            }

            history.push_back(theta);
            traj.push_back(theta);
            log.push_back({steps, MADPhase::ASCENT, theta});
            ++steps;
        }

        // ── PHASE 3: Backtrack ────────────────────────────────────────────────
        if (state == State::BACKTRACK) {
            log.push_back({steps, MADPhase::BACKTRACK, theta});
            bool found = false;

            while (!P.empty() && !found) {
                PassPoint& pp = P.top();
                if (!pp.queue.empty()) {
                    Candidate c = pp.queue.top(); pp.queue.pop();
                    Vec2 v = {std::cos(c.angle), std::sin(c.angle)};
                    theta   = pp.position + cfg_.gamma * v;
                    history = pp.history_snapshot;
                    history.push_back(theta);
                    traj.push_back(theta);
                    found = true;
                    state = State::DESCENT;
                } else {
                    P.pop();
                }
            }

            if (!found) {
                state = State::DONE;
                result.exhausted = true;
            }
        }
    }

    result.total_steps = steps;
    if (steps >= cfg_.max_steps)
        std::cerr << "[MAD] WARNING: max_steps cap reached.\n";
    return result;
}
