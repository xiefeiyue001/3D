/* ============================================================
   DF-01 · 70-post —— 后处理：MSAA / Bloom / ACES / 暗角 / 静态颗粒 / 移轴
   色彩：线性空间渲染 → 链末一次性 tone map + sRGB 编码
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const QUAD_VS = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  const BRIGHT_FS = `
    precision highp float;
    uniform sampler2D tMap;
    uniform float uThreshold;
    uniform float uKnee;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tMap, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float k = smoothstep(uThreshold, uThreshold + uKnee, l);
      gl_FragColor = vec4(c * k, 1.0);
    }
  `;

  const BLUR_FS = `
    precision highp float;
    uniform sampler2D tMap;
    uniform vec2 uDir;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      vec2 d = uDir * uTexel;
      vec3 s = texture2D(tMap, vUv).rgb * 0.2270270270;
      s += texture2D(tMap, vUv + d * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tMap, vUv - d * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tMap, vUv + d * 3.2307692308).rgb * 0.0702702703;
      s += texture2D(tMap, vUv - d * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(s, 1.0);
    }
  `;

  const COMPOSITE_FS = `
    precision highp float;
    uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform sampler2D tGrain;
    uniform float uExposure;
    uniform float uBloom;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uTilt;
    uniform float uTime;
    uniform vec2 uRes;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      x *= uExposure;
      float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    vec3 lin2srgb(vec3 c){
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.003)), vec3(1.0/2.4)) - 0.055, step(0.0035, c));
    }
    void main(){
      vec3 base = texture2D(tScene, vUv).rgb;
      vec3 blur = texture2D(tBloom, vUv).rgb;

      // 轻微移轴：画面上/下边缘混入模糊
      float band = smoothstep(0.10, 0.52, abs(vUv.y - 0.5));
      vec3 col = mix(base, blur, band * uTilt);
      col += blur * uBloom;

      col = aces(col);

      // 暗角
      vec2 q = vUv - 0.5;
      float vig = 1.0 - uVignette * pow(length(q * vec2(1.08, 0.86)), 2.2);
      col *= clamp(vig, 0.0, 1.0);

      // 静态亮度遮罩颗粒（暗背景不撒颗粒，保证远景帧差≈0）
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float mask = smoothstep(0.015, 0.42, lum);
      float g = texture2D(tGrain, vUv * uRes / 256.0).r - 0.5;
      col += g * uGrain * mask;

      gl_FragColor = vec4(lin2srgb(col), 1.0);
    }
  `;

  DF.createPost = function (renderer, opts) {
    const o = opts || {};
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const samples = isWebGL2 && !o.lq ? 4 : 0;

    const rtOpts = {
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      format: T.RGBAFormat,
      type: T.HalfFloatType,
      stencilBuffer: false,
      depthBuffer: true,
    };
    const rtScene = new T.WebGLRenderTarget(1, 1, Object.assign({}, rtOpts, { samples }));
    const rtA = new T.WebGLRenderTarget(1, 1, Object.assign({}, rtOpts, { depthBuffer: false }));
    const rtB = new T.WebGLRenderTarget(1, 1, Object.assign({}, rtOpts, { depthBuffer: false }));

    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    const qScene = new T.Scene();
    qScene.add(quad);

    const grain = DF.texGrain(256);

    const brightMat = new T.ShaderMaterial({
      uniforms: { tMap: { value: null }, uThreshold: { value: 0.92 }, uKnee: { value: 0.32 } },
      vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false,
    });
    const blurMat = new T.ShaderMaterial({
      uniforms: { tMap: { value: null }, uDir: { value: new T.Vector2(1, 0) }, uTexel: { value: new T.Vector2(1, 1) } },
      vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false,
    });
    const compMat = new T.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tGrain: { value: grain },
        uExposure: { value: 1.0 },
        uBloom: { value: 0.3 },
        uGrain: { value: 0.055 },
        uVignette: { value: 0.42 },
        uTilt: { value: 0.12 },
        uTime: { value: 0 },
        uRes: { value: new T.Vector2(1, 1) },
      },
      vertexShader: QUAD_VS, fragmentShader: COMPOSITE_FS, depthTest: false, depthWrite: false,
    });

    const api = {
      rtScene, compMat,
      exposure: 1.0,
      bloom: 0.3,
      grainAmount: 0.055,
      tilt: 0.12,
      enabled: true,
      size: { w: 1, h: 1, pr: 1 },
      setSize(w, h, pr) {
        api.size = { w, h, pr };
        const W = Math.max(1, Math.floor(w * pr)), H = Math.max(1, Math.floor(h * pr));
        rtScene.setSize(W, H);
        const hw = Math.max(1, Math.floor(W / 2)), hh = Math.max(1, Math.floor(H / 2));
        rtA.setSize(hw, hh);
        rtB.setSize(hw, hh);
        blurMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
        compMat.uniforms.uRes.value.set(W, H);
      },
      render(scene, camera, time) {
        const r = renderer;
        if (!api.enabled) {
          r.setRenderTarget(null);
          r.clear();
          r.render(scene, camera);
          return;
        }
        const prevTM = r.toneMapping;
        r.toneMapping = T.NoToneMapping;

        // 1) 场景（MSAA RT）
        r.setRenderTarget(rtScene);
        r.clear();
        r.render(scene, camera);

        // 2) 亮部提取
        quad.material = brightMat;
        brightMat.uniforms.tMap.value = rtScene.texture;
        r.setRenderTarget(rtA);
        r.clear();
        r.render(qScene, cam);

        // 3) 高斯模糊两轮
        const blur = (src, dst, dx, dy) => {
          quad.material = blurMat;
          blurMat.uniforms.tMap.value = src.texture;
          blurMat.uniforms.uDir.value.set(dx, dy);
          r.setRenderTarget(dst);
          r.clear();
          r.render(qScene, cam);
        };
        blur(rtA, rtB, 1, 0);
        blur(rtB, rtA, 0, 1);
        blur(rtA, rtB, 1, 0);
        blur(rtB, rtA, 0, 1);

        // 4) 合成到屏幕
        quad.material = compMat;
        compMat.uniforms.tScene.value = rtScene.texture;
        compMat.uniforms.tBloom.value = rtA.texture;
        compMat.uniforms.uExposure.value = api.exposure;
        compMat.uniforms.uBloom.value = api.bloom;
        compMat.uniforms.uGrain.value = api.grainAmount;
        compMat.uniforms.uTilt.value = api.tilt;
        compMat.uniforms.uTime.value = time;
        r.setRenderTarget(null);
        r.clear();
        r.render(qScene, cam);

        r.toneMapping = prevTM;
      },
    };
    return api;
  };

})(window.DF = window.DF || {});
