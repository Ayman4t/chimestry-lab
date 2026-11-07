/* Home-screen background: a live Fe³⁺ + SCN⁻ ⇌ [Fe(SCN)]²⁺ equilibrium.
   Gold = Fe³⁺, cyan = SCN⁻, red = the complex. The cursor stirs the solution and
   the temperature slider shifts the equilibrium (exothermic: heat favours the left). */
(function () {
  'use strict';
  var home = document.getElementById('home');
  if (!home) return;

  var cv = document.createElement('canvas');
  cv.id = 'heroCv';
  cv.setAttribute('aria-hidden', 'true');
  home.insertBefore(cv, home.firstChild);
  var g = cv.getContext('2d');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COL = { 0: [255, 201, 74], 1: [63, 216, 255], 2: [255, 74, 90] };
  var W = 0, H = 0, dpr = 1, N = 0;
  var parts = [], T = 25, dim = 0.3;
  var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
  var sprites = {};
  var tStat = 0, cap2 = 1600;

  function sprite(rgb, r) {
    var s = Math.ceil(r * 6 * dpr), c = document.createElement('canvas');
    c.width = c.height = s;
    var x = c.getContext('2d'), m = s / 2;
    var gr = x.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, 'rgba(255,255,255,.95)');
    gr.addColorStop(0.16, 'rgba(' + rgb + ',1)');
    gr.addColorStop(0.34, 'rgba(' + rgb + ',.38)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, s, s);
    return c;
  }
  var R = { 0: 5, 1: 4, 2: 9 };
  function buildSprites() {
    for (var k in COL) sprites[k] = sprite(COL[k].join(','), R[k]);
  }

  function spawn(t, x, y) {
    parts.push({
      t: t,
      x: x === undefined ? Math.random() * W : x,
      y: y === undefined ? Math.random() * H : y,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      flash: 0
    });
  }

  function init() {
    parts = [];
    for (var i = 0; i < N; i++) { spawn(0); spawn(1); }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var n = Math.max(26, Math.min(80, Math.round(W * H / 17000)));
    buildSprites();
    if (n !== N) { N = n; init(); }
    // capture radius scales with density so the equilibrium looks alike on every screen
    cap2 = 1.3 * W * H / (N * Math.PI);
  }

  /* reaction rates (per second). Dissociation grows with temperature. */
  function kr() { return 1.2 * Math.exp(0.05 * (T - 25)); }

  function step(dt) {
    var k = reduce ? 0.3 : 1, i, j, p, q;
    dt = Math.max(0, dt) * k;
    var heat = 0.7 + (T - 5) / 75 * 1.1;         // thermal agitation
    var damp = Math.exp(-1.6 * dt), sq = Math.sqrt(dt);

    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var m = p.t === 2 ? 0.55 : 1;
      p.vx += (Math.random() - 0.5) * 260 * heat * m * sq;
      p.vy += (Math.random() - 0.5) * 260 * heat * m * sq;

      // stirring: push with the pointer's motion and curl around it
      var dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < 22500) {
        var d = Math.sqrt(d2) + 0.001, f = 1 - d / 150; f *= f;
        p.vx += (ptr.vx * 0.9 - dy / d * 260) * f * dt * 6;
        p.vy += (ptr.vy * 0.9 + dx / d * 260) * f * dt * 6;
      }

      p.vx *= damp; p.vy *= damp;
      var sp = Math.hypot(p.vx, p.vy), mx = 150 + 90 * heat;
      if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;

      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 2.2);
      if (p.cd > 0) p.cd -= dt;
    }

    // association: a free Fe³⁺ meets a free SCN⁻ (rate 4 per second while in range)
    var pf = 1 - Math.exp(-4 * dt);
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (p.t !== 0 || p.dead || p.cd > 0) continue;
      for (j = 0; j < parts.length; j++) {
        q = parts[j];
        if (q.t !== 1 || q.dead || q.cd > 0) continue;
        var ax = p.x - q.x, ay = p.y - q.y;
        if (ax * ax + ay * ay < cap2 && Math.random() < pf) {
          p.t = 2; p.flash = 1; p.vx = (p.vx + q.vx) / 2; p.vy = (p.vy + q.vy) / 2;
          q.dead = true;
          break;
        }
      }
    }
    // dissociation
    var pk = 1 - Math.exp(-kr() * dt);
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (p.t === 2 && !p.dead && Math.random() < pk) {
        p.t = 0; p.flash = 1;
        var a = Math.random() * 6.283;
        spawn(1, p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14);
        parts[parts.length - 1].vx = Math.cos(a) * 90;
        parts[parts.length - 1].vy = Math.sin(a) * 90;
        parts[parts.length - 1].flash = 1;
        parts[parts.length - 1].cd = 0.7; p.cd = 0.7;
        p.vx -= Math.cos(a) * 60; p.vy -= Math.sin(a) * 60;
      }
    }
    for (i = parts.length - 1; i >= 0; i--) if (parts[i].dead) parts.splice(i, 1);
  }

  function counts() {
    var c = [0, 0, 0];
    for (var i = 0; i < parts.length; i++) c[parts[i].t]++;
    return c;
  }

  function draw(frac) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#060b16';
    g.fillRect(0, 0, W, H);

    // the glow takes on the colour of the solution: pale when hot, deep red when cold
    var big = Math.max(W, H);
    var gr = g.createRadialGradient(W * 0.3, H * 0.55, 0, W * 0.3, H * 0.55, big * 0.75);
    gr.addColorStop(0, 'rgba(' + Math.round(40 + 200 * frac) + ',' + Math.round(90 - 40 * frac) + ',' + Math.round(150 - 80 * frac) + ',' + (0.30 + 0.28 * frac).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(6,11,22,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var g2 = g.createRadialGradient(W * 0.9, H * 0.05, 0, W * 0.9, H * 0.05, big * 0.6);
    g2.addColorStop(0, 'rgba(30,110,200,.22)');
    g2.addColorStop(1, 'rgba(6,11,22,0)');
    g.fillStyle = g2; g.fillRect(0, 0, W, H);

    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], s = sprites[p.t], r = R[p.t] * 3;
      var a = 0.55 + 0.45 * (1 - dim);
      g.globalAlpha = a;
      g.drawImage(s, p.x - r, p.y - r, r * 2, r * 2);
      if (p.flash > 0) {
        var fr = r * (1 + (1 - p.flash) * 1.8);
        g.globalAlpha = p.flash * 0.7 * a;
        g.drawImage(sprites[2], p.x - fr, p.y - fr, fr * 2, fr * 2);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    if (dim > 0) { g.fillStyle = 'rgba(6,11,22,' + (dim * 0.8).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }

  function readout(c, frac) {
    var el;
    if ((el = document.getElementById('nFe'))) el.textContent = c[0];
    if ((el = document.getElementById('nScn'))) el.textContent = c[1];
    if ((el = document.getElementById('nCx'))) el.textContent = c[2];
    if ((el = document.getElementById('barCx'))) el.style.transform = 'scaleX(' + frac.toFixed(3) + ')';
  }

  var last = performance.now(), smooth = 0.4;
  function frame(now) {
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    if (document.body.classList.contains('home-on') && !document.hidden) {
      // pointer velocity decays when the mouse stops
      ptr.vx *= 0.9; ptr.vy *= 0.9;
      step(dt);
      var c = counts(), frac = c[2] / Math.max(1, N);
      smooth += (frac - smooth) * Math.min(1, dt * 2);
      var sub = home.dataset.view === 'sub';
      var target = sub ? 0.62 : Math.min(0.6, home.scrollTop / (H * 0.85) * 0.6) + 0.04;
      dim += (target - dim) * Math.min(1, dt * 4);
      draw(Math.min(1, smooth * 2));
      tStat += dt;
      if (tStat > 0.2) { tStat = 0; readout(c, Math.min(1, frac * 2)); }
    }
    requestAnimationFrame(frame);
  }

  home.addEventListener('pointermove', function (e) {
    if (ptr.t) {
      var dt = Math.max(0.008, (e.timeStamp - ptr.t) / 1000);
      ptr.vx = Math.max(-900, Math.min(900, (e.clientX - ptr.x) / dt));
      ptr.vy = Math.max(-900, Math.min(900, (e.clientY - ptr.y) / dt));
    }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = e.timeStamp;
  }, { passive: true });
  home.addEventListener('pointerleave', function () { ptr.x = ptr.y = -9999; ptr.t = 0; });

  home.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'heatR') {
      T = +e.target.value;
      var o = document.getElementById('heatO');
      if (o) o.textContent = T + '°م';
      var pct = (T - 5) / 75 * 100;
      e.target.style.setProperty('--p', pct + '%');
    }
  });

  window.HERO = { get t() { return T; } };
  window.addEventListener('resize', resize);
  resize();
  // let the first seconds show the reaction happening
  for (var i = 0; i < 20; i++) step(0.03);
  requestAnimationFrame(frame);
})();
