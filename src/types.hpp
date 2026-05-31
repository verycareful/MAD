#pragma once
#include <vector>
#include <queue>
#include <string>
#include <cmath>
#include <limits>
#include <optional>

// ─── Vec2 ────────────────────────────────────────────────────────────────────
struct Vec2 {
    double x{0.0}, y{0.0};

    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
    Vec2 operator*(double s)      const { return {x * s,   y * s};   }
    Vec2 operator/(double s)      const { return {x / s,   y / s};   }
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }

    double dot(const Vec2& o) const { return x * o.x + y * o.y; }
    double norm()    const { return std::sqrt(x * x + y * y); }
    double norm_sq() const { return x * x + y * y; }

    Vec2 normalized() const {
        double n = norm();
        return (n < 1e-15) ? Vec2{0.0, 0.0} : Vec2{x / n, y / n};
    }
};
inline Vec2 operator*(double s, const Vec2& v) { return {s * v.x, s * v.y}; }

// ─── Candidate descent direction (stored in pass point queue) ─────────────────
struct Candidate {
    double angle;     // radians, direction of descent
    double priority;  // higher = tried first (farther from known minima)
    bool operator<(const Candidate& o) const { return priority < o.priority; }
};

// ─── MinNode ─────────────────────────────────────────────────────────────────
struct MinNode {
    Vec2   position;
    double loss;
};

// ─── PassPoint ───────────────────────────────────────────────────────────────
struct PassPoint {
    Vec2                              position;
    std::vector<Vec2>                 history_snapshot; // history up to this point
    std::priority_queue<Candidate>    queue;             // max-heap by priority
};

// ─── Configuration ────────────────────────────────────────────────────────────
struct MADConfig {
    double gamma     = 0.01;   // learning rate (descent & ascent step size)
    double epsilon   = 1e-5;   // convergence threshold: ‖∇f‖ < epsilon → minimum
    double delta     = 0.5;    // proximity radius: trajectory check activates within δ
    double alpha     = 0.22;   // trend window scale: w = floor(α · dist)
    double tau       = 0.85;   // trajectory alignment threshold (cosine)
    double tau_excl  = 15.0;   // exclusion cone half-angle in degrees
    double lambda    = std::numeric_limits<double>::quiet_NaN(); // early stop (NaN = off)
    bool   lazy      = false;  // true = lazy ascent, false = backtrack on abort
    int    max_steps = 200000; // safety cap
    int    n_sweep   = 720;    // angular sweep resolution for Phase 2
    double min_ascent_dist = 0.5; // min distance from last minimum before pass point allowed
    std::string function_name = "himmelblau";
    Vec2   theta_init = {0.0, 0.0};
};

// ─── Phase tracking ───────────────────────────────────────────────────────────
enum class MADPhase { DESCENT, ASCENT, BACKTRACK };

struct PhaseEvent {
    int      step;
    MADPhase phase;
    Vec2     position;
};

// ─── Result ───────────────────────────────────────────────────────────────────
struct MADResult {
    std::optional<MinNode>  best;
    std::vector<MinNode>    all_minima;
    std::vector<Vec2>       trajectory;
    std::vector<Vec2>       pass_point_positions;
    std::vector<PhaseEvent> phase_log;
    int                     total_steps{0};
    bool                    exhausted{false}; // true if full landscape explored
};
