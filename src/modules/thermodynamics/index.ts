// ============================================================
// 奥托定容理想循环 — 热力学计算模块
//   1→2 等熵压缩  2→3 等容加热  3→4 等熵膨胀  4→1 等容放热
// ============================================================
import type { OttoParams, OttoCycleResult } from '../../types';

const R_GAS = 0.287;     // 空气气体常数 kJ/(kg·K)
const Q_IN = 1250;        // 定容加热量 kJ/kg

export function computeOttoCycle(params: OttoParams): OttoCycleResult {
  const { intakePressure: P1, intakeTemp: T1, compressionRatio: r, cv } = params;
  const cp = cv + R_GAS;
  const gamma = cp / cv;

  const V1 = 1.0;
  const S1 = 0;

  // 状态2: 等熵压缩终点
  const V2 = V1 / r;
  const T2 = T1 * Math.pow(r, gamma - 1);
  const P2 = P1 * Math.pow(r, gamma);
  const S2 = S1;

  // 状态3: 等容加热终点
  const V3 = V2;
  const T3 = T2 + Q_IN / cv;
  const P3 = P2 * (T3 / T2);
  const S3 = S2 + cv * Math.log(T3 / T2);

  // 状态4: 等熵膨胀终点
  const V4 = V1;
  const T4 = T3 / Math.pow(r, gamma - 1);
  const P4 = P3 / Math.pow(r, gamma);
  const S4 = S3;

  const states = [
    { P: P1, T: T1, V: V1, S: S1, label: '1 进气终了' },
    { P: P2, T: T2, V: V2, S: S2, label: '2 压缩终了' },
    { P: P3, T: T3, V: V3, S: S3, label: '3 加热终了' },
    { P: P4, T: T4, V: V4, S: S4, label: '4 膨胀终了' },
  ] as [any, any, any, any];

  const efficiency = 1 - 1 / Math.pow(r, gamma - 1);
  const N = 60;

  const pvData: [number, number][][] = [
    curve(V1, V2, N, (v) => P1 * Math.pow(V1 / v, gamma)),
    vline(V2, P2, P3, N),
    curve(V2, V1, N, (v) => P3 * Math.pow(V2 / v, gamma)),
    vline(V1, P4, P1, N),
  ];

  const tsData: [number, number][][] = [
    vline(S1, T1, T2, N),
    curve(S2, S3, N, (s) => T2 * Math.exp((s - S2) / cv)),
    vline(S3, T3, T4, N),
    curve(S4, S1, N, (s) => T4 * Math.exp((s - S4) / cv)),
  ];

  return { states, pvData, tsData, qIn: Q_IN, efficiency, gamma };
}

function curve(x1: number, x2: number, n: number, fn: (x: number) => number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * (i / n);
    pts.push([x, fn(x)]);
  }
  return pts;
}

function vline(x: number, y1: number, y2: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push([x, y1 + (y2 - y1) * (i / n)]);
  return pts;
}

// ============================================================
// 运行时工质状态
// ============================================================
export function computeFluidState(
  params: OttoParams,
  cycle: OttoCycleResult,
  crankAngle: number,
): { volume: number; temperature: number; pressure: number } {
  const { compressionRatio: r } = params;
  const V1 = 1.0, V2 = V1 / r, Vstroke = V1 - V2;
  const gamma = cycle.gamma;
  const a = crankAngle % (4 * Math.PI);
  let volume: number, temperature: number, pressure: number;

  if (a < Math.PI) {
    const t = a / Math.PI;
    volume = V2 + t * Vstroke;
    temperature = params.intakeTemp;
    pressure = params.intakePressure;
  } else if (a < 2 * Math.PI) {
    const t = (a - Math.PI) / Math.PI;
    volume = V1 - t * Vstroke;
    temperature = params.intakeTemp * Math.pow(V1 / volume, gamma - 1);
    pressure = params.intakePressure * Math.pow(V1 / volume, gamma);
  } else if (a < 3 * Math.PI) {
    const t = (a - 2 * Math.PI) / Math.PI;
    volume = V2 + t * Vstroke;
    temperature = cycle.states[2].T * Math.pow(V2 / volume, gamma - 1);
    pressure = cycle.states[2].P * Math.pow(V2 / volume, gamma);
  } else {
    const t = (a - 3 * Math.PI) / Math.PI;
    volume = V1 - t * Vstroke;
    temperature = cycle.states[3].T - t * (cycle.states[3].T - params.intakeTemp);
    pressure = params.intakePressure;
  }
  return { volume, temperature, pressure };
}

export function temperatureToColor(T: number): string {
  const t = Math.max(0, Math.min(1, (T - 250) / 2750));
  let r: number, g: number, b: number;
  if (t < 0.33) { const s = t / 0.33; r = 0; g = Math.round(255 * s); b = 255; }
  else if (t < 0.66) { const s = (t - 0.33) / 0.33; r = Math.round(255 * s); g = 255; b = Math.round(255 * (1 - s)); }
  else { const s = (t - 0.66) / 0.34; r = 255; g = Math.round(255 * (1 - s)); b = 0; }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getCycleDescription(cycle: OttoCycleResult): string {
  const { states, efficiency, gamma, qIn } = cycle;
  const r = states[0].V / states[1].V;
  return [
    `<strong>奥托定容理想循环 (Otto Cycle)</strong> — 四冲程汽油机理论热力模型`,
    ``,
    `<span style="color:#6699ff">① 1→2 等熵压缩</span>: 活塞从BDC上行至TDC，工质绝热压缩，PV<sup>γ</sup>=const。`,
    `   V↓ P↑ T↑  (P₁=${states[0].P.toFixed(0)}→P₂=${states[1].P.toFixed(0)} kPa, T₁=${states[0].T.toFixed(0)}→T₂=${states[1].T.toFixed(0)} K)`,
    ``,
    `<span style="color:#ff5555">② 2→3 等容加热</span>: 火花塞点火，定容燃烧，Q<sub>in</sub>=${qIn.toFixed(0)} kJ/kg。`,
    `   V=const P↑↑ T↑↑  (P₂=${states[1].P.toFixed(0)}→P₃=${states[2].P.toFixed(0)} kPa, T₂=${states[1].T.toFixed(0)}→T₃=${states[2].T.toFixed(0)} K)`,
    ``,
    `<span style="color:#ffaa00">③ 3→4 等熵膨胀</span>: 高温工质推动活塞下行至BDC，对外做功，PV<sup>γ</sup>=const。`,
    `   V↑ P↓ T↓  (P₃=${states[2].P.toFixed(0)}→P₄=${states[3].P.toFixed(0)} kPa, T₃=${states[2].T.toFixed(0)}→T₄=${states[3].T.toFixed(0)} K)`,
    ``,
    `<span style="color:#44cc88">④ 4→1 等容放热</span>: 排气门开启，定容排出废气，回到初始状态。`,
    `   V=const P↓ T↓  (P₄=${states[3].P.toFixed(0)}→P₁=${states[0].P.toFixed(0)} kPa, T₄=${states[3].T.toFixed(0)}→T₁=${states[0].T.toFixed(0)} K)`,
    ``,
    `<b>热效率</b>: η = 1 − 1/r<sup>γ−1</sup> = <b>${(efficiency * 100).toFixed(1)}%</b>`,
    `(γ = Cp/Cv = ${gamma.toFixed(3)}, r = ${r.toFixed(1)})`,
  ].join('<br>');
}