/* ============================================================
   EN-01 · 40-actions —— 分解 / 回装 / 选中高亮 / 透视
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const S = {
    t: 0,          // 当前分解量 0..1
    target: 0,     // 目标分解量
    sel: -1,
    section: false,
    hover: -1,
    auto: false
  };
  DF.state = S;

  const CLIP = new T.Plane(new T.Vector3(-0.78, 0, -0.62), 0.0);
  let ready = false;

  DF.initActions = function (scene, renderer, camera) {
    S.t = 0; S.target = 0; S.sel = -1; S.section = false;
    S.parts = DF.PARTS;
    S.meshes = [];
    S.parts.forEach((grp, i) => {
      grp.userData.basePos = grp.position.clone();
      grp.traverse(o => { if (o.isMesh) S.meshes.push(o); });
    });
    S.camera = camera; S.scene = scene; S.renderer = renderer;
    ready = true;
  };

  /* ---------- 分解量驱动 ---------- */
  DF.setExplode = function (v, instant) {
    S.target = DF.clamp(v, 0, 1);
    if (instant) S.t = S.target;
    DF.emit && DF.emit('explode', S.target);
  };
  DF.toggleExplode = function () {
    S.target = S.target > 0.5 ? 0 : 1;
  };

  /* ---------- 选中 ---------- */
  DF.selectPart = function (idx, focusCam) {
    S.sel = idx;
    DF.PARTS.forEach((grp, i) => {
      const on = i === idx;
      (grp.userData.meshes || []).forEach(m => {
        const u = m.material.userData;
        if (!u || !u.base || !m.material.emissive) return;
        if (!m.material.userData._hc) m.material.userData._hc = m.material.color.clone();
        if (on) {
          m.material.color.copy(m.material.userData._hc).lerp(new T.Color(0xf2a73b), 0.72);
          m.material.emissive.setHex(0x241403);
          m.material.emissiveIntensity = 0.20;
        } else {
          m.material.color.copy(m.material.userData._hc);
          m.material.emissive.copy(u.emissive);
          m.material.emissiveIntensity = 1;
        }
      });
    });
    if (focusCam && idx >= 0 && S.camera && DF.PARTS[idx].userData.center) {
      const c = DF.PARTS[idx].userData.center.clone();
      c.applyMatrix4(DF.PARTS[idx].matrixWorld);
      S.camera.userData.focus = c;
    }
    DF.emit && DF.emit('select', idx);
  };

  /* ---------- 透视（外壳半透明，看内部结构） ---------- */
  DF.setSection = function (on) {
    S.section = on;
    S.parts.forEach(grp => {
      (grp.userData.meshes || []).forEach(m => {
        const mt = m.material;
        if (!mt) return;
        if (!mt.userData._base) mt.userData._base = { op: mt.opacity, tr: mt.transparent, dw: mt.depthWrite };
        if (on) {
          if (mt.isMeshBasicMaterial) return;
          mt.transparent = true; mt.opacity = 0.26; mt.depthWrite = false;
        } else {
          mt.transparent = mt.userData._base.tr; mt.opacity = mt.userData._base.op; mt.depthWrite = mt.userData._base.dw;
        }
        mt.needsUpdate = true;
      });
    });
    DF.emit && DF.emit('section', on);
  };

  /* 连续透视：0 = 实心，1 = 全外壳半透明（巡游里平滑过渡，避免硬跳） */
  DF.setSectionMix = function (v) {
    v = DF.clamp(v, 0, 1);
    S.section = v > 0.02;
    S.parts.forEach(grp => {
      (grp.userData.meshes || []).forEach(m => {
        const mt = m.material;
        if (!mt || mt.isMeshBasicMaterial) return;
        if (!mt.userData._base) mt.userData._base = { op: mt.opacity, tr: mt.transparent, dw: mt.depthWrite };
        const b = mt.userData._base;
        mt.transparent = v > 0.02 ? true : b.tr;
        mt.opacity = DF.lerp(b.op, 0.26, v);
        mt.depthWrite = v > 0.02 ? false : b.dw;
        mt.needsUpdate = true;
      });
    });
  };

  /* ---------- 拾取 ---------- */
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  DF.pick = function (clientX, clientY) {
    const el = DF.renderer.domElement;
    const r = el.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, S.camera);
    const hits = ray.intersectObjects(S.meshes, false);
    if (!hits.length) return -1;
    let o = hits[0].object;
    while (o && !o.userData.id) o = o.parent;
    if (!o || !o.userData.id) return -1;
    return DF.PARTS.indexOf(o);
  };

  /* ---------- 每帧推进 ---------- */
  DF.updateActions = function (dt) {
    if (!ready) return;
    const k = 1 - Math.exp(-3.4 * dt);
    S.t += (S.target - S.t) * k;
    if (Math.abs(S.target - S.t) < 0.0008) S.t = S.target;

    const span = 1.0;     // 分解行程放大系数
    DF.PARTS.forEach((grp, i) => {
      const st = DF.clamp((S.t - i * 0.028) / 0.72, 0, 1);
      const e = DF.easeInOutCubic(st);
      const d = grp.userData.dir;
      grp.position.set(
        grp.userData.basePos.x + d.x * e * span,
        grp.userData.basePos.y + d.y * e * span,
        grp.userData.basePos.z + d.z * e * span
      );
      // 分解时轻微外倾，让层次更明确
      grp.rotation.z = e * d.x * 0.06;
      grp.rotation.x = -e * d.z * 0.06;
    });

    // 相机对焦（选中零件时缓推）
    const cam = S.camera;
    if (cam.userData.focus) {
      cam.userData.target.lerp(cam.userData.focus, 1 - Math.exp(-2.2 * dt));
      if (cam.userData.target.distanceTo(cam.userData.focus) < 0.05) cam.userData.focus = null;
    }
  };

})(window.DF = window.DF || {});
