# 内燃机奥托定容理想循环 — 3D 交互式可视化

基于 **Vite + TypeScript + Three.js + ECharts** 构建的四冲程汽油机 **奥托定容理想循环 (Otto Cycle)** 交互式可视化教学工具。

## 在线演示

[https://1844514356zjc-dev.github.io/regen-rankine-3d/](https://1844514356zjc-dev.github.io/regen-rankine-3d/)

## 功能特性

- **直列四缸发动机 3D 模型** — 完整的四缸、活塞、连杆、曲轴、进排气门结构，金属材质渲染
- **四冲程时序动画** — 进气→压缩→做功→排气，1-3-4-2 点火顺序，曲柄连杆机构同步运动
- **双视图一键切换** — 完整发动机视图 / 剖面视图（clipping plane 真实切割，非透明效果）
- **动态工质流体** — 气缸内半透明流体跟随四冲程同步改变体积与颜色（低温蓝→高温红）
- **PV 热力图** — 标注 1-2-3-4 四个特征状态点，悬浮显示 P/V/T 精确数值
- **TS 温熵图** — 对应奥托循环四段热力过程曲线，闭合循环
- **参数实时调节** — 进气压强、进气温度、压缩比、定容比热容、发动机转速，滑块拖动实时联动 3D 模型和图表
- **全局暗色主题** — 黑色背景 + 浅色文字，图表暗色背景，清晰可读
- **键盘快捷键** — 空格播放/暂停，R 重置，V 切换视图

## 技术栈

| 技术 | 用途 |
|------|------|
| Vite 6 | 构建工具 |
| TypeScript 5 | 类型安全 |
| Three.js 0.170 | 3D 渲染引擎（含 clipping plane 剖面切割） |
| ECharts 5 | 热力曲线图（PV 图 / TS 图） |

## 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/1844514356zjc-dev/regen-rankine-3d.git
cd regen-rankine-3d

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器访问 http://localhost:3000
```

## 项目结构

```
regen-rankine-3d/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
└── src/
    ├── main.ts
    ├── App.ts                     # 垂直流式布局
    ├── styles/global.css          # 暗色主题全局样式
    ├── types/index.ts
    ├── store/parameters.ts        # 参数状态管理
    ├── modules/
    │   ├── renderer/
    │   │   ├── scene.ts           # 场景总控 + 四缸发动机 + 裁剪平面
    │   │   ├── cylinder.ts        # 单缸气缸体
    │   │   ├── piston.ts          # 活塞 + 连杆
    │   │   ├── valves.ts          # 进排气门
    │   │   ├── fluid.ts           # 工质流体
    │   │   └── controls.ts        # 相机控制
    │   └── thermodynamics/
    │       └── index.ts           # 奥托循环热力计算
    └── components/
        ├── SliderPanel/           # 参数滑块面板
        ├── ChartPanel/            # PV/TS 图表 (ECharts)
        ├── ControlBar/            # 播放/暂停/重置
        └── ViewToggle/            # 完整/剖面视图切换
```

## 奥托定容理想循环原理

奥托循环是四冲程火花塞点火式内燃机（汽油机）的理想热力循环模型：

### ① 1→2 等熵压缩
活塞从 BDC 上行至 TDC，工质绝热压缩，**PV^γ = const**，V↓ P↑ T↑ S=const

### ② 2→3 等容加热
火花塞点火，定容燃烧，**Q_in = Cv·(T₃−T₂)**，V=const P↑↑ T↑↑ S↑

### ③ 3→4 等熵膨胀
高温工质推动活塞下行至 BDC，对外做功，**PV^γ = const**，V↑ P↓ T↓ S=const

### ④ 4→1 等容放热
排气门开启，定容排出废气，V=const P↓ T↓ S↓ → 回到状态1

### 热效率
```
η = 1 − 1 / r^(γ−1)
```

## GitHub Pages 部署

```bash
# 构建生产版本
npm run build

# 推送后 GitHub Actions 自动部署
git push origin main
```

## 开源协议

MIT License