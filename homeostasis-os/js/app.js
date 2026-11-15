window.App = {
  async init() {
    this.setApiStatus("CONNECTING TO API", "caution");
    try {
      await window.HomeostasisApi.health();
      const crew = await window.HomeostasisApi.listCrew();
      if (!crew.length) throw new Error("The backend returned no crew profiles.");

      const select = document.getElementById("crewSelect");
      select.replaceChildren(...crew.map(member => {
        const option = document.createElement("option");
        option.value = member.crew_id;
        option.textContent = member.name;
        return option;
      }));
      await this.loadCrew(crew[0].crew_id);

      window.ConflictEngine.render();
      window.RxDrift.render();
      window.EquilibriumSandbox.render();
      window.MicroCheck.render();
      this.updateTopRings();
      this.reportApiConnected();
    } catch (error) {
      if (window.HomeostasisState.activeCrewId) {
        document.getElementById("crewSelect").value = window.HomeostasisState.activeCrewId;
      }
      this.reportApiError(error);
    }
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  updateTopRings() {
    const state = window.HomeostasisState;
    const rings = state.projectedRings || (state.dashboard && state.dashboard.rings);
    if (rings) this.renderRings(rings);

    const badge = document.getElementById("topRingsBadge");
    const sbBadge = document.getElementById("sbGateBadge");
    if (badge && sbBadge) {
      badge.textContent = "EVA-04 // " + sbBadge.textContent;
      badge.className = sbBadge.className;
    }
  },

  switchView(id, btn) {
    document.querySelectorAll(".view-section").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + id).classList.remove("hidden");
    document.querySelectorAll(".nav-tab").forEach(t => {
      t.className = "nav-tab px-3.5 py-2 text-deck-secondary border-b-2 border-transparent hover:text-deck-text cursor-pointer";
    });
    btn.className = "nav-tab px-3.5 py-2 text-deck-text font-semibold border-b-2 border-deck-accent bg-deck-panel cursor-pointer";
    if (id === "conflict") window.ConflictEngine.startEcgLoop();
  },

  async switchCrew(crewId) {
    const skel = document.getElementById("skeletonView");
    const main = document.getElementById("mainContent");
    main.classList.add("hidden");
    skel.classList.remove("hidden");
    try {
      await this.loadCrew(crewId);
      window.ConflictEngine.render();
      window.RxDrift.render();
      window.EquilibriumSandbox.render();
      this.updateTopRings();
      this.reportApiConnected();
    } catch (error) {
      this.reportApiError(error);
    } finally {
      skel.classList.add("hidden");
      main.classList.remove("hidden");
    }
  },

  async loadCrew(crewId) {
    const dashboard = await window.HomeostasisApi.dashboard(crewId);
    const vitals = dashboard.vitals;
    const profile = {
      ...vitals,
      story: `${vitals.name} is on mission day ${vitals.mission_day}. Bone-loss index: ${vitals.bone_resorption_index.toFixed(0)}/100; ocular/SANS risk: ${vitals.sans_ocular_score.toFixed(0)}/100; fluid balance: ${vitals.hydration_delta_ml.toFixed(0)} mL. Use the controls to evaluate a balanced countermeasure plan.`,
      sansBase: vitals.sans_ocular_score,
      renalBase: vitals.renal_stone_index
    };
    const state = window.HomeostasisState;
    state.activeCrewId = crewId;
    state.crewProfiles[crewId] = profile;
    state.dashboard = dashboard;
    state.projectedRings = null;
    state.rxSnapshot = dashboard.rx_snapshot;
    state.medications = dashboard.rx_snapshot.medications;
    if (window.RxDrift) window.RxDrift.lastDoseResult = null;

    document.getElementById("crewSelect").value = crewId;
    this.setText("heroCrewName", vitals.name);
    this.setText("heroEva", vitals.next_milestone);
    this.setText("heroCo2", `${vitals.cabin_co2_mmhg.toFixed(1)} mmHg`);
    this.setText("heroHyd", `${vitals.hydration_delta_ml.toFixed(0)} mL`);
    this.setText("heroRad", `${vitals.cumulative_radiation_msv.toFixed(1)} mSv`);
    this.setText("heroStoryText", profile.story);
    this.renderRings(dashboard.rings);
  },

  renderRings(rings) {
    const values = {
      Bone: rings.bone_muscle,
      Neuro: rings.neuro_ocular,
      Renal: rings.renal_metabolic,
      Cog: rings.cognitive_circadian
    };
    const circumference = 238.76;
    for (const [name, value] of Object.entries(values)) {
      const ring = document.getElementById(`topRing${name}`);
      const label = document.getElementById(`topVal${name}`);
      if (ring) ring.setAttribute("stroke-dashoffset", (circumference * (1 - value / 100)).toFixed(1));
      if (label) label.textContent = `${Math.round(value)}%`;
    }
  },

  setApiStatus(message, tone) {
    const status = document.getElementById("apiStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `font-mono text-[10px] text-deck-${tone}`;
    status.setAttribute("role", tone === "critical" ? "alert" : "status");
  },

  reportApiError(error) {
    const message = error instanceof Error ? error.message : String(error);
    this.setApiStatus(`API ERROR: ${message}`, "critical");
    console.error("HOMEOSTASIS-OS API request failed:", error);
  },

  reportApiConnected() {
    this.setApiStatus("BACKEND CONNECTED", "nominal");
  },

  openLegal(title) {
    this.setText("legalTitle", title);
    this.setText(
      "legalBody",
      title.includes("PRIVACY")
        ? "Derived health-check results are sent to the backend. Micro-check summaries are held in server memory for this demo."
        : "HOMEOSTASIS-OS is an educational and Crew Medical Officer decision-support simulator. It does not autonomously diagnose disease or prescribe drugs."
    );
    document.getElementById("legalModal").classList.remove("hidden");
  },

  flashButton(btn, msg) {
    const prev = btn.textContent;
    btn.textContent = msg;
    setTimeout(() => (btn.textContent = prev), 1800);
  }
};

document.addEventListener("DOMContentLoaded", () => window.App.init());