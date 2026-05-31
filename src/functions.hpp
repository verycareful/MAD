#pragma once
#include "types.hpp"
#include <cmath>
#include <functional>
#include <string>
#include <stdexcept>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// ─── Numerical gradient (central differences) ─────────────────────────────────
inline Vec2 numerical_gradient(const std::function<double(Vec2)>& f,
                                Vec2 theta, double h = 1e-5) {
    double dx = f({theta.x + h, theta.y}) - f({theta.x - h, theta.y});
    double dy = f({theta.x, theta.y + h}) - f({theta.x, theta.y - h});
    return {dx / (2.0 * h), dy / (2.0 * h)};
}

namespace functions {

// ─── Himmelblau ───────────────────────────────────────────────────────────────
// f(x,y) = (x²+y-11)² + (x+y²-7)²
// 4 global minima (f=0): (3,2), (-2.805,3.131), (-3.779,-3.283), (3.584,-1.848)
inline double himmelblau(Vec2 p) {
    double a = p.x * p.x + p.y - 11.0;
    double b = p.x + p.y * p.y - 7.0;
    return a * a + b * b;
}

// ─── Rastrigin 2D ─────────────────────────────────────────────────────────────
// Many local minima on a regular grid; global minimum at (0,0) with f=0
inline double rastrigin(Vec2 p) {
    const double A = 10.0;
    return 2.0 * A
        + p.x * p.x - A * std::cos(2.0 * M_PI * p.x)
        + p.y * p.y - A * std::cos(2.0 * M_PI * p.y);
}

// ─── Ackley 2D ────────────────────────────────────────────────────────────────
// Many local minima; single global at (0,0) with f=0
inline double ackley(Vec2 p) {
    double s1 = 0.5 * (p.x * p.x + p.y * p.y);
    double s2 = 0.5 * (std::cos(2.0 * M_PI * p.x) + std::cos(2.0 * M_PI * p.y));
    return -20.0 * std::exp(-0.2 * std::sqrt(s1))
           - std::exp(s2) + 20.0 + std::exp(1.0);
}

// ─── Beale ────────────────────────────────────────────────────────────────────
// Global minimum at (3, 0.5) with f=0
inline double beale(Vec2 p) {
    double a = 1.5   - p.x + p.x * p.y;
    double b = 2.25  - p.x + p.x * p.y * p.y;
    double c = 2.625 - p.x + p.x * p.y * p.y * p.y;
    return a * a + b * b + c * c;
}

// ─── Simple quadratic (sanity check) ─────────────────────────────────────────
// Single minimum at (0,0) with f=0
inline double quadratic(Vec2 p) {
    return p.x * p.x + p.y * p.y;
}

// ─── Double well ──────────────────────────────────────────────────────────────
// Two minima: approx (-1, 0) and (1, 0)
inline double double_well(Vec2 p) {
    double u = p.x * p.x - 1.0;
    return u * u + p.y * p.y;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
inline std::function<double(Vec2)> get(const std::string& name) {
    if (name == "himmelblau")  return himmelblau;
    if (name == "rastrigin")   return rastrigin;
    if (name == "ackley")      return ackley;
    if (name == "beale")       return beale;
    if (name == "quadratic")   return quadratic;
    if (name == "double_well") return double_well;
    throw std::invalid_argument("Unknown function: " + name);
}

// Suggested visualization bounds
inline std::pair<Vec2, Vec2> bounds(const std::string& name) {
    if (name == "himmelblau")  return {{-5.0, -5.0}, {5.0, 5.0}};
    if (name == "rastrigin")   return {{-5.12, -5.12}, {5.12, 5.12}};
    if (name == "ackley")      return {{-5.0, -5.0}, {5.0, 5.0}};
    if (name == "beale")       return {{-4.5, -4.5}, {4.5, 4.5}};
    if (name == "quadratic")   return {{-3.0, -3.0}, {3.0, 3.0}};
    if (name == "double_well") return {{-2.0, -2.0}, {2.0, 2.0}};
    return {{-5.0, -5.0}, {5.0, 5.0}};
}

// Suggested starting point per function
inline Vec2 start(const std::string& name) {
    if (name == "himmelblau")  return {0.0, 0.0};
    if (name == "rastrigin")   return {3.0, 3.0};
    if (name == "ackley")      return {2.5, 2.5};
    if (name == "beale")       return {1.0, 1.0};
    if (name == "quadratic")   return {2.0, 2.0};
    if (name == "double_well") return {0.0, 0.5};
    return {0.0, 0.0};
}

} // namespace functions
