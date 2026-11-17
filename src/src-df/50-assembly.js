/* ============================================================
   DF-01 · 50-assembly —— 双总装线 / 缓行车 / 操作工 / EOL 光廊 / 发运
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const LINES = [
    { z: 12, name: '总装线 A', en: 'FINAL LINE A' },
    { z: 28, name: '总装线 B', en: 'FINAL LINE B' },
  ];
  const X0 = 20, PITCH = 3.4, STN = 13;
  const XEND = X0 + PITCH * (STN - 1);
  const LINE_LEN = XEND - 17;

  function stationProps(b, x, z, i) {
    const kind = i % 4;
    // 工位基础 + 编号
    b.box('matte', 0x2b2e33, 3.2, 0.08, 2.6, x, 0.04, z);
    b.box('matte', 0x15181b, 0.9, 0.3, 0.06, x, 2.5, z + 2.0);
    b.box('emit', DF.col(0xf2a73b, 0.75), 0.75, 0.035, 0.07, x, 2.42, z + 2.0);

    if (kind === 0) {
      // 工具平衡器（悬臂 + 平衡吊）
      b.box('metal', DF.C.steelDark, 0.22, 4.6, 0.22, x, 2.3, z + 2.3);
      b.box('metal', DF.C.steelDark, 0.18, 0.18, 3.2, x, 4.5, z + 0.9);
      b.cyl('metal', DF.C.steelLight, 0.05, 0.05, 1.9, 6, x, 3.5, z + 0.4);
      b.cyl('metal', 0x6f757c, 0.26, 0.2, 0.4, 10, x, 2.55, z + 0.4);
      b.box('metal', DF.C.steelLight, 0.3, 0.28, 0.3, x, 2.3, z + 0.4);
    } else if (kind === 1) {
      // 零件超市（多层料架）
      b.box('metal', 0x5d656e, 1.4, 2.2, 2.2, x, 1.1, z + 2.9);
      for (let k = 0; k < 4; k++) {
        b.box('metal', 0x757d86, 1.5, 0.06, 2.3, x, 0.5 + k * 0.55, z + 2.9);
        for (let j = 0; j < 3; j++) {
          b.box('matte', [DF.C.binBlue, DF.C.binGray, DF.C.kraft][j], 0.4, 0.4, 0.4,
            x - 0.4 + j * 0.42, 0.75 + k * 0.55, z + 2.9);
        }
      }
      b.box('emit', DF.col(0x9ed6b4, 0.6), 0.1, 0.06, 0.1, x + 0.75, 2.3, z + 2.9);
    } else if (kind === 2) {
      // 扭矩 / 加注工位（柜体 + 屏 + 管）
      b.box('metal', DF.C.steelLight, 0.8, 1.7, 0.6, x - 1.9, 0.85, z + 1.6);
      b.box('emit', DF.col(0x7ad0a8, 0.9), 0.05, 0.42, 0.62, x - 1.52, 1.35, z + 1.6);
      b.cyl('metal', DF.C.steelLight, 0.12, 0.12, 4.2, 10, x + 1.9, 2.1, z + 1.9);
      b.cyl('metal', 0x8a6236, 0.1, 0.1, 1.8, 8, x + 1.9, 3.9, z + 1.2, Math.PI / 2, 0, 0);
      b.box('metal', 0x6f757c, 0.5, 0.9, 0.4, x + 1.9, 0.55, z + 1.9);
    } else {
      // 座椅 / 玻璃装配机器人（简化 3 轴）
      b.cyl('metal', DF.C.steelDark, 0.35, 0.42, 1.0, 12, x + 1.6, 0.5, z + 2.6);
      b.box('matte', 0xc9a24a, 0.4, 1.7, 0.34, x + 1.6, 1.6, z + 2.6);
      b.box('matte', 0xc9a24a, 0.3, 0.3, 1.8, x + 1.6, 2.4, z + 2.0, -0.4);
      b.box('metal', DF.C.steelLight, 0.3, 0.4, 0.4, x + 1.6, 2.3, z + 1.2);
      b.box('emit', DF.col(0xffd9a0, 0.55), 0.12, 0.08, 0.12, x + 1.6, 2.1, z + 1.1);
    }
    // 人行通道踏板
    b.box('metal', DF.C.steelLight, 3.2, 0.6, 0.5, x, 0.3, z + 3.6);
  }

  function buildAssembly(scene) {
    const b = new DF.Builder();
    const carriers = [];
    const workers = [];
    const finished = [];

    LINES.forEach((ln, li) => {
      // 输送线本体
      b.box('metal', DF.C.steelDark, LINE_LEN + 2, 0.55, 1.5, (17 + XEND + 2) / 2, 0.3, ln.z);
      b.box('metal', 0x6d747c, LINE_LEN + 2, 0.12, 1.72, (17 + XEND + 2) / 2, 0.62, ln.z);
      for (let x = 17; x <= XEND + 2; x += 1.7) {
        b.cyl('metal', DF.C.steelLight, 0.12, 0.12, 1.6, 8, x, 0.7, ln.z, 0, 0, Math.PI / 2);
      }
      // 线体支腿
      for (let x = 19; x <= XEND; x += 6.8) {
        b.box('metal', DF.C.steelDark, 0.16, 0.7, 0.16, x, 0.35, ln.z - 0.7);
        b.box('metal', DF.C.steelDark, 0.16, 0.7, 0.16, x, 0.35, ln.z + 0.7);
      }
      // 工位
      for (let i = 0; i < STN; i++) {
        stationProps(b, X0 + i * PITCH, ln.z, i);
      }
      // 线首 / 线尾标牌
      b.box('matte', 0x101316, 0.1, 1.1, 3.4, 16.2, 2.0, ln.z);
      b.box('emit', DF.col(0xf2a73b, 0.8), 0.11, 0.1, 3.0, 16.2, 2.4, ln.z);
      b.box('matte', 0x101316, 0.1, 1.1, 3.4, XEND + 3.6, 2.0, ln.z);
      b.box('emit', DF.col(0x9ed6b4, 0.7), 0.11, 0.1, 3.0, XEND + 3.6, 2.4, ln.z);
      // 线首暗棚（车身由此进入，遮住循环接缝）
      b.box('matte', 0x0d0f11, 3.0, 3.4, 4.2, 17.0, 1.7, ln.z);
      b.box('emit', DF.col(0x6d5a3c, 0.3), 2.4, 2.2, 0.05, 18.4, 1.4, ln.z);

      // 电池合装升降台（第 9 工位下方）
      const bx = X0 + 8 * PITCH;
      b.box('metal', DF.C.steelDark, 2.8, 0.3, 2.2, bx, 0.15, ln.z);
      b.box('metal', 0x7a828b, 2.2, 0.22, 1.8, bx, 0.3, ln.z);

      // 缓行车（载车身）
      for (let i = 0; i < 8; i++) {
        const g = new T.Group();
        const cb = new DF.Builder();
        cb.box('metal', DF.C.steelDark, 3.1, 0.22, 1.5, 0, 0.11, 0);
        cb.box('metal', 0x767e87, 2.9, 0.1, 1.3, 0, 0.26, 0);
        cb.box('metal', DF.C.steelLight, 0.3, 0.35, 1.4, -1.45, 0.18, 0);
        cb.flush(g);
        const body = DF.makeBodyShell(li === 0 ? 0xdad5cc : 0xd2cec4);
        body.position.y = 0.3;
        g.add(body);
        g.position.set(X0 + i * (LINE_LEN / 8), 0.7, ln.z);
        scene.add(g);
        carriers.push({ o: g, z: ln.z, off: i * (LINE_LEN / 8), li });
      }
    });

    // 操作工（15 名，沿两条线交替分布）
    for (let i = 0; i < 15; i++) {
      const ln = LINES[i % 2];
      const x = X0 + ((i * 2 + (i % 2)) % STN) * PITCH + 0.9;
      const w = DF.makeWorker({ x: x, z: ln.z + 2.55, ry: Math.PI + (i % 3) * 0.2, vest: i % 5 === 0 ? 0x3d6e8a : 0xd8b23c });
      scene.add(w);
      workers.push({ o: w, x, z: ln.z + 2.55, ph: i * 0.9 });
    }

    // EOL 下线检测光廊 ×2
    [12, 28].forEach(z => {
      b.box('metal', DF.C.steelDark, 0.4, 4.2, 4.6, 65.0, 2.1, z);
      b.box('metal', DF.C.steelDark, 0.4, 4.2, 4.6, 69.2, 2.1, z);
      b.box('metal', DF.C.steelDark, 4.6, 0.4, 4.6, 67.1, 4.1, z);
      b.box('emit', DF.col(0xcfe6ff, 0.9), 0.12, 3.6, 4.0, 64.85, 2.0, z);
      b.box('emit', DF.col(0xcfe6ff, 0.85), 0.12, 3.6, 4.0, 69.35, 2.0, z);
      b.box('emit', DF.col(0xdff0ff, 0.75), 4.2, 0.1, 4.0, 67.1, 4.05, z);
      // 四轮定位板 / 滚台
      b.box('metal', 0x7d858e, 4.0, 0.3, 3.6, 67.1, 0.15, z);
      for (const dz of [-1.4, 1.4]) {
        b.box('metal', 0x565e66, 1.4, 0.1, 0.9, 67.1, 0.34, z + dz);
      }
      // 检测屏
      b.box('metal', DF.C.steelDark, 0.7, 1.6, 0.4, 71.6, 0.8, z + 2.2);
      b.box('emit', DF.col(0x8fe3b8, 0.95), 0.05, 0.85, 0.5, 71.94, 1.2, z + 2.2);
    });
    // EOL 输送滚道
    b.box('metal', DF.C.steelDark, 12, 0.45, 1.4, 71, 0.25, 12);
    b.box('metal', DF.C.steelDark, 12, 0.45, 1.4, 71, 0.25, 28);
    for (let x = 65; x <= 77; x += 1.2) {
      b.cyl('metal', DF.C.steelLight, 0.11, 0.11, 1.5, 8, x, 0.4, 12, 0, 0, Math.PI / 2);
      b.cyl('metal', DF.C.steelLight, 0.11, 0.11, 1.5, 8, x, 0.4, 28, 0, 0, Math.PI / 2);
    }

    // 成品车暂存（6 台）
    const cc = [DF.C.car1, DF.C.car2, DF.C.car3, DF.C.car4, DF.C.car5, 0x8a9299];
    for (let i = 0; i < 6; i++) {
      const car = DF.makeCar({
        color: cc[i],
        x: 66 + (i % 2) * 4.2,
        z: 6 + Math.floor(i / 2) * 3.4 + 1.5,
        ry: (i % 2) ? Math.PI : 0,
      });
      scene.add(car);
    }
    // 发运缓存车（门口）
    [12, 26].forEach((z, i) => {
      const car = DF.makeCar({ color: cc[(i + 2) % 6], x: 75.4, z: z - 2.4, ry: -Math.PI / 2 });
      scene.add(car);
      finished.push(car);
    });

    // 涂装输出的车身（总装线前的缓存）
    for (let i = 0; i < 3; i++) {
      const shell = DF.makeBodyShell(0xc7c2b8, { x: 15.6 + i * 0.2, y: 0, z: 6 + i * 3.2, ry: Math.PI / 2 });
      shell.rotation.y = Math.PI / 2;
      scene.add(shell);
    }

    b.flush(scene);

    DF.STATIONS.push(
      { id: 'AS-01', cn: '总装线 A', en: 'ASSEMBLY LINE A', zone: 'Z05', x: 40, y: 1.8, z: 12 },
      { id: 'AS-02', cn: '总装线 B', en: 'ASSEMBLY LINE B', zone: 'Z05', x: 40, y: 1.8, z: 28 },
      { id: 'OC-01', cn: '空中输送链', en: 'OVERHEAD CONVEYOR', zone: 'Z05', x: 40, y: 7.2, z: 20 },
      { id: 'EOL-01', cn: '下线检测光廊', en: 'EOL LIGHT TUNNEL', zone: 'Z06', x: 67, y: 2.4, z: 20 },
      { id: 'DOCK-OUT', cn: '发运月台', en: 'OUTBOUND DOCK', zone: 'Z06', x: 78, y: 2.0, z: 19 }
    );

    return {
      update(t, dt, sim) {
        const mul = sim ? sim.rate() : 1;
        carriers.forEach(c => {
          const x = 17 + ((c.off + t * 0.62 * mul) % (LINE_LEN + 2));
          c.o.position.x = x;
          // 线首暗棚内隐藏（避免看到循环接缝）
          c.o.visible = x > 18.6;
          c.o.position.y = 0.7 + Math.sin(t * 2.2 + c.off) * 0.002;
        });
        workers.forEach(w => {
          w.o.position.y = Math.sin(t * 0.9 + w.ph) * 0.012;
          w.o.rotation.y = Math.PI + Math.sin(t * 0.35 + w.ph) * 0.12;
        });
      },
    };
  }

  DF.buildAssembly = buildAssembly;

})(window.DF = window.DF || {});
