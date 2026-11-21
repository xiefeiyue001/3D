/* ============================================================
   EN-01 · 20-studio —— 暗色工业摄影棚：地台 / 三点光 / 环境
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  DF.buildStudio = function (scene, renderer) {
    scene.background = DF.col(0x05060a);
    scene.fog = new T.Fog(DF.col(0x05060a), 22, 78);

    /* ---------- 环境光照（程序化柔光箱 → PMREM） ---------- */
    const pmrem = new T.PMREMGenerator(renderer);
    const envScene = new T.Scene();
    const box = new T.MeshBasicMaterial({ side: T.BackSide, color: DF.col(0x0b0d11) });
    envScene.add(new T.Mesh(new T.BoxGeometry(40, 40, 40), box));

    const panel = (w, h, x, y, z, rx, ry, inten, hue) => {
      const m = new T.MeshBasicMaterial({ color: DF.col(hue, inten) });
      const p = new T.Mesh(new T.PlaneGeometry(w, h), m);
      p.position.set(x, y, z);
      p.rotation.set(rx, ry, 0);
      envScene.add(p);
    };
    panel(20, 14, -12, 10, 2, 0, Math.PI / 2, 0.9, 0xfff2e2);
    panel(16, 10, 11, 8, -3, 0, -Math.PI / 2, 0.75, 0x9fc4e8);
    panel(24, 8, 0, 18, 0, Math.PI / 2, 0, 0.65, 0xffffff);
    panel(10, 10, 0, 4, 16, 0, Math.PI, 0.45, 0xffc58a);

    const envTex = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = envTex;
    pmrem.dispose();

    /* ---------- 三点光 ---------- */
    const key = new T.DirectionalLight(0xffeedd, 2.3);
    key.position.set(-5.2, 7.6, 5.0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 26;
    key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0009;
    key.shadow.radius = 2.2;
    scene.add(key);
    scene.add(key.target);
    key.target.position.set(0, 1.2, 0);

    const fill = new T.DirectionalLight(0x86aed6, 0.5);
    fill.position.set(6.0, 3.2, 4.2);
    scene.add(fill);

    const rim = new T.DirectionalLight(0xb6d0f0, 1.15);
    rim.position.set(2.4, 5.0, -6.4);
    scene.add(rim);

    const hemi = new T.HemisphereLight(0x2b3742, 0x07070a, 0.55);
    scene.add(hemi);

    const top = new T.DirectionalLight(0xdfe8f2, 0.42);
    top.position.set(1.5, 9, 1.0);
    scene.add(top);

    // 琥珀轮廓补光（打亮金属边缘，形成摄影棚高光带）
    const amber = new T.PointLight(0xf2a73b, 1.05, 9, 1.6);
    amber.position.set(-2.6, 1.4, -3.2);
    scene.add(amber);

    /* ---------- 地台 ---------- */
    const floorTex = DF.canvasTex(512, (ctx, s) => {
      const r = DF.hash(7717);
      ctx.fillStyle = '#131416';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5200; i++) {
        const x = r() * s, y = r() * s, g = 20 + r() * 26;
        ctx.fillStyle = 'rgba(' + g + ',' + g + ',' + (g + 2) + ',' + (0.15 + r() * 0.35) + ')';
        ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
      }
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(180,150,100,.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
    }, [24, 24], false);

    const floor = new T.Mesh(
      new T.CircleGeometry(9.5, 96),
      new T.MeshStandardMaterial({ map: floorTex, color: DF.col(0x8f8c86), roughness: 0.95, metalness: 0.02, envMapIntensity: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);

    // 金属转台（发动机落座）
    const plinth = new T.Mesh(
      new T.CylinderGeometry(1.15, 1.28, 0.16, 72),
      new T.MeshStandardMaterial({ color: DF.col(0x3a3f45), roughness: 0.38, metalness: 0.82, envMapIntensity: 0.35 })
    );
    plinth.position.y = 0.08;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const ring = new T.Mesh(
      new T.TorusGeometry(1.22, 0.012, 8, 96),
      new T.MeshStandardMaterial({ color: DF.col(0xf2a73b), emissive: DF.col(0xf2a73b), emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.2 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.168;
    scene.add(ring);
    DF.studioRefs = { key, fill, rim, hemi, top, amber, floor, plinth, ring };
  };

})(window.DF = window.DF || {});
