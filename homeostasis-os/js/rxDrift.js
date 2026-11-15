window.RxDrift = {
  selectedLot: "med_ibuprofen",
  lastDoseResult: null,

  render() {
    document.getElementById("view-rxdrift").innerHTML = `
      <div class="bg-deck-panel border border-deck-border p-5 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-deck-border">
          <div>
            <h2 class="text-base font-bold text-deck-text">Space Medicine Cabinet (Rx-Drift)</h2>
            <p class="text-xs text-deck-secondary">Backend potency estimates use this crew member's mission day and radiation exposure</p>
          </div>
          <span class="font-mono text-[10px] px-2.5 py-1 border border-deck-caution bg-deck-cautionTint text-deck-caution">DECISION-SUPPORT REFERENCE ONLY</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-deck-well border border-deck-border p-4">
          <div class="lg:col-span-5">
            <div class="flex justify-between font-mono text-xs mb-1"><span>Mission Day</span><strong id="rxDayLabel" class="text-deck-accent">Loading…</strong></div>
          </div>
          <div class="lg:col-span-5">
            <div class="flex justify-between font-mono text-xs mb-1"><span>Cumulative Radiation Exposure</span><strong id="rxRadLabel" class="text-deck-caution">Loading…</strong></div>
          </div>
          <div class="lg:col-span-2">
            <svg width="100%" height="36" viewBox="0 0 140 36">
              <path class="rad-stream" d="M 0,10 L 140,10" stroke="#D4963B" stroke-width="1.5" fill="none"></path>
              <path class="rad-stream" d="M 0,26 L 140,26" stroke="#4686CC" stroke-width="1.5" fill="none"></path>
              <text x="70" y="21" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#94A5B8">RADIATION FLUX</text>
            </svg>
          </div>
        </div>

        <div id="rxCardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"></div>

        <!-- PIE CHART + 540-DAY DECAY LINE GRAPH -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="bg-deck-well border border-deck-border p-4">
            <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-3 border-b border-deck-border">MED-KIT POTENCY PIE CHART</div>
            <div class="flex flex-wrap items-center justify-around gap-4">
              <svg id="rxPieSvg" width="150" height="150" viewBox="0 0 120 120"></svg>
              <div id="rxPieLegend" class="font-mono text-xs space-y-2"></div>
            </div>
          </div>

          <div class="bg-deck-well border border-deck-border p-4">
            <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-3 border-b border-deck-border">ILLUSTRATIVE POTENCY DECAY (BLISTER VS BAG)</div>
            <svg class="w-full h-[160px]" viewBox="0 0 460 150">
              <line stroke="#29394B" x1="40" y1="20" x2="430" y2="20"></line>
              <line stroke="#D6473F" stroke-dasharray="4,3" x1="40" y1="68" x2="430" y2="68"></line>
              <line stroke="#29394B" x1="40" y1="120" x2="430" y2="120"></line>
              <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="9" x="8" y="24">100%</text>
              <text fill="#D6473F" font-family="IBM Plex Mono" font-size="9" x="8" y="72">70%</text>
              <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="9" x="14" y="124">25%</text>
              <path d="M 40,20 Q 230,28 430,42" fill="none" stroke="#359672" stroke-width="2.5"></path>
              <path d="M 40,20 Q 210,55 430,108" fill="none" stroke="#D6473F" stroke-width="2.5"></path>
              <line id="rxDayMarker" x1="142" y1="15" x2="142" y2="125" stroke="#4686CC" stroke-width="1.5"></line>
              <text fill="#359672" font-family="IBM Plex Mono" font-size="10" x="260" y="28">Original Blister Pack</text>
              <text fill="#D6473F" font-family="IBM Plex Mono" font-size="10" x="240" y="102">Repackaged Pouch</text>
            </svg>
          </div>
        </div>

        <div id="rxAdviceBox" class="bg-deck-well border border-deck-accent p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"></div>

        <!-- PHARMACOLOGY SAFETY FLOWCHART -->
        <div class="bg-deck-well border border-deck-border p-4 font-mono text-xs">
          <div class="text-[11px] font-bold uppercase text-deck-secondary mb-3">MEDICATION DECISION FLOWCHART</div>
          <div class="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center text-center">
            <div class="p-2.5 bg-deck-surface border border-deck-border">1. Check Med</div>
            <div class="text-deck-accent">--&gt;</div>
            <div class="p-2.5 bg-deck-surface border border-deck-caution text-deck-caution">2. Check Packaging</div>
            <div class="text-deck-accent">--&gt;</div>
            <div class="p-2.5 bg-deck-surface border border-deck-critical text-deck-critical">3. &lt;10h to Spacewalk?</div>
            <div class="text-deck-accent">--&gt;</div>
            <div class="p-2.5 bg-deck-nominalTint border border-deck-nominal text-deck-nominal">4. Safe or Light Protocol</div>
          </div>
        </div>
      </div>
    `;
    this.renderCards();
  },

  renderCards() {
    let strong = 0, watch = 0, low = 0;
    const snapshot = window.HomeostasisState.rxSnapshot;
    const grid = document.getElementById("rxCardsGrid");
    if (!snapshot || !grid) return;
    document.getElementById("rxDayLabel").textContent = `${snapshot.mission_day} Days`;
    document.getElementById("rxRadLabel").textContent = `${snapshot.cumulative_radiation_msv.toFixed(1)} mSv`;
    grid.innerHTML = "";

    snapshot.medications.forEach(m => {
      const pot = Math.round(m.estimated_potency_pct);
      if (pot >= 85) strong++; else if (pot >= 70) watch++; else low++;

      const col = pot >= 85 ? "#359672" : pot >= 70 ? "#D4963B" : "#D6473F";
      const active = m.med_id === this.selectedLot;
      const isBag = m.packaging === "repackaged_pouch";

      const card = document.createElement("div");
      card.className = "p-4 bg-deck-well border cursor-pointer flex flex-col justify-between space-y-3 " + (active ? "border-deck-accent bg-deck-surface" : "border-deck-border");
      card.onclick = () => { this.selectedLot = m.med_id; this.lastDoseResult = null; this.renderCards(); };
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold text-sm text-deck-text">${this.escapeHtml(m.name)}</div>
            <div class="font-mono text-[10px] text-deck-muted">${isBag ? "Repackaged Zip Pouch" : "Sealed Blister Pack"}</div>
          </div>
          <svg width="42" height="24" viewBox="0 0 42 24">
            <rect x="1" y="1" width="40" height="22" fill="#121C28" stroke="${col}" stroke-width="1.2"></rect>
            <rect x="6" y="7" width="14" height="10" fill="${col}"></rect>
            <rect x="20" y="7" width="16" height="10" fill="#1F2D3D"></rect>
          </svg>
        </div>
        <div>
          <div class="flex justify-between font-mono text-xs mb-1"><span class="text-deck-secondary">Strength Left</span><strong style="color:${col}">${pot}%</strong></div>
          <div class="w-full h-2 bg-deck-track border border-deck-border"><div class="h-full smooth-geom" style="width:${pot}%;background:${col};"></div></div>
        </div>
        <div class="font-mono text-[10px] px-2 py-1 border text-center" style="border-color:${col};color:${col}">${this.escapeHtml(m.potency_status.toUpperCase())} · ${m.quantity_remaining} LEFT</div>
        <button type="button" class="px-2 py-1 bg-deck-accent text-deck-text font-mono text-[10px]">Simulate Dose</button>
      `;
      card.querySelector("button").onclick = event => {
        event.stopPropagation();
        this.simulateDose(m.med_id);
      };
      grid.appendChild(card);
    });

    // Draw Live Med-Kit Pie Chart
    const total = snapshot.medications.length || 1;
    const cCirc = 2 * Math.PI * 36;
    const sLen = (strong / total) * cCirc;
    const wLen = (watch / total) * cCirc;
    const lLen = (low / total) * cCirc;
    document.getElementById("rxPieSvg").innerHTML = `
      <circle cx="60" cy="60" r="36" fill="none" stroke="#1F2D3D" stroke-width="22"></circle>
      <circle cx="60" cy="60" r="36" fill="none" stroke="#359672" stroke-width="22" stroke-dasharray="${sLen} ${cCirc}" transform="rotate(-90 60 60)"></circle>
      <circle cx="60" cy="60" r="36" fill="none" stroke="#D4963B" stroke-width="22" stroke-dasharray="${wLen} ${cCirc}" stroke-dashoffset="${-sLen}" transform="rotate(-90 60 60)"></circle>
      <circle cx="60" cy="60" r="36" fill="none" stroke="#D6473F" stroke-width="22" stroke-dasharray="${lLen} ${cCirc}" stroke-dashoffset="${-(sLen + wLen)}" transform="rotate(-90 60 60)"></circle>
    `;
    document.getElementById("rxPieLegend").innerHTML = `
      <div class="text-deck-nominal">Full Strength (&gt;=85%): <strong>${strong}/${snapshot.medications.length}</strong></div>
      <div class="text-deck-caution">Losing Strength (70-84%): <strong>${watch}/${snapshot.medications.length}</strong></div>
      <div class="text-deck-critical">Degraded (&lt;70%): <strong>${low}/${snapshot.medications.length}</strong></div>
    `;

    const selected = snapshot.medications.find(m => m.med_id === this.selectedLot) || snapshot.medications[0];
    if (!selected) return;
    const dose = this.lastDoseResult;
    const result = dose
      ? `<p class="text-xs ${dose.eva_safe ? "text-deck-nominal" : "text-deck-critical"}">${this.escapeHtml(dose.plain_english_verdict)}</p>`
      : "";
    document.getElementById("rxAdviceBox").innerHTML = `
      <div class="space-y-1">
        <div class="font-mono text-xs font-bold text-deck-accent">${this.escapeHtml(selected.name.toUpperCase())} // MEDICAL GUIDANCE</div>
        <p class="text-xs text-deck-text">${this.escapeHtml(selected.plain_english_guidance)}</p>
        <p class="text-xs text-deck-nominal font-semibold">${this.escapeHtml(selected.non_drug_alternative || "Consult the Flight Surgeon for alternatives.")}</p>
        ${result}
        <p class="text-[10px] text-deck-muted">${this.escapeHtml(snapshot.disclaimer)}</p>
      </div>
    `;
  },

  async simulateDose(medId) {
    try {
      this.lastDoseResult = await window.HomeostasisApi.simulateDose(
        window.HomeostasisState.activeCrewId,
        medId
      );
      this.selectedLot = medId;
      this.renderCards();
      window.App.reportApiConnected();
    } catch (error) {
      window.App.reportApiError(error);
    }
  },

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
};