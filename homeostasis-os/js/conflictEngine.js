window.ConflictEngine = {
  ecgRaf: null,
  bpm: 112,
  ecgColor: "#359672",
  apiTimer: null,
  apiRequestVersion: 0,

  render() {
    clearTimeout(this.apiTimer);
    this.apiRequestVersion++;
    const c = window.HomeostasisState.crewProfiles[window.HomeostasisState.activeCrewId];
    document.getElementById("view-conflict").innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <!-- LEFT 5 COLS: BODY DIAGRAM + LIVE HEARTBEAT VITALS -->
        <div class="lg:col-span-5 space-y-5 flex flex-col justify-between">
          <div class="bg-deck-panel border border-deck-border p-5 flex-1 flex flex-col justify-between">
            <div class="flex items-center justify-between pb-3 border-b border-deck-border">
              <div>
                <h2 class="text-sm font-bold text-deck-text">1. Astronaut Body Diagram</h2>
                <p class="text-xs text-deck-secondary">Fluid direction reacts live to your workout choice</p>
              </div>
              <span id="bodyFlowBadge" class="font-mono text-[10px] px-2 py-1 border border-deck-nominal bg-deck-nominalTint text-deck-nominal">HEALTHY FLOW</span>
            </div>

            <div class="py-2 flex justify-center">
              <svg width="280" height="275" viewBox="0 0 290 320">
                <circle cx="145" cy="48" r="24" fill="#0F1822" stroke="#4686CC" stroke-width="1.8"></circle>
                <rect x="115" y="78" width="60" height="96" fill="#0F1822" stroke="#394E66" stroke-width="1.5"></rect>
                <rect x="85" y="84" width="24" height="82" fill="#0F1822" stroke="#394E66" stroke-width="1.5"></rect>
                <rect x="181" y="84" width="24" height="82" fill="#0F1822" stroke="#394E66" stroke-width="1.5"></rect>
                <rect x="117" y="180" width="24" height="110" fill="#0F1822" stroke="#394E66" stroke-width="1.5"></rect>
                <rect x="149" y="180" width="24" height="110" fill="#0F1822" stroke="#394E66" stroke-width="1.5"></rect>
                <rect id="lbnpSuitBox" x="108" y="175" width="74" height="120" fill="rgba(70,134,204,0.12)" stroke="#4686CC" stroke-dasharray="4,3" stroke-width="1.5"></rect>
                <text id="lbnpSuitLbl" x="145" y="310" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#4686CC">LBNP SUIT ACTIVE</text>
                <g id="fluidParticles"></g>
                <circle id="eyeHotspot" cx="145" cy="44" r="7" fill="rgba(212,150,59,0.28)" stroke="#D4963B" stroke-width="1.5"></circle>
                <line x1="152" y1="44" x2="205" y2="44" stroke="#D4963B" stroke-width="1"></line>
                <text id="eyeLabel" x="209" y="47" font-family="IBM Plex Mono" font-size="10" fill="#D4963B">EYES: SAFE</text>
                <circle cx="132" cy="148" r="6" fill="rgba(53,150,114,0.28)" stroke="#359672" stroke-width="1.5"></circle>
                <line x1="126" y1="148" x2="72" y2="148" stroke="#359672" stroke-width="1"></line>
                <text x="68" y="144" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#359672">KIDNEYS</text>
                <text id="kidneySub" x="68" y="156" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#359672">CLEAR</text>
                <circle cx="161" cy="238" r="6" fill="rgba(70,134,204,0.28)" stroke="#4686CC" stroke-width="1.5"></circle>
                <line x1="167" y1="238" x2="205" y2="238" stroke="#4686CC" stroke-width="1"></line>
                <text id="boneLabel" x="209" y="241" font-family="IBM Plex Mono" font-size="10" fill="#4686CC">BONES: 94%</text>
              </svg>
            </div>
          </div>

          <!-- LIVE HEARTBEAT ECG & VITALS MONITOR -->
          <div class="bg-deck-panel border border-deck-border p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-deck-border pb-2">
              <span class="font-mono text-xs font-bold text-deck-text">LIVE HEARTBEAT &amp; VITALS (ECG)</span>
              <span id="vitalHrBadge" class="font-mono text-xs font-bold text-deck-nominal">112 BPM</span>
            </div>
            <div class="bg-deck-well border border-deck-border h-20 overflow-hidden">
              <canvas id="ecgCanvas" class="w-full h-full block"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 font-mono text-xs">
              <div class="bg-deck-well border border-deck-border p-2">
                <div class="text-[10px] text-deck-muted">BLOOD PRESS</div>
                <strong id="vitalBp" class="text-deck-text">124/78</strong>
              </div>
              <div class="bg-deck-well border border-deck-border p-2">
                <div class="text-[10px] text-deck-muted">OXYGEN SpO2</div>
                <strong id="vitalSpo2" class="text-deck-nominal">98%</strong>
              </div>
              <div class="bg-deck-well border border-deck-border p-2">
                <div class="text-[10px] text-deck-muted">HEAD PRESS</div>
                <strong id="vitalIcp" class="text-deck-caution">15.2 mmHg</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT 7 COLS: DECISION STORY + SLIDER + RADAR + LINE GRAPH -->
        <div class="lg:col-span-7 space-y-5 flex flex-col justify-between">
          <div class="bg-deck-panel border border-deck-border p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-deck-border">
              <span class="font-bold text-base text-deck-text">Cross-System Balance Controller</span>
              <span id="conflictPill" class="font-mono text-[10px] px-2.5 py-1 border border-deck-nominal bg-deck-nominalTint text-deck-nominal">BALANCED PLAN ACTIVE</span>
            </div>
            <p class="text-xs sm:text-sm text-deck-secondary leading-relaxed">${c.story}</p>

            <div class="grid grid-cols-3 gap-2.5">
              <div class="bg-deck-well border border-deck-border p-3">
                <div class="text-[11px] text-deck-muted">Eye Risk</div>
                <div id="kpiSans" class="font-mono text-xl font-bold text-deck-caution mt-1">+6.0%</div>
              </div>
              <div class="bg-deck-well border border-deck-border p-3">
                <div class="text-[11px] text-deck-muted">Kidney Risk</div>
                <div id="kpiRenal" class="font-mono text-xl font-bold text-deck-nominal mt-1">LOW</div>
              </div>
              <div class="bg-deck-well border border-deck-border p-3">
                <div class="text-[11px] text-deck-muted">Bone Kept</div>
                <div id="kpiBone" class="font-mono text-xl font-bold text-deck-accent mt-1">94%</div>
              </div>
            </div>

            <div class="space-y-2.5 pt-2 border-t border-deck-border">
              <div class="flex flex-wrap justify-between items-center gap-2">
                <span class="text-xs font-semibold text-deck-text">Drag Countermeasure Trade-Off Slider:</span>
                <div class="flex gap-1.5 font-mono text-[11px]">
                  <button onclick="ConflictEngine.setSlider(0)" class="px-2.5 py-1 bg-deck-well border border-deck-critical/60 text-deck-critical cursor-pointer">Heavy Squats</button>
                  <button onclick="ConflictEngine.setSlider(50)" class="px-2.5 py-1 bg-deck-accent text-deck-text font-semibold cursor-pointer">Balanced Pivot</button>
                  <button onclick="ConflictEngine.setSlider(100)" class="px-2.5 py-1 bg-deck-well border border-deck-border text-deck-secondary cursor-pointer">Rest Eyes</button>
                </div>
              </div>
              <input id="tradeoffSlider" type="range" min="0" max="100" step="5" value="50" oninput="ConflictEngine.updateModel(this.value)" class="deck-slider" />
              <div class="flex justify-between font-mono text-[10px] text-deck-secondary">
                <span>0% Heavy Squats Only</span>
                <span class="text-deck-accent font-semibold">50% Moderate + LBNP + Water</span>
                <span>100% Light Recovery</span>
              </div>
            </div>
          </div>

          <!-- ALWAYS-VISIBLE RADAR & 30-DAY LINE GRAPH -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="bg-deck-panel border border-deck-border p-4">
              <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-2 border-b border-deck-border">BODY EQUILIBRIUM RADAR</div>
              <svg class="w-full h-[215px]" viewBox="0 0 560 350">
                <polygon fill="#0F1822" points="280,45 405,117 405,261 280,333 155,261 155,117" stroke="#29394B"></polygon>
                <polygon fill="none" points="280,98 360,144 360,236 280,282 200,236 200,144" stroke="#65788C" stroke-dasharray="4,3"></polygon>
                <polygon fill="rgba(214,71,63,0.18)" points="280,55 345,155 412,268 280,324 180,245 148,112" stroke="#D6473F" stroke-width="2"></polygon>
                <polygon id="radarProtocolPoly" class="smooth-geom" fill="rgba(70,134,204,0.22)" points="280,94 365,144 350,230 280,260 208,234 198,140" stroke="#4686CC" stroke-width="2.5"></polygon>
                <text fill="#E4EAF0" font-family="IBM Plex Mono" font-size="12" text-anchor="middle" x="280" y="25">BONE</text>
                <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="12" text-anchor="start" x="418" y="117">WATER</text>
                <text fill="#D6473F" font-family="IBM Plex Mono" font-size="12" text-anchor="start" x="418" y="268">EYES</text>
                <text fill="#D4963B" font-family="IBM Plex Mono" font-size="12" text-anchor="middle" x="280" y="348">KIDNEYS</text>
                <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="12" text-anchor="end" x="142" y="268">SLEEP</text>
                <text fill="#D4963B" font-family="IBM Plex Mono" font-size="12" text-anchor="end" x="142" y="117">CO2</text>
              </svg>
            </div>

            <div class="bg-deck-panel border border-deck-border p-4">
              <div class="font-mono text-[11px] font-bold uppercase pb-2 mb-2 border-b border-deck-border">30-DAY RISK LINE GRAPH</div>
              <svg class="w-full h-[215px]" viewBox="0 0 540 250">
                <line stroke="#1F2D3D" x1="45" y1="30" x2="510" y2="30"></line>
                <line stroke="#1F2D3D" x1="45" y1="125" x2="510" y2="125"></line>
                <line stroke="#29394B" x1="45" y1="210" x2="510" y2="210"></line>
                <line stroke="#D6473F" stroke-dasharray="6,4" stroke-width="1.5" x1="45" y1="80" x2="510" y2="80"></line>
                <text fill="#D6473F" font-family="IBM Plex Mono" font-size="11" x="50" y="70">70% DANGER LIMIT</text>
                <path d="M 55,144 C 160,136 290,104 400,66 L 495,50" fill="none" stroke="#D6473F" stroke-width="2" stroke-dasharray="4,3"></path>
                <path id="trajProtocolPath" class="smooth-geom" d="M 55,144 C 165,152 295,150 400,146 L 495,144" fill="none" stroke="#4686CC" stroke-width="2.5"></path>
                <circle id="trajEndDot" class="smooth-geom" cx="495" cy="144" r="4.5" fill="#4686CC"></circle>
                <text id="trajEndLbl" fill="#4686CC" font-family="IBM Plex Mono" font-size="12" text-anchor="end" x="490" y="168">36% SAFE</text>
                <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="11" x="45" y="232">DAY ${c.mission_day}</text>
                <text fill="#94A5B8" font-family="IBM Plex Mono" font-size="11" text-anchor="end" x="505" y="232">DAY ${c.mission_day + 30}</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- ALWAYS-VISIBLE CAUSE-AND-EFFECT FLOWCHART -->
      <div class="bg-deck-panel border border-deck-border p-5">
        <div class="flex justify-between items-center pb-3 mb-4 border-b border-deck-border font-mono">
          <span class="text-xs font-bold uppercase tracking-wider">CAUSE-AND-EFFECT FLOWCHART // HOW BODY SYSTEMS CONNECT</span>
          <span class="text-[10px] text-deck-accent border border-deck-accent px-2 py-0.5">LIVE SIGNAL FLOW</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-11 items-center gap-2 font-mono text-xs">
          <div class="md:col-span-3 space-y-2">
            <div class="p-2.5 bg-deck-well border border-deck-caution/60 text-deck-caution">1. Water Balance (${c.hydration_delta_ml.toFixed(0)} mL)</div>
            <div class="p-2.5 bg-deck-well border border-deck-border text-deck-text">2. Workout Load</div>
            <div class="p-2.5 bg-deck-well border border-deck-caution/60 text-deck-caution">3. Cabin CO2 (${c.cabin_co2_mmhg.toFixed(1)})</div>
          </div>
          <div class="hidden md:block md:col-span-1 h-32">
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 140">
              <path class="bus-flow" d="M 0,22 L 100,22" fill="none" stroke="#D4963B" stroke-width="1.6"></path>
              <path class="bus-flow" d="M 0,70 L 50,70 L 50,95 L 100,95" fill="none" stroke="#4686CC" stroke-width="1.6"></path>
              <path class="bus-flow" d="M 0,118 L 50,118 L 50,95" fill="none" stroke="#D4963B" stroke-width="1.6"></path>
            </svg>
          </div>
          <div class="md:col-span-2 space-y-2">
            <div class="p-2.5 bg-deck-well border border-deck-border text-deck-caution">Urine Concentration</div>
            <div class="p-2.5 bg-deck-well border border-deck-border text-deck-caution">Fluid Shift to Head</div>
          </div>
          <div class="hidden md:block md:col-span-1 h-32">
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 140">
              <path class="bus-flow" d="M 0,25 L 100,25" fill="none" stroke="#D4963B" stroke-width="1.6"></path>
              <path class="bus-flow" d="M 0,95 L 50,95 L 50,70 L 100,70" fill="none" stroke="#D6473F" stroke-width="1.6"></path>
              <path class="bus-flow" d="M 50,95 L 50,118 L 100,118" fill="none" stroke="#359672" stroke-width="1.6"></path>
            </svg>
          </div>
          <div class="md:col-span-2 space-y-2">
            <div id="flowRenalNode" class="p-2.5 bg-deck-well border border-deck-nominal text-deck-nominal">Kidneys: Safe</div>
            <div id="flowEyeNode" class="p-2.5 bg-deck-well border border-deck-caution text-deck-caution">Eyes: Buffered</div>
            <div id="flowBoneNode" class="p-2.5 bg-deck-well border border-deck-accent text-deck-accent">Bones: 94% Kept</div>
          </div>
          <div class="md:col-span-2 p-3 bg-deck-well border border-deck-accent text-center">
            <div class="font-bold text-deck-accent mb-1">RESULT</div>
            <div id="flowResultNode" class="text-[11px] text-deck-nominal">All 3 Systems Balanced</div>
          </div>
        </div>
      </div>
    `;
    this.updateModel(50);
    this.startEcgLoop();
  },

  startEcgLoop() {
    if (this.ecgRaf) cancelAnimationFrame(this.ecgRaf);
    const canvas = document.getElementById("ecgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const samples = [];
    let xPos = 0;

    const ecgShape = p => {
      if (p > 0.10 && p < 0.18) return Math.sin(((p - 0.10) / 0.08) * Math.PI) * 0.16;
      if (p >= 0.24 && p < 0.27) return -0.18;
      if (p >= 0.27 && p < 0.305) return 1.0;
      if (p >= 0.305 && p < 0.34) return -0.3;
      if (p > 0.44 && p < 0.56) return Math.sin(((p - 0.44) / 0.12) * Math.PI) * 0.26;
      return 0;
    };

    const draw = now => {
      if (!document.getElementById("ecgCanvas")) return;
      const w = canvas.clientWidth || 300;
      const h = canvas.clientHeight || 80;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const periodSec = 60 / this.bpm;
      const phase = ((now / 1000) % periodSec) / periodSec;
      const val = ecgShape(phase);
      const y = h * 0.58 - val * (h * 0.42);

      samples[xPos] = y;
      xPos = (xPos + 2) % w;

      ctx.fillStyle = "#0F1822";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(41, 57, 75, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.58);
      ctx.lineTo(w, h * 0.58);
      ctx.stroke();

      ctx.strokeStyle = this.ecgColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < w; x += 2) {
        if (samples[x] === undefined || Math.abs(x - xPos) < 8) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(x, samples[x]);
          started = true;
        } else {
          ctx.lineTo(x, samples[x]);
        }
      }
      ctx.stroke();

      this.ecgRaf = requestAnimationFrame(draw);
    };
    this.ecgRaf = requestAnimationFrame(draw);
  },

  setSlider(v) {
    document.getElementById("tradeoffSlider").value = v;
    this.updateModel(v);
  },

  updateModel(val) {
    const v = Number(val);
    const s = window.HomeostasisState;
    const c = s.crewProfiles[s.activeCrewId];
    const sans = Math.round((c.sansBase + s.microCheckSansPenalty - v * 0.24) * 10) / 10;
    const renalIdx = Math.max(18, Math.round(52 + c.renalBase - v * 0.55));
    const bonePct = Math.round(100 - v * 0.18);

    // Update Heartbeat & Vitals dynamically based on workout strain vs LBNP relief
    this.bpm = Math.round(142 - v * 0.58);
    this.ecgColor = this.bpm > 128 ? "#D6473F" : this.bpm > 115 ? "#D4963B" : "#359672";
    const sys = Math.round(156 - v * 0.36);
    const dia = Math.round(94 - v * 0.18);
    const icp = (18.6 - v * 0.065).toFixed(1);

    const hrBadge = document.getElementById("vitalHrBadge");
    if (hrBadge) {
      hrBadge.textContent = this.bpm + " BPM";
      hrBadge.style.color = this.ecgColor;
      document.getElementById("vitalBp").textContent = `${sys}/${dia}`;
      document.getElementById("vitalIcp").textContent = `${icp} mmHg`;
    }

    const kpiSans = document.getElementById("kpiSans");
    kpiSans.textContent = (sans >= 0 ? "+" : "") + sans.toFixed(1) + "%";
    kpiSans.className = "font-mono text-xl font-bold mt-1 " + (sans > 10 ? "text-deck-critical" : sans > 3 ? "text-deck-caution" : "text-deck-nominal");

    const kpiRenal = document.getElementById("kpiRenal");
    kpiRenal.textContent = renalIdx > 45 ? "HIGH" : "LOW";
    kpiRenal.className = "font-mono text-xl font-bold mt-1 " + (renalIdx > 45 ? "text-deck-critical" : "text-deck-nominal");
    document.getElementById("kpiBone").textContent = bonePct + "%";

    const particles = document.getElementById("fluidParticles");
    const lbnpBox = document.getElementById("lbnpSuitBox");
    const lbnpLbl = document.getElementById("lbnpSuitLbl");
    const eyeHot = document.getElementById("eyeHotspot");
    const eyeLbl = document.getElementById("eyeLabel");
    const badge = document.getElementById("bodyFlowBadge");
    const pill = document.getElementById("conflictPill");

    if (v < 30) {
      particles.innerHTML = `<circle class="fluid-up" cx="138" cy="70" r="4" fill="#D6473F"></circle><circle class="fluid-up" cx="152" cy="90" r="4" fill="#D6473F" style="animation-delay:0.6s"></circle><circle class="fluid-up" cx="145" cy="110" r="4" fill="#D4963B" style="animation-delay:1.2s"></circle>`;
      lbnpBox.setAttribute("opacity", "0.15");
      lbnpLbl.textContent = "LBNP SUIT OFF";
      eyeHot.setAttribute("stroke", "#D6473F");
      eyeLbl.setAttribute("fill", "#D6473F");
      eyeLbl.textContent = `EYES: +${sans}%`;
      badge.textContent = "FLUID RISING TO HEAD";
      badge.className = "font-mono text-[10px] px-2 py-1 border border-deck-critical bg-deck-criticalTint text-deck-critical";
      pill.textContent = "CONFLICT TRIGGERED";
      pill.className = "font-mono text-[10px] px-2.5 py-1 border border-deck-critical bg-deck-criticalTint text-deck-critical";
      document.getElementById("flowEyeNode").textContent = `Eyes: High Strain (+${sans}%)`;
      document.getElementById("flowResultNode").textContent = "Hold High-Load Squats";
    } else {
      particles.innerHTML = `<circle class="fluid-down" cx="138" cy="70" r="3.5" fill="#4686CC"></circle><circle class="fluid-down" cx="152" cy="90" r="3.5" fill="#4686CC" style="animation-delay:0.7s"></circle><circle class="fluid-down" cx="145" cy="110" r="3.5" fill="#359672" style="animation-delay:1.4s"></circle>`;
      lbnpBox.setAttribute("opacity", "1");
      lbnpLbl.textContent = "LBNP SUIT ACTIVE";
      eyeHot.setAttribute("stroke", sans > 3 ? "#D4963B" : "#359672");
      eyeLbl.setAttribute("fill", sans > 3 ? "#D4963B" : "#359672");
      eyeLbl.textContent = `EYES: ${sans >= 0 ? "+" : ""}${sans}%`;
      badge.textContent = "HEALTHY DOWNWARD FLOW";
      badge.className = "font-mono text-[10px] px-2 py-1 border border-deck-nominal bg-deck-nominalTint text-deck-nominal";
      pill.textContent = "BALANCED PLAN ACTIVE";
      pill.className = "font-mono text-[10px] px-2.5 py-1 border border-deck-nominal bg-deck-nominalTint text-deck-nominal";
      document.getElementById("flowEyeNode").textContent = `Eyes: Safe (${sans >= 0 ? "+" : ""}${sans}%)`;
      document.getElementById("flowResultNode").textContent = "All 3 Systems Balanced";
    }

    document.getElementById("boneLabel").textContent = `BONES: ${bonePct}%`;
    document.getElementById("kidneySub").textContent = renalIdx > 45 ? "AT RISK" : "CLEAR";
    document.getElementById("flowRenalNode").textContent = `Kidneys: ${renalIdx > 45 ? "At Risk" : "Clear"}`;
    document.getElementById("flowBoneNode").textContent = `Bones: ${bonePct}% Kept`;

    const endY = Math.round(48 + v * 1.1);
    const endRisk = Math.max(18, Math.round(78 - v * 0.65));
    document.getElementById("trajProtocolPath").setAttribute("d", `M 55,144 C 165,${Math.round(148 + v * 0.1)} 295,${Math.round(142 + v * 0.1)} 400,${endY} L 495,${endY}`);
    document.getElementById("trajEndDot").setAttribute("cy", endY);
    document.getElementById("trajEndLbl").setAttribute("y", endY + 20);
    document.getElementById("trajEndLbl").textContent = endRisk + "% RISK";
    document.getElementById("radarProtocolPoly").setAttribute("points", `280,${Math.round(58 + v * 0.55)} 365,144 ${Math.round(395 - v * 0.75)},${Math.round(256 - v * 0.45)} 280,${Math.round(285 - v * 0.4)} 208,234 198,140`);

    if (window.App && window.App.updateTopRings) window.App.updateTopRings();
    clearTimeout(this.apiTimer);
    this.apiTimer = setTimeout(() => this.evaluateWithBackend(v), 180);
  },

  async evaluateWithBackend(sliderValue) {
    const requestVersion = ++this.apiRequestVersion;
    const state = window.HomeostasisState;
    const resistance = 100 - sliderValue;
    const protocol = {
      resistance_load_pct: resistance,
      lbnp_minutes: Math.round((sliderValue / 100) * 45),
      post_workout_hydration_ml: Math.round(100 + sliderValue * 6),
      potassium_citrate_supplement: sliderValue >= 50,
      cabin_co2_scrub_boost: sliderValue >= 50
    };
    try {
      const result = await window.HomeostasisApi.evaluateConflicts(state.activeCrewId, protocol);
      if (requestVersion !== this.apiRequestVersion) return;
      const radar = result.projected_radar;
      const sansRisk = 100 - radar["Ocular / SANS Safety"];
      const renalRisk = 100 - radar["Renal Safety"];
      const boneSafety = radar["Bone Stability"];
      const sans = document.getElementById("kpiSans");
      const renal = document.getElementById("kpiRenal");
      const bone = document.getElementById("kpiBone");
      if (sans) {
        sans.textContent = `${sansRisk.toFixed(1)}%`;
        sans.className = `font-mono text-xl font-bold mt-1 ${sansRisk >= 45 ? "text-deck-critical" : sansRisk >= 30 ? "text-deck-caution" : "text-deck-nominal"}`;
      }
      if (renal) {
        renal.textContent = `${renalRisk.toFixed(1)}%`;
        renal.className = `font-mono text-xl font-bold mt-1 ${renalRisk >= 45 ? "text-deck-critical" : renalRisk >= 30 ? "text-deck-caution" : "text-deck-nominal"}`;
      }
      if (bone) bone.textContent = `${boneSafety.toFixed(1)}%`;
      const eyeLabel = document.getElementById("eyeLabel");
      const kidneySub = document.getElementById("kidneySub");
      const boneLabel = document.getElementById("boneLabel");
      const flowEye = document.getElementById("flowEyeNode");
      const flowRenal = document.getElementById("flowRenalNode");
      const flowBone = document.getElementById("flowBoneNode");
      if (eyeLabel) eyeLabel.textContent = `EYES: ${sansRisk.toFixed(1)}% RISK`;
      if (kidneySub) kidneySub.textContent = renalRisk >= 45 ? "AT RISK" : "CLEAR";
      if (boneLabel) boneLabel.textContent = `BONES: ${boneSafety.toFixed(1)}%`;
      if (flowEye) flowEye.textContent = `Eyes: ${sansRisk.toFixed(1)}% risk`;
      if (flowRenal) flowRenal.textContent = `Kidneys: ${renalRisk.toFixed(1)}% risk`;
      if (flowBone) flowBone.textContent = `Bones: ${boneSafety.toFixed(1)}% stable`;

      const pill = document.getElementById("conflictPill");
      const flowResult = document.getElementById("flowResultNode");
      const traps = result.active_traps;
      if (pill) {
        pill.textContent = traps.length ? `${traps.length} COUNTERMEASURE TRAP${traps.length === 1 ? "" : "S"}` : "NO ACTIVE TRAPS";
        const tone = traps.some(trap => trap.severity === "red") ? "critical" : traps.length ? "caution" : "nominal";
        pill.className = `font-mono text-[10px] px-2.5 py-1 border border-deck-${tone} bg-deck-${tone}Tint text-deck-${tone}`;
      }
      if (flowResult) {
        flowResult.textContent = traps.length ? traps[0].recommended_pivot : "No active traps in this plan";
      }
      window.App.reportApiConnected();
    } catch (error) {
      if (requestVersion === this.apiRequestVersion) window.App.reportApiError(error);
    }
  }
};