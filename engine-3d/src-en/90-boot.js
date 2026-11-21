/* ============================================================
   EN-01 · 90-boot —— 渲染循环 / 轨道相机 / 巡游 / 键盘
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const Q = new URLSearchParams(location.search);
  const canvasHost = document.getElementById('stage');

  /* ---------- 渲染器 ---------- */
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, Q.get('dpr') ? +Q.get('dpr') : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.localClippingEnabled = false;
  canvasHost.appendChild(renderer.domElement);

  const scene = new T.Scene();
  DF.buildStudio(scene, renderer);

  const camera = new T.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.05, 60);

  /* ---------- 相机骨架 ---------- */
  const rig = {
    tx: 0, ty: 1.35, tz: 0,
    azim: Q.get('azim') ? +Q.get('azim') : 0.62,
    elev: Q.get('elev') ? +Q.get('elev') : 0.24,
    dist: Q.get('dist') ? +Q.get('dist') : 5.4,
    fov: Q.get('fov') ? +Q.get('fov') : 34
  };
  DF.rig = rig;
  camera.userData.target = new T.Vector3(rig.tx, rig.ty, rig.tz);

  DF.buildEngine(scene);
  DF.initActions(scene, renderer, camera);
  DF.buildUI();

  const post = DF.createPost(renderer, { lq: Q.get('lq') === '1' });
  post.setSize(window.innerWidth, window.innerHeight, DPR);
  post.exposure = 1.04;
  DF.post = post;
  DF.renderer = renderer;
  renderer.info.autoReset = false;

  /* ---------- 相机施加 ---------- */
  function applyCam() {
    const ce = Math.cos(rig.elev);
    const tgt = camera.userData.target;
    camera.position.set(
      tgt.x + Math.sin(rig.azim) * ce * rig.dist,
      tgt.y + Math.sin(rig.elev) * rig.dist,
      tgt.z + Math.cos(rig.azim) * ce * rig.dist
    );
    camera.lookAt(tgt);
    if (camera.fov !== rig.fov) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
  }
  applyCam();
  DF.applyCam = applyCam;

  /* ---------- 交互：拖拽 / 滚轮 ---------- */
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    DF.stopTour && DF.stopTour();
    rig.azim -= dx * 0.0055;
    rig.elev = DF.clamp(rig.elev + dy * 0.0042, 0.02, 1.32);
    applyCam();
  });
  el.addEventListener('pointerup', e => {
    dragging = false;
    if (moved < 8) {
      const idx = DF.pick(e.clientX, e.clientY);
      DF.selectPart(idx, false);
    }
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    DF.stopTour && DF.stopTour();
    rig.dist = DF.clamp(rig.dist * (1 + Math.sign(e.deltaY) * 0.09), 2.2, 12);
    applyCam();
  }, { passive: false });

  /* ---------- 巡游（4 章，32 s 循环，匀速环绕不回头） ---------- */
  const TOUR = [
    { t: 0,  az: 0.62, el: 0.22, d: 5.40, ty: 1.35, ex: 0, sec: 0, title: '整体总装', en: 'ASSEMBLED' },
    { t: 8,  az: 2.19, el: 0.26, d: 3.25, ty: 1.90, ex: 0, sec: 0, title: '动力头 · 涡轮泵', en: 'TURBOPUMP / POWERHEAD' },
    { t: 16, az: 3.76, el: 0.10, d: 6.20, ty: 1.92, ex: 1, sec: 0, title: '十一部件分解', en: 'EXPLODED · 11 PARTS' },
    { t: 24, az: 5.33, el: 0.24, d: 5.40, ty: 1.35, ex: 0, sec: 0, title: '回装', en: 'REASSEMBLY' }
  ];
  const TOUR_LEN = 32;
  let touring = false, tourT = 0, secMix = 0, secApplied = -1;

  DF.startTour = function () { touring = true; DF.state.auto = true; tourT = 0; document.getElementById('tourcap').classList.add('on'); };
  DF.stopTour = function () {
    if (!touring) return;
    touring = false; DF.state.auto = false;
    document.getElementById('tourcap').classList.remove('on');
    document.getElementById('btnTour').classList.remove('on');
  };
  DF.toggleTour = function () {
    if (touring) DF.stopTour();
    else { DF.startTour(); document.getElementById('btnTour').classList.add('on'); }
  };
  DF.isTouring = () => touring;

  function tourUpdate(dt) {
    if (!touring) return;
    tourT += dt;
    if (tourT >= TOUR_LEN) tourT -= TOUR_LEN;
    let i = 0;
    for (let k = 0; k < TOUR.length; k++) if (tourT >= TOUR[k].t) i = k;
    const a = TOUR[i], b = TOUR[(i + 1) % TOUR.length];
    const seg = (i + 1) % TOUR.length === 0 ? TOUR_LEN - a.t : b.t - a.t;
    const u = DF.easeInOutCubic(DF.clamp((tourT - a.t) / seg, 0, 1));
    const nz = b.az + (b.az < a.az ? Math.PI * 2 : 0);
    rig.azim = DF.lerp(a.az, nz, u);
    rig.elev = DF.lerp(a.el, b.el, u);
    rig.dist = DF.lerp(a.d, b.d, u);
    rig.ty = DF.lerp(a.ty, b.ty, u);
    camera.userData.target.y = rig.ty;
    applyCam();

    DF.setExplode(DF.lerp(a.ex, b.ex, u), true);

    // 透视强度按章节平滑推进
    const secTarget = a.sec || 0;
    secMix = DF.damp(secMix, secTarget, 2.6, dt);
    if (secApplied < 0 || Math.abs(secMix - secApplied) > 0.035 || (secTarget === 0 && secApplied !== 0)) {
      DF.setSectionMix(secMix);
      secApplied = secMix;
    }
    DF.setTourCaption(a.title, a.en, i + 1, u);
  }

  DF.setTourCaption = function (title, en, n, u) {
    const cap = document.getElementById('tourcap');
    if (!cap) return;
    document.getElementById('tourNum').textContent = '0' + n + ' / 04';
    document.getElementById('tourTitle').textContent = title;
    document.getElementById('tourEn').textContent = en;
    document.getElementById('tourProg').style.width = (u * 100).toFixed(1) + '%';
  };

  /* ---------- 键盘 ---------- */
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); DF.toggleExplode(); }
    else if (k === 'h') DF.setSection(!DF.state.section);
    else if (k === 'l') DF.setLabels(!DF._labelsOn);
    else if (k === 'p') DF.toggleTour();
    else if (k === '0' || k === 'r') { DF.stopTour(); DF.resetView(); }
    else if (k === 'f') { DF.toggleFull(); }
    else if (k >= '1' && k <= '9') { const i = +k - 1; if (i < DF.PARTS.length) DF.selectPart(i, false); }
    else if (k === 'escape') { DF.stopTour(); DF.selectPart(-1, false); }
  });

  DF.on && DF.on('explode', (v) => {
    const rg = document.getElementById('explodeRange');
    if (rg && document.activeElement !== rg) rg.value = Math.round(v * 100);
    DF.rig._distTarget = v > 0.5 ? 7.6 : 5.4;
    DF.rig._tyTarget = v > 0.5 ? 1.86 : 1.35;
  });

  DF.toggleFull = function () {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else if (document.exitFullscreen) document.exitFullscreen();
  };

  DF.resetView = function () {
    rig.tx = 0; rig.ty = 1.35; rig.tz = 0;
    rig.azim = 0.62; rig.elev = 0.24; rig.dist = 5.4; rig.fov = 34;
    camera.userData.target.set(0, 1.35, 0);
    camera.userData.focus = null;
    DF.setExplode(0, false);
    DF.setSection(false);
    DF.selectPart(-1, false);
    applyCam();
  };

  /* ---------- 尺寸 ---------- */
  function onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    camera.aspect = W / H;
    // 竖屏拉远
    if (W / H < 1) rig.dist = 5.4 * Math.pow(1 / (W / H), 0.42);
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    post.setSize(W, H, Math.min(window.devicePixelRatio || 1, 2));
    applyCam();
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ---------- HUD 数值 ---------- */
  const hud = {
    partCount: document.getElementById('hudParts'),
    thrust: document.getElementById('hudThrust'),
    cycle: document.getElementById('hudCycle'),
    explode: document.getElementById('hudExplode'),
    fps: document.getElementById('hudFps')
  };

  /* ---------- 主循环 ---------- */
  let last = performance.now(), hudAcc = 0, frames = 0, fpsT = 0, fps = 60;
  DF.__ready = false;
  let firstFrame = true;

  function frame(now) {
    const dtRaw = (now - last) / 1000;
    last = now;
    let dt = dtRaw;
    if (!(dt >= 0)) dt = 0;
    dt = Math.min(dt, 0.05);

    DF.updateActions(dt);
    if (rig._distTarget && !touring) {
      rig.dist = DF.damp(rig.dist, rig._distTarget, 2.4, dt);
      rig.ty = DF.damp(rig.ty, rig._tyTarget, 2.4, dt);
      camera.userData.target.y = rig.ty;
      applyCam();
    }
    tourUpdate(dt);
    DF.updateLabels(dt, camera);

    renderer.info.reset();
    post.render(scene, camera);

    hudAcc += dt; fpsT += dt; frames++;
    if (fpsT > 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
    if (hudAcc > 0.1) {
      hudAcc = 0;
      if (hud.explode) hud.explode.textContent = Math.round(DF.state.t * 100) + '%';
      if (hud.fps) hud.fps.textContent = Math.round(fps) + ' fps';
      const range = document.getElementById('explodeRange');
      if (range && document.activeElement !== range) range.value = Math.round(DF.state.t * 100);
      const e2 = document.getElementById('hudExplode2');
      if (e2) e2.textContent = Math.round(DF.state.t * 100) + '%';
      const btnE = document.getElementById('btnExplode');
      if (btnE) btnE.classList.toggle('on', DF.state.t > 0.5);
    }

    if (firstFrame) {
      firstFrame = false;
      DF.__ready = true;
      document.body.classList.add('ready');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 调试面 ---------- */
  DF.api = { rig, camera, scene, renderer, post, state: DF.state, parts: DF.PARTS,
    select: DF.selectPart, explode: DF.setExplode, section: DF.setSection, sectionMix: DF.setSectionMix,
    tour: DF.toggleTour, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }) };

})(window.DF = window.DF || {});
