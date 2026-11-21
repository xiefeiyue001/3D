# EN-01 · 液氧煤油发动机 · 分解总装（单文件 3D）

与根目录的 `digital-factory-3d.html` 完全不同的一套作品，单独放在 `engine-3d/` 目录：一台 1200 kN 级液氧煤油发动机（燃气发生器循环）的离线 3D 数字样机，可把整机拆成 11 个部件，再原样装回去。

在线预览（单文件成品）：https://aka.doubaocdn.com/s/ynBr6j9ajA

## 特性

- 单文件离线：three.js r149 内联（608 KB），零网络请求，双击 `engine-3d.html` 即可运行
- 11 组可拆部件：喷管 / 燃烧室 / 喷注器 / 推力室头部 / 涡轮泵 / 燃气发生器 / 主阀组 / 摆动伺服 / 万向架 / 推进剂管路 / 传感器与电缆
- 连续分解量 `t ∈ [0,1]`：每件沿各自轴向位移，带 stagger 偏移与 `easeInOutCubic` 缓动，反向即回装
- 工业摄影棚灯光：程序化 PMREM 柔光箱 + 三点光 + 琥珀点光，金属转台与发光环
- SCADA HUD：左侧部件清单、右侧零件规格卡（材料 / 尺寸 / 工况 / 作用）、11 条投影标注引线
- 透视模式（H）：外壳半透明，直接看到泵体流道、喷注器阵列、阀门内部
- 电影级巡游（P）：整体总装 → 分解 → 涡轮泵特写 → 回装，24 s 循环

## 操作

| 键 | 作用 |
| --- | --- |
| Space | 分解 / 回装 |
| H | 透视 |
| L | 标注显隐 |
| P | 自动巡游 |
| 0 | 复位视角 |
| F | 全屏 |
| 1–9 | 直选部件 |
| 拖拽 / 滚轮 | 环绕 / 推拉 |

## 目录

```
engine-3d/
├─ shell.html        HUD 外壳，含 /*__THREE__*/ 与 /*__APP__*/ 占位符
├─ build.js          shell + 7 个模块 + vendor/three → engine-3d.html
├─ src-en/           场景全部逻辑（按文件名顺序拼接）
│  ├─ 10-util.js     数学 / 调色板 / 材质 / 几何合并器 / 纹理
│  ├─ 20-studio.js   影棚灯光 / PMREM 环境 / 地台与转台
│  ├─ 30-engine.js   11 组部件几何（喷管 lathe、240 喷嘴阵列、涡轮叶栅…）
│  ├─ 40-actions.js  分解 / 回装 / 选中高亮 / 透视 / 射线拾取
│  ├─ 50-ui.js       部件清单 / 规格卡 / 投影标注 / 控件绑定
│  ├─ 70-post.js     MSAA + Bloom + ACES + 暗角 + 静态颗粒 + 移轴
│  └─ 90-boot.js     渲染器 / 轨道相机 / 巡游 / 键盘 / HUD
└─ vendor/           放 three.classic.js（r149 UMD，需自行下载）
```

## 构建

```bash
# three r149 UMD（仓库不内联，避免把 600 KB 二进制化后塞进 Git）
curl -L -o vendor/three.classic.js https://unpkg.com/three@0.149.0/build/three.min.js
node build.js   # 产出单文件 engine-3d.html
```

## 指标

46 draw call / 50,868 三角形 / 11 部件 / 0 报错 / 0 外部请求，桌面端 60 fps。
