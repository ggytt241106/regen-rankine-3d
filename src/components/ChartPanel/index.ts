// ============================================================
// 右侧图表面板 — PV图 + TS图 (ECharts 暗色专业主题)
// ============================================================
import * as echarts from 'echarts';
import { parameterStore } from '../../store/parameters';
import { computeOttoCycle } from '../../modules/thermodynamics';
import type { OttoCycleResult } from '../../types';

const BG = '#0c0c10';
const TEXT_COLOR = '#9a9aa8';
const AXIS_COLOR = 'rgba(255,255,255,0.12)';
const GRID_COLOR = 'rgba(255,255,255,0.04)';

// 循环过程色板
const C_COMPRESSION = '#5b8def';
const C_HEATING = '#e0556a';
const C_EXPANSION = '#f0a050';
const C_EXHAUST = '#4ec9a0';

export class ChartPanel {
  private pvChart: echarts.ECharts | null = null;
  private tsChart: echarts.ECharts | null = null;
  private unsub: (() => void) | null = null;

  constructor() {
    this.init();
    this.unsub = parameterStore.subscribe(() => this.updateCharts());
  }

  private init(): void {
    const pvDom = document.getElementById('pv-chart')!;
    const tsDom = document.getElementById('ts-chart')!;
    this.pvChart = echarts.init(pvDom, undefined, { renderer: 'canvas' });
    this.tsChart = echarts.init(tsDom, undefined, { renderer: 'canvas' });
    this.updateCharts();

    const ro = new ResizeObserver(() => {
      this.pvChart?.resize();
      this.tsChart?.resize();
    });
    ro.observe(pvDom);
    ro.observe(tsDom);
  }

  private updateCharts(): void {
    const cycle = computeOttoCycle(parameterStore.params);
    this.pvChart?.setOption(this.buildPVOption(cycle), { notMerge: true });
    this.tsChart?.setOption(this.buildTSOption(cycle), { notMerge: true });
  }

  private buildPVOption(cycle: OttoCycleResult): echarts.EChartsOption {
    const { pvData, states } = cycle;

    const segments = [
      { name: '1→2 等熵压缩', data: pvData[0], color: C_COMPRESSION },
      { name: '2→3 等容加热', data: pvData[1], color: C_HEATING },
      { name: '3→4 等熵膨胀', data: pvData[2], color: C_EXPANSION },
      { name: '4→1 等容放热', data: pvData[3], color: C_EXHAUST },
    ];

    const lines = segments.map(s => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: false,
      symbol: 'none',
      lineStyle: { color: s.color, width: 2.5 },
    }));

    const areas = segments.map(s => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: false,
      symbol: 'none',
      lineStyle: { color: s.color, width: 0 },
      areaStyle: { color: s.color, opacity: 0.08 },
      silent: true,
    }));

    const markers = states.map(st => ({
      name: st.label,
      coord: [st.V, st.P] as [number, number],
      value: `P=${st.P.toFixed(1)} kPa\nV=${st.V.toFixed(3)} m³/kg\nT=${st.T.toFixed(1)} K`,
      symbol: 'circle',
      symbolSize: 10,
      itemStyle: {
        color: '#ffffff',
        borderColor: '#1e1e28',
        borderWidth: 2.5,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.5)',
      },
      label: {
        show: true,
        position: 'top' as const,
        fontSize: 11,
        color: TEXT_COLOR,
        distance: 8,
      },
    }));

    return {
      title: {
        text: 'P-V 图',
        subtext: '奥托定容循环',
        left: 'center',
        top: 10,
        textStyle: { fontSize: 15, fontWeight: 600, color: '#d8d8e0' },
        subtextStyle: { fontSize: 11, color: TEXT_COLOR },
      },
      backgroundColor: BG,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(18,18,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { fontSize: 12, color: '#d8d8e0' },
        formatter: (p: any) =>
          p.seriesType === 'scatter'
            ? p.data.value.replace(/\n/g, '<br/>')
            : `V = ${p.data[0].toFixed(4)} m³/kg<br/>P = ${p.data[1].toFixed(1)} kPa`,
      },
      grid: { left: 64, right: 28, top: 54, bottom: 40 },
      xAxis: {
        name: '比容 V (m³/kg)',
        nameLocation: 'middle' as const,
        nameGap: 28,
        type: 'value',
        nameTextStyle: { color: TEXT_COLOR, fontSize: 12 },
        axisLine: { lineStyle: { color: AXIS_COLOR } },
        axisTick: { lineStyle: { color: AXIS_COLOR } },
        axisLabel: { color: TEXT_COLOR, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_COLOR, type: 'dashed' } },
      },
      yAxis: {
        name: '压强 P (kPa)',
        nameLocation: 'middle' as const,
        nameGap: 44,
        type: 'value',
        nameTextStyle: { color: TEXT_COLOR, fontSize: 12 },
        axisLine: { lineStyle: { color: AXIS_COLOR } },
        axisTick: { lineStyle: { color: AXIS_COLOR } },
        axisLabel: { color: TEXT_COLOR, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_COLOR, type: 'dashed' } },
      },
      series: [...lines, ...areas, { type: 'scatter', data: markers, z: 10 }],
      legend: {
        bottom: 6,
        textStyle: { fontSize: 11, color: TEXT_COLOR },
        itemWidth: 16,
        itemHeight: 3,
      },
    };
  }

  private buildTSOption(cycle: OttoCycleResult): echarts.EChartsOption {
    const { tsData, states } = cycle;

    const segments = [
      { name: '1→2 等熵压缩', data: tsData[0], color: C_COMPRESSION },
      { name: '2→3 等容加热', data: tsData[1], color: C_HEATING },
      { name: '3→4 等熵膨胀', data: tsData[2], color: C_EXPANSION },
      { name: '4→1 等容放热', data: tsData[3], color: C_EXHAUST },
    ];

    const lines = segments.map(s => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: false,
      symbol: 'none',
      lineStyle: { color: s.color, width: 2.5 },
    }));

    const areas = segments.map(s => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: false,
      symbol: 'none',
      lineStyle: { color: s.color, width: 0 },
      areaStyle: { color: s.color, opacity: 0.08 },
      silent: true,
    }));

    const markers = states.map(st => ({
      name: st.label,
      coord: [st.S, st.T] as [number, number],
      value: `T=${st.T.toFixed(1)} K\nS=${st.S.toFixed(3)} kJ/(kg·K)\nP=${st.P.toFixed(1)} kPa`,
      symbol: 'circle',
      symbolSize: 10,
      itemStyle: {
        color: '#ffffff',
        borderColor: '#1e1e28',
        borderWidth: 2.5,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.5)',
      },
      label: {
        show: true,
        position: 'top' as const,
        fontSize: 11,
        color: TEXT_COLOR,
        distance: 8,
      },
    }));

    return {
      title: {
        text: 'T-S 图',
        subtext: '奥托定容循环',
        left: 'center',
        top: 10,
        textStyle: { fontSize: 15, fontWeight: 600, color: '#d8d8e0' },
        subtextStyle: { fontSize: 11, color: TEXT_COLOR },
      },
      backgroundColor: BG,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(18,18,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { fontSize: 12, color: '#d8d8e0' },
        formatter: (p: any) =>
          p.seriesType === 'scatter'
            ? p.data.value.replace(/\n/g, '<br/>')
            : `S = ${p.data[0].toFixed(4)} kJ/(kg·K)<br/>T = ${p.data[1].toFixed(1)} K`,
      },
      grid: { left: 64, right: 28, top: 54, bottom: 40 },
      xAxis: {
        name: '熵 S (kJ/(kg·K))',
        nameLocation: 'middle' as const,
        nameGap: 28,
        type: 'value',
        nameTextStyle: { color: TEXT_COLOR, fontSize: 12 },
        axisLine: { lineStyle: { color: AXIS_COLOR } },
        axisTick: { lineStyle: { color: AXIS_COLOR } },
        axisLabel: { color: TEXT_COLOR, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_COLOR, type: 'dashed' } },
      },
      yAxis: {
        name: '温度 T (K)',
        nameLocation: 'middle' as const,
        nameGap: 44,
        type: 'value',
        nameTextStyle: { color: TEXT_COLOR, fontSize: 12 },
        axisLine: { lineStyle: { color: AXIS_COLOR } },
        axisTick: { lineStyle: { color: AXIS_COLOR } },
        axisLabel: { color: TEXT_COLOR, fontSize: 11 },
        splitLine: { lineStyle: { color: GRID_COLOR, type: 'dashed' } },
      },
      series: [...lines, ...areas, { type: 'scatter', data: markers, z: 10 }],
      legend: {
        bottom: 6,
        textStyle: { fontSize: 11, color: TEXT_COLOR },
        itemWidth: 16,
        itemHeight: 3,
      },
    };
  }

  dispose(): void {
    this.unsub?.();
    this.pvChart?.dispose();
    this.tsChart?.dispose();
  }
}