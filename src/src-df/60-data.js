/* ============================================================
   DF-01 · 60-data —— 琥珀数据层：分区轮廓 / 投影标签 / 能源流 / 信标
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  function rectPts(z, y) {
    return [
      new T.Vector3(z.x0, y, z.z0), new T.Vector3(z.x1, y, z.z0),
      new T.Vector3(z.x1, y, z.z1), new T.Vector3(z.x0, y, z.z1),
      new T.Vector3(z.x0, y, z.z0),
    ];
  }

  function plate(no, cn, en) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(242,167,59,0.55)';
    c.lineWidth = 2;
    c.strokeRect(8, 8, 240, 240);
    c.fillStyle = 'rgba(242,167,59,0.9)';
    c.font = '700 96px "Bahnschrift","DIN Alternate",sans-serif';
    c.fillText(no, 26, 118);
    c.font = '500 30px "Microsoft YaHei",sans-serif';
    c.fillStyle = 'rgba(232,226,214,0.85)';
    c.fillText(cn, 26, 168);
    c.font = '400 20px "Bahnschrift",monospace';
    c.fillStyle = 'rgba(242,167,59,0.55)';
    c.fillText(en, 26, 200);
    const tex = new T.CanvasTexture(cv);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  DF.buildData = function (scene, camera) {
    const g = new T.Group();
    g.name = 'dataLayer';
    scene.add(g);

    const amber = DF.col(0xf2a73b, 0.8);
    const amberDim = DF.col(0xf2a73b, 0.35);

    /* ---------- 1. 分区轮廓 ---------- */
    const zones = DF.L.zones;
    const zoneMeshes = {};
    Object.keys(zones).forEach(k => {
      const z = zones[k];
      const outline = new T.Line(
        new T.BufferGeometry().setFromPoints(rectPts(z, 0.07)),
        new T.LineBasicMaterial({ color: DF.col(0xf2a73b, 0.75), transparent: true, opacity: 0.55 })
      );
      g.add(outline);

      const fill = new T.Mesh(
        new T.PlaneGeometry(z.x1 - z.x0, z.z1 - z.z0),
        new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 1), transparent: true, opacity: 0.035, depthWrite: false })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set((z.x0 + z.x1) / 2, 0.05, (z.z0 + z.z1) / 2);
      g.add(fill);

      // 角标（L 形延伸）
      const corner = 3.2;
      [[z.x0, z.z0, 1, 1], [z.x1, z.z0, -1, 1], [z.x1, z.z1, -1, -1], [z.x0, z.z1, 1, -1]].forEach(c => {
        const pts = [
          new T.Vector3(c[0] + c[2] * corner, 0.08, c[1]),
          new T.Vector3(c[0], 0.08, c[1]),
          new T.Vector3(c[0], 0.08, c[1] + c[3] * corner),
        ];
        g.add(new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: DF.col(0xf2a73b, 0.5), transparent: true, opacity: 0.5 })
        ));
      });

      // 地面编号牌
      const tex = plate(z.no, z.cn, z.en);
      const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false });
      const pl = new T.Mesh(new T.PlaneGeometry(9, 9), mat);
      pl.rotation.x = -Math.PI / 2;
      pl.position.set(z.x0 + 5.6, 0.09, z.z0 + 5.6);
      g.add(pl);

      zoneMeshes[k] = { outline, fill };
    });

    // 能源站轮廓
    const E = DF.L.energy;
    g.add(new T.Line(
      new T.BufferGeometry().setFromPoints(rectPts(E, 0.07)),
      new T.LineBasicMaterial({ color: DF.col(0xf2a73b, 0.5), transparent: true, opacity: 0.4 })
    ));

    /* ---------- 2. 能源流（虚线主干 + 分支 + 移动脉冲） ---------- */
    const flowGroup = new T.Group();
    g.add(flowGroup);
    const branches = [
      { pts: [[-36, -52], [-36, -40], [-36, -12], [2, -12]], speed: 0.055 },
      { pts: [[-36, -12], [-60, -12], [-60, 6], [-62, 20]], speed: 0.048 },
      { pts: [[-36, -12], [-30, -14], [-30, 12], [-26, 20]], speed: 0.05 },
      { pts: [[2, -12], [8, -12], [8, 20], [30, 22]], speed: 0.045 },
      { pts: [[8, 20], [40, 24], [64, 20]], speed: 0.052 },
      { pts: [[8, 20], [22, 6], [22, -26], [26, -32]], speed: 0.042 },
    ];
    const pulses = [];
    branches.forEach((br, bi) => {
      const pts = br.pts.map(p => new T.Vector3(p[0], 0.12, p[1]));
      const curve = DF.polyPath(pts, { smooth: 3 });
      const lineGeo = new T.BufferGeometry().setFromPoints(curve.dense);
      const line = new T.Line(lineGeo, new T.LineDashedMaterial({
        color: DF.col(0xf2a73b, 0.85), dashSize: 1.4, gapSize: 0.9,
        transparent: true, opacity: 0.55,
      }));
      line.computeLineDistances();
      flowGroup.add(line);
      for (let k = 0; k < 2; k++) {
        const pulse = new T.Mesh(
          new T.SphereGeometry(0.16, 8, 6),
          new T.MeshBasicMaterial({ color: DF.col(0xffd39a, 2.4) })
        );
        flowGroup.add(pulse);
        pulses.push({ o: pulse, curve, off: k * 0.5 + bi * 0.13, speed: br.speed });
      }
    });

    /* ---------- 3. 物料流：AGV 环线 ---------- */
    if (DF.logistics && DF.logistics.agv) {
      const pts = DF.logistics.agv.path.dense.map(p => new T.Vector3(p.x, 0.14, p.z));
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({
        color: DF.col(0xf2a73b, 0.6), dashSize: 1.2, gapSize: 1.6, transparent: true, opacity: 0.4,
      }));
      line.computeLineDistances();
      flowGroup.add(line);
    }

    /* ---------- 4. 数字孪生包络盒 ---------- */
    const envelopes = [
      { x: -31, y: 5.5, z: -19, w: 34, h: 11, d: 15 },       // 冲压线
      { x: -30, y: 1.6, z: 20, w: 34, h: 3.2, d: 28 },       // 焊装
      { x: 2, y: 3.2, z: -18, w: 22, h: 6.4, d: 28 },        // 涂装
      { x: 40, y: 1.4, z: 20, w: 46, h: 2.8, d: 32 },        // 总装
      { x: 67, y: 2.2, z: 20, w: 14, h: 4.4, d: 14 },        // EOL
      { x: -62, y: 10, z: 0, w: 28, h: 20, d: 66 },          // 立库
    ];
    envelopes.forEach(e => {
      const box = new T.Box3(
        new T.Vector3(e.x - e.w / 2, 0, e.z - e.d / 2),
        new T.Vector3(e.x + e.w / 2, e.h, e.z + e.d / 2)
      );
      const geo = new T.EdgesGeometry(new T.BoxGeometry(e.w, e.h, e.d));
      const ls = new T.LineSegments(geo, new T.LineBasicMaterial({
        color: DF.col(0xf2a73b, 0.45), transparent: true, opacity: 0.3,
      }));
      ls.position.set(e.x, e.h / 2, e.z);
      g.add(ls);
      // 顶部四角小标记
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => {
        const m = new T.Mesh(new T.SphereGeometry(0.09, 6, 6), new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 1.6) }));
        m.position.set(e.x + c[0] * e.w / 2, e.h, e.z + c[1] * e.d / 2);
        g.add(m);
      });
    });

    /* ---------- 5. 地面扫描带 ---------- */
    const scan = new T.Mesh(
      new T.PlaneGeometry(10, 78),
      new T.MeshBasicMaterial({
        color: DF.col(0xf2a73b, 1), transparent: true, opacity: 0.05, depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    scan.rotation.x = -Math.PI / 2;
    scan.position.set(-70, 0.11, 0);
    g.add(scan);

    /* ---------- 6. 工位信标 + 告警涟漪 ---------- */
    const beaconGeo = new T.SphereGeometry(0.22, 10, 8);
    const beaconMats = {
      run: new T.MeshBasicMaterial({ color: DF.col(0x9ed6b4, 2.0) }),
      idle: new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 2.0) }),
      down: new T.MeshBasicMaterial({ color: DF.col(0xff5638, 2.2) }),
    };
    const beacons = [];
    DF.STATIONS.forEach((s, i) => {
      const m = new T.Mesh(beaconGeo, beaconMats.idle);
      m.position.set(s.x, s.y, s.z);
      m.userData.station = s.id;
      g.add(m);
      // 垂直细引线
      const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.9, 5),
        new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 1.2), transparent: true, opacity: 0.6 }));
      stem.position.set(s.x, s.y - 0.5, s.z);
      g.add(stem);
      beacons.push({ o: m, stem, s, ph: i * 0.47 });
    });

    const rings = [];
    const ringGeo = new T.RingGeometry(0.35, 0.42, 28);
    for (let i = 0; i < 8; i++) {
      const r = new T.Mesh(ringGeo, new T.MeshBasicMaterial({
        color: DF.col(0xff5638, 1.6), transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false,
      }));
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      g.add(r);
      rings.push({ o: r, t: 0, active: false, station: null });
    }

    /* ---------- 7. 选中高亮 ---------- */
    const selGroup = new T.Group();
    selGroup.visible = false;
    g.add(selGroup);
    const selBox = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)),
      new T.LineBasicMaterial({ color: DF.col(0xffd39a, 1.2), transparent: true, opacity: 0.9 })
    );
    selGroup.add(selBox);

    /* ---------- 8. DOM 投影标签 ---------- */
    const labelRoot = document.getElementById('labels');
    const labels = [];
    Object.keys(zones).forEach(k => {
      if (k === 'Z07') return;
      const z = zones[k];
      const el = document.createElement('div');
      el.className = 'dlabel';
      el.innerHTML =
        '<div class="dl-card"><div class="dl-no">' + z.no + '</div>' +
        '<div class="dl-txt"><b>' + z.cn + '</b><i>' + z.en + '</i></div>' +
        '<div class="dl-val"><span data-v="util">--</span><em>UTIL</em></div>' +
        '<div class="dl-val"><span data-v="wip">--</span><em>WIP</em></div></div>' +
        '<div class="dl-line"></div><div class="dl-dot"></div>';
      labelRoot.appendChild(el);
      labels.push({
        el, zone: k,
        anchor: new T.Vector3((z.x0 + z.x1) / 2, 8.4, z.z0 + 2),
        util: el.querySelector('[data-v="util"]'),
        wip: el.querySelector('[data-v="wip"]'),
      });
    });
    DF._labels = labels;

    const v = new T.Vector3();
    let labelAcc = 0;

    return {
      group: g,
      labels,
      setEnabled(on) { g.visible = on; },
      setLabels(on) { labelRoot.style.display = on ? '' : 'none'; },
      select(bounds, label) {
        if (!bounds) { selGroup.visible = false; return; }
        selGroup.visible = true;
        selBox.position.set(bounds.x, bounds.y, bounds.z);
        selBox.scale.set(bounds.w, bounds.h, bounds.d);
      },
      ping(stationId) {
        const s = DF.STATIONS.find(x => x.id === stationId);
        if (!s) return;
        const free = rings.find(r => !r.active);
        if (!free) return;
        free.active = true; free.t = 0; free.o.visible = true;
        free.o.position.set(s.x, 0.12, s.z);
      },
      update(dt, t, sim) {
        // 能源脉冲
        pulses.forEach(p => {
          const u = (t * p.speed + p.off) % 1;
          p.curve.getPointAt(u, v);
          p.o.position.set(v.x, 0.18, v.z);
        });
        // 扫描带
        const sx = -70 + ((t * 0.1) % 1) * 140;
        scan.position.x = sx;
        // 信标呼吸 + 状态
        beacons.forEach(b => {
          const st = sim ? sim.getStation(b.s.id) : null;
          const state = st ? st.state : 'run';
          b.o.material = beaconMats[state] || beaconMats.run;
          const br = 1 + Math.sin(t * 2.2 + b.ph) * 0.16;
          b.o.scale.setScalar(br);
          b.stem.material.opacity = (state === 'down' ? 0.9 : 0.45) + Math.sin(t * 2.2 + b.ph) * 0.15;
        });
        // 告警涟漪
        rings.forEach(r => {
          if (!r.active) return;
          r.t += dt;
          const k = r.t / 1.8;
          if (k >= 1) { r.active = false; r.o.visible = false; return; }
          r.o.scale.setScalar(1 + k * 4.5);
          r.o.material.opacity = 0.55 * (1 - k);
        });
        // 标签 20 fps（投影 + 碰撞避让 + HUD 区域避让）
        labelAcc += dt;
        if (labelAcc < 0.05) return;
        labelAcc = 0;
        const used = [];
        const W = window.innerWidth, H = window.innerHeight;
        const narrow = W < 900;
        const hideX = narrow ? 0 : 264, hideX2 = narrow ? W : W - 288;
        const hideTop = narrow ? 54 : 64, hideBottom = narrow ? H - 96 : H - 104;
        labels.forEach(L => {
          if (!g.visible || labelRoot.style.display === 'none') { L.el.style.opacity = 0; return; }
          v.copy(L.anchor).project(camera);
          if (v.z > 1) { L.el.style.opacity = 0; return; }
          const x = (v.x * 0.5 + 0.5) * W;
          const y = (-v.y * 0.5 + 0.5) * H;
          const dist = camera.position.distanceTo(L.anchor);
          if (x - 96 < hideX || x + 96 > hideX2 || y < hideTop || y > hideBottom || dist > 620) {
            L.el.style.opacity = 0; return;
          }
          const cw = 182, ch = 46;
          let lead = 16;
          for (let k = 0; k < 3; k++) {
            const top = y - lead - ch;
            const hit = used.some(r => Math.abs(r.x - x) < cw && Math.abs(r.y - (top + ch / 2)) < ch + 8);
            if (!hit) { used.push({ x, y: top + ch / 2 }); break; }
            lead += ch + 10;
          }
          L.el.style.left = x.toFixed(1) + 'px';
          L.el.style.top = y.toFixed(1) + 'px';
          L.el.style.setProperty('--lead', lead + 'px');
          L.el.style.opacity = 1;
        });

        // 数值随仿真刷新
        labels.forEach(L => {
          if (sim) {
            L.util.textContent = (sim.zoneUtil(L.zone) * 100).toFixed(0) + '%';
            L.wip.textContent = sim.zoneWip(L.zone);
          }
        });
      },
    };
  };

})(window.DF = window.DF || {});
