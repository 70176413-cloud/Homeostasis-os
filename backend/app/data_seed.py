from typing import Dict, List
from .models import CrewVitals, MedKitItem, PackagingType, TrajectoryPoint

# 3 Demo Presets for 1-click live demo switching
SEED_CREW_PROFILES: Dict[str, CrewVitals] = {
    "vance_day112": CrewVitals(
        crew_id="vance_day112",
        name="Cmdr. Elena Vance",
        role="Mission Commander",
        mission_day=112,
        next_milestone="EVA Ready in 48h",
        hours_to_milestone=48.0,
        bone_resorption_index=74.0,     # High bone loss pressure
        hydration_delta_ml=-420.0,      # Dehydrated (-420 mL)
        sans_ocular_score=66.0,         # Elevated SANS fluid shift risk
        renal_stone_index=61.0,         # Borderline Yellow
        sleep_circadian_score=78.0,
        cognitive_readiness=81.0,
        cabin_co2_mmhg=3.6,             # Slightly elevated cabin CO2
        cumulative_radiation_msv=92.0,
    ),
    "okafor_day45": CrewVitals(
        crew_id="okafor_day45",
        name="Dr. Marcus Okafor",
        role="Flight Engineer / CMO",
        mission_day=45,
        next_milestone="EVA Airlock Ops in 9h",
        hours_to_milestone=9.0,         # Triggers EVA medication conflict!
        bone_resorption_index=48.0,
        hydration_delta_ml=-150.0,
        sans_ocular_score=38.0,
        renal_stone_index=34.0,
        sleep_circadian_score=54.0,     # Circadian misalignment
        cognitive_readiness=64.0,       # Mild space fog
        cabin_co2_mmhg=2.8,
        cumulative_radiation_msv=38.0,
    ),
    "chen_day180": CrewVitals(
        crew_id="chen_day180",
        name="Lt. Sora Chen",
        role="Payload Specialist",
        mission_day=180,
        next_milestone="Mars Descent Readiness",
        hours_to_milestone=72.0,
        bone_resorption_index=81.0,
        hydration_delta_ml=-550.0,
        sans_ocular_score=72.0,
        renal_stone_index=74.0,
        sleep_circadian_score=62.0,
        cognitive_readiness=69.0,
        cabin_co2_mmhg=4.1,
        cumulative_radiation_msv=165.0,   # High cumulative rads -> med-kit drift!
    ),
}

# Realistic Deep-Space Med-Kit Inventory (NASA HRP Space Pharmacology inspired)
SEED_MED_KIT: List[MedKitItem] = [
    MedKitItem(
        med_id="med_ibuprofen",
        name="Ibuprofen 400mg",
        lot_number="Lot #4",
        category="Analgesic / Anti-inflammatory",
        packaging=PackagingType.REPACKAGED_POUCH,
        repackaged_day=1,
        shelf_life_days_nominal=730,
        daily_radiation_sensitivity=8.5,
        microgravity_gi_delay_min=35,
        sedation_half_life_hrs=2.0,
        eva_exclusion_window_hrs=0.0,
        quantity_remaining=28,
    ),
    MedKitItem(
        med_id="med_zolpidem",
        name="Zolpidem 5mg (Sleep Aid)",
        lot_number="Lot #2",
        category="Hypnotic / Circadian",
        packaging=PackagingType.ORIGINAL_BLISTER,
        repackaged_day=None,
        shelf_life_days_nominal=900,
        daily_radiation_sensitivity=3.0,
        microgravity_gi_delay_min=45,
        sedation_half_life_hrs=6.5,
        eva_exclusion_window_hrs=10.0,
        quantity_remaining=14,
    ),
    MedKitItem(
        med_id="med_promethazine",
        name="Promethazine 25mg",
        lot_number="Lot #7",
        category="Anti-emetic / Space Motion Sickness",
        packaging=PackagingType.REPACKAGED_POUCH,
        repackaged_day=14,
        shelf_life_days_nominal=540,
        daily_radiation_sensitivity=10.5,
        microgravity_gi_delay_min=40,
        sedation_half_life_hrs=9.0,
        eva_exclusion_window_hrs=12.0,
        quantity_remaining=12,
    ),
    MedKitItem(
        med_id="med_kcitrate",
        name="Potassium Citrate 10 mEq",
        lot_number="Lot #1",
        category="Renal Stone Prophylaxis",
        packaging=PackagingType.ORIGINAL_BLISTER,
        repackaged_day=None,
        shelf_life_days_nominal=1095,
        daily_radiation_sensitivity=1.5,
        microgravity_gi_delay_min=20,
        sedation_half_life_hrs=0.0,
        eva_exclusion_window_hrs=0.0,
        quantity_remaining=60,
    ),
    MedKitItem(
        med_id="med_modafinil",
        name="Modafinil 100mg",
        lot_number="Lot #3",
        category="Wakefulness / Fatigue Countermeasure",
        packaging=PackagingType.REPACKAGED_POUCH,
        repackaged_day=1,
        shelf_life_days_nominal=730,
        daily_radiation_sensitivity=5.5,
        microgravity_gi_delay_min=30,
        sedation_half_life_hrs=0.0,
        eva_exclusion_window_hrs=2.0,
        quantity_remaining=16,
    ),
]


def get_seed_7day_history(vitals: CrewVitals) -> List[TrajectoryPoint]:
    """Generate deterministic 7-day trailing trend leading up to today's state."""
    points: List[TrajectoryPoint] = []
    base_bone = max(20.0, 100.0 - vitals.bone_resorption_index)
    base_neuro = max(20.0, 100.0 - vitals.sans_ocular_score)
    base_renal = max(20.0, 100.0 - vitals.renal_stone_index)
    base_cog = (vitals.sleep_circadian_score + vitals.cognitive_readiness) / 2.0

    for idx, day_offset in enumerate(range(-6, 1)):
        drift = (6 - idx) * 1.4  # gradual drift toward current tension
        b = round(min(98.0, base_bone + drift * 0.9), 1)
        n = round(min(98.0, base_neuro + drift * 1.1), 1)
        r = round(min(98.0, base_renal + drift * 0.8), 1)
        c = round(min(98.0, base_cog + drift * 0.5), 1)
        overall = round((b + n + r + c) / 4.0, 1)
        points.append(
            TrajectoryPoint(
                day_offset=day_offset,
                bone_muscle=b,
                neuro_ocular=n,
                renal_metabolic=r,
                cognitive_circadian=c,
                overall_readiness=overall,
            )
        )
    return points


PLAIN_ENGLISH_GLOSSARY = {
    "SANS": {
        "jargon_term": "Spaceflight Associated Neuro-ocular Syndrome (SANS)",
        "plain_english": "Fluid floats up into the head in zero gravity, gently pressing on the back of your eyes and flattening vision over time.",
        "why_it_matters_in_space": "Heavy straining exercises or high cabin CO2 push even more fluid toward the head, risking blurry vision during critical docking or EVA tasks.",
        "actionable_countermeasure": "Pair moderate exercise with 20 minutes of Lower Body Negative Pressure (LBNP) to pull fluid back down toward the legs.",
    },
    "RENAL_STONE": {
        "jargon_term": "Hypercalciuric Renal Stone Risk",
        "plain_english": "In microgravity, bones release calcium into the blood. If you are dehydrated, that calcium can crystallize into painful kidney stones.",
        "why_it_matters_in_space": "A kidney stone mid-transit to Mars is a mission-critical medical emergency with no ER nearby.",
        "actionable_countermeasure": "Drink +500 mL of water paired with Potassium Citrate after workouts to keep urine diluted and prevent crystal formation.",
    },
    "RX_DRIFT": {
        "jargon_term": "Space Pharmacology Potency & PK/PD Drift",
        "plain_english": "Pills removed from foil blisters and stored in space pouches break down faster under radiation, and microgravity slows stomach absorption.",
        "why_it_matters_in_space": "A sleep aid taken before an EVA can linger longer than on Earth, causing dangerous 'space fog' in the spacesuit.",
        "actionable_countermeasure": "Check potency ratings before dosing and use light-therapy protocols within 10 hours of an EVA.",
    },
    "SPACE_FOG": {
        "jargon_term": "Neuro-Vestibular & CO2-Induced Cognitive Drift",
        "plain_english": "Elevated cabin CO2 combined with poor sleep slows reaction speed and decision accuracy without you noticing.",
        "why_it_matters_in_space": "Subtle cognitive slowing raises error rates on robotic arm ops and airlock checklists.",
        "actionable_countermeasure": "Boost cabin CO2 scrubbing, take a 15-second micro-check, and prioritize circadian blue-light alignment.",
    },
}