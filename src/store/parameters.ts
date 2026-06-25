// ============================================================
// 参数状态管理 — 全局热力参数 & 动画状态（发布-订阅模式）
// ============================================================
import type { OttoParams, AnimationState, StrokePhase } from '../types';

export const DEFAULT_PARAMS: OttoParams = {
  intakePressure: 100,
  intakeTemp: 300,
  compressionRatio: 10,
  cv: 0.718,
  rpm: 300,
};

export const PARAM_RANGES: Record<keyof OttoParams, { min: number; max: number; step: number }> = {
  intakePressure:   { min: 80,   max: 150,  step: 1 },
  intakeTemp:       { min: 260,  max: 400,  step: 1 },
  compressionRatio: { min: 6,    max: 14,   step: 0.1 },
  cv:               { min: 0.5,  max: 1.2,  step: 0.001 },
  rpm:              { min: 5,    max: 4000, step: 5 },
};

export const PARAM_LABELS: Record<keyof OttoParams, string> = {
  intakePressure: '初始进气压强',
  intakeTemp: '初始进气温度',
  compressionRatio: '压缩比',
  cv: '定容比热容 Cv',
  rpm: '发动机转速',
};

export const PARAM_UNITS: Record<keyof OttoParams, string> = {
  intakePressure: 'kPa',
  intakeTemp: 'K',
  compressionRatio: '',
  cv: 'kJ/(kg·K)',
  rpm: 'rpm',
};

class ParameterStore {
  params: OttoParams = { ...DEFAULT_PARAMS };
  animation: AnimationState = {
    phase: 'intake',
    crankAngle: 0,
    isPlaying: false,
  };

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  setParam<K extends keyof OttoParams>(key: K, value: OttoParams[K]): void {
    this.params[key] = value;
    this.notify();
  }

  resetParams(): void {
    this.params = { ...DEFAULT_PARAMS };
    this.notify();
  }

  setAnimation(partial: Partial<AnimationState>): void {
    Object.assign(this.animation, partial);
    this.notify();
  }

  getStrokePhase(angle: number): StrokePhase {
    const a = angle % (4 * Math.PI);
    if (a < Math.PI) return 'intake';
    if (a < 2 * Math.PI) return 'compression';
    if (a < 3 * Math.PI) return 'power';
    return 'exhaust';
  }
}

export const parameterStore = new ParameterStore();