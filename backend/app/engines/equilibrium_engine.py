from typing import List
from ..data_seed import PLAIN_ENGLISH_GLOSSARY
from ..models import (
    CrewVitals,
    EquilibriumRings,
    RiskExplanation,
    TrajectoryPoint,
    WhatIfInput,
    WhatIfResponse,
)


def _clamp(val: float, low: float = 5.0, high: float = 99.0) -> float:
    return round(max(low, min(high, val)), 1)


def compute_equilibrium_rings(vitals: CrewVitals) -> EquilibriumRings:
    """
    Converts current physiological state into the 4-Ring Mission Equilibrium Core
    (Bone/Muscle, Neuro-Ocular, Renal/Metabolic, Cognitive/Circadian).
    Higher = healthier / closer to 100% readiness.
    """
    bone_muscle = _clamp(100.0 - vitals.bone_resorption_index)
    neuro_ocular = _clamp(100.0 - vitals.sans_ocular_score)
    hydration_factor = max(-15.0, min(10.0, vitals.hydration_delta_ml / 40.0))
    renal_metabolic = _clamp((100.0 - vitals.renal_stone_index) + (hydration_factor * 0.4))
    co2_penalty = max(0.0, (vitals.cabin_co2_mmhg - 2.5) * 4.5)
    cognitive_circadian = _clamp(
        ((vitals.sleep_circadian_score + vitals.cognitive_readiness) / 2.0) - co2_penalty
    )

    overall = round((bone_muscle + neuro_ocular + renal_metabolic + cognitive_circadian) / 4.0, 1)
    milestone_ready = overall >= 68.0 and min(bone_muscle, neuro_ocular, renal_metabolic, cognitive_circadian) >= 50.0

    return EquilibriumRings(
        bone_muscle=bone_muscle,
        neuro_ocular=neuro_ocular,
        renal_metabolic=renal_metabolic,
        cognitive_circadian=cognitive_circadian,
        overall_mission_readiness=overall,
        milestone_ready=milestone_ready,
        milestone_label=vitals.next_milestone,
    )


def simulate_what_if(vitals: CrewVitals, scenario: WhatIfInput) -> WhatIfResponse:
    """
    30-Day Interactive What-If Sandbox.
    Models coupled day-by-day trajectory changes when crew alters exercise, sleep,
    hydration, LBNP, or faces a Solar Storm / CO2 Spike.
    """
    current_rings = compute_equilibrium_rings(vitals)

    bone = current_rings.bone_muscle
    neuro = current_rings.neuro_ocular
    renal = current_rings.renal_metabolic
    cog = current_rings.cognitive_circadian

    trajectory: List[TrajectoryPoint] = [
        TrajectoryPoint(
            day_offset=0,
            bone_muscle=bone,
            neuro_ocular=neuro,
            renal_metabolic=renal,
            cognitive_circadian=cog,
            overall_readiness=current_rings.overall_mission_readiness,
        )
    ]

    # Daily rate deltas driven by user sliders
    # Exercise protects bone (+), but without LBNP/hydration slightly stresses neuro-ocular & renal
    exercise_delta = scenario.exercise_hours_per_day - 1.5
    sleep_hrs_delta = scenario.sleep_delta_minutes / 60.0

    daily_bone_shift = (exercise_delta * 0.55) + (0.12 if scenario.exercise_hours_per_day >= 1.2 else -0.45)
    daily_neuro_shift = (
        (scenario.lbnp_daily_minutes * 0.025)
        - (max(0.0, exercise_delta) * 0.25)
        - (0.45 if scenario.cabin_co2_spike else 0.0)
        - (0.25 if scenario.solar_storm_event else 0.0)
    )
    daily_renal_shift = (
        (scenario.extra_hydration_ml / 500.0) * 0.45
        - (max(0.0, -scenario.extra_hydration_ml) / 400.0) * 0.5
        - (0.18 if scenario.exercise_hours_per_day > 1.8 and scenario.extra_hydration_ml <= 0 else 0.0)
    )
    daily_cog_shift = (
        (sleep_hrs_delta * 0.65)
        - (0.60 if scenario.cabin_co2_spike else 0.0)
        - (0.40 if scenario.solar_storm_event else 0.0)
    )

    for day in range(1, 31):
        # Solar storm acute stressor peaks between days 3..9
        storm_hit = -0.35 if (scenario.solar_storm_event and 3 <= day <= 9) else 0.0

        bone = _clamp(bone + daily_bone_shift)
        neuro = _clamp(neuro + daily_neuro_shift + (storm_hit * 0.5))
        renal = _clamp(renal + daily_renal_shift)
        cog = _clamp(cog + daily_cog_shift + storm_hit)

        overall = round((bone + neuro + renal + cog) / 4.0, 1)
        trajectory.append(
            TrajectoryPoint(
                day_offset=day,
                bone_muscle=bone,
                neuro_ocular=neuro,
                renal_metabolic=renal,
                cognitive_circadian=cog,
                overall_readiness=overall,
            )
        )

    day30 = trajectory[-1]
    projected_rings = EquilibriumRings(
        bone_muscle=day30.bone_muscle,
        neuro_ocular=day30.neuro_ocular,
        renal_metabolic=day30.renal_metabolic,
        cognitive_circadian=day30.cognitive_circadian,
        overall_mission_readiness=day30.overall_readiness,
        milestone_ready=day30.overall_readiness >= 68.0
        and min(day30.bone_muscle, day30.neuro_ocular, day30.renal_metabolic, day30.cognitive_circadian) >= 50.0,
        milestone_label=vitals.next_milestone,
    )

    delta_overall = round(projected_rings.overall_mission_readiness - current_rings.overall_mission_readiness, 1)
    direction = "improves" if delta_overall >= 0 else "drops"
    events = []
    if scenario.solar_storm_event:
        events.append("Solar Particle Event (increased radiation & circadian stress)")
    if scenario.cabin_co2_spike:
        events.append("Cabin CO2 Spike (headward pressure & cognitive slowing)")
    event_note = f" Factoring in {', '.join(events)}." if events else ""

    briefing = (
        f"Over 30 days, this routine {direction} overall Mission Readiness by {delta_overall:+.1f} pts "
        f"(from {current_rings.overall_mission_readiness:.0f}% to {projected_rings.overall_mission_readiness:.0f}%). "
        f"Exercise at {scenario.exercise_hours_per_day:.1f}h/day + {scenario.lbnp_daily_minutes:.0f}m LBNP "
        f"places Bone at {projected_rings.bone_muscle:.0f}% and Neuro-Ocular at {projected_rings.neuro_ocular:.0f}%."
        f"{event_note}"
    )

    return WhatIfResponse(
        crew_id=vitals.crew_id,
        current_rings=current_rings,
        projected_day30_rings=projected_rings,
        trajectory_30_days=trajectory,
        plain_english_briefing=briefing,
    )


def get_plain_english_explanation(topic: str) -> RiskExplanation:
    key = topic.upper().strip()
    entry = PLAIN_ENGLISH_GLOSSARY.get(
        key,
        {
            "jargon_term": topic,
            "plain_english": "Spaceflight stressors interact across organs—fixing one system aggressively can overload another.",
            "why_it_matters_in_space": "Without ground hospitals, balancing bone, vision, kidneys, and cognition prevents mission-aborting emergencies.",
            "actionable_countermeasure": "Use the Trade-Off Slider to test moderate countermeasures paired with hydration and LBNP.",
        },
    )
    return RiskExplanation(topic=key, **entry)