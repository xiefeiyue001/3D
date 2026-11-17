/* ============================================================
   DF-01 · 40-process —— 冲压线 / 焊装机器人 / 涂装房 / 空中输送链
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  DF.STATIONS = DF.STATIONS || [];

  /* ---------- 白车身（BIW 壳体，无轮） ---------- */
  DF.makeBodyShell = function (color, opts) {
    const o = opts || {};
    const g = new T.Group();
    const b = new DF.Builder();
    const body = color === undefined ? DF.C.whiteBody : color;
    b.box('matte', body, 1.62, 0.10, 4.05, 0, 0.52, 0);              // 地板
    b.box('matte', body, 0.09, 0.52, 3.6, 0.80, 0.85, 0.1);          // 侧围
    b.box('matte', body, 0.09, 0.52, 3.6, -0.80, 0.85, 0.1);
    b.box('matte', body, 1.55, 0.09, 1.75, 0, 1.45, 0.35);           // 顶盖
    b.box('matte', body, 1.5, 0.4, 0.12, 0, 1.2, 1.72);              // A 柱横梁
    b.box('matte', body, 1.5, 0.36, 0.12, 0, 1.22, -1.2);            // C 柱
    b.box('matte', body, 0.14, 0.62, 0.14, 0.76, 1.16, 0.95);
    b.box('matte', body, 0.14, 0.62, 0.14, -0.76, 1.16, 0.95);
    b.box('matte', body, 1.66, 0.12, 0.5, 0, 0.72, 1.95);            // 前舱
    b.box('matte', body, 1.66, 0.12, 0.5, 0, 0.72, -1.95);
    b.box('glass', DF.C.glass, 1.42, 0.06, 1.5, 0, 1.5, 0.35);        // 顶棚玻璃区
    b.flush(g);
    if (o.x !== undefined) g.position.set(o.x, o.y || 0, o.z || 0);
    if (o.ry) g.rotation.y = o.ry;
    return g;
  };

  /* ---------- 安全围栏 ---------- */
  function fence(b, x0, z0, x1, z1, h, color) {
    const c = color || DF.C.steel;
    const lenX = Math.abs(x1 - x0), lenZ = Math.abs(z1 - z0);
    const n = Math.max(2, Math.round(Math.max(lenX, lenZ) / 2.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      b.box('metal', c, 0.08, h, 0.08, DF.lerp(x0, x1, t), h / 2, DF.lerp(z0, z1, t));
    }
    b.box('metal', c, lenX || 0.08, 0.05, lenZ || 0.08, (x0 + x1) / 2, h, (z0 + z1) / 2);
    b.box('metal', DF.col(0xd4a43a, 0.8), lenX || 0.08, 0.03, lenZ || 0.08, (x0 + x1) / 2, h - 0.25, (z0 + z1) / 2);
  }

  /* ---------- 六轴机器人（每关节一个合并网格） ---------- */
  function makeRobot(opts) {
    const o = opts || {};
    const accent = o.accent === undefined ? DF.C.safety : o.accent;
    const root = new T.Group();
    const b0 = new DF.Builder();
    b0.cyl('metal', DF.C.concreteDark, 0.72, 0.82, 0.22, 18, 0, 0.11, 0);
    b0.cyl('metal', DF.C.steelDark, 0.46, 0.52, 0.6, 18, 0, 0.52, 0);
    b0.box('matte', accent, 0.72, 0.34, 0.72, 0, 0.86, 0);
    b0.flush(root);

    const yaw = new T.Group(); yaw.position.set(0, 1.02, 0); root.add(yaw);
    const b1 = new DF.Builder();
    b1.cyl('metal', DF.C.steelDark, 0.34, 0.4, 0.55, 14, 0, 0.24, 0);
    b1.box('matte', accent, 0.46, 0.5, 0.46, 0, 0.5, 0);
    b1.flush(yaw);

    const shoulder = new T.Group(); shoulder.position.set(0, 0.62, 0); yaw.add(shoulder);
    const b2 = new DF.Builder();
    b2.box('matte', accent, 0.4, 1.55, 0.42, 0, 0.78, 0);
    b2.box('gloss', DF.C.graphite2, 0.44, 0.36, 0.46, 0, 0.2, 0);
    b2.cyl('metal', DF.C.steelLight, 0.11, 0.11, 0.5, 10, 0, 1.5, 0, 0, 0, Math.PI / 2);
    b2.flush(shoulder);

    const elbow = new T.Group(); elbow.position.set(0, 1.56, 0); shoulder.add(elbow);
    const b3 = new DF.Builder();
    b3.box('matte', accent, 0.34, 1.28, 0.36, 0, 0.62, 0);
    b3.cyl('gloss', DF.C.graphite2, 0.16, 0.16, 0.4, 10, 0, 0.02, 0, 0, 0, Math.PI / 2);
    b3.flush(elbow);

    const wrist = new T.Group(); wrist.position.set(0, 1.28, 0); elbow.add(wrist);
    const b4 = new DF.Builder();
    b4.cyl('metal', DF.C.steelLight, 0.14, 0.14, 0.3, 12, 0, 0.05, 0);
    b4.box('metal', DF.C.steelDark, 0.2, 0.34, 0.22, 0, 0.28, 0);
    b4.box('metal', DF.C.steelLight, 0.08, 0.5, 0.08, 0, 0.62, 0);
    b4.box('emit', DF.col(0xffd9a0, 0.6), 0.1, 0.06, 0.1, 0, 0.9, 0);
    b4.flush(wrist);

    const tip = new T.Object3D();
    tip.position.set(0, 0.9, 0);
    wrist.add(tip);

    root.userData.rig = { yaw, shoulder, elbow, wrist, tip };
    return root;
  }
  DF.makeRobot = makeRobot;

  /* ============================================================
     冲压线 Z02
     ============================================================ */
  function buildPressLine(scene) {
    const b = new DF.Builder();
    const pressX = [-43, -35, -27, -19];
    const zc = -19;

    pressX.forEach((x, i) => {
      // 基础
      b.box('matte', DF.C.concreteDark, 6.2, 0.9, 8.4, x, 0.45, zc);
      b.box('metal', DF.C.steelDark, 5.6, 0.35, 7.6, x, 1.0, zc);
      // 立柱 ×2
      [-2.15, 2.15].forEach(dx => {
        b.box('metal', DF.C.steel, 0.9, 7.4, 6.2, x + dx, 4.5, zc);
        b.box('metal', DF.C.steelLight, 0.98, 0.5, 6.3, x + dx, 8.2, zc);
      });
      // 顶冠
      b.box('metal', DF.C.steelDark, 5.6, 1.5, 6.4, x, 8.4, zc);
      b.box('metal', DF.C.steelLight, 5.7, 0.2, 6.5, x, 9.15, zc);
      // 工作台 / 下模
      b.box('metal', DF.C.steelDark, 4.6, 0.7, 5.4, x, 1.55, zc);
      b.box('metal', 0x7d848c, 4.0, 0.45, 4.6, x, 2.1, zc);
      // 液压管线
      [-2.9, 2.9].forEach(dz => {
        b.cyl('metal', DF.C.steelLight, 0.14, 0.14, 5.2, 10, x + 2.85, 5.2, zc + dz, 0, 0, 0);
        b.cyl('metal', 0x6f757c, 0.18, 0.18, 0.8, 10, x + 2.85, 7.9, zc + dz, 0, 0, 0);
      });
      // 上罩玻璃（观察窗）
      b.box('glass', DF.C.glass, 0.06, 2.2, 5.2, x + 2.72, 4.0, zc);
      b.box('glass', DF.C.glass, 0.06, 2.2, 5.2, x - 2.72, 4.0, zc);
      // 操作台 + 屏幕
      b.box('metal', DF.C.steelDark, 0.9, 0.9, 1.4, x + 3.4, 0.45, zc + 2.2);
      b.box('metal', DF.C.steelDark, 0.12, 0.7, 1.0, x + 3.4, 1.35, zc + 2.2, 0, 0, -0.25);
      b.box('emit', DF.col(0x7ad0a8, 0.9), 0.05, 0.5, 0.8, x + 3.47, 1.4, zc + 2.2, 0, 0, -0.25);
      // 编号标牌
      b.box('matte', 0x101316, 1.1, 0.4, 0.06, x, 9.8, zc - 3.2);
      b.box('emit', DF.col(0xf2a73b, 0.85), 0.9, 0.05, 0.07, x, 9.68, zc - 3.2);

      DF.STATIONS.push({ id: 'PR-0' + (i + 1), cn: '伺服压机 ' + (i + 1), en: 'SERVO PRESS ' + (i + 1), zone: 'Z02', x, y: 3.6, z: zc });
    });

    // 跨间隙桁架机械手
    b.box('metal', DF.C.steelDark, 30, 0.28, 0.28, -31, 9.9, zc - 3.4);
    b.box('metal', DF.C.steelDark, 30, 0.28, 0.28, -31, 9.9, zc + 3.4);
    b.box('metal', DF.C.steel, 0.25, 0.25, 7.2, -31, 10.4, zc);

    // 开卷机 / 钢卷
    b.cyl('metal', DF.C.steelDark, 0.55, 0.55, 3.2, 16, -46.4, 1.4, zc, 0, 0, Math.PI / 2);
    b.cyl('metal', DF.C.coil, 0.9, 0.9, 1.5, 20, -45.2, 1.0, zc, 0, 0, Math.PI / 2);
    b.cyl('metal', DF.C.coil, 0.9, 0.9, 1.5, 20, -45.2, 2.9, zc, 0, 0, Math.PI / 2);
    b.box('metal', DF.C.steel, 4.0, 0.14, 1.6, -41.5, 0.95, zc);

    // 废料输送 + 废料箱
    b.box('metal', DF.C.steelDark, 26, 0.2, 1.1, -31, 0.9, -30.5);
    for (let i = 0; i < 3; i++) {
      b.box('matte', 0x4a5058, 1.8, 1.0, 1.6, -44 + i * 5.5, 0.55, -30.5);
    }
    // 围栏 + 光幕
    fence(b, -47, -33.5, -14, -33.5, 2.2);
    fence(b, -47, -5.6, -14, -5.6, 2.2);
    fence(b, -47, -33.5, -47, -5.6, 2.2);
    b.box('glass', DF.col(0xff8a4a, 0.35), 32, 1.6, 0.04, -30.5, 1.1, -5.4);

    DF.STATIONS.push({ id: 'XF-01', cn: '跨间隙机械手', en: 'TRANSFER GANTRY', zone: 'Z02', x: -31, y: 9.9, z: zc });
    DF.STATIONS.push({ id: 'DOCK-IN', cn: '进厂月台', en: 'INBOUND DOCK', zone: 'Z01', x: -79, y: 2.0, z: -22 });

    b.flush(scene);

    // 滑块（动态）
    const rams = pressX.map((x, i) => {
      const grp = new T.Group();
      grp.position.set(x, 4.5, zc);
      const bb = new DF.Builder();
      bb.box('metal', DF.C.steelLight, 4.4, 1.1, 5.0, 0, 0, 0);
      bb.box('metal', 0x878e97, 3.9, 0.55, 4.4, 0, -0.8, 0);
      bb.box('matte', 0x2c3138, 0.3, 0.3, 4.2, 0, 0.75, 0);
      bb.flush(grp);
      scene.add(grp);
      return { grp, phase: i * 0.62 };
    });

    return {
      rams,
      update(t) {
        rams.forEach((r, i) => {
          const c = (t * 0.32 + r.phase) % 1;
          let y = 4.55;
          if (c < 0.34) y = 4.55 - 1.55 * DF.easeInCubic(c / 0.34);
          else if (c < 0.46) y = 3.0;
          else if (c < 0.9) y = 3.0 + 1.55 * DF.easeOutCubic((c - 0.46) / 0.44);
          r.grp.position.y = y;
          r.grp.position.x = pressX[i];
        });
      },
    };
  }

  /* ============================================================
     焊装车间 Z03
     ============================================================ */
  function buildBodyShop(scene, ctx) {
    const b = new DF.Builder();
    const robots = [];
    const xs = [-42, -34, -26, -18];
    const zs = [12.5, 26.5];
    const bodies = [];

    zs.forEach((z, row) => {
      // 夹具台
      xs.forEach((x, i) => {
        b.box('metal', DF.C.steelDark, 5.4, 0.5, 3.2, x, 0.25, z);
        b.box('metal', 0x6a7078, 4.8, 0.22, 2.6, x, 0.6, z);
        // 定位销 / 夹具
        b.box('metal', DF.C.steelLight, 0.12, 0.9, 0.12, x + 1.9, 0.9, z - 1.0);
        b.box('metal', DF.C.steelLight, 0.12, 0.9, 0.12, x - 1.9, 0.9, z + 1.0);
        // 抽烟尘罩 + 立管
        b.box('metal', DF.C.steelLight, 0.7, 0.35, 0.7, x + 2.2, 6.2, z - 1.6);
        b.cyl('metal', DF.C.steelLight, 0.22, 0.22, 6.0, 10, x + 2.2, 3.0, z - 1.6);
        // 单元标牌
        b.box('matte', 0x101316, 1.2, 0.34, 0.05, x, 2.9, z + 1.9);
        b.box('emit', DF.col(0xf2a73b, 0.8), 1.0, 0.04, 0.06, x, 2.8, z + 1.9);

        const r = makeRobot({ accent: DF.C.safety });
        r.position.set(x + 2.0, 0, z + 2.6);
        r.rotation.y = i % 2 ? -0.55 : 0.55 + Math.PI;
        scene.add(r);
        const wid = 'WB-0' + (row * 4 + i + 1);
        robots.push({ rig: r.userData.rig, root: r, phase: ((i + row * 4) * 0.37) % 1, id: wid });
        if (row === 0) DF.STATIONS.push({ id: wid, cn: '焊装单元 ' + (i + 1), en: 'WELD CELL ' + (i + 1), zone: 'Z03', x: x + 2.0, y: 3.4, z: z + 2.6 });

        if (i < 3) {
          const body = DF.makeBodyShell(DF.C.whiteBody, { x: x + 1, z, ry: Math.PI / 2 });
          body.rotation.y = Math.PI / 2;
          scene.add(body);
          bodies.push(body);
        }
      });
      fence(b, -47, z + 5.2, -14, z + 5.2, 2.1);
    });
    fence(b, -47, 7.5, -14, 7.5, 2.1);
    fence(b, -47, 30, -14, 30, 2.1);
    // 光幕（单元出入口）
    b.box('glass', DF.col(0xff8a4a, 0.3), 0.05, 1.8, 5.0, -47, 1.1, 12.5);
    b.box('glass', DF.col(0xff8a4a, 0.3), 0.05, 1.8, 5.0, -14, 1.1, 12.5);

    b.flush(scene);

    // 火花粒子（世界坐标一次更新）
    const N = robots.length * 14;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N);
    let seed = DF.hash(4471);
    for (let i = 0; i < N; i++) {
      life[i] = 2;
      pos[i * 3 + 1] = -100;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({
      color: DF.col(0xffcf8a, 2.2), size: 0.11, sizeAttenuation: true,
      transparent: true, opacity: 0.95, depthWrite: false, blending: T.AdditiveBlending,
    });
    const sparks = new T.Points(geo, mat);
    sparks.frustumCulled = false;
    scene.add(sparks);

    const wp = new T.Vector3();
    return {
      robots,
      update(t, dt, sim) {
        robots.forEach((r, i) => {
          const run = sim && sim.getStation(r.id) ? sim.getStation(r.id).state === 'run' : true;
          const ph = t * 0.75 + r.phase * 6.28;
          const amp = run ? 1 : 0.12;
          r.rig.yaw.rotation.y = Math.sin(ph * 0.5) * 0.75 * amp;
          r.rig.shoulder.rotation.x = 0.55 + Math.sin(ph) * 0.32 * amp;
          r.rig.elbow.rotation.x = -1.35 + Math.sin(ph + 1.1) * 0.36 * amp;
          r.rig.wrist.rotation.x = 0.5 + Math.sin(ph + 2.0) * 0.25 * amp;
          r.rig.wrist.rotation.z = Math.cos(ph * 0.7) * 0.3 * amp;

          if (run) {
            for (let k = 0; k < 14; k++) {
              const idx = i * 14 + k;
              r.rig.tip.getWorldPosition(wp);
              if (life[idx] <= 0) {
                life[idx] = 0.25 + seed() * 0.35;
                pos[idx * 3] = wp.x; pos[idx * 3 + 1] = wp.y; pos[idx * 3 + 2] = wp.z;
                vel[idx * 3] = (seed() - 0.5) * 1.6;
                vel[idx * 3 + 1] = 1.4 + seed() * 2.4;
                vel[idx * 3 + 2] = (seed() - 0.5) * 1.6;
              } else {
                life[idx] -= dt;
                vel[idx * 3 + 1] -= 7.5 * dt;
                pos[idx * 3] += vel[idx * 3] * dt;
                pos[idx * 3 + 1] += vel[idx * 3 + 1] * dt;
                pos[idx * 3 + 2] += vel[idx * 3 + 2] * dt;
                if (pos[idx * 3 + 1] < 0.1) life[idx] = 0;
              }
              if (life[idx] <= 0) pos[idx * 3 + 1] = -100;
            }
          }
        });
        geo.attributes.position.needsUpdate = true;
      },
    };
  }

  /* ============================================================
     涂装车间 Z04
     ============================================================ */
  function buildPaintShop(scene) {
    const b = new DF.Builder();
    const x0 = -9, x1 = 13, z0 = -33, z1 = -4;

    // 地面
    b.box('matte', 0x2e3238, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    // 玻璃观察墙（南、东、西）
    const gy = 6.2;
    b.box('glass', DF.C.glass, x1 - x0, gy, 0.06, (x0 + x1) / 2, gy / 2, z1);
    b.box('glass', DF.C.glass, 0.06, gy, z1 - z0, x0, gy / 2, (z0 + z1) / 2);
    b.box('glass', DF.C.glass, 0.06, gy, z1 - z0, x1, gy / 2, (z0 + z1) / 2);
    // 玻璃框架
    for (let x = x0; x <= x1; x += 4.4) {
      b.box('metal', DF.C.steelLight, 0.16, gy, 0.16, x, gy / 2, z1);
    }
    for (let z = z0; z <= z1; z += 4.35) {
      b.box('metal', DF.C.steelLight, 0.16, gy, 0.16, x0, gy / 2, z);
      b.box('metal', DF.C.steelLight, 0.16, gy, 0.16, x1, gy / 2, z);
    }
    b.box('metal', DF.C.steelDark, x1 - x0, 0.3, 0.3, (x0 + x1) / 2, gy, z1);
    // 顶部结构
    b.box('metal', DF.C.steelDark, x1 - x0, 0.28, z1 - z0, (x0 + x1) / 2, gy + 0.2, (z0 + z1) / 2);
    // 排烟筒
    b.cyl('metal', DF.C.steelLight, 0.85, 0.95, 13, 18, 11, 6.5, -31);
    b.cyl('metal', DF.C.steelDark, 0.9, 0.9, 0.4, 18, 11, 13.2, -31);
    // 屋顶 AHU / 风管
    b.box('metal', DF.C.steelLight, 6.0, 1.6, 3.0, 0, gy + 1.4, -28);
    [-6, 2, 9].forEach(x => {
      b.cyl('metal', DF.C.steelLight, 0.42, 0.42, 4.4, 12, x, gy + 0.8, -14, Math.PI / 2, 0, 0);
    });

    // 蛇形输送（3 段）
    const runs = [-27, -20, -13];
    runs.forEach(z => {
      b.box('metal', DF.C.steelDark, 20, 0.3, 1.5, 2, 0.55, z);
      for (let x = -7; x <= 11; x += 2) {
        b.cyl('metal', DF.C.steelLight, 0.18, 0.18, 1.4, 8, x, 0.75, z, 0, 0, Math.PI / 2);
      }
    });

    // 涂装机器人 ×4
    const robots = [];
    [-8.2, -1.4, 4.6, 10.2].forEach((x, i) => {
      const r = makeRobot({ accent: 0xc9a24a });
      r.position.set(x - 8, 0, -16 + (i % 2) * 6);
      r.rotation.y = Math.PI * 0.25;
      r.scale.setScalar(0.86);
      scene.add(r);
      robots.push({ rig: r.userData.rig, phase: i * 1.3 });
    });

    // 烘房隧道
    b.box('metal', DF.C.steelDark, 18, 4.2, 5.0, 2, 2.1, -31);
    b.box('emit', DF.col(0xff9a3c, 1.6), 16.4, 2.4, 0.1, 2, 1.6, -28.5);
    b.box('metal', DF.C.steelLight, 18.2, 0.3, 5.2, 2, 4.3, -31);
    [-6, 2, 10].forEach(x => {
      b.box('metal', DF.C.steelLight, 0.3, 4.2, 5.2, x, 2.1, -31);
    });

    // 涂装房内的车身（动态）
    const bodies = [];
    for (let i = 0; i < 4; i++) {
      const body = DF.makeBodyShell(0xb9bec4);
      body.position.set(-6 + i * 5.5, 0.9, runs[i % 3]);
      body.rotation.y = Math.PI / 2;
      scene.add(body);
      bodies.push({ o: body, baseX: -6 + i * 5.5, z: runs[i % 3], speed: 0.55 + i * 0.08 });
    }

    b.flush(scene);
    return {
      robots,
      update(t) {
        bodies.forEach((bb, i) => {
          bb.o.position.x = bb.baseX + ((t * bb.speed + i * 3) % 12) - 3;
        });
        robots.forEach((r, i) => {
          const ph = t * 0.5 + r.phase;
          r.rig.yaw.rotation.y = Math.sin(ph) * 0.9;
          r.rig.shoulder.rotation.x = 0.4 + Math.sin(ph * 1.3) * 0.3;
          r.rig.elbow.rotation.x = -1.2 + Math.sin(ph * 1.1 + 1) * 0.35;
          r.rig.wrist.rotation.x = 0.3 + Math.sin(ph * 2) * 0.2;
        });
      },
    };
  }

  /* ============================================================
     空中输送链（总装线头顶）
     ============================================================ */
  function buildOverhead(scene) {
    const b = new DF.Builder();
    const lines = [12, 28];
    lines.forEach(z => {
      b.box('metal', DF.C.steelDark, 46, 0.35, 0.5, 40, 7.2, z - 1.4);
      b.box('metal', DF.C.steelDark, 46, 0.35, 0.5, 40, 7.2, z + 1.4);
      b.box('metal', DF.C.steelLight, 46, 0.1, 1.2, 40, 7.5, z);
      for (let x = 18; x <= 62; x += 4) {
        b.box('metal', DF.C.steelDark, 0.14, 7.2, 0.14, x, 3.6, z - 1.4);
      }
    });
    b.flush(scene);

    const hangers = [];
    lines.forEach((z, li) => {
      for (let i = 0; i < 7; i++) {
        const g = new T.Group();
        const bb = new DF.Builder();
        bb.box('metal', DF.C.steelLight, 0.14, 1.5, 0.14, 0, -0.75, 0);
        bb.box('matte', 0x8d939a, 1.5, 0.5, 1.1, 0, -1.6, 0);
        bb.box('matte', 0x6d7378, 1.7, 0.3, 0.25, 0, -1.35, 0.5);
        bb.flush(g);
        g.position.set(20 + i * 6, 7.0, z);
        scene.add(g);
        hangers.push({ o: g, z, off: i * 6 + li * 2.5 });
      }
    });
    return {
      update(t) {
        hangers.forEach(h => {
          const x = ((t * 1.6 + h.off) % 46) + 17;
          h.o.position.x = x;
          h.o.position.y = 7.0 + Math.sin(t * 0.7 + h.off) * 0.05;
        });
      },
    };
  }

  function buildProcess(scene, ctx) {
    const press = buildPressLine(scene);
    const weld = buildBodyShop(scene, ctx);
    const paint = buildPaintShop(scene);
    const over = buildOverhead(scene);

    DF.STATIONS.push(
      { id: 'PT-01', cn: '涂装机器人群', en: 'PAINT ROBOTS', zone: 'Z04', x: 2, y: 2.6, z: -20 },
      { id: 'OV-01', cn: '烘房隧道', en: 'OVEN TUNNEL', zone: 'Z04', x: 2, y: 2.4, z: -31 }
    );

    return {
      press, weld, paint, over,
      update(t, dt, sim) {
        press.update(t);
        weld.update(t, dt, sim);
        paint.update(t);
        over.update(t);
      },
    };
  }

  DF.buildProcess = buildProcess;

})(window.DF = window.DF || {});
