# EN-01 · 液氧煤油发动机 · 分解总装（单文件 3D）

一台 1200 kN 级液氧煤油发动机（燃气发生器循环）的离线 3D 数字样机：可把整机拆成 11 个部件，再原样装回去。两个成品都是单文件、零网络，双击即开。

| 成品 | 下载 | 说明 |
| --- | --- | --- |
| 交互巡检版 | [engine-3d.html](./engine-3d.html) | 完整 SCADA HUD，可点选部件、拖拽环绕、分解回装 |
| 纯净录屏版 | [engine-3d-film.html](./engine-3d-film.html) | 零 HUD，黑场淡入后自动电影巡游（32 s 循环），专为录屏 |

备用下载：交互版 https://aka.doubaocdn.com/s/z3WlGhuD6X ⋅ 纯净版 https://aka.doubaocdn.com/s/Fau4LSp5j9

> 两个 html 由 GitHub Actions 自动构建并提交（`vendor/three.classic.js` 不进仓，构建时现拉）。想本地重建：见下方「构建」。

## 特性

- 单文件离线：three.js r149 内联（608 KB），零网络请求
- 11 组可拆部件：喷管 / 燃烧室 / 喷注器 / 推力室头部 / 涡轮泵 / 燃气发生器 / 主阀组 / 摆动伺服 / 万向架 / 推进剂管路 / 传感器与电缆
- 连续分解量 `t ∈ [0,1]`：每件沿各自轴向位移，带 stagger 偏移与 `easeInOutCubic` 缓动，中途反向不会跳变
- 工业摄影棚灯光：程序化 PMREM 柔光箱 + 三点光 + 琥珀点光；半径 26 m 的地台用顶点色径向衰减，边缘自溶进黑场
- SCADA HUD：左侧部件清单、右侧零件规格卡（材料 / 尺寸 / 工况 / 作用）、11 条投影标注引线
- 透视模式（H）：外壳半透明，看到泵体流道、喷注器阵列、阀门内部
- 电影级巡游（P）：总装 → 动力头涡轮泵 → 十一部件分解 → 回装，32 s 匀速环绕无缝循环

## 操作（交互版）

| 键 | 作用 |
| --- | --- |
| Space | 分解 / 回装 |
| H | 透视 |
| L | 标注显隐 |
| P | 自动巡游 |
| 0 / R | 复位视角 |
| F | 全屏 |
| 1–9 | 直选部件 |
| 拖拽 / 滚轮 | 环绕 / 推拉 |

## 纯净版参数

- 默认：零 HUD + 自动巡游循环，鼠标静止 1.4 s 隐藏指针，拖动中断巡游后静止 6 s 自动续上
- `?bars=1` ：叠 2.39:1 遮幅，并自动放宽视角避免裁掉喷管
- `?dpr=2` ：Retina 级渲染
- `?hud=1` ：临时退回带 HUD 的交互模式

## 目录

```
engine-3d/
├─ engine-3d.html      交互巡检版成品（Actions 生成）
├─ engine-3d-film.html 纯净录屏版成品（Actions 生成）
├─ shell.html          HUD 外壳，含 /*__THREE__*/ 与 /*__APP__*/ 占位符
├─ build.js            shell + 模块 + vendor/three → engine-3d.html
├─ build-film.js       同上 + film 层 → engine-3d-film.html
├─ film.css / film.js  纯净层：隐藏 HUD / 黑场淡入 / 指针自动隐藏 / 遮幅
├─ src-en/             场景全部逻辑（按文件名顺序拼接）
│  ├─ 10-util.js       数学 / 调色板 / 材质 / 几何合并器 / 画布纹理
│  ├─ 12-tex.js        径向衰减纹理（地台溶解用）
│  ├─ 20-studio.js     影棚灯光 / PMREM 环境 / 地台与转台
│  ├─ 30-engine.js     11 组部件几何（喷管 lathe、240 喷嘴阵列、涡轮叶栅…）
│  ├─ 40-actions.js    分解 / 回装 / 选中高亮 / 透视（含连续 setSectionMix）
│  ├─ 50-ui.js         部件清单 / 规格卡 / 投影标注 / 控件绑定
│  ├─ 70-post.js       MSAA + Bloom + ACES + 暗角 + 静态颗粒 + 移轴
│  └─ 90-boot.js       渲染器 / 轨道相机 / 巡游四章 / 键盘 / 主循环
└─ vendor/             放 three.classic.js（r149 UMD，构建时下载，不入库）
```

## 构建

```bash
cd engine-3d
curl -L -o vendor/three.classic.js https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js
node build.js        # → engine-3d.html
node build-film.js   # → engine-3d-film.html
```

## 指标

46 draw call / 50,900 三角形 / 11 部件 / 0 报错 / 0 外部请求，桌面端 60 fps。
