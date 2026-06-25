// ============================================================
// 奥托定容理想循环 — 全局类型定义
// ============================================================

/** 四冲程阶段 */
export type StrokePhase = 'intake' | 'compression' | 'power' | 'exhaust';

/** 3D视图模式 */
export type ViewMode = 'full' | 'section';

/** 热力循环可调参数 */
export interface OttoParams {
  intakePressure: number;     // 初始进气压强 P1 (kPa)
  intakeTemp: number;         // 初始进气温度 T1 (K)
  compressionRatio: number;   // 压缩比 r = V1/V2
  cv: number;                 // 定容比热容 (kJ/(kg·K))
  rpm: number;                // 发动机转速 (rpm)
}

/** 奥托循环四个特征状态点 */
export interface CycleStatePoint {
  P: number; T: number; V: number; S: number;
  label: string;
}

/** 完整奥托循环计算结果 */
export interface OttoCycleResult {
  states: [CycleStatePoint, CycleStatePoint, CycleStatePoint, CycleStatePoint];
  pvData: [number, number][][];
  tsData: [number, number][][];
  qIn: number;
  efficiency: number;
  gamma: number;
}

/** 动画状态 */
export interface AnimationState {
  phase: StrokePhase;
  crankAngle: number;   // 0~4π 对应完整四冲程
  isPlaying: boolean;
}

/** 工质流体瞬时状态 */
export interface FluidState {
  volume: number;
  temperature: number;
  pressure: number;
  color: string;
}