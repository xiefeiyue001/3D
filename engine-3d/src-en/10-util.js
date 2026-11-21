/* ============================================================
   DF-01 · 10-util  —— 基础工具 / 材质库 / 几何合并器
   所有模块挂在 window.DF 下，严格顺序拼接。
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  /* ---------- 数学 ---------- */
  DF.TAU = Math.PI * 2;
  DF.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  DF.lerp = (a, b, t) => a + (b - a) * t;
  DF.easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  DF.easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  DF.easeInCubic = t => t * t * t;
  DF.damp = (cur, tgt, lambda, dt) => DF.lerp(cur, tgt, 1 - Math.exp(-lambda * dt));
  DF.smoothstep = (a, b, x) => {
    const t = DF.clamp((x - a) / (b - a || 1), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ---------- 确定性随机 ---------- */
  DF.hash = function (seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  DF.rand = DF.hash(0x0df01);
  DF.rr = (r, a, b) => a + (b - a) * r();

  /* ---------- 颜色（sRGB→线性，手工管理） ---------- */
  DF.col = function (hex, mul) {
    const c = new T.Color();
    c.setHex(typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex);
    c.convertSRGBToLinear();
    if (mul !== undefined && mul !== 1) c.multiplyScalar(mul);
    return c;
  };
  DF.colHex = function (hex, mul) {
    const c = DF.col(hex, mul);
    return c;
  };

  /* ---------- 调色板 ---------- */
  DF.C = {
    void: 0x060708,
    graphite: 0x14171b,
    graphite2: 0x1c2026,
    concrete: 0x3c3934,
    concreteDark: 0x2a2825,
    concreteLight: 0x4a4640,
    steel: 0x565b62,
    steelDark: 0x2c3138,
    steelLight: 0x878e97,
    ivory: 0xcfc8ba,
    ivoryDim: 0x9c968a,
    safety: 0xd8621f,
    orange: 0xc2511c,
    amber: 0xf2a73b,
    green: 0x9ed6b4,
    red: 0xff5638,
    glass: 0x9fb3c0,
    rubber: 0x14161a,
    kraft: 0xb08a55,
    wrap: 0xc9c6bd,
    binBlue: 0x45596b,
    binGray: 0x5b6167,
    coil: 0x8d939a,
    whiteBody: 0xdad5cc,
    car1: 0xb9c2c9,
    car2: 0x36414c,
    car3: 0x8e4a32,
    car4: 0xcfd3d2,
    car5: 0x2f4f45,
  };

  /* ---------- 材质库（5 类，全部 vertexColors） ---------- */
  DF.MATDEF = {
    matte: { roughness: 0.9, metalness: 0.03, envMapIntensity: 0.5 },
    metal: { roughness: 0.42, metalness: 0.85, envMapIntensity: 0.45 },
    gloss: { roughness: 0.28, metalness: 0.35, envMapIntensity: 0.95 },
    glass: {
      roughness: 0.14, metalness: 0.1, transparent: true, opacity: 0.12,
      depthWrite: false, side: T.FrontSide, envMapIntensity: 0.35,
    },
    emit: { basic: true },
    rubber: { roughness: 0.95, metalness: 0.02, envMapIntensity: 0.15 },
    wall: { roughness: 1.0, metalness: 0.0, envMapIntensity: 0.06 },
    flat: { roughness: 1.0, metalness: 0.0, envMapIntensity: 0.03 },
  };
  DF._mats = {};
  DF.mat = function (name) {
    if (DF._mats[name]) return DF._mats[name];
    const d = DF.MATDEF[name] || DF.MATDEF.matte;
    let m;
    if (d.basic) {
      m = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    } else {
      m = new T.MeshStandardMaterial({
        vertexColors: true,
        color: 0xffffff,
        roughness: d.roughness,
        metalness: d.metalness,
        envMapIntensity: d.envMapIntensity === undefined ? 1 : d.envMapIntensity,
        transparent: !!d.transparent,
        opacity: d.opacity === undefined ? 1 : d.opacity,
        depthWrite: d.depthWrite === undefined ? true : d.depthWrite,
        side: d.side || T.FrontSide,
      });
    }
    m.name = name;
    DF._mats[name] = m;
    return m;
  };

  /* ---------- 顶点着色 ---------- */
  DF.tint = function (geo, color) {
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    const c = color instanceof T.Color ? color : DF.col(color);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    return geo;
  };

  /* ---------- 动态小网格（带顶点色，共享材质） ---------- */
  DF.boxMesh = function (key, color, w, h, d, x, y, z) {
    const g = DF.tint(new T.BoxGeometry(w, h, d), color);
    const m = new T.Mesh(g, DF.mat(key));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = key !== 'emit' && key !== 'glass';
    m.receiveShadow = key === 'matte' || key === 'metal';
    return m;
  };
  DF.cylMesh = function (key, color, rt, rb, h, seg, x, y, z) {
    const g = DF.tint(new T.CylinderGeometry(rt, rb, h, seg), color);
    const m = new T.Mesh(g, DF.mat(key));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = key !== 'emit' && key !== 'glass';
    return m;
  };
  DF.sphereMesh = function (key, color, r, x, y, z) {
    const g = DF.tint(new T.SphereGeometry(r, 14, 10), color);
    const m = new T.Mesh(g, DF.mat(key));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = false;
    return m;
  };

  /* ---------- 合并器 ---------- */
  const _m4 = new T.Matrix4();
  const _q = new T.Quaternion();
  const _e = new T.Euler();
  const _v = new T.Vector3();

  DF.Builder = function () { this.b = new Map(); };

  DF.Builder.prototype._get = function (k) {
    let b = this.b.get(k);
    if (!b) { b = { p: [], n: [], u: [], c: [] }; this.b.set(k, b); }
    return b;
  };

  DF.Builder.prototype.add = function (key, geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    const p = g.attributes.position.array;
    const n = g.attributes.normal ? g.attributes.normal.array : null;
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    const b = this._get(key);
    const c = color instanceof T.Color ? color : DF.col(color === undefined ? 0xffffff : color);
    const cnt = p.length / 3;
    for (let i = 0; i < p.length; i += 3) {
      b.p.push(p[i], p[i + 1], p[i + 2]);
      if (n) b.n.push(n[i], n[i + 1], n[i + 2]); else b.n.push(0, 1, 0);
      b.c.push(c.r, c.g, c.b);
    }
    if (u && u.length >= cnt * 2) { for (let i = 0; i < cnt * 2; i++) b.u.push(u[i]); }
    else { for (let i = 0; i < cnt * 2; i++) b.u.push(0); }
    return this;
  };

  DF.Builder.prototype.box = function (key, color, w, h, d, x, y, z, ry, rx, rz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m4.compose(_v.set(x || 0, y || 0, z || 0), _q, { x: 1, y: 1, z: 1 });
    const g = new T.BoxGeometry(w, h, d);
    this.add(key, g, _m4, color);
    g.dispose();
    return this;
  };

  DF.Builder.prototype.cyl = function (key, color, rt, rb, h, seg, x, y, z, rx, ry, rz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m4.compose(_v.set(x || 0, y || 0, z || 0), _q, { x: 1, y: 1, z: 1 });
    const g = new T.CylinderGeometry(rt, rb, h, seg, 1);
    this.add(key, g, _m4, color);
    g.dispose();
    return this;
  };

  DF.Builder.prototype.raw = function (key, color, geo, x, y, z, ry) {
    _e.set(0, ry || 0, 0);
    _q.setFromEuler(_e);
    _m4.compose(_v.set(x || 0, y || 0, z || 0), _q, { x: 1, y: 1, z: 1 });
    this.add(key, geo, _m4, color);
    return this;
  };

  DF.Builder.prototype.flush = function (parent, castAll) {
    const out = [];
    this.b.forEach((b, key) => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(b.p), 3));
      g.setAttribute('normal', new T.BufferAttribute(new Float32Array(b.n), 3));
      g.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.u), 2));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(b.c), 3));
      g.computeBoundingSphere();
      const m = new T.Mesh(g, DF.mat(key));
      m.name = 'batch:' + key;
      m.castShadow = key !== 'emit' && key !== 'glass';
      m.receiveShadow = key !== 'emit';
      m.matrixAutoUpdate = false;
      parent.add(m);
      out.push(m);
    });
    this.b.clear();
    return out;
  };

  /* ---------- 折线采样器（闭合 / 开放，按弧长等速） ---------- */
  DF.polyPath = function (points, opts) {
    const o = opts || {};
    const closed = !!o.closed;
    let arr = points.map(p => (p && p.isVector3) ? p.clone() : new T.Vector3(p[0] || 0, p[1] || 0, p[2] || 0));
    for (let it = 0; it < (o.smooth || 0); it++) {
      const out = [], n = arr.length;
      if (!closed) out.push(arr[0].clone());
      const lim = closed ? n : n - 1;
      for (let i = 0; i < lim; i++) {
        const a = arr[i], b = arr[(i + 1) % n];
        out.push(a.clone().lerp(b, 0.25));
        out.push(a.clone().lerp(b, 0.75));
      }
      if (!closed) out.push(arr[n - 1].clone());
      arr = out;
    }
    if (closed) arr = arr.concat([arr[0].clone()]);
    const cum = [0];
    let total = 0;
    for (let i = 1; i < arr.length; i++) { total += arr[i].distanceTo(arr[i - 1]); cum.push(total); }
    const len = total || 1;
    const at = (u, tgt) => {
      u = ((u % 1) + 1) % 1;
      const d = u * len;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
      const seg = (cum[hi] - cum[lo]) || 1;
      const k = (d - cum[lo]) / seg;
      return (tgt || new T.Vector3()).copy(arr[lo]).lerp(arr[hi], k);
    };
    const tan = (u, tgt) => {
      const uu = ((u % 1) + 1) % 1;
      const a = at(uu, new T.Vector3());
      const b = at(uu + 0.004, new T.Vector3());
      return (tgt || new T.Vector3()).subVectors(b, a).normalize();
    };
    return { dense: arr, length: len, getPointAt: at, getTangentAt: tan };
  };

  /* 影棚场坪：中心受光、四角没入黑场 */
  DF.texStudioFloor = function () {
    return canvasTex(512, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s * 0.46, s * 0.06, s / 2, s * 0.46, s * 0.52);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.03, '#8f8f8f');
      g.addColorStop(0.07, '#2c2c2c');
      g.addColorStop(0.12, '#080808');
      g.addColorStop(1, '#040404');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      const r = DF.hash(2917);
      for (let i = 0; i < 4200; i++) {
        const x = r() * s, y = r() * s, gg = 60 + r() * 90;
        ctx.fillStyle = 'rgba(' + gg + ',' + gg + ',' + gg + ',' + (0.05 + r() * 0.1) + ')';
        ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
      }
    }, [1, 1], false);
  };

  /* ---------- 画布纹理 ---------- */
  function canvasTex(size, draw, repeat, isColor) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    draw(ctx, size);
    const tex = new T.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    if (repeat) tex.repeat.set(repeat[0], repeat[1]);
    tex.anisotropy = 8;
    if (isColor) tex.encoding = T.sRGBEncoding;
    return tex;
  }
  DF.canvasTex = canvasTex;

  DF.texConcrete = function (repeat) {
    return canvasTex(512, (ctx, s) => {
      const r = DF.hash(5517);
      ctx.fillStyle = '#3d3a35';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const x = r() * s, y = r() * s, rr = 1 + r() * 5;
        const g = 34 + r() * 54;
        ctx.fillStyle = 'rgba(' + g + ',' + (g - 3) + ',' + (g - 8) + ',' + (0.05 + r() * 0.2) + ')';
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
      }
      // 细微伸缩缝 / 网格
      ctx.strokeStyle = 'rgba(16,15,13,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(s, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, s); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.035)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1.5, 1.5, s - 3, s - 3);
    }, repeat, true);
  };

  DF.texAsphalt = function (repeat) {
    return canvasTex(512, (ctx, s) => {
      const r = DF.hash(3319);
      ctx.fillStyle = '#2c2a28';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 6000; i++) {
        const x = r() * s, y = r() * s;
        const g = 40 + r() * 46;
        ctx.fillStyle = 'rgba(' + g + ',' + g + ',' + (g - 2) + ',' + (0.25 + r() * 0.5) + ')';
        ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
      }
    }, repeat, true);
  };

  /* 静态颗粒（不随时间变化 → 帧差为 0） */
  DF.texGrain = function (size) {
    const s = size || 256;
    const r = DF.hash(8823);
    const data = new Uint8Array(s * s * 4);
    for (let i = 0; i < s * s; i++) {
      const v = Math.floor(r() * 255);
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    const tex = new T.DataTexture(data, s, s, T.RGBAFormat);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  };

  /* ---------- 小车库 ---------- */
  DF.makeCar = function (opts) {
    const o = opts || {};
    const color = o.color === undefined ? DF.C.car1 : o.color;
    const g = new T.Group();
    const b = new DF.Builder();
    const key = o.key || 'gloss';
    // 车身主体（4.6 × 1.46 × 1.86）
    b.box(key, color, 0.86, 0.30, 4.2, 0, 1.02, 0);          // 下车身
    b.box(key, color, 0.78, 0.34, 3.6, 0, 1.30, -0.05);      // 上部体量
    b.box(key, color, 1.52, 0.30, 2.5, 0, 1.30, 0.1);        // 腰线
    b.box(key, color, 1.86, 0.42, 1.9, 0, 0.80, 0);          // 轮拱层
    // 座舱罩（宿背感）
    b.box('gloss', 0x1b2026, 1.5, 0.44, 1.9, 0, 1.62, 0.25);
    // 玻璃
    b.box('glass', DF.C.glass, 1.38, 0.34, 0.9, 0, 1.62, 0.85);
    b.box('glass', DF.C.glass, 1.3, 0.32, 0.6, 0, 1.60, -0.7);
    // 车头/车尾灯
    b.box('emit', DF.col(0xffe6c4, 2.4), 1.5, 0.09, 0.14, 0, 1.02, 2.1);
    b.box('emit', DF.col(0xff3f2a, 1.8), 0.5, 0.1, 0.1, 0.55, 1.0, -2.14);
    b.box('emit', DF.col(0xff3f2a, 1.8), 0.5, 0.1, 0.1, -0.55, 1.0, -2.14);
    // 轮
    const wheel = (x, z) => {
      b.cyl('rubber', DF.C.rubber, 0.44, 0.44, 0.28, 16, x, 0.44, z, 0, 0, Math.PI / 2);
      b.cyl('metal', DF.C.steelLight, 0.24, 0.24, 0.30, 12, x, 0.44, z, 0, 0, Math.PI / 2);
    };
    wheel(0.86, 1.32); wheel(-0.86, 1.32); wheel(0.86, -1.42); wheel(-0.86, -1.42);
    // 底盘阴影（接触暗）
    b.box('matte', 0x090a0b, 1.5, 0.06, 4.0, 0, 0.18, 0);
    b.flush(g);
    g.position.set(o.x || 0, o.y || 0, o.z || 0);
    if (o.ry) g.rotation.y = o.ry;
    g.userData.kind = 'car';
    return g;
  };

  /* ---------- 卡车（13.6 m 半挂） ---------- */
  DF.makeTruck = function (opts) {
    const o = opts || {};
    const g = new T.Group();
    const b = new DF.Builder();
    const bodyColor = o.color === undefined ? 0xb7bcc2 : o.color;
    const boxColor = o.boxColor === undefined ? 0xd7d9d6 : o.boxColor;
    // 挂车（沿 +x 车头方向）
    b.box('matte', boxColor, 10.4, 2.85, 2.55, -2.4, 2.05, 0);       // 箱体
    b.box('metal', DF.C.steelDark, 10.6, 0.22, 2.6, -2.4, 0.62, 0);  // 底架
    b.box('metal', DF.C.steelDark, 10.0, 0.16, 0.22, -2.4, 0.5, 0.9);
    b.box('metal', DF.C.steelDark, 10.0, 0.16, 0.22, -2.4, 0.5, -0.9);
    // 车头
    b.box('gloss', bodyColor, 2.6, 2.3, 2.5, 3.7, 1.55, 0);
    b.box('gloss', bodyColor, 1.1, 0.9, 2.4, 4.5, 2.35, 0);
    b.box('glass', DF.C.glass, 0.1, 1.0, 2.2, 4.9, 1.9, 0);
    b.box('emit', DF.col(0xffe6c4, 2.2), 0.12, 0.16, 2.1, 5.02, 1.05, 0);
    b.box('emit', DF.col(0xff3f2a, 1.6), 0.1, 0.14, 2.0, -7.62, 1.0, 0);
    // 轮组
    const wheel = (x, z) => {
      b.cyl('rubber', DF.C.rubber, 0.55, 0.55, 0.38, 16, x, 0.55, z, 0, 0, Math.PI / 2);
      b.cyl('metal', DF.C.steelLight, 0.28, 0.28, 0.4, 12, x, 0.55, z, 0, 0, Math.PI / 2);
    };
    wheel(4.3, 1.1); wheel(4.3, -1.1); wheel(3.0, 1.1); wheel(3.0, -1.1);
    wheel(-5.6, 1.1); wheel(-5.6, -1.1); wheel(-6.9, 1.1); wheel(-6.9, -1.1);
    b.box('matte', 0x090a0b, 12.6, 0.06, 2.6, -1.2, 0.22, 0);
    b.flush(g);
    g.position.set(o.x || 0, o.y || 0, o.z || 0);
    if (o.ry) g.rotation.y = o.ry;
    g.userData.kind = 'truck';
    return g;
  };

  /* ---------- 人（1.75 m，极简但比例准确） ---------- */
  DF.makeWorker = function (opts) {
    const o = opts || {};
    const g = new T.Group();
    const b = new DF.Builder();
    const vest = o.vest === undefined ? 0xd8b23c : o.vest;
    const skin = 0xc9a184;
    b.box('matte', 0x2b2f36, 0.36, 0.78, 0.24, 0, 0.46, 0);        // 腿
    b.box('matte', 0x23262b, 0.16, 0.1, 0.26, -0.10, 0.06, 0.02);  // 靴
    b.box('matte', 0x23262b, 0.16, 0.1, 0.26, 0.10, 0.06, 0.02);
    b.box('matte', vest, 0.42, 0.56, 0.24, 0, 1.14, 0);            // 马甲
    b.box('matte', 0x39414b, 0.12, 0.5, 0.13, -0.24, 1.16, 0);     // 臂
    b.box('matte', 0x39414b, 0.12, 0.5, 0.13, 0.24, 1.16, 0);
    b.sphere ? 0 : 0;
    const head = DF.sphereMesh('matte', skin, 0.115, 0, 1.53, 0);
    g.add(head);
    b.box('matte', 0xe4e0d4, 0.13, 0.14, 0.16, 0, 1.60, 0.02);     // 安全帽
    b.box('matte', 0xe4e0d4, 0.19, 0.03, 0.21, 0, 1.67, 0.0);
    b.flush(g);
    g.position.set(o.x || 0, o.y || 0, o.z || 0);
    if (o.ry) g.rotation.y = o.ry;
    return g;
  };

})(window.DF = window.DF || {});
