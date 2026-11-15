from typing import Dict, List
from ..models import (
    ConflictEvaluationResponse,
    ConflictTrapAlert,
    CrewVitals,
    RippleEdge,
    RippleNode,
    RiskLevel,
    TradeOffProtocol,
)


def _clamp(val: float, low: float = 0.0, high: float = 100.0) -> float:
    return round(max(low, min(high, val)), 1)


def _risk_from_badness(score: float, yellow: float = 55.0, red: float = 72.0) -> RiskLevel:
    if score >= red:
        return RiskLevel.RED
    if score >= yellow:
        return RiskLevel.YELLOW
    return RiskLevel.GREEN


def evaluate_conflicts(vitals: CrewVitals, protocol: TradeOffProtocol) -> ConflictEvaluationResponse:
    """
    Coupled-System Conflict Engine & Trade-Off Slider Evaluator.
    Models physiological trade-offs across Bone, SANS (ICP/fluid shift),
    Renal Stone Risk, Hydration, and Cabin CO2 -> Cognitive Readiness.
    """
    # 1. Baseline radar (higher = healthier equilibrium, 0..100)
    baseline_radar: Dict[str, float] = {
        "Bone Stability": _clamp(100.0 - vitals.bone_resorption_index),
        "Ocular / SANS Safety": _clamp(100.0 - vitals.sans_ocular_score),
        "Renal Safety": _clamp(100.0 - vitals.renal_stone_index),
        "Hydration Balance": _clamp(75.0 + (vitals.hydration_delta_ml / 12.0)),
        "Cognitive / CO2": _clamp(vitals.cognitive_readiness - max(0.0, (vitals.cabin_co2_mmhg - 2.5) * 4.0)),
    }

    # 2. Simulate Trade-Off Protocol impacts
    # High resistance helps bone, BUT spikes ICP/SANS & sweats out fluids (worsening renal stones)
    load_factor = protocol.resistance_load_pct / 100.0  # 0.0 .. 1.0
    bone_improvement = (load_factor * 18.0) - 4.0

    # Valsalva/headward fluid surge increases with high resistance (>65%), mitigated by LBNP
    valsalva_sans_penalty = max(0.0, (protocol.resistance_load_pct - 55.0) * 0.42)
    lbnp_sans_relief = protocol.lbnp_minutes * 0.65
    co2_sans_relief = 4.5 if (protocol.cabin_co2_scrub_boost and vitals.cabin_co2_mmhg > 3.0) else 0.0

    projected_bone_bad = _clamp(vitals.bone_resorption_index - bone_improvement)
    projected_sans_bad = _clamp(vitals.sans_ocular_score + valsalva_sans_penalty - lbnp_sans_relief - co2_sans_relief)

    # Hydration & Renal dynamics
    sweat_loss_ml = load_factor * 380.0
    net_hydration_ml = vitals.hydration_delta_ml - sweat_loss_ml + protocol.post_workout_hydration_ml
    hydration_penalty_to_renal = max(0.0, (-net_hydration_ml) / 45.0)
    bone_calcium_dump_to_renal = max(0.0, (projected_bone_bad - 50.0) * 0.18)
    citrate_relief = 16.0 if protocol.potassium_citrate_supplement else 0.0
    hydration_relief = (protocol.post_workout_hydration_ml / 500.0) * 9.0

    projected_renal_bad = _clamp(
        vitals.renal_stone_index
        + (hydration_penalty_to_renal * 0.45)
        + bone_calcium_dump_to_renal
        - citrate_relief
        - hydration_relief
    )

    # Cabin CO2 & Cognitive impact
    effective_co2 = vitals.cabin_co2_mmhg - (1.1 if protocol.cabin_co2_scrub_boost else 0.0)
    co2_cog_penalty = max(0.0, (effective_co2 - 2.5) * 6.5)
    projected_cognitive = _clamp(vitals.cognitive_readiness + (4.0 if protocol.cabin_co2_scrub_boost else 0.0) - (co2_cog_penalty * 0.35))

    projected_radar: Dict[str, float] = {
        "Bone Stability": _clamp(100.0 - projected_bone_bad),
        "Ocular / SANS Safety": _clamp(100.0 - projected_sans_bad),
        "Renal Safety": _clamp(100.0 - projected_renal_bad),
        "Hydration Balance": _clamp(75.0 + (net_hydration_ml / 12.0)),
        "Cognitive / CO2": _clamp(projected_cognitive),
    }

    # 3. Detect Cross-System Traps
    active_traps: List[ConflictTrapAlert] = []

    # Trap A: Bone vs SANS + Renal (The signature HOMEOSTASIS-OS trap)
    if vitals.bone_resorption_index >= 65 and (projected_sans_bad >= 68 or (vitals.sans_ocular_score >= 60 and protocol.resistance_load_pct > 75)):
        sans_delta_pct = round(max(0.0, projected_sans_bad - vitals.sans_ocular_score) + (valsalva_sans_penalty * 0.5), 1)
        active_traps.append(
            ConflictTrapAlert(
                trap_id="TRAP_BONE_SANS_RENAL",
                title="Cross-System Trap: Bone Load vs. SANS & Renal Risk",
                severity=RiskLevel.RED if projected_sans_bad >= 72 or projected_renal_bad >= 68 else RiskLevel.YELLOW,
                summary_plain_english=(
                    f"Bone loss is elevated ({vitals.bone_resorption_index:.0f}/100), BUT your ocular/SANS pressure is rising "
                    f"and hydration is {vitals.hydration_delta_ml:.0f} mL. Heavy squats at {protocol.resistance_load_pct:.0f}% "
                    f"push SANS risk +{sans_delta_pct:.0f}% and keep Renal Stone Index at {projected_renal_bad:.0f}/100."
                ),
                clinical_trigger="High bone resorption + Valsalva ICP surge + negative fluid balance",
                recommended_pivot=(
                    "Drop ARED resistance to 55–65%, add 20 min Lower Body Negative Pressure (LBNP), "
                    "and take +500 mL water with Potassium Citrate post-workout."
                ),
            )
        )

    # Trap B: Dehydration + Bone Calcium Dump -> Renal Stone Cascade
    if net_hydration_ml <= -250 and projected_renal_bad >= 58 and not protocol.potassium_citrate_supplement:
        active_traps.append(
            ConflictTrapAlert(
                trap_id="TRAP_RENAL_CASCADE",
                title="Renal Stone Cascade Warning",
                severity=RiskLevel.RED if projected_renal_bad >= 72 else RiskLevel.YELLOW,
                summary_plain_english=(
                    f"Net hydration after workout drops to {net_hydration_ml:.0f} mL while bone calcium turnover is high. "
                    f"This concentrates urine and pushes Renal Stone Risk to {projected_renal_bad:.0f}/100."
                ),
                clinical_trigger="Hypercalciuria + Hypohydration without citrate buffer",
                recommended_pivot="Increase post-workout hydration to >=500 mL and enable Potassium Citrate prophylaxis.",
            )
        )

    # Trap C: Cabin CO2 + SANS + Space Fog
    if effective_co2 >= 3.3:
        active_traps.append(
            ConflictTrapAlert(
                trap_id="TRAP_CO2_HYPERCAPNIA",
                title="Cabin CO2 Vasodilation & Space Fog Trap",
                severity=RiskLevel.YELLOW if effective_co2 < 4.0 else RiskLevel.RED,
                summary_plain_english=(
                    f"Cabin CO2 at {effective_co2:.1f} mmHg dilates cerebral blood vessels—worsening headward eye pressure (SANS) "
                    f"and slowing reaction time."
                ),
                clinical_trigger="CO2 > 3.3 mmHg amplifying intracranial fluid pressure",
                recommended_pivot="Activate local CO2 scrubber boost before cognitive tasks or resistance training.",
            )
        )

    # 4. Build Cause-and-Effect Ripple Graph
    ripple_nodes = [
        RippleNode(
            id="bone",
            label="Bone Resorption",
            score=projected_bone_bad,
            delta=round(projected_bone_bad - vitals.bone_resorption_index, 1),
            risk=_risk_from_badness(projected_bone_bad, 55, 72),
        ),
        RippleNode(
            id="sans",
            label="SANS / Ocular ICP",
            score=projected_sans_bad,
            delta=round(projected_sans_bad - vitals.sans_ocular_score, 1),
            risk=_risk_from_badness(projected_sans_bad, 55, 70),
        ),
        RippleNode(
            id="renal",
            label="Renal Stone Index",
            score=projected_renal_bad,
            delta=round(projected_renal_bad - vitals.renal_stone_index, 1),
            risk=_risk_from_badness(projected_renal_bad, 55, 72),
        ),
        RippleNode(
            id="hydration",
            label="Hydration Deficit",
            score=_clamp(max(0.0, -net_hydration_ml / 10.0)),
            delta=round((-net_hydration_ml + vitals.hydration_delta_ml) / 10.0, 1),
            risk=RiskLevel.RED if net_hydration_ml < -450 else (RiskLevel.YELLOW if net_hydration_ml < -200 else RiskLevel.GREEN),
        ),
        RippleNode(
            id="cognitive",
            label="Space Fog Risk",
            score=_clamp(100.0 - projected_cognitive),
            delta=round((100.0 - projected_cognitive) - (100.0 - vitals.cognitive_readiness), 1),
            risk=_risk_from_badness(100.0 - projected_cognitive, 25, 38),
        ),
    ]

    ripple_edges = [
        RippleEdge(
            source="bone",
            target="sans",
            effect="Heavy ARED load spikes headward pressure",
            polarity="positive" if valsalva_sans_penalty > lbnp_sans_relief else "negative",
            magnitude=round(abs(valsalva_sans_penalty - lbnp_sans_relief), 1),
        ),
        RippleEdge(
            source="bone",
            target="renal",
            effect="Calcium release increases stone load",
            polarity="positive",
            magnitude=round(bone_calcium_dump_to_renal, 1),
        ),
        RippleEdge(
            source="hydration",
            target="renal",
            effect="Low fluid concentrates urinary calcium" if net_hydration_ml < 0 else "Hydration dilutes stone risk",
            polarity="positive" if net_hydration_ml < 0 else "negative",
            magnitude=round(abs(hydration_penalty_to_renal - hydration_relief), 1),
        ),
        RippleEdge(
            source="sans",
            target="cognitive",
            effect="Elevated ICP + CO2 drives neuro-fatigue",
            polarity="positive" if effective_co2 > 3.0 else "negative",
            magnitude=round(co2_cog_penalty, 1),
        ),
    ]

    baseline_avg = sum(baseline_radar.values()) / len(baseline_radar)
    projected_avg = sum(projected_radar.values()) / len(projected_radar)

    return ConflictEvaluationResponse(
        crew_id=vitals.crew_id,
        protocol=protocol,
        baseline_radar=baseline_radar,
        projected_radar=projected_radar,
        active_traps=active_traps,
        ripple_nodes=ripple_nodes,
        ripple_edges=ripple_edges,
        net_equilibrium_gain=round(projected_avg - baseline_avg, 1),
    )