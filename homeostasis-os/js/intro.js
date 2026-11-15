window.IntroSequence = (() => {
  const overlay = document.getElementById("intro-overlay");
  const canvas = document.getElementById("intro-canvas");
  const titleContainer = document.getElementById("title-container");
  if (!overlay || !canvas) return { finish() {} };

  const ctx = canvas.getContext("2d", { alpha: false });
  let W = 0, H = 0, cx = 0, cy = 0;
  let stars = [], ashPlume = [], ejecta = [];
  let rafId, startTime;
  let blastTimer = 0;

  const earthImg = new Image();
  earthImg.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Earth_Western_Hemisphere_transparent_background.png/960px-Earth_Western_Hemisphere_transparent_background.png";

  const starColors = ["#CFE2FF", "#F2F6FC", "#FFF2DC", "#AFC8EB"];

  function syncCanvasSize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (Math.abs(rect.width - W) > 0.5 || Math.abs(rect.height - H) > 0.5) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      cx = W / 2;
      cy = H / 2;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    }
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 300; i++) {
      const bright = i < 7;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: bright ? Math.random() * 0.7 + 1.0 : Math.random() * 0.75 + 0.25,
        alpha: bright ? 0.92 : Math.random() * 0.55 + 0.15,
        color: starColors[i % starColors.length],
        spike: bright
      });
    }
  }

  function drawStarfield() {
    // Deep space background with faint diagonal Milky Way dust haze
    ctx.fillStyle = "#020408";
    ctx.fillRect(0, 0, W, H);

    const milky = ctx.createLinearGradient(0, H * 0.15, W, H * 0.75);
    milky.addColorStop(0, "rgba(18, 34, 58, 0)");
    milky.addColorStop(0.5, "rgba(22, 42, 72, 0.14)");
    milky.addColorStop(1, "rgba(12, 22, 38, 0)");
    ctx.fillStyle = milky;
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      if (s.spike) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - 5, s.y);
        ctx.lineTo(s.x + 5, s.y);
        ctx.moveTo(s.x, s.y - 5);
        ctx.lineTo(s.x, s.y + 5);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function triggerImpact(impactX, impactY) {
    // Volumetric volcanic ash / ejecta puffs
    for (let i = 0; i < 42; i++) {
      const spreadAngle = -Math.PI + Math.random() * Math.PI;
      const speed = Math.random() * 2.2 + 0.4;
      ashPlume.push({
        x: impactX + (Math.random() - 0.5) * 20,
        y: impactY + (Math.random() - 0.5) * 6,
        vx: Math.cos(spreadAngle) * speed * 1.4,
        vy: Math.sin(spreadAngle) * speed * 0.75 - 0.35,
        r: Math.random() * 20 + 14,
        grow: Math.random() * 0.42 + 0.18,
        life: 1.0,
        decay: Math.random() * 0.004 + 0.004,
        ember: i < 16
      });
    }

    // Incandescent ballistic droplets
    for (let i = 0; i < 55; i++) {
      const angle = -Math.PI * 0.92 + Math.random() * (Math.PI * 0.84);
      const speed = Math.random() * 7 + 2.5;
      ejecta.push({
        x: impactX,
        y: impactY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 1.6 + 0.7,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012
      });
    }
  }

  function drawRealEarth(earthY, radius, timeSinceImpact, rotAngle) {
    const earthCx = cx;
    const earthCy = earthY + radius;

    ctx.save();

    // Realistic Rayleigh atmospheric horizon scatter
    const atmos = ctx.createRadialGradient(earthCx, earthCy, radius * 0.94, earthCx, earthCy, radius + 36);
    atmos.addColorStop(0, "rgba(92, 162, 235, 0.48)");
    atmos.addColorStop(0.45, "rgba(56, 118, 194, 0.16)");
    atmos.addColorStop(1, "rgba(2, 4, 8, 0)");
    ctx.fillStyle = atmos;
    ctx.beginPath();
    ctx.arc(earthCx, earthCy, radius + 36, 0, Math.PI * 2);
    ctx.fill();

    // True circular clip
    ctx.beginPath();
    ctx.arc(earthCx, earthCy, radius, 0, Math.PI * 2);
    ctx.clip();

    if (earthImg.complete && earthImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(earthCx, earthCy);
      ctx.rotate(rotAngle);
      const drawSize = radius * 2 * 1.04;
      ctx.drawImage(earthImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    } else {
      ctx.fillStyle = "#102E52";
      ctx.fillRect(earthCx - radius, earthCy - radius, radius * 2, radius * 2);
    }

    // Terminator shading
    const shade = ctx.createRadialGradient(
      earthCx - radius * 0.25, earthCy - radius * 0.55, radius * 0.15,
      earthCx, earthCy, radius
    );
    shade.addColorStop(0, "rgba(255, 255, 255, 0.03)");
    shade.addColorStop(0.68, "rgba(5, 10, 18, 0.24)");
    shade.addColorStop(1, "rgba(2, 4, 8, 0.84)");
    ctx.fillStyle = shade;
    ctx.fillRect(earthCx - radius, earthCy - radius, radius * 2, radius * 2);

    // Realistic subsurface volcanic magma thermal bloom at impact site (no cartoon lines)
    if (timeSinceImpact > 0) {
      const glowRadius = Math.min(95, 18 + timeSinceImpact * 45);
      const heatAlpha = Math.max(0.25, 1 - timeSinceImpact * 0.22);

      ctx.globalCompositeOperation = "lighter";
      const magma = ctx.createRadialGradient(cx, earthY + 6, 2, cx, earthY + 6, glowRadius);
      magma.addColorStop(0, `rgba(255, 244, 214, ${heatAlpha})`);
      magma.addColorStop(0.28, `rgba(255, 128, 32, ${heatAlpha * 0.82})`);
      magma.addColorStop(0.65, `rgba(168, 34, 12, ${heatAlpha * 0.42})`);
      magma.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = magma;
      ctx.beginPath();
      ctx.arc(cx, earthY + 6, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();
  }

  function drawIncomingBolide(startX, startY, impactX, impactY, easeIn) {
    const curX = startX + (impactX - startX) * easeIn;
    const curY = startY + (impactY - startY) * easeIn;
    const prevX = startX + (impactX - startX) * Math.max(0, easeIn - 0.16);
    const prevY = startY + (impactY - startY) * Math.max(0, easeIn - 0.16);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Ionized atmospheric reentry plasma wake
    const trailGrad = ctx.createLinearGradient(prevX, prevY, curX, curY);
    trailGrad.addColorStop(0, "rgba(70, 134, 204, 0)");
    trailGrad.addColorStop(0.6, "rgba(255, 165, 72, 0.55)");
    trailGrad.addColorStop(1, "rgba(255, 248, 232, 0.95)");

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(curX, curY);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Hot bow-shock halo around rocky bolide
    const halo = ctx.createRadialGradient(curX, curY, 1, curX, curY, 18);
    halo.addColorStop(0, "rgba(255, 250, 235, 1)");
    halo.addColorStop(0.35, "rgba(255, 152, 56, 0.7)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(curX, curY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Irregular shaded rocky core
    ctx.fillStyle = "#3B2D26";
    ctx.beginPath();
    ctx.ellipse(curX, curY, 4.2, 3.2, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function animate(now) {
    syncCanvasSize();
    if (W === 0 || H === 0) {
      rafId = requestAnimationFrame(animate);
      return;
    }

    if (!startTime) startTime = now;
    const t = (now - startTime) / 1000;
    const tImpact = 2.0, tSlowMoEnd = 4.0, tTitleReveal = 4.5, tZoomStart = 6.5, tEnd = 8.5;

    const earthY = H * 0.64;
    const impactX = cx;
    const impactY = earthY;
    const earthR = Math.max(W * 0.45, 420);

    let timeSinceImpact = 0;
    let slowMoFactor = 1.0;
    if (t > tImpact) {
      if (t < tSlowMoEnd) {
        const slowProgress = (t - tImpact) / (tSlowMoEnd - tImpact);
        slowMoFactor = 0.06 + Math.pow(slowProgress, 2.5) * 0.94;
      }
      timeSinceImpact = t - tImpact;
    }

    let shakeX = 0, shakeY = 0;
    if (t > tImpact && t < tImpact + 0.45) {
      const intensity = (1 - (t - tImpact) / 0.45) * 9;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }

    drawStarfield();

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawRealEarth(earthY, earthR, timeSinceImpact, t * 0.02);

    if (t < tImpact) {
      const p = t / tImpact;
      const easeIn = Math.pow(p, 2.8);
      drawIncomingBolide(W * 0.18, -140, impactX, impactY, easeIn);

      if (p > 0.985 && ashPlume.length === 0) {
        triggerImpact(impactX, impactY);
      }
    }

    if (t >= tImpact) {
      if (ashPlume.length === 0) triggerImpact(impactX, impactY);

      // Brief atmospheric flash
      if (timeSinceImpact < 0.22) {
        ctx.fillStyle = `rgba(255, 244, 224, ${0.42 * (1 - timeSinceImpact / 0.22)})`;
        ctx.fillRect(-50, -50, W + 100, H + 100);
      }

      blastTimer += slowMoFactor * 0.016;

      // Soft atmospheric Rayleigh pressure wave
      if (blastTimer < 2.4) {
        const waveR = blastTimer * W * 0.28;
        const waveAlpha = Math.max(0, 0.38 * (1 - blastTimer / 2.4));
        const wave = ctx.createRadialGradient(impactX, impactY, Math.max(1, waveR - 18), impactX, impactY, waveR + 12);
        wave.addColorStop(0, "rgba(180, 218, 255, 0)");
        wave.addColorStop(0.6, `rgba(205, 228, 255, ${waveAlpha})`);
        wave.addColorStop(1, "rgba(180, 218, 255, 0)");
        ctx.fillStyle = wave;
        ctx.beginPath();
        ctx.arc(impactX, impactY, waveR + 12, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      // Volumetric ash & lit volcanic smoke cloud
      ashPlume.forEach(p => {
        if (p.life <= 0) return;
        p.x += p.vx * slowMoFactor;
        p.y += p.vy * slowMoFactor;
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.r += p.grow * slowMoFactor;
        p.life -= p.decay * slowMoFactor;

        const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
        if (p.ember && p.life > 0.45) {
          g.addColorStop(0, `rgba(255, 138, 48, ${p.life * 0.42})`);
          g.addColorStop(0.5, `rgba(92, 48, 36, ${p.life * 0.35})`);
          g.addColorStop(1, "rgba(28, 24, 24, 0)");
        } else {
          g.addColorStop(0, `rgba(58, 52, 50, ${p.life * 0.48})`);
          g.addColorStop(0.6, `rgba(34, 32, 34, ${p.life * 0.26})`);
          g.addColorStop(1, "rgba(15, 16, 20, 0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glowing incandescent ejecta droplets
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ejecta.forEach(d => {
        if (d.life <= 0) return;
        d.x += d.vx * slowMoFactor;
        d.y += d.vy * slowMoFactor;
        d.vy += 0.14 * slowMoFactor;
        d.life -= d.decay * slowMoFactor;
        ctx.beginPath();
        ctx.moveTo(d.x - d.vx * 1.4, d.y - d.vy * 1.4);
        ctx.lineTo(d.x, d.y);
        ctx.strokeStyle = `rgba(255, 178, 92, ${d.life * 0.85})`;
        ctx.lineWidth = d.size;
        ctx.stroke();
      });
      ctx.restore();
    }

    ctx.restore();

    if (t >= tTitleReveal && t < tZoomStart) {
      const p = Math.min(1, (t - tTitleReveal) / 1.0);
      titleContainer.style.opacity = p;
      titleContainer.style.transform = `translate(-50%, -50%) scale(${0.8 + p * 0.2})`;
    }

    if (t >= tZoomStart) {
      const p = Math.min(1, (t - tZoomStart) / (tEnd - tZoomStart));
      const easeZoom = Math.pow(p, 3);
      titleContainer.style.transform = `translate(-50%, -50%) scale(${1 + easeZoom * 20})`;
      titleContainer.style.opacity = 1 - Math.pow(p, 2);
      ctx.fillStyle = `rgba(7, 11, 17, ${p})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (t < tEnd) {
      rafId = requestAnimationFrame(animate);
    } else {
      finish();
    }
  }

  function finish() {
    cancelAnimationFrame(rafId);
    overlay.style.display = "none";
    if (window.OrbitHero && window.OrbitHero.startLaunch) {
      window.OrbitHero.startLaunch();
    }
  }

  rafId = requestAnimationFrame(animate);
  return { finish };
})();