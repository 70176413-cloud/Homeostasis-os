from typing import List, Optional, Tuple
from ..models import (
    CrewVitals,
    DoseSimulationResponse,
    MedKitItem,
    PackagingType,
    RiskLevel,
    RxDriftResponse,
    RxEvaluationItem,
)


def _compute_potency(vitals: CrewVitals, med: MedKitItem) -> Tuple[float, RiskLevel]:
    if med.packaging == PackagingType.REPACKAGED_POUCH:
        days_exposed = max(0, vitals.mission_day - (med.repackaged_day or 1))
        time_decay_pct = (days_exposed / med.shelf_life_days_nominal) * 38.0
        rad_protection_factor = 1.35
    else:
        days_exposed = vitals.mission_day
        time_decay_pct = (days_exposed / med.shelf_life_days_nominal) * 14.0
        rad_protection_factor = 0.65

    rad_decay_pct = (vitals.cumulative_radiation_msv / 100.0) * med.daily_radiation_sensitivity * rad_protection_factor
    est_potency = round(max(45.0, min(100.0, 100.0 - time_decay_pct - rad_decay_pct)), 1)

    if est_potency >= 90.0:
        status = RiskLevel.GREEN
    elif est_potency >= 78.0:
        status = RiskLevel.YELLOW
    else:
        status = RiskLevel.RED
    return est_potency, status


def _non_drug_protocol(med: MedKitItem) -> Optional[str]:
    if "Sleep" in med.name or "Circadian" in med.category:
        return "Use 30-min timed circadian blue-light protocol + cabin temp drop (-2°C) instead."
    if "Anti-emetic" in med.category:
        return "Use vestibular head-stabilization breathing & acupressure band prior to suit donning."
    return None


def evaluate_rx_drift(vitals: CrewVitals, med_kit: List[MedKitItem]) -> RxDriftResponse:
    """
    Rx-Drift: Space-Adjusted Medication & Shelf-Life Advisor.
    Simulates potency loss from mission time + repackaging exposure + cumulative radiation (mSv),
    plus microgravity GI delay, altered hepatic clearance, and EVA 'space fog' conflicts.
    """
    evaluated_items: List[RxEvaluationItem] = []

    for med in med_kit:
        est_potency, potency_status = _compute_potency(vitals, med)

        eva_conflict = (
            med.eva_exclusion_window_hrs > 0
            and vitals.hours_to_milestone <= med.eva_exclusion_window_hrs
            and "EVA" in vitals.next_milestone.upper()
        )

        fog_risk_increase = 0.0
        if med.sedation_half_life_hrs > 0:
            base_fog = med.sedation_half_life_hrs * 3.2
            proximity_mult = 1.45 if vitals.hours_to_milestone <= 12.0 else 0.8
            fog_risk_increase = round(min(48.0, base_fog * proximity_mult), 1)

        notes = []
        non_drug_alt = None

        if med.packaging == PackagingType.REPACKAGED_POUCH:
            notes.append(
                f"Repackaged Day {med.repackaged_day or 1} — humidity & {vitals.cumulative_radiation_msv:.0f} mSv radiation "
                f"reduce estimated potency to {est_potency:.0f}%."
            )
        else:
            notes.append(f"Original blister pack preserves stability ({est_potency:.0f}% est. potency).")

        notes.append(
            f"Microgravity slows GI absorption (~{med.microgravity_gi_delay_min} min delay) "
            f"and alters hepatic clearance."
        )

        if eva_conflict:
            notes.append(
                f"ALERT: Next EVA in {vitals.hours_to_milestone:.0f}h (within {med.eva_exclusion_window_hrs:.0f}h exclusion window). "
                f"Increases cognitive 'space fog' risk by +{fog_risk_increase:.0f}%."
            )
            non_drug_alt = _non_drug_protocol(med)
        elif med.sedation_half_life_hrs >= 5.0:
            notes.append(
                f"Taking within {med.eva_exclusion_window_hrs:.0f}h of an EVA raises space-fog risk by ~{fog_risk_increase:.0f}%."
            )
            non_drug_alt = _non_drug_protocol(med)

        evaluated_items.append(
            RxEvaluationItem(
                med_id=med.med_id,
                name=med.name,
                lot_number=med.lot_number,
                packaging=med.packaging,
                estimated_potency_pct=est_potency,
                potency_status=potency_status,
                eva_conflict_flag=eva_conflict,
                cognitive_fog_risk_increase_pct=fog_risk_increase,
                quantity_remaining=med.quantity_remaining,
                plain_english_guidance=" ".join(notes),
                non_drug_alternative=non_drug_alt,
            )
        )

    return RxDriftResponse(
        mission_day=vitals.mission_day,
        cumulative_radiation_msv=vitals.cumulative_radiation_msv,
        hours_to_next_eva=vitals.hours_to_milestone,
        medications=evaluated_items,
    )


def simulate_dose_intake(vitals: CrewVitals, med: MedKitItem, log_consumption: bool = True) -> DoseSimulationResponse:
    """
    Simulates taking 1 dose of a specific onboard medication and checks EVA / hepatic clearance impact.
    """
    est_potency, _ = _compute_potency(vitals, med)

    if log_consumption and med.quantity_remaining > 0:
        med.quantity_remaining -= 1

    # Microgravity hepatic clearance slows effective elimination by ~25-35%
    effective_clearance = round(med.sedation_half_life_hrs * 1.35 + (med.microgravity_gi_delay_min / 60.0), 1)
    eva_conflict = (
        med.eva_exclusion_window_hrs > 0
        and vitals.hours_to_milestone <= max(med.eva_exclusion_window_hrs, effective_clearance)
        and "EVA" in vitals.next_milestone.upper()
    )

    fog_peak = 0.0
    if med.sedation_half_life_hrs > 0:
        fog_peak = round(min(55.0, med.sedation_half_life_hrs * 4.1), 1)

    non_drug_alt = _non_drug_protocol(med) if eva_conflict else None

    if eva_conflict:
        verdict = (
            f"HOLD / CAUTION: {med.name} stays active ~{effective_clearance:.1f}h in microgravity due to slowed GI "
            f"absorption and altered hepatic clearance. Taking it before '{vitals.next_milestone}' pushes cognitive "
            f"'space fog' peak to +{fog_peak:.0f}%."
        )
    else:
        verdict = (
            f"CLEARED FOR REFERENCE: {med.name} delivers ~{est_potency:.0f}% potency. "
            f"Estimated clearance window is {effective_clearance:.1f}h with no immediate EVA conflict."
        )

    return DoseSimulationResponse(
        crew_id=vitals.crew_id,
        med_id=med.med_id,
        name=med.name,
        estimated_potency_pct=est_potency,
        effective_clearance_hrs=effective_clearance,
        eva_safe=not eva_conflict,
        cognitive_fog_peak_pct=fog_peak,
        quantity_remaining=med.quantity_remaining,
        plain_english_verdict=verdict,
        non_drug_alternative=non_drug_alt,
    )