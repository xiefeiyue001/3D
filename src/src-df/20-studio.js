/* ============================================================
   DF-01 · 20-studio —— 渲染器 / 摄影棚环境 / 灯光 / 地面
   “暗色摄影棚 + 实体工厂模型” 的底层光场
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  DF.studio = {};

  /* 程序化环境贴图：一个只有几块发光面的暗房，过 PMREM 拿中性影棚环境 */
  function makeEnvScene() {
    const s = new T.Scene();
    const dark = new T.MeshBasicMaterial({ color: DF.col(0x0a0c0f), side: T.BackSide });
    s.add(new T.Mesh(new T.BoxGeometry(300, 300, 300), dark));

    const panel = (hex, mul, w, h, pos, rot) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ color: DF.col(hex, mul), side: T.DoubleSide })
      );
      m.position.set(pos[0], pos[1], pos[2]);
      m.rotation.set(rot[0], rot[1], rot[2]);
      s.add(m);
    };
    // 顶部大面积冷白柔光箱
    panel(0xe8f0ff, 0.85, 170, 170, [0, 120, 0], [Math.PI / 2, 0, 0]);
    // 左上暖主光
    panel(0xffd9ad, 0.7, 90, 140, [-110, 40, -90], [0, Math.PI / 2, 0]);
    // 右侧冷轮廓
    panel(0x9dc4ee, 0.5, 60, 120, [120, 30, 40], [0, -Math.PI / 2, 0]);
    // 后方弱反射
    panel(0x6f7c8a, 0.35, 120, 80, [0, 20, 140], [0, Math.PI, 0]);
    // 地面反弹
    panel(0x2a2723, 0.5, 160, 160, [0, -110, 0], [-Math.PI / 2, 0, 0]);
    return s;
  }

  DF.initStudio = function (opts) {
    const o = opts || {};
    const canvas = o.canvas || document.getElementById('gl');
    const lq = !!o.lq;

    const renderer = new T.WebGLRenderer({
      canvas: canvas,
      antialias: false,          // MSAA 交给后处理 RT
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lq ? 1 : 1.75));
    renderer.outputEncoding = T.LinearEncoding;   // 屏幕编码在后处理合成 pass 里做一次
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = !lq;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.info.autoReset = false;

    const scene = new T.Scene();
    scene.background = DF.col(0x060708);
    scene.fog = new T.Fog(DF.col(0x07080a), 190, 980);

    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envScene = makeEnvScene();
    const envRT = pmrem.fromScene(envScene);
    scene.environment = envRT.texture;
    envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();

    const camera = new T.PerspectiveCamera(29, window.innerWidth / window.innerHeight, 0.4, 1600);

    /* ---- 灯光：主光定形 / 补光读暗部 / 轮廓光剥离背景 ---- */
    const key = new T.DirectionalLight(0xffeedd, 2.6);
    key.position.set(-126, 186, 108);
    key.target.position.set(-6, 0, -6);
    key.castShadow = !lq;
    const S = lq ? 2048 : 4096;
    key.shadow.mapSize.set(S, S);
    key.shadow.camera.left = -128; key.shadow.camera.right = 128;
    key.shadow.camera.top = 118; key.shadow.camera.bottom = -118;
    key.shadow.camera.near = 20; key.shadow.camera.far = 560;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = 2.2;
    scene.add(key, key.target);

    const fill = new T.DirectionalLight(0x7fa8cc, 0.52);
    fill.position.set(152, 104, -96);
    scene.add(fill, fill.target);

    const rim = new T.DirectionalLight(0xa9c8ee, 0.8);
    rim.position.set(46, 74, -178);
    scene.add(rim, rim.target);

    const hemi = new T.HemisphereLight(0x3a4756, 0x0b0a09, 0.95);
    scene.add(hemi);
    // 顶部柔光（无阴影，给室内暗部一点方向感）
    const top = new T.DirectionalLight(0xdfe8f2, 0.62);
    top.position.set(20, 210, 20);
    scene.add(top);

    // 车间顶棚的柔光（不投影，避免多光源阴影开销）
    const bay1 = new T.SpotLight(0xffe4bd, 0.55, 150, 0.72, 0.55, 1.4);
    bay1.position.set(-24, 30, -16);
    bay1.target.position.set(-26, 0, -18);
    scene.add(bay1, bay1.target);

    const bay2 = new T.SpotLight(0xffe4bd, 0.5, 130, 0.7, 0.6, 1.4);
    bay2.position.set(40, 30, 20);
    bay2.target.position.set(42, 0, 20);
    scene.add(bay2, bay2.target);

    /* ---- 地面 ---- */
    const floorTex = DF.texConcrete([39, 20]);
    const floorMat = new T.MeshStandardMaterial({
      map: floorTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.04,
      envMapIntensity: 0.12,
    });
    const floor = new T.Mesh(new T.PlaneGeometry(156, 80), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.015, 0);
    floor.receiveShadow = !lq;
    floor.name = 'floor';
    scene.add(floor);

    // 摄影棚地台（外扩 + 边缘暗）+ 室外沥青
    const apron = new T.Mesh(
      new T.PlaneGeometry(2600, 2600),
      new T.MeshStandardMaterial({ map: DF.texStudioFloor(), color: DF.col(0x2b2a28), roughness: 1.0, metalness: 0.0, envMapIntensity: 0.02 })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    apron.receiveShadow = false;
    apron.name = 'apron';
    scene.add(apron);

    const roadTex = DF.texAsphalt([12, 6]);
    const roadMat = new T.MeshStandardMaterial({
      map: roadTex, color: DF.col(0x35383b), roughness: 0.92, metalness: 0.04,
    });
    const roadW = new T.Mesh(new T.PlaneGeometry(56, 30), roadMat);
    roadW.rotation.x = -Math.PI / 2;
    roadW.position.set(-108, 0.005, 4);
    scene.add(roadW);
    const roadE = roadW.clone();
    roadE.material = roadMat;
    roadE.position.set(108, 0.005, 4);
    scene.add(roadE);

    // 摄影棚背幕（远处近黑雾面，避免虚空边界硬线）
    // 远处由雾与背景色收口，不另设背幕（避免硬边与 z 冲突）

    // 与桁架吊灯带对应的工作光池（无阴影，局部照亮地面与设备）
    for (let i = 0; i < 5; i++) {
      const px = -64 + i * 32;
      [[-20, 1.15], [20, 0.95]].forEach(([pz, inten]) => {
        const pl = new T.PointLight(0xffe6bf, inten, 78, 1.7);
        pl.position.set(px, 13.4, pz);
        scene.add(pl);
      });
    }

    DF.studio = { renderer, scene, camera, key, fill, rim, hemi, top, lq };
    return DF.studio;
  };

  DF.resizeStudio = function (w, h) {
    const s = DF.studio;
    if (!s.renderer) return;
    s.renderer.setSize(w, h, false);
    s.camera.aspect = w / Math.max(1, h);
    s.camera.updateProjectionMatrix();
  };

})(window.DF = window.DF || {});
