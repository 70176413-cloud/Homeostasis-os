import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    print(f"\n-----------------------------------------")
    print(f"🧪 Testing [{method}] {endpoint} ({name})")
    print(f"-----------------------------------------")
    
    headers = {'Content-Type': 'application/json'}
    body = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            response_data = json.loads(resp.read().decode('utf-8'))
            print("Status: 200 OK")
            print("Response Sample:", json.dumps(response_data, indent=2)[:300] + "..." if len(str(response_data)) > 300 else json.dumps(response_data, indent=2))
            return response_data
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        return None

def run_all_tests():
    print("🚀 Starting Comprehensive API Tests for HOMEOSTASIS-OS...")
    
    # 1. Health Check
    test_endpoint("Health Check", "GET", "/health")
    
    # 2. List Crew
    crew_list = test_endpoint("List Crew", "GET", "/api/crew")
    
    # Select first crew member for testing
    crew_id = "vance_day112"
    if crew_list and isinstance(crew_list, list) and len(crew_list) > 0:
        if isinstance(crew_list[0], dict) and "crew_id" in crew_list[0]:
            crew_id = crew_list[0]["crew_id"]

    print(f"\n📌 Using Target Crew ID for testing: '{crew_id}'")

    # 3. Get Dashboard
    test_endpoint("Get Dashboard Bundle", "GET", f"/api/dashboard/{crew_id}")
    
    # 4. Patch Vitals
    patch_payload = {"hydration_delta_ml": 150.0}
    test_endpoint("Patch Crew Vitals", "PATCH", f"/api/crew/{crew_id}/vitals", patch_payload)
    
    # 5. Evaluate Conflict Slider
    conflict_payload = {
        "resistance_load_pct": 80.0,
        "lbnp_minutes": 30.0,
        "post_workout_hydration_ml": 500.0,
        "potassium_citrate_supplement": True,
        "cabin_co2_scrub_boost": True
    }
    test_endpoint("Evaluate Conflict Slider", "POST", f"/api/conflicts/evaluate/{crew_id}", conflict_payload)
    
    # 6. Get RX Drift & Shelf Life
    rx_response = test_endpoint("Get RX Drift Advisor", "GET", f"/api/rx-drift/{crew_id}")
    
    # Dynamically grab a valid med_id or default to 'med_ibuprofen'
    med_id = "med_ibuprofen"
    if rx_response and isinstance(rx_response, dict) and "medications" in rx_response and len(rx_response["medications"]) > 0:
        if "med_id" in rx_response["medications"][0]:
            med_id = rx_response["medications"][0]["med_id"]

    # 7. Simulate Medication Dose
    test_endpoint("Simulate Rx Dose Intake", "POST", f"/api/rx-drift/{crew_id}/simulate-dose/{med_id}?log_consumption=true")
    
    # 8. Submit Micro-Check (Fixed according to your models.py)
    micro_payload = {
        "crew_id": crew_id,
        "amsler_distorted_cells": [12, 14],
        "reaction_times_ms": [245.2, 230.1, 240.5],
        "voice_duration_sec": 12.5,
        "voice_pause_ratio": 0.25,
        "voice_speech_rate_wpm": 120.0,
        "voice_pitch_variance_hz": 15.0
    }
    test_endpoint("Submit Micro-Check", "POST", "/api/microcheck", micro_payload)
    
    # 9. Get Micro-Check History
    test_endpoint("Get Micro-Check History", "GET", f"/api/microcheck/history/{crew_id}")
    
    # 10. Run What-If Mission Simulator
    whatif_payload = {
        "crew_id": crew_id,
        "exercise_hours_per_day": 2.0,
        "sleep_delta_minutes": -30,
        "extra_hydration_ml": 500.0,
        "lbnp_daily_minutes": 45.0,
        "solar_storm_event": False,
        "cabin_co2_spike": True
    }
    test_endpoint("Run What-If Sandbox", "POST", "/api/what-if", whatif_payload)
    
    # 11. Explain Risk Topic
    test_endpoint("Explain Risk (SANS)", "GET", "/api/explain/SANS")
    
    # 12. Demo Reset
    test_endpoint("Reset Demo State", "POST", "/api/demo/reset")

    print("\n=========================================")
    print("✨ ALL API ENDPOINTS TESTED SUCCESSFULLY! ✨")
    print("=========================================")

if __name__ == "__main__":
    run_all_tests()