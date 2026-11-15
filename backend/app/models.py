from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class PackagingType(str, Enum):
    ORIGINAL_BLISTER = "original_blister"
    REPACKAGED_POUCH = "repackaged_pouch"


class CrewVitals(BaseModel):
    crew_id: str
    name: str
    role: str
    mission_day: int
    next_milestone: str
    hours_to_milestone: float
    # Core physiological inputs
    bone_resorption_index: float = Field(..., ge=0, le=100, description="0=optimal, 100=severe bone loss")
    hydration_delta_ml: float = Field(..., ge=-2000, le=1500, description="Fluid balance vs baseline in mL")
    sans_ocular_score: float = Field(..., ge=0, le=100, description="SANS optic disc / ICP risk index")
    renal_stone_index: float = Field(..., ge=0, le=100, description="Urinary calcium/citrate stone risk")
    sleep_circadian_score: float = Field(..., ge=0, le=100, description="100=optimal circadian alignment")
    cognitive_readiness: float = Field(..., ge=0, le=100, description="100=sharp, <70=space fog")
    cabin_co2_mmhg: float = Field(..., ge=0.3, le=10.0, description="Nominal <2.0, elevated >3.5 mmHg")
    cumulative_radiation_msv: float = Field(..., ge=0, le=1000)


class VitalsPatch(BaseModel):
    """Partial update payload when logging or syncing sensor/manual vitals."""
    bone_resorption_index: Optional[float] = Field(None, ge=0, le=100)
    hydration_delta_ml: Optional[float] = Field(None, ge=-2000, le=1500)
    sans_ocular_score: Optional[float] = Field(None, ge=0, le=100)
    renal_stone_index: Optional[float] = Field(None, ge=0, le=100)
    sleep_circadian_score: Optional[float] = Field(None, ge=0, le=100)
    cognitive_readiness: Optional[float] = Field(None, ge=0, le=100)
    cabin_co2_mmhg: Optional[float] = Field(None, ge=0.3, le=10.0)
    cumulative_radiation_msv: Optional[float] = Field(None, ge=0, le=1000)
    hours_to_milestone: Optional[float] = Field(None, ge=0, le=500)


class TradeOffProtocol(BaseModel):
    resistance_load_pct: float = Field(75.0, ge=0, le=100, description="ARED resistance intensity %")
    lbnp_minutes: float = Field(0.0, ge=0, le=45, description="Lower Body Negative Pressure duration")
    post_workout_hydration_ml: float = Field(250.0, ge=0, le=1000)
    potassium_citrate_supplement: bool = False
    cabin_co2_scrub_boost: bool = False


class RippleNode(BaseModel):
    id: str
    label: str
    score: float
    delta: float
    risk: RiskLevel


class RippleEdge(BaseModel):
    source: str
    target: str
    effect: str
    polarity: str  # "positive" (worsens risk) or "negative" (mitigates)
    magnitude: float


class ConflictTrapAlert(BaseModel):
    trap_id: str
    title: str
    severity: RiskLevel
    summary_plain_english: str
    clinical_trigger: str
    recommended_pivot: str


class ConflictEvaluationResponse(BaseModel):
    crew_id: str
    protocol: TradeOffProtocol
    baseline_radar: Dict[str, float]
    projected_radar: Dict[str, float]
    active_traps: List[ConflictTrapAlert]
    ripple_nodes: List[RippleNode]
    ripple_edges: List[RippleEdge]
    net_equilibrium_gain: float


# --- Feature 2: Rx-Drift ---
class MedKitItem(BaseModel):
    med_id: str
    name: str
    lot_number: str
    category: str
    packaging: PackagingType
    repackaged_day: Optional[int] = None
    shelf_life_days_nominal: int
    daily_radiation_sensitivity: float
    microgravity_gi_delay_min: int
    sedation_half_life_hrs: float
    eva_exclusion_window_hrs: float
    quantity_remaining: int


class RxEvaluationItem(BaseModel):
    med_id: str
    name: str
    lot_number: str
    packaging: PackagingType
    estimated_potency_pct: float
    potency_status: RiskLevel
    eva_conflict_flag: bool
    cognitive_fog_risk_increase_pct: float
    quantity_remaining: int
    plain_english_guidance: str
    non_drug_alternative: Optional[str] = None


class RxDriftResponse(BaseModel):
    disclaimer: str = (
        "Decision-Support Simulator & Crew Medical Officer Reference Tool ONLY. "
        "Not for autonomous clinical prescribing."
    )
    mission_day: int
    cumulative_radiation_msv: float
    hours_to_next_eva: float
    medications: List[RxEvaluationItem]


class DoseSimulationResponse(BaseModel):
    disclaimer: str = (
        "Decision-Support Simulator ONLY — verify with Flight Surgeon / CMO protocol."
    )
    crew_id: str
    med_id: str
    name: str
    estimated_potency_pct: float
    effective_clearance_hrs: float
    eva_safe: bool
    cognitive_fog_peak_pct: float
    quantity_remaining: int
    plain_english_verdict: str
    non_drug_alternative: Optional[str] = None


# --- Feature 3: 15-Second Micro-Check ---
class MicroCheckInput(BaseModel):
    crew_id: str
    amsler_distorted_cells: List[int] = Field(default_factory=list)
    reaction_times_ms: List[float] = Field(..., min_length=3, max_length=10)
    voice_duration_sec: float = Field(..., ge=1.0, le=15.0)
    voice_pause_ratio: float = Field(..., ge=0.0, le=1.0, description="Fraction of silence during speech")
    voice_speech_rate_wpm: float = Field(..., ge=40.0, le=260.0)
    voice_pitch_variance_hz: float = Field(..., ge=2.0, le=120.0)


class MicroCheckResult(BaseModel):
    crew_id: str
    amsler_sans_delta: float
    reaction_mean_ms: float
    space_fog_index: float
    voice_fatigue_score: float
    overall_neuro_cognitive_status: RiskLevel
    plain_english_summary: str
    updated_vitals: CrewVitals


class MicroCheckLogEntry(BaseModel):
    timestamp_utc: str
    crew_id: str
    amsler_sans_delta: float
    reaction_mean_ms: float
    space_fog_index: float
    voice_fatigue_score: float
    overall_neuro_cognitive_status: RiskLevel


# --- Feature 4: Mission Equilibrium & What-If Sandbox ---
class EquilibriumRings(BaseModel):
    bone_muscle: float
    neuro_ocular: float
    renal_metabolic: float
    cognitive_circadian: float
    overall_mission_readiness: float
    milestone_ready: bool
    milestone_label: str


class WhatIfInput(BaseModel):
    crew_id: str
    exercise_hours_per_day: float = Field(1.5, ge=0.0, le=3.0)
    sleep_delta_minutes: float = Field(0.0, ge=-180.0, le=180.0)
    extra_hydration_ml: float = Field(0.0, ge=-500.0, le=1000.0)
    lbnp_daily_minutes: float = Field(0.0, ge=0.0, le=45.0)
    solar_storm_event: bool = False
    cabin_co2_spike: bool = False


class TrajectoryPoint(BaseModel):
    day_offset: int
    bone_muscle: float
    neuro_ocular: float
    renal_metabolic: float
    cognitive_circadian: float
    overall_readiness: float


class RiskExplanation(BaseModel):
    topic: str
    jargon_term: str
    plain_english: str
    why_it_matters_in_space: str
    actionable_countermeasure: str


class WhatIfResponse(BaseModel):
    crew_id: str
    current_rings: EquilibriumRings
    projected_day30_rings: EquilibriumRings
    trajectory_30_days: List[TrajectoryPoint]
    plain_english_briefing: str


class DashboardBundle(BaseModel):
    vitals: CrewVitals
    rings: EquilibriumRings
    conflict_snapshot: ConflictEvaluationResponse
    rx_snapshot: RxDriftResponse
    history_last_7_days: List[TrajectoryPoint]