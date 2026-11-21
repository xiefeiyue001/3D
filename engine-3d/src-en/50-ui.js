/* ============================================================
   EN-01 · 50-ui —— 部件清单 / 详情卡 / 投影标注 / 控件绑定
   ============================================================ */
(function (DF) {
  'use strict';
  const T = THREE;

  const v = new T.Vector3();
  const listeners = {};

  DF.emit = function (type, payload) {
    (listeners[type] || []).forEach(fn => fn(payload));
  };
  DF.on = function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); };

  DF.buildUI = function () {
    const listEl = document.getElementById('partList');
    const labelRoot = document.getElementById('labels');
    const labels = [];

    DF.PARTS.forEach((grp, i) => {
      const d = grp.userData;
      const row = document.createElement('button');
      row.className = 'prow';
      row.innerHTML =
        '<i class="pnum">' + String(i + 1).padStart(2, '0') + '</i>' +
        '<span class="ptxt"><b>' + d.name + '</b><em>' + d.en + '</em></span>' +
        '<s class="pdot"></s>';
      row.addEventListener('click', () => { DF.selectPart(i, false); DF.emit('pick', i); });
      listEl.appendChild(row);

      // 投影标签
      const el = document.createElement('div');
      el.className = 'plabel';
      el.innerHTML = '<b>' + d.name + '</b><em>' + d.en + '</em><span class="pl-lead"></span>';
      labelRoot.appendChild(el);
      labels.push({ grp, el, row });
    });

    DF.labels = labels;
    DF._labelRoot = labelRoot;

    /* 详情卡 */
    const detail = document.getElementById('detail');
    const fillDetail = (idx) => {
      if (idx < 0) {
        detail.innerHTML = '<div class="d-empty"><b>未选中部件</b><span>点击模型或左侧清单，查看零件规格</span></div>';
        return;
      }
      const d = DF.PARTS[idx].userData;
      const info = d.info;
      detail.innerHTML =
        '<div class="d-top"><i>' + String(idx + 1).padStart(2, '0') + '</i><div><b>' + d.name +
        '</b><em>' + d.en + '</em></div></div>' +
        '<dl>' +
        '<dt>材料</dt><dd>' + info.mat + '</dd>' +
        '<dt>尺寸</dt><dd>' + info.size + '</dd>' +
        '<dt>工况</dt><dd>' + info.temp + '</dd>' +
        '<dt>作用</dt><dd class="d-func">' + info.func + '</dd>' +
        '</dl>';
    };
    fillDetail(-1);

    DF.on('select', (idx) => {
      fillDetail(idx);
      labels.forEach((L, i) => {
        L.row.classList.toggle('on', i === idx);
        L.el.classList.toggle('sel', i === idx);
      });
    });
    DF.on('pick', (idx) => { if (idx >= 0) DF.selectPart(idx, false); });

    /* 控件 */
    const range = document.getElementById('explodeRange');
    range.addEventListener('input', () => {
      DF.setExplode(+range.value / 100, false);
      DF.emit('range', +range.value);
    });

    const btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    btn('btnExplode', () => { DF.toggleExplode(); });
    btn('btnSection', () => { DF.setSection(!DF.state.section); });
    btn('btnLabels', () => { DF.setLabels(!DF._labelsOn); });
    btn('btnReset', () => { DF.resetView(); });
    btn('btnTour', () => { DF.toggleTour && DF.toggleTour(); });
    btn('btnFull', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });

    DF.setLabels = function (on) {
      DF._labelsOn = on;
      labelRoot.style.display = on ? '' : 'none';
      document.getElementById('btnLabels').classList.toggle('on', on);
    };
    DF.setLabels(true);

    // 投影标签更新（20 fps）
    let acc = 0;
    DF.updateLabels = function (dt, cam) {
      acc += dt;
      if (acc < 0.05) return;
      acc = 0;
      if (!DF._labelsOn) return;
      const W = window.innerWidth, H = window.innerHeight;
      const used = [];
      const show = DF.state.t > 0.25;
      labels.forEach((L, i) => {
        const grp = L.grp;
        const c = grp.userData.center.clone().applyMatrix4(grp.matrixWorld);
        v.copy(c).project(cam);
        let visible = show && v.z < 1;
        let x = (v.x * 0.5 + 0.5) * W;
        let y = (-v.y * 0.5 + 0.5) * H;
        if (x < 300 || x > W - 300 || y < 90 || y > H - 120) visible = false;
        if (visible) {
          const cw = 150, ch = 40;
          let lead = 10, placed = false;
          for (let k = 0; k < 5; k++) {
            const top = y - lead - ch;
            const hit = used.some(r => Math.abs(r.x - x) < cw && Math.abs(r.y - (top + ch / 2)) < ch + 6);
            if (!hit) { used.push({ x, y: top + ch / 2 }); placed = true; break; }
            lead += ch + 10;
          }
          visible = placed;
          if (placed) {
            L.el.style.left = x.toFixed(1) + 'px';
            L.el.style.top = y.toFixed(1) + 'px';
            L.el.style.transform = 'translate(-50%, calc(-100% - ' + lead + 'px))';
            L.el.style.setProperty('--lead', lead + 'px');
          }
        }
        L.el.style.opacity = visible ? 1 : 0;
      });
    };
  };

})(window.DF = window.DF || {});
