# DF-01 数字工厂 · digital-factory-3d

一个**离线可用的单文件三维作品**：剖切式新能源汽车总装车间，覆盖 立体库 → 冲压 → 焊装 → 涂装 → 总装 → 检测发运 全流程，含机器人 / AGV / 卡车动画、琥珀数据层与 SCADA HUD，支持点击巡检与 88.5 s 循环巡游。

- 产物：`digital-factory-3d.html`（单文件，three.js 内联，零外部请求，742 KB）
- 代码：`src-df/` 分片源码 + `shell.html` + `build-df.js`
- 提示词：`PROMPT-数字工厂.md`；构成分析见 `PROMPT-数字工厂-构成分析.md`
- 同格式续作：`PROMPT-3D航天火箭.md`（RX-01）

## 打开方式

直接双击 `digital-factory-3d.html`。断网、离线、`file://` 均可，首次渲染约 1–2 s（软件渲染环境下更慢）。

## 交互

| 操作 | 说明 |
| --- | --- |
| 拖拽 | 环绕旋转（极角限位 0.05–1.32） |
| 滚轮 / 双指 | 缩放 16–540 m |
| 单击 | 巡检：命中工位弹卡片，"飞近设备"做镜头过渡；命中分区则切换分区视角 |
| `1`–`6` | 六个分区视角 |
| `0` | 总览复位 |
| `L` / `D` | 标签 / 数据层 开关 |
| `Space` | 开始 / 停止巡游 |
| `H` | HUD 显隐 |
| `B` | 2.39:1 遮幅 |
| `F` | 全屏 |
| `Esc` | 关闭巡检卡 |

## URL 参数

| 参数 | 作用 |
| --- | --- |
| `?film=1` | 纯净录屏：隐藏 HUD / 标签 / 卡片，2.39:1 遮幅，自动巡游 |
| `?tour=1` | 直接进入巡游 |
| `?tourat=38` | 跳到巡游第 38 s |
| `?tourfast=1` | 巡游 0.4× 时长（快速审片） |
| `?instant=1` | 跳过开场 veil |
| `?raw=1` | 直出，关闭后处理（排查用） |
| `?lq=1` | 低画质：关 MSAA、降像素比与阴影贴图 |
| `?nolabels=1` / `?nodata=1` | 关闭标签 / 数据层 |
| `?debug=1` | 显示 fps / draw calls / triangles |
| `?view=Z03` | 直接进入分区视角 |
| `?tx=&ty=&tz=&azim=&elev=&dist=&fov=` | 指定相机 |

## 构建

```bash
cd digital-factory-3d
node build-df.js        # 输出 digital-factory-3d.html
```

`build-df.js` 把 `shell.html` 的 `/*__THREE__*/`、`/*__APP__*/` 两个占位替换为内联 three.js 与拼接后的 app 代码。three 使用 r149 UMD 构建（`vendor/three.classic.js`，608 KB，无 r150+ 弃用警告）。

## 源码结构

```
src-df/10-util.js      工具、材质库、合并几何器（Builder）、折线/纹理生成
src-df/20-studio.js    渲染器、影棚环境、三点光 + 顶灯、雾、地面
src-df/30-building.js  剖切厂房、结构、地面标线、布局常量 DF.L
src-df/40-process.js   冲压线、焊装、涂装、10 台车与操作工
src-df/45-logistics.js 立体库、堆垛机、卡车、叉车、AGV 环线
src-df/50-assembly.js  总装两条线、四类工位道具、EOL 光廊
src-df/60-data.js      分区轮廓、投影标签、能源/物料流、信标、包络盒
src-df/70-post.js      后处理：MSAA RT → 亮部 → 高斯 → ACES/颗粒/暗角
src-df/90-boot.js      相机 rig、巡游、SIM、HUD、交互、降级
shell.html             HUD 结构与样式
build-df.js            拼接与内联
qa-df/shot.js          Playwright 冒烟：截图 / console / 网络请求
```

## QA

```bash
node qa-df/shot.js      # 截图到 qa-df/shots/shot.png，并打印 calls/tris 与控制台日志
```

冒烟脚本会等待 `DF.__ready` 后截图，同时断言：无 `pageerror`、无外部网络请求。

## 已知取舍

- 产量、OEE、WIP、能耗为**演示数据**，由 SIM 状态机推导，非真实工厂数据。
- 巡游分镜的相机参数取自 `PROMPT-数字工厂.md` 第 8 节，1:1 落地。
- 软件渲染（无 GPU）下帧率读数不可信，性能预算以 `?debug=1` 的 calls/tris 为准。
