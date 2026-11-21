/* ============================================================
   EN-01 · 12-tex —— 附加程序化纹理（径向衰减）
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  /* 径向衰减（地台向黑场溶解，避免出现地平硬边） */
  DF.falloffTex = function (size) {
    const tex = DF.canvasTex(size || 256, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.10, s / 2, s / 2, s * 0.5);
      g.addColorStop(0.00, 'rgba(255,255,255,1)');
      g.addColorStop(0.52, 'rgba(255,255,255,1)');
      g.addColorStop(0.72, 'rgba(210,210,210,0.72)');
      g.addColorStop(0.88, 'rgba(140,140,140,0.26)');
      g.addColorStop(1.00, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, [1, 1], false);
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    return tex;
  };

})(window.DF = window.DF || {});
