window.MicroCheck = {
  motorCells: [],
  tapStart: 0,
  tapTimes: [],
  activeCell: -1,
  cogPenalty: 0,
  voicePauseRatio: 0.142,

  render() {
    document.getElementById("microModal").innerHTML = `
      <div class="w-[820px] max-w-full bg-deck-surface border border-deck-border flex flex-col">
        <div class="border-b border-deck-border px-5 py-3 flex items-center justify-between bg-deck-panel">
          <div>
            <div class="font-bold text-sm text-deck-text">15-Second Astronaut Quick Check</div>
            <div class="text-xs text-deck-secondary">Fast eye, reflex, and voice check instead of 14 boring daily forms</div>
          </div>
          <button onclick="MicroCheck.close()" class="px-3 py-1 bg-deck-well border border-deck-border text-deck-secondary font-mono text-xs cursor-pointer">[ CLOSE ]</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-deck-border bg-deck-panel">
          <div class="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div class="font-bold text-xs text-deck-text mb-1">1. Eye Distortion Check (5s)</div>
              <p class="text-[11px] text-deck-secondary mb-2">Tap any square that looks wavy or blurry:</p>
              <div id="amslerGrid" class="w-[180px] h-[180px] mx-auto grid grid-cols-6 grid-rows-6 border border-deck-border bg-deck-well relative">
                <div class="w-1.5 h-1.5 bg-deck-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
              </div>
            </div>
            <div class="font-mono text-xs pt-2 border-t border-deck-border flex justify-between">
              <span>Tapped: <strong id="amslerCount" class="text-deck-critical">0</strong>/36</span>
              <span id="amslerRisk" class="text-deck-nominal">Eyes Clear</span>
            </div>
          </div>

          <div class="p-4 flex flex-col justify-between space-y-3">
            <div>
              <div class="font-bold text-xs text-deck-text mb-1">2. Reflex Speed Tap (5s)</div>
              <p class="text-[11px] text-deck-secondary mb-2">Tap the blue box 5 times as fast as you can:</p>
              <p class="text-[10px] text-deck-muted mb-2">If skipped, the demo uses the displayed 248 ms sample.</p>
              <div id="motorGrid" class="w-[180px] h-[180px] mx-auto grid grid-cols-4 grid-rows-4 border border-deck-border bg-deck-well"></div>
              <button onclick="MicroCheck.startMotorTest()" class="w-full mt-2 py-1.5 bg-deck-accent text-deck-text font-mono text-[11px] font-semibold cursor-pointer">Start Reflex Game</button>
            </div>
            <div class="font-mono text-xs pt-2 border-t border-deck-border flex justify-between">
              <span>Speed: <strong id="motorMs" class="text-deck-text">248 ms</strong></span>
              <span id="motorDrift" class="text-deck-nominal">Sharp</span>
            </div>
          </div>

          <div class="p-4 flex flex-col justify-between space-y-3">
            <div class="space-y-2">
              <div class="font-bold text-xs text-deck-text">3. Voice Fatigue Check (5s)</div>
              <p class="text-[11px] text-deck-secondary">Reads speech pauses for tiredness:</p>
              <div class="bg-deck-well border border-deck-border p-2 font-mono text-[11px] text-deck-text">"Systems nominal, ready for EVA-04."</div>
              <p class="text-[10px] text-deck-muted">Only pauses are measured here; speech rate and pitch use demo reference values.</p>
              <div id="voiceBars" class="h-12 bg-deck-well border border-deck-border p-2 flex items-end gap-1">
                <div class="flex-1 bg-deck-accent h-[40%]"></div><div class="flex-1 bg-deck-accent h-[70%]"></div><div class="flex-1 bg-deck-accent h-[55%]"></div><div class="flex-1 bg-deck-accent h-[85%]"></div><div class="flex-1 bg-deck-caution h-[50%]"></div><div class="flex-1 bg-deck-track h-[20%]"></div>
              </div>
              <button onclick="MicroCheck.runLiveVoice()" class="w-full py-1.5 bg-deck-accent text-deck-text font-mono text-[11px] font-semibold cursor-pointer">Record 5s Mic</button>
              <button onclick="MicroCheck.runSampleVoice()" class="w-full py-1.5 bg-deck-well border border-deck-border font-mono text-[11px] text-deck-text cursor-pointer">Use Sample Audio</button>
            </div>
            <div class="font-mono text-xs pt-2 border-t border-deck-border flex justify-between">
              <span>Pauses: <strong id="voicePause" class="text-deck-text">14.2%</strong></span>
              <span id="voiceFlag" class="text-deck-nominal">Rested</span>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-deck-border bg-deck-surface flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs text-deck-secondary">Applying results updates the Body Simulator and Spacewalk Rings immediately.</span>
          <button onclick="MicroCheck.apply()" class="px-4 py-2 bg-deck-accent text-deck-text font-semibold text-xs cursor-pointer">Update Astronaut Health</button>
        </div>
      </div>
    `;

    const amslerGrid = document.getElementById("amslerGrid");
    for (let i = 0; i < 36; i++) {
      const c = document.createElement("div");
      c.className = "border-[0.5px] border-deck-border cursor-pointer";
      c.onclick = () => {
        c.classList.toggle("bg-deck-critical");
        const count = amslerGrid.querySelectorAll(".bg-deck-critical").length;
        document.getElementById("amslerCount").textContent = count;
        document.getElementById("amslerRisk").textContent = count > 0 ? `+${count * 2}% Strain` : "Eyes Clear";
      };
      amslerGrid.appendChild(c);
    }

    const motorGrid = document.getElementById("motorGrid");
    this.motorCells = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement("div");
      c.className = "border-[0.5px] border-deck-border flex items-center justify-center cursor-pointer";
      c.onclick = () => {
        if (i !== this.activeCell) return;
        this.tapTimes.push(Math.round(performance.now() - this.tapStart));
        c.innerHTML = "";
        if (this.tapTimes.length >= 5) {
          this.activeCell = -1;
          this.tapTimes.sort((a, b) => a - b);
          const med = this.tapTimes[2];
          const drift = Math.round(((med - 248) / 248) * 100);
          this.cogPenalty = Math.max(0, Math.round(drift / 3));
          document.getElementById("motorMs").textContent = med + " ms";
          document.getElementById("motorDrift").textContent = drift > 10 ? "Slowed" : "Sharp";
        } else {
          this.nextMotorTarget();
        }
      };
      this.motorCells.push(c);
      motorGrid.appendChild(c);
    }
  },

  open() { document.getElementById("microModal").classList.remove("hidden"); },
  close() { document.getElementById("microModal").classList.add("hidden"); },
  startMotorTest() { this.tapTimes = []; this.nextMotorTarget(); },

  nextMotorTarget() {
    this.motorCells.forEach(c => (c.innerHTML = ""));
    this.activeCell = Math.floor(Math.random() * 16);
    this.motorCells[this.activeCell].innerHTML = '<div class="w-6 h-6 bg-deck-accent"></div>';
    this.tapStart = performance.now();
  },

  async runLiveVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let silent = 0, total = 0;
      const timer = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        total++;
        if (avg < 10) silent++;
        this.updateBars(avg);
      }, 100);
      setTimeout(() => {
        clearInterval(timer);
        stream.getTracks().forEach(t => t.stop());
        ctx.close();
        const ratio = ((silent / Math.max(1, total)) * 100).toFixed(1);
        this.voicePauseRatio = Number(ratio) / 100;
        document.getElementById("voicePause").textContent = ratio + "%";
        document.getElementById("voiceFlag").textContent = ratio > 20 ? "Fatigued" : "Rested";
        if (ratio > 20) this.cogPenalty += 5;
      }, 3500);
    } catch (error) {
      document.getElementById("voiceFlag").textContent = "Mic unavailable";
      console.error("Could not access microphone:", error);
    }
  },

  runSampleVoice() {
    this.updateBars(65);
    this.voicePauseRatio = 0.228;
    document.getElementById("voicePause").textContent = "22.8%";
    document.getElementById("voiceFlag").textContent = "Fatigued";
    this.cogPenalty += 5;
  },

  updateBars(level) {
    const bars = document.getElementById("voiceBars").children;
    for (let b of bars) b.style.height = Math.min(95, Math.max(15, Math.round(level + Math.random() * 45))) + "%";
  },

  async apply() {
    const state = window.HomeostasisState;
    const reactionTimes = this.tapTimes.length >= 3
      ? this.tapTimes
      : Array(3).fill(Number.parseInt(document.getElementById("motorMs").textContent, 10));
    const payload = {
      crew_id: state.activeCrewId,
      amsler_distorted_cells: Array.from(document.getElementById("amslerGrid").children)
        .map((cell, index) => cell.classList.contains("bg-deck-critical") ? index : -1)
        .filter(index => index >= 0),
      reaction_times_ms: reactionTimes,
      voice_duration_sec: 5,
      voice_pause_ratio: this.voicePauseRatio,
      voice_speech_rate_wpm: 120,
      voice_pitch_variance_hz: 15
    };
    try {
      await window.HomeostasisApi.submitMicroCheck(payload);
      this.close();
      await window.App.loadCrew(state.activeCrewId);
      window.ConflictEngine.render();
      window.RxDrift.render();
      window.EquilibriumSandbox.render();
      window.App.updateTopRings();
      window.App.reportApiConnected();
    } catch (error) {
      window.App.reportApiError(error);
    }
  }
};