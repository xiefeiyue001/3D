/* ============================================================
   EN-01 · 30-engine —— 液氧煤油发动机（燃气发生器循环）
   11 组可拆部件，每组独立 Group，沿 dir 向量分解
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const ST = 0x878e97;      // 不锈钢
  const ST_D = 0x5b626b;    // 深钢
  const ST_L = 0xa9b0b8;    // 亮钢
  const CU = 0xa9754f;      // 铜合金
  const DARK = 0x22262b;    // 内衬 / 石墨
  const ORANGE = 0xc2511c;
  const AMBER = 0xf2a73b;

  DF.PARTS = [];
  const P = (id, name, en, dir, info) => {
    const grp = new T.Group();
    grp.name = 'part-' + id;
    grp.userData = { id, name, en, dir: new T.Vector3(dir[0], dir[1], dir[2]), info };
    DF.PARTS.push(grp);
    return grp;
  };

  /* 单组收尾：独立材质副本，便于高亮 */
  function seal(grp) {
    const meshes = [];
    grp.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (Array.isArray(o.material)) return;
        o.material = o.material.clone();
        o.material.userData = {
          base: o.material.color ? o.material.color.clone() : null,
          emissive: o.material.emissive ? o.material.emissive.clone() : null
        };
        meshes.push(o);
      }
    });
    grp.userData.meshes = meshes;
    const box = new T.Box3().setFromObject(grp);
    grp.userData.center = box.getCenter(new T.Vector3());
    grp.userData.size = box.getSize(new T.Vector3());
  }

  /* ---------- P01 喷管（钟形，再生冷却） ---------- */
  function nozzle(root) {
    const g = P('P01', '喷管', 'NOZZLE', [0, -0.10, 0], {
      mat: '不锈钢 + 铜内衬', size: '出口 φ1.24 m / 高 1.38 m', func: '燃气膨胀加速，再生冷却夹套带走壁面热流', temp: '壁温 480 ℃'
    });
    const b = new DF.Builder();

    // 钟形外壁（LatheGeometry）
    const prof = [
      [0.620, 0.180], [0.585, 0.300], [0.540, 0.450], [0.480, 0.640],
      [0.415, 0.820], [0.352, 0.990], [0.296, 1.140], [0.252, 1.270],
      [0.220, 1.380], [0.203, 1.470], [0.198, 1.560]
    ].map(p => new T.Vector2(p[0], p[1]));
    const lathe = new T.LatheGeometry(prof, 56);
    b.raw('metal', ST, lathe, 0, 0, 0);
    lathe.dispose();

    // 内壁（略小的暗色，形成厚度与冷却夹层）
    const prof2 = prof.map(p => new T.Vector2(p.x - 0.035, p.y + 0.006));
    const inner = new T.LatheGeometry(prof2, 56);
    b.raw('gloss', DARK, inner, 0, 0, 0);
    inner.dispose();

    // 加强环 + 冷却剂集合器
    [0.30, 0.52, 0.74, 0.96, 1.18].forEach(y => {
      const r = DF.lerp(0.585, 0.26, (y - 0.30) / 0.88);
      b.cyl('metal', ST_L, r + 0.012, r + 0.012, 0.035, 48, 0, y, 0);
    });
    // 出口法兰与唇口
    b.cyl('metal', ST_D, 0.632, 0.632, 0.03, 56, 0, 0.19, 0);
    b.cyl('metal', ST_L, 0.640, 0.620, 0.045, 56, 0, 0.172, 0);
    // 冷却剂进出口
    b.cyl('metal', ST_L, 0.05, 0.05, 0.22, 12, 0.42, 1.30, 0.30, 0, 0, Math.PI / 2);
    b.cyl('metal', ST_L, 0.05, 0.05, 0.22, 12, -0.38, 1.30, -0.26, 0, 0, Math.PI / 2);

    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P02 燃烧室 ---------- */
  function chamber(root) {
    const g = P('P02', '燃烧室', 'COMBUSTION CHAMBER', [0, 0.44, 0], {
      mat: '铜合金内衬 + 不锈钢外壳', size: 'φ0.40 × 0.50 m', func: '推进剂在此完成雾化、蒸发与等压燃烧', temp: '燃气 3200 K'
    });
    const b = new DF.Builder();
    b.cyl('metal', ST_D, 0.205, 0.205, 0.50, 44, 0, 1.81, 0);        // 外壳
    b.cyl('metal', CU, 0.188, 0.188, 0.49, 44, 0, 1.815, 0);          // 铜内衬
    b.cyl('gloss', DARK, 0.172, 0.172, 0.47, 40, 0, 1.82, 0);
    [1.60, 1.70, 1.81, 1.92, 2.03].forEach(y => {
      b.cyl('metal', ST_L, 0.213, 0.213, 0.022, 48, 0, y, 0);
    });
    // 头部转接法兰
    b.cyl('metal', ST, 0.228, 0.228, 0.045, 48, 0, 2.058, 0);
    // 24 颗紧固螺栓
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      b.cyl('metal', ST_L, 0.018, 0.018, 0.055, 8, Math.cos(a) * 0.222, 2.075, Math.sin(a) * 0.222);
    }
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P03 喷注器 ---------- */
  function injector(root) {
    const g = P('P03', '喷注器', 'INJECTOR', [0, 1.02, 0], {
      mat: '不锈钢 + 铜面板', size: 'φ0.44 × 0.10 m，240 个离心喷嘴', func: '把液氧与煤油按 2.6:1 分配并雾化，形成稳定燃烧面', temp: '面板 620 ℃'
    });
    const b = new DF.Builder();
    b.cyl('metal', ST, 0.222, 0.222, 0.075, 48, 0, 2.12, 0);
    b.cyl('metal', CU, 0.206, 0.206, 0.02, 48, 0, 2.088, 0);          // 喷注面板
    // 喷嘴阵列（同心 6 圈，共 240）
    const rings = [[0.030, 6], [0.062, 14], [0.096, 22], [0.130, 30], [0.164, 38], [0.196, 46]];
    rings.forEach(([r, n]) => {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + r * 7;
        b.cyl('metal', ST_L, 0.0105, 0.0105, 0.052, 8, Math.cos(a) * r, 2.078, Math.sin(a) * r);
      }
    });
    // 氧/燃集合腔
    b.cyl('metal', ST_D, 0.228, 0.228, 0.045, 48, 0, 2.158, 0);
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P04 头部 / 集合器 ---------- */
  function head(root) {
    const g = P('P04', '推力室头部', 'THRUST HEAD', [0, 1.02, 0], {
      mat: '不锈钢锻件', size: 'φ0.50 × 0.18 m', func: '承载喷注器与涡轮泵出口压力，分流两路推进剂', temp: '结构 180 ℃'
    });
    const b = new DF.Builder();
    // 半球顶盖
    const dome = new T.SphereGeometry(0.245, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42);
    b.raw('metal', ST, dome, 0, 2.20, 0);
    dome.dispose();
    b.cyl('metal', ST, 0.245, 0.245, 0.06, 48, 0, 2.196, 0);
    // 环形集合器
    const man = new T.TorusGeometry(0.255, 0.032, 12, 48);
    b.raw('metal', ST_L, man, 0, 2.168, 0, 0);
    b.raw('metal', ST_L, man, 0, 2.245, 0, 0);
    man.dispose();
    // 进出口法兰
    b.cyl('metal', ST_D, 0.070, 0.070, 0.055, 16, 0.235, 2.238, 0.02, 0, 0, Math.PI / 2);
    b.cyl('metal', ST_D, 0.070, 0.070, 0.055, 16, -0.225, 2.238, -0.02, 0, 0, Math.PI / 2);
    // 压力传感器
    b.cyl('metal', ST_L, 0.022, 0.022, 0.10, 10, 0.16, 2.29, 0.16);
    b.cyl('emit', DF.col(AMBER, 1.6), 0.012, 0.012, 0.012, 8, 0.16, 2.345, 0.16);
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P05 涡轮泵 ---------- */
  function turbopump(root) {
    const g = P('P05', '涡轮泵', 'TURBOPUMP', [0.64, 0.62, -0.46], {
      mat: '不锈钢壳体 / 铜叶轮 / 高温合金涡轮', size: 'φ0.40 × 0.62 m，转速 18 000 rpm', func: '同轴双泵，把液氧与煤油增压至 18 MPa 送进喷注器', temp: '涡轮入口 900 K'
    });
    const b = new DF.Builder();
    const cx = 0.415, cy = 1.99, cz = -0.235;
    // 泵壳体（立式）
    b.cyl('metal', ST, 0.140, 0.140, 0.40, 36, cx, cy, cz);
    b.cyl('metal', ST_D, 0.158, 0.158, 0.045, 36, cx, cy + 0.215, cz);
    b.cyl('metal', ST_D, 0.158, 0.158, 0.045, 36, cx, cy - 0.215, cz);
    // 蜗壳（氧泵）
    const vol = new T.TorusGeometry(0.170, 0.050, 12, 40);
    b.raw('metal', ST_L, vol, cx, cy + 0.09, cz, 0);
    vol.dispose();
    // 诱导轮与叶轮（铜）
    b.cyl('metal', CU, 0.085, 0.085, 0.16, 24, cx, cy - 0.10, cz);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      b.box('metal', CU, 0.028, 0.10, 0.075, cx + Math.cos(a) * 0.095, cy - 0.10, cz + Math.sin(a) * 0.095, a, 0.35, 0);
    }
    // 涡轮级
    b.cyl('metal', 0x6d747d, 0.135, 0.135, 0.07, 32, cx, cy + 0.265, cz);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      b.box('metal', 0x9aa0a7, 0.045, 0.055, 0.11, cx + Math.cos(a) * 0.105, cy + 0.265, cz + Math.sin(a) * 0.105, a, 0, 0.5);
    }
    // 涡轮进气口 + 排气管
    b.cyl('metal', ST_D, 0.048, 0.048, 0.20, 12, cx - 0.10, cy + 0.36, cz - 0.10, 0.4, 0, 0.7);
    b.cyl('metal', ST_D, 0.052, 0.052, 0.26, 12, cx + 0.14, cy - 0.30, cz + 0.06, 0, 0, Math.PI / 2.1);
    // 泵出口短管
    b.cyl('metal', ST_L, 0.045, 0.045, 0.20, 12, cx - 0.02, cy + 0.20, cz + 0.16, Math.PI / 2, 0, 0.3);
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P06 燃气发生器 ---------- */
  function gasgen(root) {
    const g = P('P06', '燃气发生器', 'GAS GENERATOR', [-0.64, 0.74, -0.38], {
      mat: '高温合金', size: 'φ0.16 × 0.28 m', func: '少量推进剂在此富燃燃烧，产生驱动涡轮的燃气', temp: '出口 1200 K'
    });
    const b = new DF.Builder();
    const gx = -0.40, gy = 2.06, gz = -0.16;
    b.cyl('metal', ST_D, 0.078, 0.078, 0.24, 24, gx, gy, gz, 0.25, 0, 0.3);
    b.cyl('metal', ST_L, 0.084, 0.084, 0.035, 24, gx, gy + 0.12, gz);
    b.cyl('metal', ST_L, 0.084, 0.084, 0.035, 24, gx, gy - 0.12, gz);
    // 喷管（细颈）
    b.cyl('metal', ST, 0.026, 0.052, 0.10, 16, gx - 0.03, gy - 0.19, gz + 0.02, 0.3, 0, 0.2);
    // 点火器
    b.cyl('metal', ST_L, 0.018, 0.018, 0.09, 10, gx + 0.09, gy + 0.06, gz + 0.05, 0, 0, 1.0);
    b.cyl('emit', DF.col(0xff5638, 2.0), 0.010, 0.010, 0.010, 8, gx + 0.13, gy + 0.09, gz + 0.08);
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P07 主阀组 ---------- */
  function valves(root) {
    const g = P('P07', '主阀组', 'MAIN VALVES', [-0.78, 0.26, 0.40], {
      mat: '不锈钢阀体 + 聚四氟阀座', size: '2 × φ0.12 × 0.20 m', func: '控制液氧/煤油主路通断，响应时间 80 ms', temp: '介质 −183 ℃ / 常温'
    });
    const b = new DF.Builder();
    [[-0.30, 1.88, 0.16, 0.45], [0.22, 1.76, 0.19, -0.25]].forEach(([x, y, z, tilt]) => {
      b.cyl('metal', ST, 0.062, 0.062, 0.17, 24, x, y, z, 0, 0, tilt);
      b.cyl('metal', ST_D, 0.072, 0.072, 0.028, 24, x, y + 0.085, z, 0, 0, tilt);
      b.cyl('metal', ST_D, 0.072, 0.072, 0.028, 24, x, y - 0.085, z, 0, 0, tilt);
      b.box('metal', ORANGE, 0.055, 0.055, 0.20, x, y + 0.13, z, 0.6);       // 作动手柄
      b.cyl('emit', DF.col(0x9ed6b4, 1.4), 0.010, 0.010, 0.010, 8, x + 0.05, y + 0.145, z + 0.06);
    });
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P08 伺服作动筒 ---------- */
  function actuators(root) {
    const g = P('P08', '摆动伺服', 'SERVO ACTUATORS', [0.64, 0.16, 0.48], {
      mat: '钛合金筒体 + 镀铬活塞杆', size: '2 × φ0.09 × 0.46 m，行程 ±120 mm', func: '推动发动机绕万向架摆动，实现推力矢量控制', temp: '液压油 70 ℃'
    });
    const b = new DF.Builder();
    [[0.30, 1.62, 0.30, 0.55], [-0.26, 1.62, -0.30, -0.55]].forEach(([x, y, z, tilt]) => {
      b.cyl('metal', ST_D, 0.045, 0.045, 0.34, 18, x, y, z, 0, 0, tilt);
      b.cyl('metal', ST_L, 0.020, 0.020, 0.22, 12, x + 0.075, y - 0.16, z + 0.05, 0, 0, tilt);
      b.box('metal', ST, 0.06, 0.05, 0.09, x, y + 0.18, z);
      b.cyl('metal', ST, 0.028, 0.028, 0.05, 10, x + 0.10, y - 0.26, z + 0.07, 0, 0, tilt);
    });
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P09 万向架 ---------- */
  function gimbal(root) {
    const g = P('P09', '万向架', 'GIMBAL MOUNT', [0, 1.02, 0], {
      mat: '锻钢 + 关节轴承', size: 'φ0.30 × 0.20 m', func: '把发动机铰接到箭体机架，传递 1200 kN 推力并允许 ±8° 摆动', temp: '结构 120 ℃'
    });
    const b = new DF.Builder();
    // 上安装座
    b.cyl('metal', ST, 0.145, 0.145, 0.045, 32, 0, 2.50, 0);
    b.cyl('metal', ST_D, 0.100, 0.115, 0.075, 32, 0, 2.44, 0);
    // 十字轴
    b.box('metal', ST_L, 0.29, 0.035, 0.035, 0, 2.385, 0);
    b.box('metal', ST_L, 0.035, 0.035, 0.29, 0, 2.385, 0);
    b.cyl('metal', ST_D, 0.042, 0.042, 0.13, 16, 0.13, 2.385, 0, 0, 0, Math.PI / 2);
    b.cyl('metal', ST_D, 0.042, 0.042, 0.13, 16, -0.13, 2.385, 0, 0, 0, Math.PI / 2);
    // 下法兰
    b.cyl('metal', ST, 0.130, 0.130, 0.040, 32, 0, 2.335, 0);
    // 作动器耳环
    [[0.20, 2.32, 0.20], [-0.20, 2.32, -0.20]].forEach(([x, y, z]) => {
      b.box('metal', ST_D, 0.05, 0.07, 0.05, x, y, z);
    });
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P10 管路 ---------- */
  function pipes(root) {
    const g = P('P10', '推进剂管路', 'FEED LINES', [-0.58, 0.48, 0.62], {
      mat: '不锈钢波纹管 + 绝热包覆', size: 'φ56 / φ44 mm，总长 3.1 m', func: '把涡轮泵出口的液氧与煤油送到喷注器集合器', temp: '液氧 −183 ℃'
    });
    const b = new DF.Builder();
    const tube = (pts, r, color, key) => {
      const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])));
      const geo = new T.TubeGeometry(curve, 48, r, 9, false);
      b.raw(key || 'metal', color, geo, 0, 0, 0);
      geo.dispose();
    };
    // 氧路：泵出口 → 头部集合器
    tube([[0.46, 2.20, -0.14], [0.34, 2.34, 0.02], [0.12, 2.30, 0.10], [-0.02, 2.26, 0.12]], 0.030, ST_L);
    // 燃路：阀 → 头部
    tube([[0.26, 1.92, 0.30], [0.10, 2.02, 0.34], [-0.08, 2.16, 0.28], [-0.16, 2.24, 0.14]], 0.026, ST);
    // 发生器供液
    tube([[-0.26, 1.94, 0.20], [-0.34, 2.00, 0.02], [-0.38, 2.04, -0.10]], 0.018, ST_D);
    // 涡轮排气管 → 喷管下游
    tube([[0.62, 1.86, -0.34], [0.70, 1.72, -0.28], [0.66, 1.55, -0.02], [0.56, 1.44, 0.06]], 0.034, ST_D);
    b.flush(g);
    seal(g);
    root.add(g);
  }

  /* ---------- P11 传感器 / 电缆 ---------- */
  function sensors(root) {
    const g = P('P11', '传感器与电缆', 'SENSORS & HARNESS', [0.82, 0.44, 0.26], {
      mat: '不锈钢壳体 + 屏蔽电缆', size: '4 测点 / 8 通道', func: '采集压力、温度、转速与振动，送入测发控 8 通道遥测', temp: '−180…1200 ℃'
    });
    const b = new DF.Builder();
    [[0.20, 1.72, 0.20], [-0.20, 2.10, 0.16], [0.44, 2.16, -0.06], [-0.30, 1.62, -0.22]].forEach(([x, y, z], i) => {
      b.cyl('metal', ST_L, 0.020, 0.020, 0.055, 10, x, y, z);
      b.box('metal', ST_D, 0.036, 0.030, 0.030, x, y + 0.04, z);
      b.cyl('emit', DF.col(i % 2 ? 0x9ed6b4 : AMBER, 1.8), 0.007, 0.007, 0.007, 8, x + 0.02, y + 0.065, z);
    });
    // 电缆（细管绕行）
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0.22, 1.74, 0.22), new T.Vector3(0.40, 1.86, 0.34),
      new T.Vector3(0.52, 2.06, 0.30), new T.Vector3(0.44, 2.20, 0.02),
      new T.Vector3(0.28, 2.28, -0.06)
    ]);
    const geo = new T.TubeGeometry(curve, 40, 0.010, 6, false);
    b.raw('rubber', 0x15171a, geo, 0, 0, 0);
    geo.dispose();
    b.flush(g);
    seal(g);
    root.add(g);
  }

  DF.buildEngine = function (scene) {
    const root = new T.Group();
    root.name = 'engine';
    root.position.set(0, 0.06, 0);
    scene.add(root);
    nozzle(root); chamber(root); injector(root); head(root);
    turbopump(root); gasgen(root); valves(root); actuators(root);
    gimbal(root); pipes(root); sensors(root);
    DF.engine = root;
    return root;
  };

})(window.DF = window.DF || {});
