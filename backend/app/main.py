from datetime import datetime, timezone
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data_seed import get_seed_7day_history
from .engines.conflict_engine import evaluate_conflicts
from .engines.equilibrium_engine import (
    compute_equilibrium_rings,
    get_plain_english_explanation,
    simulate_what_if,
)
from .engines.microcheck_engine import evaluate_microcheck
from .engines.rx_drift_engine import evaluate_rx_drift, simulate_dose_intake
from .models import (
    ConflictEvaluationResponse,
    CrewVitals,
    DashboardBundle,
    DoseSimulationResponse,
    MicroCheckInput,
    MicroCheckLogEntry,
    MicroCheckResult,
    RiskExplanation,
    RxDriftResponse,
    TradeOffProtocol,
    VitalsPatch,
    WhatIfInput,
    WhatIfResponse,
)
from .store import store

app = FastAPI(
    title="HOMEOSTASIS-OS API",
    description="Cross-System Countermeasure Conflict & Space-Pharmacology Optimizer (Decision-Support Simulator)",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "online", "system": "HOMEOSTASIS-OS", "version": "1.1.0"}


@app.get("/api/crew", response_model=List[CrewVitals])
def list_crew():
    """List all seeded crew scenarios (for 1-click demo preset switching)."""
    return store.list_crew()


@app.patch("/api/crew/{crew_id}/vitals", response_model=DashboardBundle)
def patch_vitals(crew_id: str, patch: VitalsPatch):
    """Log or sync updated vitals (hydration, CO2, radiation, bone, SANS) and return refreshed dashboard."""
    updated = store.patch_crew_vitals(crew_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    return get_dashboard(crew_id)


@app.post("/api/demo/reset")
def reset_demo():
    """Reset all crew vitals, med-kit counts, and microcheck logs back to clean demo presets."""
    store.reset_demo_state()
    return {"status": "reset_complete", "crew_count": len(store.list_crew())}


@app.get("/api/dashboard/{crew_id}", response_model=DashboardBundle)
def get_dashboard(crew_id: str):
    """Single-call hydration endpoint for the entire HOMEOSTASIS-OS state."""
    vitals = store.get_crew(crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")

    default_protocol = TradeOffProtocol(
        resistance_load_pct=85.0,
        lbnp_minutes=0.0,
        post_workout_hydration_ml=200.0,
        potassium_citrate_supplement=False,
        cabin_co2_scrub_boost=False,
    )

    return DashboardBundle(
        vitals=vitals,
        rings=compute_equilibrium_rings(vitals),
        conflict_snapshot=evaluate_conflicts(vitals, default_protocol),
        rx_snapshot=evaluate_rx_drift(vitals, store.get_med_kit()),
        history_last_7_days=get_seed_7day_history(vitals),
    )


@app.post("/api/conflicts/evaluate/{crew_id}", response_model=ConflictEvaluationResponse)
def run_conflict_slider(crew_id: str, protocol: TradeOffProtocol):
    """Feature 1: Live Trade-Off Slider & Ripple Graph recalculation."""
    vitals = store.get_crew(crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    return evaluate_conflicts(vitals, protocol)


@app.get("/api/rx-drift/{crew_id}", response_model=RxDriftResponse)
def get_rx_drift(crew_id: str):
    """Feature 2: Space-Adjusted Medication Shelf-Life & EVA Conflict Advisor."""
    vitals = store.get_crew(crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    return evaluate_rx_drift(vitals, store.get_med_kit())


@app.post("/api/rx-drift/{crew_id}/simulate-dose/{med_id}", response_model=DoseSimulationResponse)
def simulate_rx_dose(crew_id: str, med_id: str, log_consumption: bool = True):
    """Feature 2B: Simulate taking 1 dose of a med, compute hepatic clearance & EVA fog risk."""
    vitals = store.get_crew(crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    med = store.get_med(med_id)
    if not med:
        raise HTTPException(status_code=404, detail=f"Medication '{med_id}' not found")
    return simulate_dose_intake(vitals, med, log_consumption=log_consumption)


@app.post("/api/microcheck", response_model=MicroCheckResult)
def submit_microcheck(payload: MicroCheckInput):
    """Feature 3: Process 15-second Amsler + Reaction + Voice Micro-Check & log history."""
    vitals = store.get_crew(payload.crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{payload.crew_id}' not found")
    result = evaluate_microcheck(vitals, payload)
    store.update_crew(result.updated_vitals)
    store.log_microcheck(
        MicroCheckLogEntry(
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            crew_id=result.crew_id,
            amsler_sans_delta=result.amsler_sans_delta,
            reaction_mean_ms=result.reaction_mean_ms,
            space_fog_index=result.space_fog_index,
            voice_fatigue_score=result.voice_fatigue_score,
            overall_neuro_cognitive_status=result.overall_neuro_cognitive_status,
        )
    )
    return result


@app.get("/api/microcheck/history/{crew_id}", response_model=List[MicroCheckLogEntry])
def get_microcheck_history(crew_id: str):
    """Retrieve timestamped history of 15-second Micro-Checks for a crew member."""
    if not store.get_crew(crew_id):
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    return store.get_microcheck_history(crew_id)


@app.post("/api/what-if", response_model=WhatIfResponse)
def run_what_if_sandbox(payload: WhatIfInput):
    """Feature 4: 30-Day Mission Equilibrium What-If Simulator."""
    vitals = store.get_crew(payload.crew_id)
    if not vitals:
        raise HTTPException(status_code=404, detail=f"Crew member '{crew_id}' not found")
    return simulate_what_if(vitals, payload)


@app.get("/api/explain/{topic}", response_model=RiskExplanation)
def explain_risk(topic: str):
    """1-click 'Explain This Risk' plain-English translator (SANS, RENAL_STONE, RX_DRIFT, SPACE_FOG)."""
    return get_plain_english_explanation(topic)