/* ============================================================
   DF-01 · 45-logistics —— 立体库 / 堆垛机 / 月台卡车 / AGV 车队 / 叉车
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  /* ---------- 立体库 ---------- */
  function buildASRS(scene) {
    const b = new DF.Builder();
    const ROWS = [-73.4, -66.2, -59.0, -51.8];   // 4 排货架（x）
    const LEVELS = 8, LH = 2.3, H = 20.2;
    const Z0 = -33, Z1 = 33;
    const BAYS = 30;
    const bayD = (Z1 - Z0) / BAYS;

    ROWS.forEach(x => {
      // 立柱 + 横梁
      for (let i = 0; i <= BAYS; i++) {
        const z = Z0 + i * bayD;
        b.box('metal', 0x5d6670, 0.14, H, 2.2, x, H / 2, z);
      }
      for (let l = 0; l <= LEVELS; l++) {
        b.box('metal', 0x6d757e, 3.0, 0.16, 0.14, x, 0.4 + l * LH, Z0);
        b.box('metal', 0x6d757e, 3.0, 0.16, 0.14, x, 0.4 + l * LH, Z1);
        b.box('metal', 0x5f676f, 0.1, 0.16, Z1 - Z0, x - 1.2, 0.4 + l * LH, 0);
        b.box('metal', 0x5f676f, 0.1, 0.16, Z1 - Z0, x + 1.2, 0.4 + l * LH, 0);
      }
      // 端部斜撑
      for (let l = 0; l < LEVELS; l += 2) {
        b.box('metal', 0x4c545d, 0.1, LH * 2.1, 0.1, x - 1.1, 0.4 + l * LH + LH, Z0 + 0.2, 0, 0, 0.06);
      }
    });

    // 库位货品（InstanceMesh，按 4 种色调）
    const binGeo = new T.BoxGeometry(2.2, 1.9, 2.0);
    const cols = [0x4a3a22, 0x4a4842, 0x1e2831, 0x25282d, 0x3c4249];
    const mats = cols.map(c => new T.MeshStandardMaterial({
      color: DF.col(c), roughness: 0.86, metalness: 0.12, envMapIntensity: 0.35,
    }));
    const perMat = cols.map(() => []);
    const rnd = DF.hash(9931);

    ROWS.forEach(x => {
      for (let lv = 0; lv < LEVELS; lv++) {
        for (let i = 0; i < BAYS; i++) {
          const z = Z0 + (i + 0.5) * bayD;
          // 每个货架位两侧各一列库位
          [-0.62, 0.62].forEach(dx => {
            if (rnd() > 0.64) return;
            const sel = Math.floor(rnd() * cols.length);
            const hh = 1.9 * (0.55 + rnd() * 0.42);
            perMat[sel].push({ x: x + dx, y: 0.4 + lv * LH + hh / 2 + 0.1, z, h: hh, r: (rnd() - 0.5) * 0.06 });
          });
        }
      }
    });
    perMat.forEach((list, mi) => {
      if (!list.length) return;
      const inst = new T.InstancedMesh(binGeo, mats[mi], list.length);
      const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
      list.forEach((o, i) => {
        e.set(0, o.r, 0); q.setFromEuler(e);
        s.set(1, o.h / 1.9, 1); p.set(o.x, o.y, o.z);
        m.compose(p, q, s);
        inst.setMatrixAt(i, m);
      });
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = true;
      scene.add(inst);
    });

    // P&D 输送线（库前）
    b.box('metal', DF.C.steelDark, 2.2, 0.5, 44, -49.4, 0.7, 0);
    for (let z = -20; z <= 20; z += 2.2) {
      b.cyl('metal', DF.C.steelLight, 0.16, 0.16, 1.9, 8, -49.4, 0.95, z, 0, 0, Math.PI / 2);
    }
    // 充电位
    for (let i = 0; i < 3; i++) {
      b.box('matte', 0x26292d, 1.6, 0.12, 2.4, -49.6, 0.06, 24 + i * 3.0);
      b.box('emit', DF.col(0xf2a73b, 1.0), 0.12, 0.06, 1.6, -48.8, 0.4, 24 + i * 3.0);
    }

    // 3 台堆垛机（动态）
    const cranes = [];
    [-69.8, -62.6, -55.4].forEach((x, i) => {
      const g = new T.Group();
      const bb = new DF.Builder();
      bb.box('metal', 0x3d444b, 0.55, 0.3, 3.4, 0, H + 0.9, 0);          // 顶部小车
      bb.box('metal', 0x6f7881, 0.24, H + 0.8, 0.24, 0, (H + 0.8) / 2, 1.6);
      bb.box('metal', 0x6f7881, 0.24, H + 0.8, 0.24, 0, (H + 0.8) / 2, -1.6);
      bb.box('emit', DF.col(0xf2a73b, 1.2), 0.3, 0.12, 0.3, 0, H + 0.3, 1.7);
      bb.flush(g);
      // 载货台
      const car = new T.Group();
      const cb = new DF.Builder();
      cb.box('metal', DF.C.steelLight, 1.1, 0.35, 2.4, 0, 0, 0);
      cb.box('metal', DF.C.steelDark, 0.9, 0.5, 2.0, 0, 0.35, 0);
      cb.box('emit', DF.col(0x9ed6b4, 0.9), 0.1, 0.06, 0.5, 0.5, -0.1, 0);
      cb.flush(car);
      g.add(car);
      g.position.set(x, 0, 0);
      scene.add(g);
      cranes.push({ g, car, x, phase: i * 0.37, amp: 0.9 });
    });

    return { cranes, update(t) {
      cranes.forEach(c => {
        const p = (t * 0.09 + c.phase) % 1;
        const z = -28 + Math.sin(p * DF.TAU) * 28;
        c.g.position.z = z;
        const y = 2.2 + (Math.sin(p * DF.TAU * 2 + 1) * 0.5 + 0.5) * 15.6;
        c.car.position.y = y;
      });
    } };
  }

  /* ---------- 进厂月台：卡车 + 卸货雨棚下的作业 ---------- */
  function buildDock(scene) {
    const trucks = [];
    const zs = [-22, -2, 18];
    zs.forEach((z, i) => {
      const t = DF.makeTruck({
        x: -86.5, z: z, ry: Math.PI / 2,
        color: [0xb7bcc2, 0x6f7a84, 0xc8c3b6][i],
        boxColor: [0xd7d9d6, 0x9aa4ae, 0xcfc9bb][i],
      });
      scene.add(t);
      trucks.push({ o: t, base: -86.5, z, phase: i * 0.4 });
    });
    // 备车（再挂 1 台在堆场）
    const parked = DF.makeTruck({ x: -104, z: 6, ry: Math.PI / 2, color: 0x545e68, boxColor: 0x8d9299 });
    scene.add(parked);

    // 叉车 ×2
    const lifts = [];
    [[-52, 22], [-51, -12]].forEach((p, i) => {
      const g = new T.Group();
      const b = new DF.Builder();
      b.box('matte', 0xc9a227, 1.1, 0.75, 2.1, 0, 0.62, 0);
      b.box('metal', DF.C.steelDark, 1.15, 0.55, 0.9, 0, 1.1, -0.6);
      b.box('metal', DF.C.steelDark, 0.12, 1.7, 0.12, 0, 1.85, -0.9);
      b.box('metal', DF.C.steelDark, 0.12, 1.7, 0.12, 0.9, 1.85, -0.9);
      b.box('metal', DF.C.steelDark, 0.12, 0.12, 1.4, 0, 2.6, -0.2);
      b.box('metal', DF.C.steelLight, 0.1, 0.7, 0.06, 0.45, 2.35, -0.55);
      b.cyl('rubber', DF.C.rubber, 0.34, 0.34, 0.26, 12, 0.5, 0.34, 0.6, 0, 0, Math.PI / 2);
      b.cyl('rubber', DF.C.rubber, 0.34, 0.34, 0.26, 12, -0.5, 0.34, 0.6, 0, 0, Math.PI / 2);
      b.cyl('rubber', DF.C.rubber, 0.28, 0.28, 0.24, 12, 0.5, 0.28, -0.85, 0, 0, Math.PI / 2);
      b.cyl('rubber', DF.C.rubber, 0.28, 0.28, 0.24, 12, -0.5, 0.28, -0.85, 0, 0, Math.PI / 2);
      b.box('emit', DF.col(0xffcf8a, 1.4), 0.1, 0.1, 0.1, 0, 1.95, -0.95);
      b.flush(g);
      g.position.set(p[0], 0, p[1]);
      scene.add(g);
      lifts.push({ o: g, x: p[0], z: p[1], phase: i * 1.9 });
    });
    return { trucks, lifts, update(t) {
      lifts.forEach((l, i) => {
        l.o.position.x = l.x + Math.sin(t * 0.28 + l.phase) * 3.4;
        l.o.position.z = l.z + Math.cos(t * 0.22 + l.phase) * 2.2;
        l.o.rotation.y = Math.sin(t * 0.2 + l.phase) * 0.9 + Math.PI;
      });
      trucks.forEach((tr, i) => {
        tr.o.position.x = tr.base + Math.sin(t * 0.06 + tr.phase) * 0.35;
      });
    } };
  }

  /* ---------- AGV 环线 ---------- */
  function agvPath() {
    // 沿中央脊线 z ∈ [-2.6, 2.6]，两端圆角
    const arr = [];
    const x0 = -70, x1 = 64, r = 2.6, step = 1.2;
    for (let x = x0 + r; x <= x1 - r; x += step) arr.push([x, -r, 0]);
    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.12) arr.push([x1 - r + Math.cos(a) * r, Math.sin(a) * r, 0]);
    for (let x = x1 - r; x >= x0 + r; x -= step) arr.push([x, r, 0]);
    for (let a = Math.PI / 2; a <= Math.PI * 1.5; a += 0.12) arr.push([x0 + r + Math.cos(a) * r, Math.sin(a) * r, 0]);
    return DF.polyPath(arr, { closed: true, smooth: 1 });
  }

  function buildAGV(scene) {
    const path = agvPath();
    const N = 12;
    const fleet = [];
    const b = new DF.Builder();
    // 共用几何：车身
    const bodyGeo = new T.BoxGeometry(2.6, 0.5, 1.7);
    const matBody = DF.mat('gloss');
    const deckGeo = new T.BoxGeometry(2.4, 0.1, 1.55);
    const loadGeo = new T.BoxGeometry(1.9, 1.1, 1.4);
    const wheelGeo = new T.CylinderGeometry(0.2, 0.2, 0.18, 10);

    for (let i = 0; i < N; i++) {
      const g = new T.Group();
      const body = new T.Mesh(DF.tint(bodyGeo.clone(), DF.C.steelDark), matBody);
      body.position.y = 0.42;
      body.castShadow = true;
      g.add(body);
      const deck = new T.Mesh(DF.tint(deckGeo.clone(), 0x3b4249), matBody);
      deck.position.y = 0.72;
      g.add(deck);
      // 载荷
      const load = new T.Mesh(DF.tint(loadGeo.clone(), i % 3 === 0 ? DF.C.kraft : (i % 3 === 1 ? DF.C.binBlue : DF.C.wrap)), DF.mat('matte'));
      load.position.set(0, 1.3, 0);
      load.castShadow = true;
      g.add(load);
      // 轮
      for (const [dx, dz] of [[0.9, 0.72], [-0.9, 0.72], [0.9, -0.72], [-0.9, -0.72]]) {
        const w = new T.Mesh(DF.tint(wheelGeo.clone(), DF.C.rubber), DF.mat('rubber'));
        w.rotation.z = Math.PI / 2;
        w.position.set(dx, 0.2, dz);
        g.add(w);
      }
      // 顶灯（琥珀 → 状态色在 update 中改）
      const beacon = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 2.2) }));
      beacon.position.set(0.95, 0.92, 0.65);
      g.add(beacon);
      // 侧向扫描条
      const strip = new T.Mesh(new T.BoxGeometry(2.5, 0.05, 0.06), new T.MeshBasicMaterial({ color: DF.col(0xf2a73b, 1.4) }));
      strip.position.set(0, 0.62, 0.86);
      g.add(strip);
      g.userData.kind = 'agv';
      g.userData.idx = i;
      scene.add(g);
      fleet.push({ o: g, u: (i / N) * 1.0, speed: 0.02 + (i % 3) * 0.004, beacon, strip, load });
    }

    const pos = new T.Vector3(), tan = new T.Vector3();
    return {
      path, fleet,
      station: (i, u) => fleet[i].u = u,
      update(t, dt, sim) {
        fleet.forEach((a, i) => {
          a.u = (a.u + a.speed * dt) % 1;
          path.getPointAt(a.u, pos);
          path.getTangentAt(a.u, tan);
          a.o.position.set(pos.x, 0, pos.z);
          a.o.rotation.y = Math.atan2(tan.x, tan.z) - Math.PI / 2;
          const st = sim ? sim.agvState(i) : 'run';
          const col = st === 'down' ? DF.col(0xff5638, 2.2) : st === 'idle' ? DF.col(0xf2a73b, 2.2) : DF.col(0x9ed6b4, 2.0);
          a.beacon.material.color.copy(col);
          a.strip.material.color.copy(col);
          // 载荷随电量/节拍轻微起伏
          a.load.position.y = 1.3 + Math.sin(t * 0.8 + i) * 0.01;
        });
      },
    };
  }

  function buildLogistics(scene, ctx) {
    const asrs = buildASRS(scene);
    const dock = buildDock(scene);
    const agv = buildAGV(scene);

    DF.STATIONS.push(
      { id: 'ASRS-01', cn: '立体库堆垛机 1', en: 'STACKER CRANE 1', zone: 'Z01', x: -62, y: 12, z: 0 },
      { id: 'ASRS-02', cn: '立体库堆垛机 2', en: 'STACKER CRANE 2', zone: 'Z01', x: -52, y: 8, z: 4 },
      { id: 'AGV-01', cn: 'AGV 车队', en: 'AGV FLEET', zone: 'Z01', x: 0, y: 1.4, z: 0 }
    );

    return {
      asrs, dock, agv,
      update(t, dt, sim) {
        asrs.update(t);
        dock.update(t);
        agv.update(t, dt, sim);
      },
    };
  }

  DF.buildLogistics = buildLogistics;

})(window.DF = window.DF || {});
