/* ============================================================
   DF-01 · 90-boot —— 仿真 / 相机 / 巡游 / HUD / 交互 / 主循环
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  /* ================= 参数 ================= */
  const Q = new URLSearchParams(location.search);
  const FLAG = {
    instant: Q.has('instant'),
    still: Q.has('still'),
    raw: Q.has('raw'),
    lq: Q.has('lq'),
    noLabels: Q.has('nolabels'),
    noData: Q.has('nodata'),
    noCard: Q.has('nocard'),
    hideUI: Q.has('hideui'),
    debug: Q.has('debug'),
    film: Q.get('film') === '1',
    tour: Q.has('tour') || Q.get('tour') === '1',
    letterbox: Q.has('letterbox') || Q.get('letterbox') === '1',
    tourFast: Q.has('tourfast'),
    tourAt: Q.get('tourat') !== null ? parseFloat(Q.get('tourat')) : null,
    sim: parseFloat(Q.get('sim') || '1'),
    view: Q.get('view'),
  };
  const CAM0 = {
    tx: Q.get('tx') !== null ? +Q.get('tx') : 4,
    ty: Q.get('ty') !== null ? +Q.get('ty') : 3,
    tz: Q.get('tz') !== null ? +Q.get('tz') : 2,
    azim: Q.get('azim') !== null ? +Q.get('azim') : -0.70,
    elev: Q.get('elev') !== null ? +Q.get('elev') : 0.44,
    dist: Q.get('dist') !== null ? +Q.get('dist') : 300,
    fov: Q.get('fov') !== null ? +Q.get('fov') : 29,
  };

  /* ================= 仿真 ================= */
  function createSIM() {
    const stations = DF.STATIONS.map(s => Object.assign({}, s, { state: 'run', faultT: 0, uptime: 1 }));
    const st = {};
    stations.forEach(s => st[s.id] = s);

    const sim = {
      clock: 14 * 3600 + 36 * 60,          // 14:36
      shift: '白班 08:00–20:00',
      output: 936,
      target: 1488,
      takt: 58,
      wip: 248,
      energy: 1.24,
      uptimeAcc: 0, downAcc: 0,
      rateValue: 1,
      agvs: Array.from({ length: 12 }, (_, i) => ({
        online: true, battery: 40 + (i * 7) % 50, charging: i % 6 === 5,
      })),
      history: [],
      alarms: [],
      _t: 0,
      _nextFault: 45,
      _nextUnit: 29,
      _histAcc: 0,
    };

    // 96 点历史（回推）
    let h = sim.output;
    for (let i = 0; i < 96; i++) {
      h -= 0.9 + Math.sin(i * 0.4) * 0.35;
      sim.history.unshift(Math.round(h));
    }
    sim.history = sim.history.slice(-96);
    while (sim.history.length < 96) sim.history.unshift(sim.output);

    sim.getStation = id => st[id] || null;
    sim.rate = () => sim.rateValue;
    sim.setRate = r => { sim.rateValue = r; };
    sim.agvState = i => {
      const a = sim.agvs[i % 12];
      if (!a.online) return 'down';
      if (a.battery < 15) return 'idle';
      return 'run';
    };
    sim.alarm = (text, level, zone) => {
      sim.alarms.unshift({ text, level: level || 'warn', zone, t: sim.clock });
      if (sim.alarms.length > 5) sim.alarms.pop();
    };
    sim.completeUnit = () => {
      sim.output++;
      sim.wip = Math.max(90, sim.wip - 1);
    };
    sim.zoneState = z => {
      const list = stations.filter(s => s.zone === z);
      if (!list.length) return 'run';
      if (list.some(s => s.state === 'down')) return 'down';
      if (list.every(s => s.state === 'idle')) return 'idle';
      return 'run';
    };
    sim.zoneUtil = z => {
      const list = stations.filter(s => s.zone === z);
      if (!list.length) return 0.72;
      return list.reduce((a, s) => a + (s.state === 'run' ? 0.86 : s.state === 'idle' ? 0.52 : 0.18), 0) / list.length;
    };
    sim.zoneWip = z => {
      const list = stations.filter(s => s.zone === z);
      return Math.round(28 + list.length * 3.4 + Math.sin(sim._t * 0.3 + list.length) * 9);
    };
    sim.tick = (dtReal) => {
      const mul = 8 * sim.rateValue;
      const dt = dtReal * mul;
      sim._t += dt;
      sim.clock += dt;
      if (sim.clock > 20 * 3600) sim.clock = 8 * 3600;

      // 单元下线
      sim._nextUnit -= dt;
      if (sim._nextUnit <= 0) {
        sim._nextUnit = 29;
        sim.completeUnit();
      }
      // 历史采样
      sim._histAcc += dt;
      if (sim._histAcc > 90) {
        sim._histAcc = 0;
        sim.history.push(sim.output);
        sim.history.shift();
      }
      // 故障注入
      sim._nextFault -= dt;
      if (sim._nextFault <= 0) {
        sim._nextFault = 50 + Math.random() * 70;
        const cand = stations.filter(s => s.state === 'run');
        const s = cand[Math.floor(Math.random() * cand.length)];
        if (s) {
          s.state = 'down';
          s.faultT = 6 + Math.random() * 9;
          sim.alarm(s.cn + ' 停机 / 通讯中断', 'error', s.zone);
          DF.data && DF.data.ping(s.id);
        }
      }
      stations.forEach(s => {
        if (s.state === 'down') {
          s.faultT -= dt;
          sim.downAcc += dt;
          if (s.faultT <= 0) {
            s.state = 'run';
            sim.alarm(s.cn + ' 已恢复运行', 'info', s.zone);
          }
        } else if (Math.random() < 0.002 * dt * 0.1) {
          s.state = 'idle';
          setTimeout(() => { if (st[s.id].state === 'idle') st[s.id].state = 'run'; }, 1200);
        }
        s.uptime = s.state === 'run' ? 1 : s.state === 'idle' ? 0.6 : 0;
        s.avg = s.avg === undefined ? 0.95 : s.avg * 0.94 + s.uptime * 0.06;
      });

      // 能耗 / WIP / 电量
      sim.energy = 1.2 + Math.sin(sim._t * 0.05) * 0.045 + Math.random() * 0.012;
      sim.wip = DF.clamp(sim.wip + (Math.random() - 0.5) * 0.6, 150, 320);
      sim.agvs.forEach(a => {
        if (a.charging) { a.battery = Math.min(98, a.battery + 0.02 * dt); }
        else { a.battery = Math.max(6, a.battery - 0.012 * dt); }
        if (a.battery < 14) a.charging = true;
        if (a.battery > 92) a.charging = false;
      });
      sim._A = sim.avail();
    };

    sim.avail = () => {
      let sum = 0;
      stations.forEach(s => sum += (s.avg === undefined ? 0.95 : s.avg));
      return DF.clamp(sum / stations.length, 0.7, 0.99);
    };
    sim.perf = () => {
      const planPerHour = sim.target / 12;                       // 124 台/h
      const elapsedH = Math.max(1, (sim.clock - 8 * 3600) / 3600);
      const expect = planPerHour * elapsedH;
      return DF.clamp(sim.output / expect, 0.84, 1.0);
    };
    sim.quality = () => 0.982 + Math.sin(sim._t * 0.03) * 0.006;
    sim.oee = () => sim.avail() * sim.perf() * sim.quality();
    return sim;
  }

  /* ================= 相机 ================= */
  function createRig(camera) {
    const rig = {
      cur: Object.assign({}, CAM0),
      tgt: Object.assign({}, CAM0),
      vel: 0,
      pointer: { x: 0.5, y: 0.5 },
      idle: 0,
      lastInput: 0,
      set(k, instant) {
        Object.assign(rig.tgt, k);
        if (instant) Object.assign(rig.cur, k);
      },
      update(dt) {
        const k = 1 - Math.exp(-3.4 * dt);
        const c = rig.cur, t = rig.tgt;
        c.tx += (t.tx - c.tx) * k;
        c.ty += (t.ty - c.ty) * k;
        c.tz += (t.tz - c.tz) * k;
        c.azim += (t.azim - c.azim) * k;
        c.elev += (t.elev - c.elev) * k;
        c.dist += (t.dist - c.dist) * k;
        c.fov += (t.fov - c.fov) * k;

        // 空闲缓慢漂移 + 指针视差
        let azim = c.azim, elev = c.elev;
        if (!FLAG.still) {
          if (DF.touring) azim += Math.sin(rig.idle * 0.18) * 0.012;
          else azim += (rig.pointer.x - 0.5) * 0.06 + Math.sin(rig.idle * 0.2) * 0.02;
          elev += (0.5 - rig.pointer.y) * 0.03;
        }
        const ce = Math.cos(elev), se = Math.sin(elev);
        const D = c.dist * (window.__FIT || 1);
        camera.position.set(
          c.tx + Math.sin(azim) * ce * D,
          c.ty + se * D,
          c.tz + Math.cos(azim) * ce * D
        );
        camera.lookAt(c.tx, c.ty, c.tz);
        if (Math.abs(camera.fov - c.fov) > 0.01) {
          camera.fov = c.fov;
          camera.updateProjectionMatrix();
        }
      },
    };
    return rig;
  }

  /* ================= 巡游 ================= */
  const TOUR = [
    { d: 10, split: 0.62, cn: '总览', en: 'OVERVIEW', a: [4, 4, 2, -0.76, 0.44, 272, 30], b: [7, 3, 0, -0.64, 0.40, 244, 28] },
    { d: 10, split: 0.55, cn: '原材料立库', en: 'RAW MATERIAL ASRS', a: [-62, 6, 0, -0.72, 0.38, 82, 34], b: [-58, 5.5, 0, -0.95, 0.33, 66, 36] },
    { d: 10, split: 0.50, cn: '冲压线', en: 'PRESS LINE', a: [-30, 4, -20, 0.44, 0.15, 36, 42], b: [-26, 4.4, -20, 0.30, 0.19, 30, 40] },
    { d: 10, split: 0.50, cn: '焊装车间', en: 'BODY SHOP', a: [-30, 3, 20, 1.54, 0.12, 32, 44], b: [-26, 3.2, 22, 1.30, 0.16, 40, 42] },
    { d: 9.5, split: 0.50, cn: '涂装车间', en: 'PAINT SHOP', a: [2, 3, -18, 0, 0.12, 31, 42], b: [3, 3.4, -19, 0.30, 0.16, 36, 40] },
    { d: 10.5, split: 0.55, cn: '总装线', en: 'FINAL ASSEMBLY', a: [40, 5, 20, -0.90, 0.30, 70, 30], b: [44, 4.6, 20, -1.10, 0.26, 62, 32] },
    { d: 9.5, split: 0.50, cn: '检测发运', en: 'EOL / DISPATCH', a: [64, 3.4, 8, -1.50, 0.15, 54, 36], b: [66, 3.2, 10, -1.56, 0.17, 46, 38] },
    { d: 9, split: 0.62, cn: '升空', en: 'RISE', a: [52, 2, 6, -1.00, 0.06, 62, 44], b: [34, 4, 0, -0.92, 0.28, 186, 30] },
    { d: 10, split: 0.50, cn: '回到总览', en: 'BACK TO OVERVIEW', a: [22, 4, 4, -0.70, 0.48, 330, 29], b: [3, 4, 3, -0.76, 0.47, 322, 30] },
  ];
  const TOUR_TOTAL = TOUR.reduce((a, s) => a + s.d, 0);

  function lerpKF(a, b, t) {
    return {
      tx: DF.lerp(a[0], b[0], t), ty: DF.lerp(a[1], b[1], t), tz: DF.lerp(a[2], b[2], t),
      azim: DF.lerp(a[3], b[3], t), elev: DF.lerp(a[4], b[4], t),
      dist: DF.lerp(a[5], b[5], t), fov: DF.lerp(a[6], b[6], t),
    };
  }

  /* ================= HUD ================= */
  function fmtClock(sec) {
    sec = Math.floor(sec) % 86400;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function buildHUD(sim) {
    const zonesEl = document.getElementById('zones');
    const zoneKeys = ['Z01', 'Z02', 'Z03', 'Z04', 'Z05', 'Z06'];
    zonesEl.innerHTML = zoneKeys.map(k => {
      const z = DF.L.zones[k];
      return '<button class="zrow" data-zone="' + k + '">' +
        '<span class="zno">' + z.no + '</span>' +
        '<span class="zbody"><span class="zname">' + z.cn + '</span>' +
        '<span class="zen">' + z.en + '</span>' +
        '<span class="zbar"><i></i></span></span>' +
        '<span class="zdot" data-dot="' + k + '"></span></button>';
    }).join('');

    const dockEl = document.getElementById('dock');
    dockEl.innerHTML =
      '<button class="dbtn" data-act="overview">总览 <i>0</i></button>' +
      zoneKeys.map((k, i) => '<button class="dbtn" data-act="zone" data-zone="' + k + '">' + DF.L.zones[k].no + ' ' + DF.L.zones[k].cn.replace('车间', '') + ' <i>' + (i + 1) + '</i></button>').join('') +
      '<span class="dsep"></span>' +
      '<button class="dbtn" data-act="data">数据层 <i>D</i></button>' +
      '<button class="dbtn" data-act="labels">标签 <i>L</i></button>' +
      '<button class="dbtn" data-act="tour">巡游 <i>Space</i></button>' +
      '<button class="dbtn" data-act="reset">复位 <i>0</i></button>' +
      '<button class="dbtn" data-act="full">全屏 <i>F</i></button>';

    const sparks = document.getElementById('spark');
    return {
      clock: document.getElementById('clock'),
      rate: document.getElementById('rateBtn'),
      sync: document.getElementById('syncTxt'),
      oee: document.getElementById('oeeVal'),
      ring: document.getElementById('oeeRing'),
      a: document.getElementById('oeeA'),
      p: document.getElementById('oeeP'),
      q: document.getElementById('oeeQ'),
      out: document.getElementById('outVal'),
      outTarget: document.getElementById('outTarget'),
      wip: document.getElementById('wipVal'),
      agv: document.getElementById('agvVal'),
      agvSub: document.getElementById('agvSub'),
      energy: document.getElementById('energyVal'),
      ebar: document.getElementById('energyBars'),
      alarms: document.getElementById('alarmList'),
      spark, sparks,
      view: document.getElementById('viewName'),
      needle: document.getElementById('needle'),
      scale: document.getElementById('scaleBar'),
      fps: document.getElementById('fps'),
      inspector: document.getElementById('inspector'),
      zoneEl: zonesEl,
    };
  }

  let hudAcc = 0;
  function updateHUD(hud, sim, rig, camera) {
    hud.clock.textContent = fmtClock(sim.clock);
    const oee = sim.oee();
    hud.oee.textContent = (oee * 100).toFixed(1) + '%';
    const C = 2 * Math.PI * 34;
    hud.ring.style.strokeDasharray = C;
    hud.ring.style.strokeDashoffset = C * (1 - oee);
    hud.a.style.width = (sim.avail() * 100).toFixed(0) + '%';
    hud.p.style.width = (sim.perf() * 100).toFixed(0) + '%';
    hud.q.style.width = (sim.quality() * 100).toFixed(0) + '%';
    const apqEm = (el, v) => { const em = el.closest('.apq-row') && el.closest('.apq-row').querySelector('em'); if (em) em.textContent = v.toFixed(1); };
    apqEm(hud.a, sim.avail() * 100);
    apqEm(hud.p, sim.perf() * 100);
    apqEm(hud.q, sim.quality() * 100);

    hud.out.textContent = sim.output.toLocaleString();
    hud.outTarget.textContent = '/ ' + sim.target.toLocaleString();
    hud.wip.textContent = Math.round(sim.wip);
    hud.agv.textContent = sim.agvs.filter(a => a.online).length + '/' + sim.agvs.length;
    hud.agvSub.textContent = '均电量 ' + (sim.agvs.reduce((a, b) => a + b.battery, 0) / sim.agvs.length).toFixed(0) + '%';
    hud.energy.textContent = sim.energy.toFixed(2) + ' MW';

    // 分区能耗柱
    const shares = [0.13, 0.24, 0.19, 0.17, 0.26, 0.09];
    const bars = hud.ebar.children;
    for (let i = 0; i < bars.length; i++) {
      const v = sim.energy * shares[i];
      bars[i].style.height = (v * 26).toFixed(1) + 'px';
      bars[i].title = DF.L.zones['Z0' + (i + 1)].cn + ' ' + v.toFixed(2) + ' MW';
    }

    // 分区索引
    Array.from(hud.zoneEl.querySelectorAll('.zrow')).forEach(row => {
      const z = row.getAttribute('data-zone');
      const util = sim.zoneUtil(z);
      row.querySelector('.zbar i').style.width = (util * 100).toFixed(0) + '%';
      const st = sim.zoneState(z);
      const dot = row.querySelector('.zdot');
      dot.className = 'zdot ' + st;
    });

    // 告警
    if (sim.alarms.length && hud.alarms.dataset.n !== String(sim.alarms.length + '_' + Math.floor(sim.alarms[0].t))) {
      hud.alarms.dataset.n = sim.alarms.length + '_' + Math.floor(sim.alarms[0].t);
      hud.alarms.innerHTML = sim.alarms.slice(0, 4).map(a =>
        '<div class="al ' + a.level + '"><span class="al-d"></span><span class="al-t">' + fmtClock(a.t) + '</span><span class="al-x">' + a.text + '</span></div>'
      ).join('');
    }

    // sparkline
    drawSpark(hud.spark, sim.history, sim.target);

    // 罗盘 & 比例尺
    hud.needle.style.transform = 'rotate(' + (-rig.cur.azim * 180 / Math.PI).toFixed(1) + 'deg)';
    const visH = 2 * rig.cur.dist * Math.tan(rig.cur.fov * Math.PI / 360);
    const pxPerM = window.innerHeight / visH;
    let meters = 20;
    let px = meters * pxPerM;
    while (px > 140) { meters /= 2; px = meters * pxPerM; }
    while (px < 46) { meters *= 2; px = meters * pxPerM; }
    hud.scale.style.width = px.toFixed(0) + 'px';
    hud.scale.dataset.m = meters + ' m';
    const scTxt = document.querySelector('.sc-txt');
    if (scTxt) scTxt.textContent = meters + ' m';
  }

  function drawSpark(cv, arr, target) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 176, h = cv.clientHeight || 44;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    const n = arr.length;
    const min = Math.min.apply(null, arr), max = Math.max.apply(null, arr);
    const span = Math.max(12, max - min);
    x.strokeStyle = 'rgba(242,167,59,.22)';
    x.beginPath(); x.moveTo(0, 6); x.lineTo(w, 6); x.stroke();
    x.beginPath();
    for (let i = 0; i < n; i++) {
      const px = (i / (n - 1)) * w;
      const py = h - 4 - ((arr[i] - min) / span) * (h - 12);
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.strokeStyle = 'rgba(242,173,80,.95)';
    x.lineWidth = 1.4;
    x.stroke();
    // 末端点
    const lastX = w, lastY = h - 4 - ((arr[n - 1] - min) / span) * (h - 12);
    x.fillStyle = '#ffd39a';
    x.beginPath(); x.arc(lastX - 1, lastY, 2, 0, 6.283); x.fill();
  }

  /* ================= 交互 / 启动 ================= */
  function boot() {
    const canvas = document.getElementById('gl');
    const studio = DF.initStudio({ canvas, lq: FLAG.lq });
    const { renderer, scene, camera } = studio;
    const pr = renderer.getPixelRatio();

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const post = DF.createPost(renderer, { lq: FLAG.lq });
    post.setSize(window.innerWidth, window.innerHeight, pr);
    post.enabled = true;
    post.exposure = 1.02;

    /* ---- 建模 ---- */
    const tBuild = performance.now();
    DF.buildBuilding(scene);
    const process = DF.buildProcess(scene);
    const logistics = DF.buildLogistics(scene);
    DF.logistics = logistics;
    const assembly = DF.buildAssembly(scene);
    const sim = createSIM();
    DF.sim = sim;
    sim.setRate(FLAG.sim === 2 ? 2 : FLAG.sim === 4 ? 4 : 1);

    const data = DF.buildData(scene, camera);
    DF.data = data;
    data.setEnabled(!FLAG.noData);
    data.setLabels(!FLAG.noLabels);

    const hud = buildHUD(sim);
    const rig = createRig(camera);
    rig.cur.dist = CAM0.dist + 40;
    rig.set(CAM0, false);

    /* ---- 视野命名 ---- */
    const viewName = (name) => {
      hud.view.textContent = name;
    };
    viewName('总览 OVERVIEW');

    /* ---- 分区 / 设备拾取 ---- */
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    let downPos = null;

    function pickAt(cx, cy) {
      ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const objs = [];
      data.group.traverse(o => {
        if (o.userData.zone || o.userData.station) objs.push(o);
      });
      const hits = ray.intersectObjects(objs, false);
      if (hits.length) return hits[0].object;

      // 后备：屏幕空间最近工位（阈值 64 px），深度须在相机前方
      let best = null, bestD = 64;
      const p2 = new T.Vector3();
      DF.STATIONS.forEach(s => {
        p2.set(s.x, s.y, s.z).project(camera);
        if (p2.z > 1) return;
        const sx = (p2.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-p2.y * 0.5 + 0.5) * window.innerHeight;
        const d = Math.hypot(sx - cx, sy - cy);
        if (d < bestD) { bestD = d; best = s; }
      });
      return best ? { userData: { station: best } } : null;
    }

    function zoneView(k) {
      const map = { Z01: 1, Z02: 2, Z03: 3, Z04: 4, Z05: 5, Z06: 6 };
      const idx = map[k];
      if (idx === undefined) return;
      const seg = TOUR[idx];
      rig.set(lerpKF(seg.a, seg.a, 0));
      hud.view.textContent = DF.L.zones[k].no + ' · ' + DF.L.zones[k].cn + ' ' + DF.L.zones[k].en;
      stopTour();
      FLAG.still = false;
    }

    function overview() {
      rig.set(CAM0);
      viewName('总览 OVERVIEW');
      stopTour();
      data.select(null);
      hideInspector();
    }

    /* ---- inspector ---- */
    function showInspector(station) {
      if (FLAG.noCard) return;
      const s = sim.getStation(station && station.id ? station.id : station);
      if (!s) return;
      const z = DF.L.zones[s.zone];
      const stateTxt = s.state === 'run' ? '运行' : s.state === 'idle' ? '待机' : '故障';
      hud.inspector.innerHTML =
        '<div class="ins-head"><span class="ins-id">' + s.id + '</span><button class="ins-x" data-act="ins-close">×</button></div>' +
        '<div class="ins-name">' + s.cn + '<i>' + s.en + '</i></div>' +
        '<div class="ins-rows">' +
        '<div><em>所属分区</em><b>' + (z ? z.no + ' ' + z.cn : s.zone) + '</b></div>' +
        '<div><em>状态</em><b class="st-' + s.state + '">' + stateTxt + '</b></div>' +
        '<div><em>可用率</em><b>' + (s.avg * 100).toFixed(1) + '%</b></div>' +
        '<div><em>当班节拍</em><b>58 s</b></div>' +
        '<div><em>本区 WIP</em><b>' + Math.round(sim.zoneWip(s.zone)) + ' 台</b></div>' +
        '</div>' +
        '<div class="ins-actions"><button data-act="focus" data-st="' + s.id + '">飞近设备</button><button data-act="ins-close">关闭</button></div>';
      hud.inspector.classList.add('on');
    }
    function hideInspector() { hud.inspector.classList.remove('on'); }

    function focusStation(id) {
      const s = sim.getStation(id && id.id ? id.id : id);
      if (!s) return;
      rig.set({
        tx: s.x, ty: s.y, tz: s.z,
        azim: rig.cur.azim + 0.4, elev: 0.22, dist: 22, fov: 46,
      });
      viewName(s.id + ' · ' + s.cn);
      stopTour();
    }

    /* ---- 巡游 ---- */
    const cap = document.getElementById('tourcap');
    const capTitle = document.getElementById('tourTitle');
    const capNum = document.getElementById('tourNum');
    const capProg = document.getElementById('tourProg');
    const lbTop = document.getElementById('lbTop');
    const lbBot = document.getElementById('lbBot');

    const tourState = { on: false, t: 0, seg: -1, fileScale: FLAG.tourFast ? 0.16 : 1 };

    function startTour() {
      tourState.on = true;
      tourState.t = FLAG.tourAt !== null ? FLAG.tourAt : 0;
      tourState.seg = -1;
      DF.touring = true;
      document.body.classList.add('touring');
      if (FLAG.film) { document.body.classList.add('film'); setLetterbox(true); }
      updateTourUI();
    }
    function stopTour() {
      if (!tourState.on) return;
      tourState.on = false;
      DF.touring = false;
      document.body.classList.remove('touring');
      cap.classList.remove('on');
      if (FLAG.film) { document.body.classList.remove('film'); }
    }

    function updateTourUI() {
      const seg = Math.min(TOUR.length - 1, Math.floor(tourState.t / 1));
      let acc = 0, idx = 0;
      for (let i = 0; i < TOUR.length; i++) {
        if (tourState.t < acc + TOUR[i].d) { idx = i; break; }
        acc += TOUR[i].d;
        idx = i;
      }
      const local = (tourState.t - acc) / TOUR[idx].d;
      if (idx !== tourState.seg) {
        tourState.seg = idx;
        capNum.textContent = String(idx + 1).padStart(2, '0') + ' / 09';
        capTitle.textContent = TOUR[idx].cn;
        document.getElementById('tourEn').textContent = TOUR[idx].en;
        cap.classList.remove('on');
        void cap.offsetWidth;
        cap.classList.add('on');
        document.querySelectorAll('.dbtn[data-act="tour"]').forEach(b => b.classList.add('on'));
      }
      capProg.style.width = (local * 100).toFixed(1) + '%';
      const tb = document.querySelector('.dbtn[data-act="tour"]');
      if (tb) tb.innerHTML = '巡游 ' + (idx + 1) + '/9 <i>Space</i>';
    }

    function tourFrame(dt, snap) {
      if (!tourState.on) return;
      tourState.t += dt * tourState.fileScale;
      if (tourState.t >= TOUR_TOTAL) tourState.t -= TOUR_TOTAL;

      let acc = 0, idx = 0, local = 0;
      for (let i = 0; i < TOUR.length; i++) {
        if (tourState.t < acc + TOUR[i].d || i === TOUR.length - 1) {
          idx = i; local = (tourState.t - acc) / TOUR[i].d; break;
        }
        acc += TOUR[i].d;
      }
      const seg = TOUR[idx];
      const prevB = idx === 0 ? TOUR[TOUR.length - 1].b : TOUR[idx - 1].b;
      const s = seg.split;
      let kf;
      if (local < s) {
        kf = lerpKF(prevB, seg.a, DF.easeInOutCubic(local / s));
      } else {
        kf = lerpKF(seg.a, seg.b, DF.easeInOutCubic((local - s) / (1 - s)));
      }
      rig.set(kf, !!snap);
      updateTourUI();
    }

    function setLetterbox(on) {
      document.body.classList.toggle('letterbox', on);
      lbTop.style.height = on ? 'calc((100vh - 100vw / 2.39) / 2)' : '0';
      lbBot.style.height = on ? 'calc((100vh - 100vw / 2.39) / 2)' : '0';
    }

    /* ---- 键盘 ---- */
    window.addEventListener('keydown', e => {
      if (e.key === '1') zoneView('Z01');
      if (e.key === '2') zoneView('Z02');
      if (e.key === '3') zoneView('Z03');
      if (e.key === '4') zoneView('Z04');
      if (e.key === '5') zoneView('Z05');
      if (e.key === '6') zoneView('Z06');
      if (e.key === '0') overview();
      if (e.key === 'l' || e.key === 'L') toggleLabels();
      if (e.key === 'd' || e.key === 'D') toggleData();
      if (e.key === ' ') { e.preventDefault(); tourState.on ? stopTour() : startTour(); }
      if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hideui');
      if (e.key === 'b' || e.key === 'B') {
        const on = !document.body.classList.contains('letterbox');
        setLetterbox(on);
        document.body.classList.toggle('collapse', on);
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
      }
      if (e.key === 'Escape') { stopTour(); hideInspector(); setLetterbox(false); document.body.classList.remove('collapse'); }
    });

    function toggleLabels() {
      FLAG.noLabels = !FLAG.noLabels;
      data.setLabels(!FLAG.noLabels);
      const b = document.querySelector('.dbtn[data-act="labels"]');
      if (b) b.classList.toggle('on', !FLAG.noLabels);
    }
    function toggleData() {
      FLAG.noData = !FLAG.noData;
      data.setEnabled(!FLAG.noData);
      const b = document.querySelector('.dbtn[data-act="data"]');
      if (b) b.classList.toggle('on', !FLAG.noData);
    }

    /* ---- 点击 / 拖拽 ---- */
    canvas.addEventListener('pointerdown', e => {
      downPos = { x: e.clientX, y: e.clientY, t: performance.now() };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      rig.pointer.x = e.clientX / window.innerWidth;
      rig.pointer.y = e.clientY / window.innerHeight;
      if (e.buttons) {
        const dx = e.movementX || 0, dy = e.movementY || 0;
        if (DF.touring) stopTour();
        rig.tgt.azim -= dx * 0.0055;
        rig.tgt.elev = DF.clamp(rig.tgt.elev + dy * 0.0042, 0.05, 1.32);
        rig.idle = 0;
      }
    });
    canvas.addEventListener('pointerup', e => {
      if (!downPos) return;
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      const quick = performance.now() - downPos.t < 420;
      if (moved < 6 && quick) {
        const obj = pickAt(e.clientX, e.clientY);
        if (obj && obj.userData.station) {
          showInspector(obj.userData.station);
          focusStation(obj.userData.station);
        } else if (obj && obj.userData.zone) {
          zoneView(obj.userData.zone);
          data.select(null);
        } else {
          hideInspector();
        }
      }
      downPos = null;
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (DF.touring) stopTour();
      rig.tgt.dist = DF.clamp(rig.tgt.dist * (1 + e.deltaY * 0.0012), 16, 540);
      rig.idle = 0;
    }, { passive: false });

    // 双指缩放
    let pinch = null;
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        rig.tgt.dist = DF.clamp(rig.tgt.dist * (pinch / d), 16, 540);
        pinch = d;
      }
    }, { passive: true });

    /* ---- dock / HUD 事件 ---- */
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'overview') overview();
      if (act === 'zone') zoneView(btn.getAttribute('data-zone'));
      if (act === 'data') toggleData();
      if (act === 'labels') toggleLabels();
      if (act === 'tour') tourState.on ? stopTour() : startTour();
      if (act === 'reset') { overview(); data.select(null); }
      if (act === 'full') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
      }
      if (act === 'ins-close') hideInspector();
      if (act === 'focus') focusStation(btn.getAttribute('data-st'));
      if (act === 'rate') {
        sim.setRate(sim.rate() === 1 ? 2 : sim.rate() === 2 ? 4 : 1);
        hud.rate.textContent = sim.rate() + '×';
      }
    });

    // dock 内分区按钮
    document.addEventListener('click', e => {
      const z = e.target.closest('.zrow');
      if (z) zoneView(z.getAttribute('data-zone'));
    });

    /* ---- 初始状态 ---- */
    document.querySelectorAll('.dbtn[data-act="data"]').forEach(b => b.classList.toggle('on', !FLAG.noData));
    document.querySelectorAll('.dbtn[data-act="labels"]').forEach(b => b.classList.toggle('on', !FLAG.noLabels));
    hud.rate.textContent = sim.rate() + '×';
    if (FLAG.hideUI || FLAG.film) document.body.classList.add('hideui');
    if (FLAG.film) { document.body.classList.add('film'); setLetterbox(true); }
    if (FLAG.letterbox) setLetterbox(true);
    if (FLAG.view && /^Z0[1-6]$/.test(FLAG.view)) zoneView(FLAG.view);
    if (FLAG.view === 'overview') overview();
    if (FLAG.tour || FLAG.film) startTour();
    if (FLAG.tourAt !== null) {
      tourState.on = true; tourState.t = FLAG.tourAt; tourFrame(0, true);
    }

    /* ---- veil ---- */
    const veil = document.getElementById('veil');
    if (FLAG.instant || FLAG.raw) veil.remove();
    else setTimeout(() => { veil.classList.add('out'); setTimeout(() => veil.remove(), 1000); }, 420);

    /* ---- 主循环 ---- */
    let last = performance.now();
    let animT = 0;
    let fpsAcc = 0, fpsN = 0, fpsVal = 60, degrade = 0, prNow = pr;

    const perfEl = document.getElementById('fps');
    if (!FLAG.debug) perfEl.style.display = 'none';

    function frame(now) {
      requestAnimationFrame(frame);
      let dtRaw = (now - last) / 1000;
      if (!(dtRaw >= 0)) { DF.__negDt = (DF.__negDt || 0) + 1; dtRaw = 0; }
      dtRaw = Math.min(0.05, dtRaw);
      last = now;
      const dtSim = dtRaw * Math.min(sim.rate(), 2);

      sim.tick(dtRaw);
      animT += dtRaw * (sim.rate() === 1 ? 1 : sim.rate() === 2 ? 1.35 : 1.7);

      rig.idle += dtRaw;
      tourFrame(dtRaw);
      rig.update(dtRaw);

      process.update(animT, dtRaw * (sim.rate() === 1 ? 1 : 1.5), sim);
      logistics.update(animT, dtRaw * (sim.rate() === 1 ? 1 : 1.5), sim);
      assembly.update(animT, dtRaw * (sim.rate() === 1 ? 1 : 1.5), sim);
      data.update(dtRaw, animT, sim);

      renderer.info.reset();
      post.render(scene, camera, animT);
      if (!DF.__ready) DF.__ready = true;

      // HUD 10 Hz
      hudAcc += dtRaw;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        updateHUD(hud, sim, rig, camera);
        if (FLAG.debug && perfEl) {
          perfEl.textContent = fpsVal.toFixed(0) + ' fps · ' + renderer.info.render.calls + ' calls · ' + ((renderer.info.render.triangles || 0) / 1000).toFixed(0) + 'k tri';
        }
      }

      // 帧率与降级
      fpsAcc += dtRaw; fpsN++;
      if (fpsAcc > 0.6) {
        fpsVal = fpsN / fpsAcc;
        fpsAcc = 0; fpsN = 0;
        if (fpsVal < 46 && degrade < 2 && !FLAG.raw) {
          degrade++;
          prNow = degrade === 1 ? Math.min(1.2, pr) : 1;
          renderer.setPixelRatio(prNow);
          renderer.setSize(window.innerWidth, window.innerHeight, false);
          post.setSize(window.innerWidth, window.innerHeight, prNow);
        }
      }
    }

    document.body.classList.add('ready');

    // 首帧预编译
    camera.position.set(120, 90, 200);
    camera.lookAt(0, 4, 0);
    renderer.compile(scene, camera);
    requestAnimationFrame(frame);

    // 尺寸
    let FIT = 1;            // 竖屏时把机位推远，保证整条产线仍在画面内
    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      window.__FIT = camera.aspect < 1 ? Math.min(1.8, Math.pow(1 / camera.aspect, 0.45)) : 1;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      post.setSize(w, h, pr);
      data.setLabels(!FLAG.noLabels);
    }
    window.addEventListener('resize', onResize);
    onResize();

    // 调试入口
    window.DF.api = {
      sim, rig, data, post, camera, scene, renderer,
      zoneView, overview, startTour, stopTour, focusStation, showInspector,
      isTouring: () => !!DF.touring,
      info() {
        return {
          calls: renderer.info.render.calls,
          tris: renderer.info.render.triangles,
          stations: DF.STATIONS.length,
          building: (performance.now() - tBuild).toFixed(0) + 'ms build',
        };
      },
    };
    console.log('[DF-01] build', (performance.now() - tBuild).toFixed(0) + 'ms', 'stations', DF.STATIONS.length);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.DF = window.DF || {});
