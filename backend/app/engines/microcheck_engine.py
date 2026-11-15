from statistics import mean
from ..models import CrewVitals, MicroCheckInput, MicroCheckResult, RiskLevel


def evaluate_microcheck(vitals: CrewVitals, check: MicroCheckInput) -> MicroCheckResult:
    """
    Zero-Friction 15-Second Micro-Check Evaluator:
    1. 5s Digital Amsler Grid -> passive SANS visual distortion delta
    2. 5s Reaction Tap -> processing speed drift ("space fog")
    3. 5s Voice Check -> pause ratio, speech rate, pitch variance fatigue score
    """
    # 1. Digital Amsler Grid (6x6 = 36 cells; central 4 cells weigh heavier for macular/optic disc shift)
    central_cells = {14, 15, 20, 21}
    distorted_count = len(set(check.amsler_distorted_cells))
    central_hits = len(central_cells.intersection(check.amsler_distorted_cells))
    amsler_sans_delta = round(min(22.0, (distorted_count * 2.2) + (central_hits * 3.5)), 1)

    # 2. Reaction Tap (Nominal astronaut baseline ~245 ms; >340 ms signals cognitive drift)
    rt_mean = round(mean(check.reaction_times_ms), 1)
    rt_drift = max(0.0, rt_mean - 245.0)
    space_fog_index = round(min(100.0, (rt_drift / 2.2)), 1)

    # 3. Voice Acoustic Biomarker Heuristic
    # Fatigue markers: higher pause ratio (>0.28), slower speech (<115 wpm), flattened pitch variance (<18 Hz)
    pause_penalty = max(0.0, (check.voice_pause_ratio - 0.22) * 110.0)
    rate_penalty = max(0.0, (125.0 - check.voice_speech_rate_wpm) * 0.55)
    pitch_penalty = max(0.0, (22.0 - check.voice_pitch_variance_hz) * 1.4)
    voice_fatigue_score = round(min(100.0, max(5.0, pause_penalty + rate_penalty + pitch_penalty)), 1)

    # 4. Update crew vitals with blended micro-check evidence
    new_sans = round(min(100.0, max(10.0, vitals.sans_ocular_score + (amsler_sans_delta * 0.65) - (2.0 if distorted_count == 0 else 0.0))), 1)
    combined_cog_penalty = (space_fog_index * 0.55) + (voice_fatigue_score * 0.45)
    new_cognitive = round(max(25.0, min(98.0, 96.0 - (combined_cog_penalty * 0.65))), 1)

    updated_vitals = vitals.model_copy(
        update={
            "sans_ocular_score": new_sans,
            "cognitive_readiness": new_cognitive,
        }
    )

    if new_sans >= 72 or new_cognitive <= 62:
        status = RiskLevel.RED
    elif new_sans >= 58 or new_cognitive <= 75:
        status = RiskLevel.YELLOW
    else:
        status = RiskLevel.GREEN

    # Plain-English Synthesis
    findings = []
    if distorted_count > 0:
        findings.append(
            f"Amsler Grid flagged {distorted_count} distorted zone(s), pushing SANS ocular risk to {new_sans:.0f}/100."
        )
    else:
        findings.append("Amsler Grid clear — no acute central visual distortion detected.")

    findings.append(f"Reaction mean {rt_mean:.0f} ms (Space Fog Index: {space_fog_index:.0f}/100).")

    if voice_fatigue_score >= 45:
        findings.append(
            f"Voice cadence shows elevated pause ratio ({check.voice_pause_ratio:.0%}) and flatter pitch, "
            f"indicating neuro-fatigue ({voice_fatigue_score:.0f}/100)."
        )
    else:
        findings.append(f"Voice cadence steady (fatigue score: {voice_fatigue_score:.0f}/100).")

    return MicroCheckResult(
        crew_id=vitals.crew_id,
        amsler_sans_delta=amsler_sans_delta,
        reaction_mean_ms=rt_mean,
        space_fog_index=space_fog_index,
        voice_fatigue_score=voice_fatigue_score,
        overall_neuro_cognitive_status=status,
        plain_english_summary=" ".join(findings),
        updated_vitals=updated_vitals,
    )