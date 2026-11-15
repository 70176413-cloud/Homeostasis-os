window.OrbitHero = (() => {
  const canvas = document.getElementById("launchStageCanvas");
  if (!canvas) return { startLaunch() {} };
  const ctx = canvas.getContext("2d");
  const phaseLbl = document.getElementById("stagePhaseLbl");
  const altLbl = document.getElementById("stageAltLbl");

  let W = 0, H = 0;
  let launched = false;
  let launchStartTime = null;

  // Real NASA Blue Marble Earth photograph
  const earthImg = new Image();
  earthImg.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Earth_Western_Hemisphere_transparent_background.png/960px-Earth_Western_Hemisphere_transparent_background.png";

  // Real NASA Space Shuttle Challenger transparent PNG (NASA Dryden Flight Research Center)
  const shuttleImg = new Image();
  shuttleImg.src = "https://upload.wikimedia.org/wikipedia/commons/a/aa/Shuttle.png";

  const starColors = ["#CFE2FF", "#F2F6FC", "#FFF2DC", "#AFC8EB"];
  const stars = Array.from({ length: 180 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: i < 4 ? 1.15 : Math.random() * 0.7 + 0.25,
    alpha: i < 4 ? 0.9 : Math.random() * 0.55 + 0.15,
    color: starColors[i % starColors.length],
    speed: Math.random() * 0.00009 + 0.00002,
    spike: i < 4
  }));

  const smokeParticles = [];
  const exhaustPlume = [];

  function syncCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (Math.abs(rect.width - W) > 0.5 || Math.abs(rect.height - H) > 0.5) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function spawnExhaust(rx, ry, angle, speedBoost) {
    const backX = rx - Math.sin(angle) * 30;
    const backY = ry + Math.cos(angle) * 30;
    for (let i = 0; i < 2; i++) {
      exhaustPlume.push({
        x: backX + (Math.random() - 0.5) * 5,
        y: backY + (Math.random() - 0.5) * 5,
        vx: -Math.sin(angle) * (1.9 + speedBoost) + (Math.random() - 0.5) * 0.7,
        vy: Math.cos(angle) * (1.9 + speedBoost) + (Math.random() - 0.5) * 0.7,
        r: Math.random() * 5.5 + 3.5,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.025
      });
    }
  }

  function spawnLaunchSmoke(padX, padY) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    smokeParticles.push({
      x: padX + (Math.random() - 0.5) * 14,
      y: padY,
      vx: dir * (Math.random() * 1.5 + 0.5),
      vy: -(Math.random() * 0.35 + 0.1),
      r: Math.random() * 9 + 7,
      life: 1.0,
      decay: 0.016
    });
  }

  function drawRealEarth(earthCx, earthCy, earthR, orbitR, rotAngle) {
    ctx.save();

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(70, 134, 204, 0.32)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(earthCx, earthCy, orbitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const atmos = ctx.createRadialGradient(earthCx, earthCy, earthR * 0.9, earthCx, earthCy, earthR + 24);
    atmos.addColorStop(0, "rgba(86, 154, 232, 0.44)");
    atmos.addColorStop(0.55, "rgba(56, 118, 194, 0.15)");
    atmos.addColorStop(1, "rgba(7, 11, 17, 0)");
    ctx.fillStyle = atmos;
    ctx.beginPath();
    ctx.arc(earthCx, earthCy, earthR + 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(earthCx, earthCy, earthR, 0, Math.PI * 2);
    ctx.clip();

    if (earthImg.complete && earthImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(earthCx, earthCy);
      ctx.rotate(rotAngle);
      const drawSize = earthR * 2 * 1.04;
      ctx.drawImage(earthImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    } else {
      ctx.fillStyle = "#102E52";
      ctx.fillRect(earthCx - earthR, earthCy - earthR, earthR * 2, earthR * 2);
    }

    const shade = ctx.createRadialGradient(
      earthCx - earthR * 0.38, earthCy - earthR * 0.38, earthR * 0.15,
      earthCx, earthCy, earthR
    );
    shade.addColorStop(0, "rgba(255, 255, 255, 0.03)");
    shade.addColorStop(0.68, "rgba(7, 11, 17, 0.2)");
    shade.addColorStop(1, "rgba(5, 8, 14, 0.78)");
    ctx.fillStyle = shade;
    ctx.fillRect(earthCx - earthR, earthCy - earthR, earthR * 2, earthR * 2);

    ctx.restore();
  }

  function drawRealRocket(x, y, angle, thrustPower, scale, timeSec) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Supersonic plasma exhaust plume below the engines
    if (thrustPower > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const flicker = Math.sin(timeSec * 48) * 3.5 + Math.cos(timeSec * 33) * 2.5;
      const len = (32 + flicker) * thrustPower;

      const plume = ctx.createRadialGradient(0, 28 + len * 0.35, 1, 0, 28 + len * 0.45, len * 0.9);
      plume.addColorStop(0, "rgba(255, 245, 214, 0.95)");
      plume.addColorStop(0.32, "rgba(255, 158, 44, 0.68)");
      plume.addColorStop(0.7, "rgba(214, 71, 63, 0.28)");
      plume.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = plume;
      ctx.beginPath();
      ctx.ellipse(0, 28 + len * 0.42, 9 * thrustPower, len * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let d = 0; d < 3; d++) {
        const dy = 30 + d * (len * 0.22);
        const dw = 3.2 - d * 0.7;
        ctx.fillStyle = `rgba(255, 250, 235, ${0.9 - d * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(0, dy, dw, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw real NASA Space Shuttle image preserving natural aspect ratio
    if (shuttleImg.complete && shuttleImg.naturalWidth > 0) {
      const h = 68;
      const w = h * (shuttleImg.naturalWidth / shuttleImg.naturalHeight);
      ctx.drawImage(shuttleImg, -w / 2, -h / 2, w, h);
    } else {
      // Minimal silhouette only while image finishes downloading
      ctx.fillStyle = "#E4EAF0";
      ctx.fillRect(-5, -20, 10, 40);
    }

    ctx.restore();
  }

  function frame(now) {
    syncCanvasSize();
    if (W === 0 || H === 0) {
      requestAnimationFrame(frame);
      return;
    }

    const introOverlay = document.getElementById("intro-overlay");
    const introStillPlaying = introOverlay && getComputedStyle(introOverlay).display !== "none";
    if (!introStillPlaying && !launched) {
      launched = true;
      launchStartTime = now;
    }

    ctx.fillStyle = "#070B11";
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      s.x -= s.speed;
      if (s.x < 0) s.x = 1;
      const sx = s.x * W;
      const sy = s.y * H;
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.spike) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy);
        ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy + 4);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    const isDesktop = W >= 1024;
    const earthCx = isDesktop ? W * 0.76 : W * 0.5;
    const earthCy = isDesktop ? H * 0.45 : H * 0.73;
    const earthR = isDesktop ? Math.min(82, H * 0.22) : Math.min(58, H * 0.14);
    const orbitR = earthR + (isDesktop ? 64 : 44);

    drawRealEarth(earthCx, earthCy, earthR, orbitR, (now / 1000) * 0.025);

    if (isDesktop) {
      const fade = ctx.createLinearGradient(0, 0, W * 0.58, 0);
      fade.addColorStop(0, "rgba(7, 11, 17, 0.85)");
      fade.addColorStop(0.75, "rgba(7, 11, 17, 0.45)");
      fade.addColorStop(1, "rgba(7, 11, 17, 0)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W * 0.58, H);
    }

    const padY = earthCy - earthR - 30;
    const orbitTopY = earthCy - orbitR;

    let rx = earthCx;
    let ry = padY;
    let angle = 0;
    let thrust = 0;
    let scale = 1.0;
    let t = 0;

    if (launched) {
      t = (now - launchStartTime) / 1000;

      if (t < 1.5) {
        rx = earthCx + Math.sin(t * 55) * 0.8;
        ry = padY;
        angle = 0;
        thrust = 0.5 + (t / 1.5) * 0.75;
        spawnLaunchSmoke(earthCx, earthCy - earthR);
        spawnExhaust(rx, ry, 0, 0.35);
        if (phaseLbl) phaseLbl.textContent = "PHASE: ENGINE IGNITION";
        if (altLbl) altLbl.textContent = "ALT: 0 KM";
      } else if (t < 4.2) {
        const p = (t - 1.5) / 2.7;
        const ease = 1 - Math.pow(1 - p, 2);
        rx = earthCx;
        ry = padY + (orbitTopY - padY) * ease;
        angle = p * (Math.PI * 0.5);
        scale = 1.0 - p * 0.25;
        thrust = 1.25;
        spawnExhaust(rx, ry, angle, 1.8);
        if (phaseLbl) phaseLbl.textContent = "PHASE: LIFTOFF & ASCENT";
        if (altLbl) altLbl.textContent = `ALT: ${Math.round(p * 408)} KM`;
      } else {
        const orbitTime = t - 4.2;
        const theta = -Math.PI / 2 + orbitTime * 0.45;
        rx = earthCx + Math.cos(theta) * orbitR;
        ry = earthCy + Math.sin(theta) * orbitR;
        angle = theta + Math.PI;
        scale = 0.75;
        thrust = 0.85;
        spawnExhaust(rx, ry, angle, 1.2);
        if (phaseLbl) phaseLbl.textContent = "PHASE: CONTINUOUS ORBIT";
        if (altLbl) altLbl.textContent = "ALT: 408 KM // 27,600 KM/H";
      }
    }

    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const s = smokeParticles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.r += 0.25;
      s.life -= s.decay;
      if (s.life <= 0) {
        smokeParticles.splice(i, 1);
      } else {
        const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.1, s.x, s.y, s.r);
        g.addColorStop(0, `rgba(215, 200, 188, ${s.life * 0.28})`);
        g.addColorStop(0.55, `rgba(130, 145, 162, ${s.life * 0.14})`);
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = exhaustPlume.length - 1; i >= 0; i--) {
      const f = exhaustPlume[i];
      f.x += f.vx;
      f.y += f.vy;
      f.life -= f.decay;
      if (f.life <= 0) {
        exhaustPlume.splice(i, 1);
      } else {
        const g = ctx.createRadialGradient(f.x, f.y, 0.5, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(255, 224, 150, ${f.life * 0.55})`);
        g.addColorStop(0.5, `rgba(225, 102, 42, ${f.life * 0.25})`);
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    drawRealRocket(rx, ry, angle, thrust, scale, t);
    requestAnimationFrame(frame);
  }

  function startLaunch() {
    if (launched) return;
    launched = true;
    launchStartTime = performance.now();
  }

  requestAnimationFrame(frame);
  return { startLaunch };
})();