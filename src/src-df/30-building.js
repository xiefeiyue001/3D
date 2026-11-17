/* ============================================================
   DF-01 · 30-building —— 剖切厂房 / 钢桁架 / 地面标线 / 室外硬景 / 能源站
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  DF.L = {
    hall: { x0: -78, x1: 78, z0: -40, z1: 40, h: 15.8 },
    zones: {
      Z01: { x0: -76, x1: -50, z0: -34, z1: 34, cn: '原材料立库', en: 'RAW MATERIAL ASRS', no: '01' },
      Z02: { x0: -47, x1: -14, z0: -34, z1: -6, cn: '冲压线', en: 'PRESS LINE', no: '02' },
      Z03: { x0: -47, x1: -14, z0: 6, z1: 34, cn: '焊装车间', en: 'BODY SHOP', no: '03' },
      Z04: { x0: -9, x1: 13, z0: -33, z1: -4, cn: '涂装车间', en: 'PAINT SHOP', no: '04' },
      Z05: { x0: 17, x1: 62, z0: 6, z1: 34, cn: '总装线', en: 'FINAL ASSEMBLY', no: '05' },
      Z06: { x0: 62, x1: 76, z0: 4, z1: 36, cn: '检测发运', en: 'EOL / DISPATCH', no: '06' },
      Z07: { x0: 16, x1: 60, z0: -40, z1: -24, cn: '辅助区', en: 'UTILITY BLOCK', no: '07' },
    },
    energy: { x0: -50, x1: -24, z0: -56, z1: -42, cn: '能源站', en: 'ENERGY STATION', no: 'E' },
  };

  DF.buildBuilding = function (scene) {
    const b = new DF.Builder();
    DF.STATIONS = DF.STATIONS || [];
    DF.STATIONS.push({ id: 'EN-01', cn: '能源站', en: 'ENERGY STATION', zone: 'Z07', x: -37, y: 3.2, z: -48 });
    const { x0, x1, z0, z1, h } = DF.L.hall;
    const W = x1 - x0, D = z1 - z0;

    /* ---------- 北墙（满高背景） ---------- */
    const wallSeg = (ax, az, bx, bz, y0, y1, thick) => {
      const len = Math.abs(bx - ax) || Math.abs(bz - az);
      const horiz = Math.abs(bx - ax) > Math.abs(bz - az);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, cy = (y0 + y1) / 2;
      b.box('matte', DF.C.concrete,
        horiz ? len : thick, y1 - y0, horiz ? thick : len,
        cx, cy, cz);
    };
    wallSeg(x0 - 0.5, z0, x1 + 0.5, z0, 0, h, 0.55);

    // 墙面竖向肋 + 水平分缝
    for (let x = x0; x <= x1; x += 6) {
      b.box('matte', DF.C.concreteDark, 0.35, h, 0.28, x, h / 2, z0 + 0.3);
    }
    for (let y = 4.2; y < h; y += 4.2) {
      b.box('matte', DF.C.concreteDark, W + 1, 0.1, 0.12, 0, y, z0 + 0.34);
    }
    // 北墙上一条微弱采光带
    b.box('emit', DF.col(0x8fb0cf, 0.18), W - 4, 0.5, 0.06, 0, h - 1.6, z0 + 0.36);

    /* ---------- 东墙（满高，留 2 个发运门） ---------- */
    wallSeg(x1, z0 - 0.5, x1, 8, 0, h, 0.55);
    wallSeg(x1, 16, x1, 22, 0, h, 0.55);
    wallSeg(x1, 30, x1, z1 + 0.5, 0, h, 0.55);
    wallSeg(x1, 8, x1, 16, 6.5, h, 0.55);
    wallSeg(x1, 22, x1, 30, 6.5, h, 0.55);
    for (let z = z0; z <= z1; z += 6) {
      b.box('matte', DF.C.concreteDark, 0.3, h, 0.35, x1 - 0.3, h / 2, z);
    }
    // 发运门框 + 卷帘（半开）
    [12, 26].forEach(zc => {
      b.box('metal', DF.C.steelDark, 0.5, 0.4, 8.6, x1 - 0.1, 6.6, zc);
      b.box('metal', DF.C.steelDark, 0.45, 6.6, 0.4, x1 - 0.1, 3.3, zc - 4.1);
      b.box('metal', DF.C.steelDark, 0.45, 6.6, 0.4, x1 - 0.1, 3.3, zc + 4.1);
      b.box('metal', DF.C.steelLight, 0.2, 2.6, 7.6, x1 - 0.42, 6.5, zc);   // 卷起的帘
      b.box('emit', DF.col(0x2c2a26, 0.05), 0.1, 6.4, 7.8, x1 - 0.2, 3.2, zc);
    });

    /* ---------- 西墙（切至 7.5 m，留 3 个卸货门） ---------- */
    const westH = 7.5;
    const doors = [-22, -2, 18]; // 门中心 z
    const doorW = 8, doorH = 6.2;
    let zc = z0;
    const solids = [];
    doors.forEach(dz => {
      solids.push([zc, dz - doorW / 2]);
      zc = dz + doorW / 2;
    });
    solids.push([zc, z1]);
    solids.forEach(s => {
      if (s[1] - s[0] > 0.1) wallSeg(x0, s[0], x0, s[1], 0, westH, 0.5);
    });
    doors.forEach(dz => {
      b.box('matte', DF.C.concrete, 0.5, westH - doorH, doorW, x0, (doorH + westH) / 2, dz);
      b.box('metal', DF.C.steelLight, 0.55, 0.28, doorW, x0, doorH, dz);
      b.box('metal', DF.C.steelLight, 0.55, doorH, 0.3, x0, doorH / 2, dz - doorW / 2);
      b.box('metal', DF.C.steelLight, 0.55, doorH, 0.3, x0, doorH / 2, dz + doorW / 2);
      // 内部辉光（月台方向的暖光）
      b.box('emit', DF.col(0x9a7d52, 0.22), 0.08, doorH - 0.6, doorW - 0.6, x0 + 0.3, (doorH - 0.4) / 2, dz);
      // 卸货台（高度 1.1）
      b.box('matte', DF.C.concreteDark, 2.2, 1.1, doorW, x0 + 1.1, 0.55, dz);
    });
    // 西墙上沿（切面示意）
    b.box('matte', DF.C.concreteDark, 0.5, 0.22, D, x0, westH + 0.1, 0);

    /* ---------- 南侧女儿墙（≤1.2 m） ---------- */
    b.box('matte', DF.C.concrete, W + 1, 1.15, 0.4, 0, 0.575, z1);
    b.box('metal', DF.C.steelLight, W + 1, 0.08, 0.55, 0, 1.18, z1);

    /* ---------- 钢柱 ---------- */
    for (let x = x0; x <= x1; x += 6) {
      // 北侧柱
      b.box('metal', DF.C.steelDark, 0.5, h, 0.55, x, h / 2, z0 + 1.0);
      b.box('metal', DF.C.steelLight, 0.62, 0.6, 0.68, x, 0.3, z0 + 1.0);
      // 南侧矮柱（只到女儿墙，视觉上不挡剖切）
      b.box('metal', DF.C.steelDark, 0.42, 1.1, 0.45, x, 0.55, z1 - 0.75);
    }
    // 东侧、西侧边柱
    [z0 + 1, z1 - 0.9].forEach(zz => {
      for (let z = z0 + 4; z <= z1 - 4; z += 8) {
        b.box('metal', DF.C.steelDark, 0.45, h, 0.5, x1 - 1.0, h / 2, z);
        b.box('metal', DF.C.steelDark, 0.45, westH, 0.5, x0 + 1.0, westH / 2, z);
      }
    });

    /* ---------- 开放钢桁架（无屋面板） ---------- */
    const tY = 15.9;
    for (let x = x0; x <= x1; x += 6) {
      b.box('metal', DF.C.steelDark, 0.26, 0.3, D, x, tY, 0);            // 下弦
      b.box('metal', DF.C.steelDark, 0.24, 0.22, D, x, tY + 1.85, 0);     // 上弦
      for (let z = z0 + 4; z <= z1 - 2; z += 8) {
        b.box('metal', DF.C.steel, 0.16, 1.85, 0.16, x, tY + 0.9, z);     // 腹杆
      }
      // 端部斜撑
      b.box('metal', DF.C.steel, 0.14, 2.2, 0.14, x, tY + 1.0, z0 + 2.4, 0, 0.12, 0);
    }
    // 檩条
    for (let z = z0 + 3; z <= z1 - 3; z += 8) {
      b.box('metal', DF.C.steelDark, W, 0.12, 0.18, 0, tY + 1.95, z);
    }
    // 天窗骨架 / 采光带
    for (let x = x0 + 6; x < x1; x += 12) {
      b.box('emit', DF.col(0xbcd2e2, 0.13), 0.55, 0.04, D - 6, x, tY + 1.7, 0);
    }

    /* ---------- 吊挂灯带 ---------- */
    for (let x = x0 + 6; x <= x1 - 6; x += 11) {
      for (let z = z0 + 6; z <= z1 - 6; z += 11) {
        b.box('metal', DF.C.steelDark, 0.05, 2.4, 0.05, x, tY - 1.2, z);
        b.box('matte', DF.C.graphite2, 1.0, 0.14, 0.34, x, tY - 2.4, z, 0);
        b.box('emit', DF.col(0xffd9a8, 1.12), 0.86, 0.08, 0.24, x, tY - 2.5, z);
      }
    }

    /* ---------- 地面标线 ---------- */
    const line = (x, z, len, wid, ry) => b.box('matte', 0xbdb6a6, len, 0.015, wid, x, 0.03, z, ry || 0);
    // 中央 AGV 通道两侧
    for (let x = -74; x < 68; x += 24) {
      line(x + 12, -4.2, 24, 0.16);
      line(x + 12, 4.2, 24, 0.16);
    }
    // 分区外沿人行道
    line(-48.5, -18, 0.16, 52, Math.PI / 2);
    line(15, -18, 0.16, 56, Math.PI / 2);
    // 冲压线危险区黄黑斑马条（围栏内侧）
    for (let i = 0; i < 16; i++) {
      const xx = -46 + i * 2.05;
      b.box('matte', 0xd9b23e, 1.0, 0.02, 0.5, xx, 0.035, -5.2);
      b.box('matte', 0x191a18, 1.0, 0.02, 0.5, xx + 1.02, 0.035, -5.2);
    }
    // 交叉斑马线（通往辅助区）
    for (let i = 0; i < 7; i++) {
      b.box('matte', 0xcac3b2, 0.55, 0.02, 3.0, 15.5, 0.03, -2 + i * 0.85);
    }

    /* ---------- 室外硬景：卸货雨棚 / 围栏 / 集装箱 / 路灯 / 堆场 ---------- */
    doors.forEach(dz => {
      // 雨棚
      b.box('metal', DF.C.steelDark, 11.5, 0.24, 11.5, x0 - 6.2, 7.2, dz);
      [dz - 5, dz + 5].forEach(zz => {
        b.box('metal', DF.C.steelDark, 0.28, 7.1, 0.28, x0 - 11.2, 3.55, zz);
        b.box('metal', DF.C.steelLight, 0.4, 0.5, 0.4, x0 - 11.2, 0.25, zz);
      });
      b.box('emit', DF.col(0xffd8a0, 0.7), 0.5, 0.1, 0.5, x0 - 6.2, 7.0, dz, 0, 0, 0);
    });
    // 围栏（西侧作业区）
    for (let z = -34; z <= 34; z += 4) {
      b.box('metal', DF.C.steelDark, 0.1, 2.2, 0.1, -104, 1.1, z);
    }
    b.box('metal', DF.C.steelLight, 0.08, 0.1, 68, -104, 2.1, 0);
    b.box('metal', DF.C.steelLight, 0.08, 0.1, 68, -104, 1.1, 0);
    // 集装箱堆场
    const cc = [0x2f4c5e, 0x8a4232, 0x5c6152];
    [[-98, -30], [-98, -22], [-94, -26]].forEach((p, i) => {
      b.box('matte', cc[i % 3], 6.1, 2.6, 2.44, p[0], i === 2 ? 4.0 : 1.3, p[1], i === 2 ? 0.08 : 0);
    });
    // 室外路灯
    [-30, -2, 26].forEach(z => {
      b.box('metal', DF.C.steelDark, 0.18, 8.5, 0.18, -96, 4.25, z);
      b.box('metal', DF.C.steelDark, 0.18, 0.18, 1.6, -96.7, 8.5, z, Math.PI / 2, 0, 0);
      b.box('emit', DF.col(0xffdca6, 1.0), 0.5, 0.12, 0.75, -96, 8.35, z);
    });
    // 警示锥 / 托盘
    for (let i = 0; i < 5; i++) {
      b.cyl('matte', 0xd8621f, 0.02, 0.16, 0.6, 8, -88 + i * 1.4, 0.3, 30);
    }
    for (let i = 0; i < 4; i++) {
      b.box('matte', 0x8a6a44, 1.2, 0.14, 1.0, -86 + i * 1.6, 0.07, -34);
      b.box('matte', 0x7a5f3e, 1.2, 0.8, 1.0, -86 + i * 1.6, 0.5, -34);
    }
    // 东侧发运场
    b.box('matte', DF.C.concreteDark, 14, 0.06, 34, 86, 0.03, 20);
    [12, 26].forEach(z => {
      b.box('metal', DF.C.steelDark, 10, 0.24, 11, x1 + 5.5, 6.9, z);
      [z - 5, z + 5].forEach(zz => {
        b.box('metal', DF.C.steelDark, 0.28, 6.8, 0.28, x1 + 10.2, 3.4, zz);
      });
    });

    /* ---------- 能源站（室外北侧） ---------- */
    const E = DF.L.energy;
    b.box('matte', DF.C.concreteDark, E.x1 - E.x0, 0.12, E.z1 - E.z0, (E.x0 + E.x1) / 2, 0.06, (E.z0 + E.z1) / 2);
    // 变压器 ×2
    [-42, -34].forEach((xc, i) => {
      b.box('metal', DF.C.steelDark, 3.2, 3.0, 2.4, xc, 1.6, -48.5);
      for (let k = 0; k < 6; k++) b.box('metal', DF.C.steelLight, 3.3, 0.06, 0.05, xc, 0.6 + k * 0.4, -47.28);
      b.box('emit', DF.col(0xff6a3d, 0.9), 0.12, 0.12, 0.12, xc + 1.4, 3.15, -47.4);
    });
    // 冷水机组 + 泵
    b.box('metal', DF.C.steelLight, 5.4, 2.0, 3.0, -28, 1.05, -48);
    b.box('metal', DF.C.steelDark, 5.6, 0.3, 3.2, -28, 2.15, -48);
    [-30, -25].forEach(xc => {
      b.cyl('metal', DF.C.steelDark, 0.45, 0.45, 1.6, 12, xc, 0.9, -43.6);
    });
    // 储罐 ×2
    [-45, -38].forEach(xc => {
      b.cyl('metal', DF.C.steelLight, 1.7, 1.7, 6.0, 20, xc, 3.2, -53.4);
      b.cyl('metal', DF.C.steelDark, 1.75, 1.7, 0.3, 20, xc, 6.3, -53.4);
      b.box('metal', DF.C.steelDark, 0.35, 0.35, 0.35, xc, 0.4, -53.4);
    });
    // 管桥：穿越北墙进入车间
    b.box('metal', DF.C.steelDark, 9, 0.25, 24, -36, 4.2, -35);
    for (let z = -45; z <= -26; z += 6) {
      b.box('metal', DF.C.steelDark, 0.2, 4.2, 0.2, -40, 2.1, z);
    }
    [-38.5, -36.5].forEach((y, i) => {
      b.cyl('metal', i ? 0x9a6a3a : DF.C.steelLight, 0.24, 0.24, 26, 12, -36, y, -33, Math.PI / 2, 0, 0);
    });
    // 能源站标识牌
    b.box('matte', 0x14171a, 6.0, 1.4, 0.16, -37, 7.6, -56.4);
    b.box('emit', DF.col(0xf2a73b, 0.9), 0.5, 0.06, 0.06, -37, 7.9, -56.5);

    b.flush(scene);

    // 剖切面提示：西墙与南侧的“切边”用极细琥珀线标出（工程图纸语言）
    const cutMat = new T.LineBasicMaterial({ color: DF.col(0xf2a73b, 0.55), transparent: true, opacity: 0.5 });
    const cutPts = [
      new T.Vector3(x0, westH, z0), new T.Vector3(x0, westH, z1),
      new T.Vector3(x0, 0, z1), new T.Vector3(x1, 0, z1),
    ];
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(cutPts), cutMat));

    DF.building = { builder: b };
  };

})(window.DF = window.DF || {});
