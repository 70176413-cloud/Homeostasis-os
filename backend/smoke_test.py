import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def call(method: str, path: str, body: dict = None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Failed {method} {path}: {resp.status}"
        return json.loads(resp.read().decode("utf-8"))


print("1. Health:", call("GET", "/health"))
print("2. Crew count:", len(call("GET", "/api/crew")))
dash = call("GET", "/api/dashboard/vance_day112")
print("3. Dashboard traps:", [t["trap_id"] for t in dash["conflict_snapshot"]["active_traps"]])

pivot = call("POST", "/api/conflicts/evaluate/vance_day112", {
    "resistance_load_pct": 60,
    "lbnp_minutes": 20,
    "post_workout_hydration_ml": 500,
    "potassium_citrate_supplement": True,
    "cabin_co2_scrub_boost": True,
})
print("4. Conflict Slider Net Gain:", pivot["net_equilibrium_gain"], "| Remaining traps:", len(pivot["active_traps"]))

dose = call("POST", "/api/rx-drift/okafor_day45/simulate-dose/med_zolpidem")
print("5. Rx-Drift Dose Verdict:", dose["eva_safe"], "|", dose["plain_english_verdict"][:75] + "...")

mc = call("POST", "/api/microcheck", {
    "crew_id": "vance_day112",
    "amsler_distorted_cells": [14, 15],
    "reaction_times_ms": [290, 310, 305, 320, 295],
    "voice_duration_sec": 5.0,
    "voice_pause_ratio": 0.34,
    "voice_speech_rate_wpm": 108.0,
    "voice_pitch_variance_hz": 15.0,
})
print("6. Micro-Check status:", mc["overall_neuro_cognitive_status"], "| Space Fog:", mc["space_fog_index"])
print("7. Micro-Check logs:", len(call("GET", "/api/microcheck/history/vance_day112")))

patched = call("PATCH", "/api/crew/vance_day112/vitals", {"hydration_delta_ml": 100.0})
print("8. Patched hydration:", patched["vitals"]["hydration_delta_ml"])

whatif = call("POST", "/api/what-if", {
    "crew_id": "vance_day112",
    "exercise_hours_per_day": 1.2,
    "sleep_delta_minutes": 60,
    "extra_hydration_ml": 400,
    "lbnp_daily_minutes": 20,
    "solar_storm_event": True,
    "cabin_co2_spike": False,
})
print("9. What-If Day 30 readiness:", whatif["projected_day30_rings"]["overall_mission_readiness"])
print("10. Explain SANS:", call("GET", "/api/explain/SANS")["jargon_term"])
print("11. Demo Reset:", call("POST", "/api/demo/reset"))
print("\nALL BACKEND ENDPOINTS PASSED!")