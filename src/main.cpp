#include "mad.hpp"
#include "functions.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <cmath>
#include <filesystem>

// ─── Simple JSON writer (no external deps) ────────────────────────────────────

static std::string vec2_json(Vec2 v) {
    std::ostringstream ss;
    ss << "[" << v.x << "," << v.y << "]";
    return ss.str();
}

static void write_json(const MADResult& res, const MADConfig& cfg,
                       const std::string& out_path) {
    std::ofstream f(out_path);
    if (!f) { std::cerr << "Cannot open: " << out_path << "\n"; return; }

    f << "{\n";
    f << "  \"function\": \"" << cfg.function_name << "\",\n";

    // Config
    f << "  \"config\": {\n";
    f << "    \"gamma\": "    << cfg.gamma    << ",\n";
    f << "    \"epsilon\": "  << cfg.epsilon  << ",\n";
    f << "    \"delta\": "    << cfg.delta    << ",\n";
    f << "    \"alpha\": "    << cfg.alpha    << ",\n";
    f << "    \"tau\": "      << cfg.tau      << ",\n";
    f << "    \"tau_excl\": " << cfg.tau_excl << ",\n";
    f << "    \"lazy\": "     << (cfg.lazy ? "true" : "false") << ",\n";
    f << "    \"theta_init\": " << vec2_json(cfg.theta_init) << "\n";
    f << "  },\n";

    // Trajectory
    f << "  \"trajectory\": [";
    for (size_t i = 0; i < res.trajectory.size(); ++i) {
        f << vec2_json(res.trajectory[i]);
        if (i + 1 < res.trajectory.size()) f << ",";
    }
    f << "],\n";

    // Pass points
    f << "  \"pass_points\": [";
    for (size_t i = 0; i < res.pass_point_positions.size(); ++i) {
        f << vec2_json(res.pass_point_positions[i]);
        if (i + 1 < res.pass_point_positions.size()) f << ",";
    }
    f << "],\n";

    // All minima
    f << "  \"minima\": [";
    for (size_t i = 0; i < res.all_minima.size(); ++i) {
        const auto& m = res.all_minima[i];
        f << "{\"pos\":" << vec2_json(m.position) << ",\"loss\":" << m.loss << "}";
        if (i + 1 < res.all_minima.size()) f << ",";
    }
    f << "],\n";

    // Best
    if (res.best) {
        f << "  \"best\": {\"pos\":" << vec2_json(res.best->position)
          << ",\"loss\":" << res.best->loss << "},\n";
    } else {
        f << "  \"best\": null,\n";
    }

    // Phase log (sampled — every 50th event to keep file small)
    f << "  \"phase_log\": [";
    bool first = true;
    for (size_t i = 0; i < res.phase_log.size(); i += 50) {
        if (!first) f << ",";
        const auto& e = res.phase_log[i];
        std::string ph = (e.phase == MADPhase::DESCENT)   ? "DESCENT"
                       : (e.phase == MADPhase::ASCENT)    ? "ASCENT"
                                                           : "BACKTRACK";
        f << "{\"step\":" << e.step << ",\"phase\":\"" << ph
          << "\",\"pos\":" << vec2_json(e.position) << "}";
        first = false;
    }
    f << "],\n";

    f << "  \"total_steps\": " << res.total_steps << ",\n";
    f << "  \"exhausted\": "   << (res.exhausted ? "true" : "false") << "\n";
    f << "}\n";

    std::cout << "[MAD] Results written to: " << out_path << "\n";
}

// ─── CLI argument parsing ─────────────────────────────────────────────────────

static std::string get_arg(int argc, char** argv,
                            const std::string& key, const std::string& def = "") {
    for (int i = 1; i < argc - 1; ++i)
        if (std::string(argv[i]) == key) return argv[i + 1];
    return def;
}

static bool has_flag(int argc, char** argv, const std::string& key) {
    for (int i = 1; i < argc; ++i)
        if (std::string(argv[i]) == key) return true;
    return false;
}

// ─── main ─────────────────────────────────────────────────────────────────────

int main(int argc, char** argv) {
    MADConfig cfg;

    // Function selection
    cfg.function_name = get_arg(argc, argv, "--fn", "himmelblau");

    // Hyperparameters (overridable via CLI)
    if (auto v = get_arg(argc, argv, "--gamma");    !v.empty()) cfg.gamma     = std::stod(v);
    if (auto v = get_arg(argc, argv, "--epsilon");  !v.empty()) cfg.epsilon   = std::stod(v);
    if (auto v = get_arg(argc, argv, "--delta");    !v.empty()) cfg.delta     = std::stod(v);
    if (auto v = get_arg(argc, argv, "--alpha");    !v.empty()) cfg.alpha     = std::stod(v);
    if (auto v = get_arg(argc, argv, "--tau");      !v.empty()) cfg.tau       = std::stod(v);
    if (auto v = get_arg(argc, argv, "--tau_excl"); !v.empty()) cfg.tau_excl  = std::stod(v);
    if (auto v = get_arg(argc, argv, "--lambda");   !v.empty()) cfg.lambda    = std::stod(v);
    if (auto v = get_arg(argc, argv, "--max_steps");    !v.empty()) cfg.max_steps       = std::stoi(v);
    if (auto v = get_arg(argc, argv, "--min_ascent");   !v.empty()) cfg.min_ascent_dist = std::stod(v);
    if (has_flag(argc, argv, "--lazy")) cfg.lazy = true;

    // Starting position
    {
        auto sx = get_arg(argc, argv, "--x0");
        auto sy = get_arg(argc, argv, "--y0");
        if (!sx.empty() && !sy.empty())
            cfg.theta_init = {std::stod(sx), std::stod(sy)};
        else
            cfg.theta_init = functions::start(cfg.function_name);
    }

    // Output path
    std::string out_dir = get_arg(argc, argv, "--out", "output");
    std::filesystem::create_directories(out_dir);
    std::string out_file = out_dir + "/" + cfg.function_name + "_result.json";

    // ── Print config ──────────────────────────────────────────────────────────
    std::cout << "══════════════════════════════════════════\n";
    std::cout << " MAD Optimizer  —  Phase A (2D)\n";
    std::cout << "══════════════════════════════════════════\n";
    std::cout << " Function : " << cfg.function_name << "\n";
    std::cout << " Start    : (" << cfg.theta_init.x << ", " << cfg.theta_init.y << ")\n";
    std::cout << " gamma=" << cfg.gamma << "  epsilon=" << cfg.epsilon
              << "  delta=" << cfg.delta << "  alpha=" << cfg.alpha << "\n";
    std::cout << " tau=" << cfg.tau << "  tau_excl=" << cfg.tau_excl
              << "deg  lazy=" << (cfg.lazy ? "yes" : "no") << "\n";
    std::cout << "──────────────────────────────────────────\n";

    // ── Run ───────────────────────────────────────────────────────────────────
    auto f = functions::get(cfg.function_name);
    MAD optimizer(cfg);
    MADResult result = optimizer.run(f, cfg.theta_init);

    // ── Summary ───────────────────────────────────────────────────────────────
    std::cout << "──────────────────────────────────────────\n";
    std::cout << " Total steps   : " << result.total_steps << "\n";
    std::cout << " Minima found  : " << result.all_minima.size() << "\n";
    std::cout << " Exhausted     : " << (result.exhausted ? "YES" : "NO") << "\n";
    if (result.best) {
        std::cout << " Best minimum  : ("
                  << result.best->position.x << ", "
                  << result.best->position.y << ")"
                  << "  f=" << result.best->loss << "\n";
    }
    std::cout << "══════════════════════════════════════════\n";

    write_json(result, cfg, out_file);
    return 0;
}
