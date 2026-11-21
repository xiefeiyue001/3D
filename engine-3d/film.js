/* ============================================================
   EN-01 · film —— 纯净录屏引导层
   1) 进场即切 body.film：HUD / 标注 / 字幕 / dock / 角标全部不渲染
   2) 首帧就绪后黑场淡入，并自动进入电影巡游（总装→动力头→分解→回装，32 s 循环）
   3) 鼠标静止 1.4 s 自动隐藏指针
   4) ?bars=1 叠 2.39:1 遮幅；?hud=1 退回带 HUD 的交互模式
   ============================================================ */
(function () {
  'use strict';

  var Q = new URLSearchParams(location.search);
  if (Q.get('hud') === '1') return;          // 需要看 HUD 时：engine-3d-film.html?hud=1

  document.body.classList.add('film');

  /* ---------- 黑场 ---------- */
  var fade = document.createElement('div');
  fade.id = 'filmFade';
  document.body.appendChild(fade);

  /* ---------- 遮幅（可选） ---------- */
  var bars = null;
  if (Q.get('bars') === '1') {
    bars = document.createElement('div');
    bars.id = 'filmBars';
    bars.innerHTML = '<i id="fbTop"></i><i id="fbBot"></i>';
    bars.style.display = 'block';
    document.body.appendChild(bars);
  }
  function layoutBars() {
    if (!bars) return;
    var W = window.innerWidth, H = window.innerHeight;
    var h = Math.max(0, (H - W / 2.39) / 2);
    var top = document.getElementById('fbTop'), bot = document.getElementById('fbBot');
    top.style.height = h + 'px';
    top.style.top = '0';
    bot.style.height = h + 'px';
    bot.style.bottom = '0';
  }
  layoutBars();
  window.addEventListener('resize', layoutBars);

  /* ---------- 指针自动隐藏 ---------- */
  var curTimer = null;
  function wakeCursor() {
    document.body.classList.remove('curhide');
    clearTimeout(curTimer);
    curTimer = setTimeout(function () { document.body.classList.add('curhide'); }, 1400);
  }
  window.addEventListener('mousemove', wakeCursor);
  window.addEventListener('pointerdown', wakeCursor);
  wakeCursor();

  /* ---------- 等首帧：淡入 + 起巡游 ---------- */
  var started = false;
  function kick() {
    if (started) return;
    if (!window.DF || !DF.__ready) { setTimeout(kick, 120); return; }
    started = true;
    requestAnimationFrame(function () {
      fade.classList.add('out');
      setTimeout(function () { fade.style.display = 'none'; }, 1500);
    });
    /* 遮幅模式下把视角放宽，避免 2.39:1 把喷管裁掉 */
    if (bars) { DF.api.rig.fov = 39.5; DF.applyCam(); }
    DF.startTour();
    /* 巡游被鼠标打断后 6 s 无操作自动续上，录屏不必手动按键 */
    var idle = 0, dragging = false;
    window.addEventListener('pointerdown', function () { dragging = true; idle = 0; });
    window.addEventListener('pointerup', function () { dragging = false; idle = 0; });
    window.addEventListener('pointercancel', function () { dragging = false; });
    window.addEventListener('wheel', function () { idle = 0; }, { passive: true });
    setInterval(function () {
      if (DF.isTouring() || dragging) { idle = 0; return; }
      idle += 0.5;
      if (idle > 6) { idle = 0; DF.startTour(); }
    }, 500);
  }
  kick();
})();
