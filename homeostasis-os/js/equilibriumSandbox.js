window.EquilibriumSandbox = {
  requestTimer: null,
  requestVersion: 0,

  render() {
    document.getElementById("view-sandbox").innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div class="lg:col-span-5 bg-deck-panel border border-deck-border p-5 flex flex-col justify-between space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-deck-border">
            <div>
              <h2 class="text-sm font-bold text-deck-text">Spacewalk Readiness Core</h2>
              <p class="text-xs text-deck-secondary">4-system readiness mapped to EVA-04 clearance</p>
            </div>
            <span id="sbGateBadge" class="font-mono text-[10px] px-2.5 py-1 border border-deck-caution text-deck-caution bg-deck-cautionTint">CONDITIONAL</span>
          </div>

          <div class="flex justify-center py-1">
            <div class="relative w-[235px] h-[235px]">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r="136" fill="none" stroke="#0F1822" stroke-width="14"></circle>
                <circle cx="160" cy="160" r="114" fill="none" stroke="#0F1822" stroke-width="14"></circle>
                <circle cx="160" cy="160" r="92" fill="none" stroke="#0F1822" stroke-width="14"></circle>
                <circle cx="160" cy="160" r="70" fill="none" stroke="#0F1822" stroke-width="14"></circle>
                <circle id="sbRingBone" class="smooth-geom" cx="160" cy="160" r="136" fill="none" stroke="#4686CC" stroke-width="14" stroke-dasharray="854.51" stroke-dashoffset="170"></circle>
                <circle id="sbRingNeuro" class="smooth-geom" cx="160" cy="160" r="114" fill="none" stroke="#359672" stroke-width="14" stroke-dasharray="716.28" stroke-dashoffset="222"></circle>
                <circle id="sbRingRenal" class="smooth-geom" cx="160" cy="160" r="92" fill="none" stroke="#D4963B" stroke-width="14" stroke-dasharray="578.05" stroke-dashoffset="133"></circle>
                <circle id="sbRingCog" class="smooth-geom" cx="160" cy="160" r="70" fill="none" stroke="#6FA8DC" stroke-width="14" stroke-dasharray="439.82" stroke-dashoffset="79"></circle>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span class="text-[10px] text-deck-muted">SPACEWALK</span>
                <span id="sbComposite" class="text-3xl font-bold text-deck-text">76%</span>
                <span class="text-[10px] text-deck-secondary">READINESS</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-deck-well border border-deck-border p-2.5">Bone &amp; Muscle: <strong id="sbValBone" class="font-mono text-[#4686CC]">80%</strong></div>
            <div class="bg-deck-well border border-deck-border p-2.5">Eyes &amp; Brain: <strong id="sbValNeuro" class="font-mono text-deck-nominal">69%</strong></div>
            <div class="bg-deck-well border border-deck-border p-2.5">Kidneys: <strong id="sbValRenal" class="font-mono text-deck-caution">77%</strong></div>
            <div class="bg-deck-well border border-deck-border p-2.5">Sleep &amp; Focus: <strong id="sbValCog" class="font-mono text-[#6FA8DC]">82%</strong></div>
          </div>
        </div>

        <div class="lg:col-span-7 bg-deck-panel border border-deck-border p-5 flex flex-col justify-between space-y-4">
          <div class="pb-2 border-b border-deck-border">
            <h2 class="text-sm font-bold text-deck-text">What-If Mission Sandbox</h2>
            <p class="text-xs text-deck-secondary">Adjust habits or simulate space emergencies</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="bg-deck-well border border-deck-border p-3"><div class="flex justify-between mb-1"><span>Daily Workout</span><strong id="lblEx" class="font-mono text-deck-nominal">45 min</strong></div><input id="sbEx" type="range" min="0" max="120" step="5" value="45" oninput="EquilibriumSandbox.recalc()" class="deck-slider" /></div>
            <div class="bg-deck-well border border-deck-border p-3"><div class="flex justify-between mb-1"><span>Extra Sleep</span><strong id="lblSlp" class="font-mono text-deck-text">+0 min</strong></div><input id="sbSlp" type="range" min="-120" max="120" step="15" value="0" oninput="EquilibriumSandbox.recalc()" class="deck-slider" /></div>
            <div class="bg-deck-well border border-deck-border p-3"><div class="flex justify-between mb-1"><span>LBNP Vacuum Suit</span><strong id="lblLbnp" class="font-mono text-deck-caution">20 min</strong></div><input id="sbLbnp" type="range" min="0" max="45" step="5" value="20" oninput="EquilibriumSandbox.recalc()" class="deck-slider" /></div>
            <div class="bg-deck-well border border-deck-border p-3"><div class="flex justify-between mb-1"><span>Daily Water Intake</span><strong id="lblHyd" class="font-mono text-deck-accent">2.6 L</strong></div><input id="sbHyd" type="range" min="1.5" max="3" step="0.1" value="2.6" oninput="EquilibriumSandbox.recalc()" class="deck-slider" /></div>
          </div>
          <div class="space-y-2 text-xs">
            <label class="flex items-center gap-2.5 p-2.5 bg-deck-well border border-deck-border cursor-pointer"><input id="chkSolar" type="checkbox" onchange="EquilibriumSandbox.recalc()" class="bg-deck-surface border-deck-border text-deck-accent focus:ring-0" /><span><strong>Solar Storm Hits</strong> (+25 mSv space radiation &amp; sleep disruption)</span></label>
            <label class="flex items-center gap-2.5 p-2.5 bg-deck-well border border-deck-border cursor-pointer"><input id="chkCo2" type="checkbox" onchange="EquilibriumSandbox.recalc()" class="bg-deck-surface border-deck-border text-deck-accent focus:ring-0" /><span><strong>Air Scrubber Slows Down</strong> (Cabin CO2 rises, straining eyes &amp; focus)</span></label>
          </div>
          <div id="sbEvalStrip" class="border border-deck-caution bg-deck-cautionTint p-3 text-xs text-deck-text"></div>
        </div>
      </div>

      <!-- PIE CHART + 30-DAY READINESS LINE GRAPH -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-deck-panel border border-deck-border p-5">
          <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-3 border-b border-deck-border">BODY STRAIN BREAKDOWN (PIE CHART)</div>
          <div class="flex flex-wrap items-center justify-around gap-4">
            <svg id="sbPieSvg" width="150" height="150" viewBox="0 0 120 120"></svg>
            <div id="sbPieLegend" class="font-mono text-xs space-y-2"></div>
          </div>
        </div>

        <div class="bg-deck-panel border border-deck-border p-5">
          <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-3 border-b border-deck-border">30-DAY READINESS FORECAST LINE GRAPH</div>
          <svg class="w-full h-[165px]" viewBox="0 0 480 155">
            <line stroke="#29394B" x1="40" y1="20" x2="450" y2="20"></line>
            <line stroke="#359672" stroke-dasharray="4,3" x1="40" y1="52" x2="450" y2="52"></line>
            <line stroke="#29394B" x1="40" y1="125" x2="450" y2="125"></line>
            <text fill="#359672" font-family="IBM Plex Mono" font-size="9" x="44" y="46">80% PASS LINE</text>
            <path id="sbLinePath" class="smooth-geom" d="M 40,75 Q 240,65 450,50" fill="none" stroke="#4686CC" stroke-width="2.8"></path>
            <circle id="sbLineDot" class="smooth-geom" cx="450" cy="50" r="4.5" fill="#4686CC"></circle>
            <text id="sbLineLbl" fill="#4686CC" font-family="IBM Plex Mono" font-size="10" text-anchor="end" x="445" y="40">76%</text>
            <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="9" x="40" y="142">TODAY</text>
            <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="9" text-anchor="end" x="450" y="142">+30 DAYS</text>
          </svg>
        </div>
      </div>

      <!-- SPACEWALK GATE FLOWCHART -->
      <div class="bg-deck-panel border border-deck-border p-5 font-mono text-xs">
        <div class="text-[11px] font-bold uppercase text-deck-secondary mb-3">SPACEWALK CLEARANCE FLOWCHART</div>
        <div class="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center text-center">
          <div class="p-2.5 bg-deck-well border border-deck-border">1. Daily Habits</div>
          <div class="text-deck-accent">--&gt;</div>
          <div class="p-2.5 bg-deck-well border border-deck-border">2. Space Hazards</div>
          <div class="text-deck-accent">--&gt;</div>
          <div id="sbFlowCheck" class="p-2.5 bg-deck-well border border-deck-caution text-deck-caution">3. Check &gt;=80%</div>
          <div class="text-deck-accent">--&gt;</div>
          <div id="sbFlowGate" class="p-2.5 bg-deck-cautionTint border border-deck-caution text-deck-caution">4. CONDITIONAL</div>
        </div>
      </div>
    `;
    this.recalc();
  },

  recalc() {
    const ex = Number(document.getElementById("sbEx").value);
    const slp = Number(document.getElementById("sbSlp").value);
    const lbnp = Number(document.getElementById("sbLbnp").value);
    const hyd = Number(document.getElementById("sbHyd").value);
    const solar = document.getElementById("chkSolar").checked;
    const co2 = document.getElementById("chkCo2").checked;

    document.getElementById("lblEx").textContent = ex + " min";
    document.getElementById("lblSlp").textContent = (slp >= 0 ? "+" : "") + slp + " min";
    document.getElementById("lblLbnp").textContent = lbnp + " min";
    document.getElementById("lblHyd").textContent = hyd.toFixed(1) + " L";
    this.requestVersion++;
    clearTimeout(this.requestTimer);
    this.requestTimer = setTimeout(() => this.requestProjection({
      crew_id: window.HomeostasisState.activeCrewId,
      exercise_hours_per_day: ex / 60,
      sleep_delta_minutes: slp,
      extra_hydration_ml: Math.max(-500, Math.min(1000, Math.round((hyd - 2) * 1000))),
      lbnp_daily_minutes: lbnp,
      solar_storm_event: solar,
      cabin_co2_spike: co2
    }), 250);
  },

  async requestProjection(payload) {
    const requestVersion = ++this.requestVersion;
    try {
      const result = await window.HomeostasisApi.whatIf(payload);
      if (requestVersion !== this.requestVersion) return;
      this.renderProjection(result);
      window.App.reportApiConnected();
    } catch (error) {
      if (requestVersion === this.requestVersion) window.App.reportApiError(error);
    }
  },

  renderProjection(result) {
    const rings = result.projected_day30_rings;
    window.HomeostasisState.projectedRings = rings;
    const scores = [rings.bone_muscle, rings.neuro_ocular, rings.renal_metabolic, rings.cognitive_circadian];
    const ids = ["Bone", "Neuro", "Renal", "Cog"];
    const radii = [854.51, 716.28, 578.05, 439.82];
    const badness = scores.map(score => Math.max(4, 100 - score));
    const total = badness.reduce((sum, score) => sum + score, 0);
    const circumference = 2 * Math.PI * 36;
    const lengths = badness.map(score => (score / total) * circumference);
    const colors = ["#4686CC", "#D6473F", "#D4963B", "#359672"];
    let offset = 0;
    document.getElementById("sbPieSvg").innerHTML = "";

    scores.forEach((score, index) => {
      document.getElementById(`sbVal${ids[index]}`).textContent = `${Math.round(score)}%`;
      document.getElementById(`sbRing${ids[index]}`).setAttribute("stroke-dashoffset", (radii[index] * (1 - score / 100)).toFixed(1));
      const circle = `<circle cx="60" cy="60" r="36" fill="none" stroke="${colors[index]}" stroke-width="22" stroke-dasharray="${lengths[index]} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"></circle>`;
      document.getElementById("sbPieSvg").insertAdjacentHTML("beforeend", circle);
      offset += lengths[index];
    });

    const composite = Math.round(rings.overall_mission_readiness);
    document.getElementById("sbComposite").textContent = `${composite}%`;
    document.getElementById("sbPieLegend").innerHTML = [
      "Bone Strain", "Eye/Neuro Strain", "Renal Strain", "Sleep/Focus Strain"
    ].map((label, index) =>
      `<div style="color:${colors[index]}">${label}: <strong>${Math.round((badness[index] / total) * 100)}%</strong></div>`
    ).join("");

    const points = result.trajectory_30_days;
    const path = points.map((point, index) => {
      const x = 40 + (index / (points.length - 1)) * 410;
      const y = 125 - (point.overall_readiness / 100) * 105;
      return `${index ? "L" : "M"} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const endY = 125 - (composite / 100) * 105;
    document.getElementById("sbLinePath").setAttribute("d", path);
    document.getElementById("sbLineDot").setAttribute("cx", "450");
    document.getElementById("sbLineDot").setAttribute("cy", endY.toFixed(1));
    document.getElementById("sbLineLbl").setAttribute("y", (endY - 8).toFixed(1));
    document.getElementById("sbLineLbl").textContent = `${composite}%`;

    const ready = rings.milestone_ready;
    const badge = document.getElementById("sbGateBadge");
    const strip = document.getElementById("sbEvalStrip");
    const flowGate = document.getElementById("sbFlowGate");
    const tone = ready ? "nominal" : "caution";
    badge.textContent = ready ? "MILESTONE READY" : "CONDITIONAL";
    badge.className = `font-mono text-[10px] px-2.5 py-1 border border-deck-${tone} text-deck-${tone} bg-deck-${tone}Tint`;
    strip.className = `border border-deck-${tone} bg-deck-${tone}Tint p-3 text-xs text-deck-text`;
    strip.textContent = result.plain_english_briefing;
    flowGate.textContent = ready ? "4. READY" : "4. CONDITIONAL";
    flowGate.className = `p-2.5 bg-deck-${tone}Tint border border-deck-${tone} text-deck-${tone}`;

    if (window.App) {
      window.App.renderRings(rings);
      window.App.updateTopRings();
    }
  }
};