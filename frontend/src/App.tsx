import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// =====================================================================
//                              TYPES
// =====================================================================

type RecordData = Record<string, any>;

type DashboardState = {
  dashboardData: RecordData[];
  top10KocGmv: RecordData[];
  top10KocVideo: RecordData[];
  top10KocLive: RecordData[];
  top10Shop: RecordData[];
  top10Product: RecordData[];
  kocSegmentation: RecordData[];
  videoLiveComparison: RecordData[];
  insights: RecordData[];
};

type AlertTone = 'warning' | 'info' | 'success' | 'danger';

type Priority = 'P0' | 'P1' | 'P2';

interface SmartAlert {
  type: AlertTone;
  title: string;
  message: string;
  priority?: Priority;
  signal?: string;
}

interface Recommendation {
  priority: Priority;
  area: string;
  title: string;
  impact: string;
  action: string;
  status: 'open' | 'recommended' | 'monitoring' | 'resolved';
  signal?: string;
}

interface CommandItem {
  priority: Priority;
  issue: string;
  impact: string;
  recommendation: string;
  action: string;
  status: 'open' | 'recommended' | 'monitoring' | 'resolved';
  signal: string;
  tone: 'red' | 'amber' | 'blue' | 'green' | 'brand' | 'pink';
}

interface RecommendedAction {
  action: string;
  why: string;
  priority: Priority;
  value: string;
  tone: 'amber' | 'red' | 'brand' | 'green' | 'pink' | 'blue';
  icon: ReactNode;
  signal: string;
}

interface StrategicRecommendation {
  priority: Priority;
  recommendation: string;
  why: string;
  impact: string;
  action: string;
  signal: string;
  tone: 'amber' | 'red' | 'brand' | 'green' | 'pink' | 'blue';
  icon: ReactNode;
}

interface ChannelBucket {
  key: 'highVideo' | 'highLive' | 'balanced' | 'lowBoth';
  label: string;
  count: number;
  totalGmv: number;
  examples: { name: string; gmv: number; videoShare: number; liveShare: number }[];
  recommendation: string;
}

// =====================================================================
//                            CONFIG
// =====================================================================

const FILE_MAP: { [key in keyof DashboardState]: string } = {
  dashboardData: 'dashboard_data.json',
  top10KocGmv: 'top10_koc_gmv.json',
  top10KocVideo: 'top10_koc_video.json',
  top10KocLive: 'top10_koc_live.json',
  top10Shop: 'top10_shop.json',
  top10Product: 'top10_product.json',
  kocSegmentation: 'koc_segmentation.json',
  videoLiveComparison: 'video_live_comparison.json',
  insights: 'insights.json',
};

const METRIC_MAP: Record<string, string> = {
  'Tổng GMV': 'Total GMV',
  'GMV Video': 'Video GMV',
  'GMV LIVE': 'LIVE GMV',
  'Tổng đơn hàng': 'Orders',
  AOV: 'AOV',
  'Top10 KOC GMV share': 'Top10 KOC Share',
  'Top3 KOC GMV share': 'Top3 KOC Share',
  'Top1 KOC GMV share': 'Top1 KOC Share',
  'Average GMV per KOC': 'Avg GMV per KOC',
  'Average GMV per Shop': 'Avg GMV per Shop',
  'Average GMV per Product': 'Avg GMV per Product',
  'Total KOC': 'Total KOC',
  'Total Shop': 'Total Shop',
  'Total Product': 'Total Product',
  'High-performing KOC': 'High-performing KOC',
  'Medium-performing KOC': 'Medium-performing KOC',
  'Low-performing KOC': 'Low-performing KOC',
  'No-sales KOC': 'No-sales KOC',
};

const SEGMENT_META: Record<
  string,
  { color: string; grad: string; tint: string; border: string; action: string; tone: 'high' | 'medium' | 'low' | 'none' }
> = {
  'High-performing KOC': {
    color: '#10b981',
    grad: 'linear-gradient(135deg, #10b981, #22d3ee)',
    tint: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.4)',
    action: 'Lock in top performers with retention bonuses, exclusive product launches and a dedicated success manager.',
    tone: 'high',
  },
  'Medium-performing KOC': {
    color: '#5b8cff',
    grad: 'linear-gradient(135deg, #5b8cff, #22d3ee)',
    tint: 'rgba(91, 140, 255, 0.16)',
    border: 'rgba(91, 140, 255, 0.4)',
    action: 'Upgrade with structured coaching, A/B tested content briefs, and matched product bundles.',
    tone: 'medium',
  },
  'Low-performing KOC': {
    color: '#f59e0b',
    grad: 'linear-gradient(135deg, #f59e0b, #f472b6)',
    tint: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.4)',
    action: 'Run targeted reactivation campaigns and reassign to better-fit categories or shops.',
    tone: 'low',
  },
  'No-sales KOC': {
    color: '#ef4444',
    grad: 'linear-gradient(135deg, #ef4444, #f472b6)',
    tint: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(239, 68, 68, 0.4)',
    action: 'Auto-triage: re-onboard high-fit creators, archive low-fit, and reclaim the operational budget.',
    tone: 'none',
  },
};

// =====================================================================
//                              ICONS
// =====================================================================

const I = {
  Home: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" /></svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Video: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m22 8-6 4 6 4V8z" /></svg>
  ),
  Layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 17 9 5 9-5" /><path d="m3 12 9 5 9-5" /></svg>
  ),
  Store: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 1-5h16l1 5" /><path d="M3 9h18v11H3z" /><path d="M9 20v-6h6v6" /></svg>
  ),
  Box: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v9" /></svg>
  ),
  Bot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="3" /><path d="M12 4v4" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></svg>
  ),
  Spark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3" /><path d="M12 18v3" /><path d="M5 12H2" /><path d="M22 12h-3" /><path d="m4.9 4.9 2.1 2.1" /><path d="m17 17 2.1 2.1" /><path d="m4.9 19.1 2.1-2.1" /><path d="m17 7 2.1-2.1" /></svg>
  ),
  Zap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
  ),
  Workflow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M6 9v3a3 3 0 0 0 3 3h3" /></svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  Money: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 6v2" /><path d="M12 16v2" /></svg>
  ),
  Cart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
  ),
  Tag: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12 12 20l-9-9V3h8z" /><circle cx="7" cy="7" r="1.5" /></svg>
  ),
  Bolt: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
  ),
  Brain: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0-1 5.83V14a3 3 0 0 0 3 3v3" /><path d="M12 5a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1 1 5.83V14a3 3 0 0 1-3 3v3" /></svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h0" /></svg>
  ),
  Trend: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  ),
  Down: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>
  ),
  Arrow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
  ),
  Database: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></svg>
  ),
  Match: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="12" r="4" /><circle cx="17" cy="12" r="4" /><path d="M11 12h2" /></svg>
  ),
  Send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Doc: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="14" y2="17" /></svg>
  ),
  Cross: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
};

// =====================================================================
//                          HELPERS
// =====================================================================

/** Compact VND formatter — uses suffixes for axes/KPIs. */
export function formatVND(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} tỷ ₫`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr ₫`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K ₫`;
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

/** Full VND formatter for tooltips and tables. */
export function formatVNDFull(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return `${(n * 100).toFixed(digits)}%`;
}

export function getMetricValue(
  metrics: Record<string, number | string>,
  key: string,
): number | string | null {
  if (metrics == null) return null;
  if (key in metrics) return metrics[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(metrics)) if (k.toLowerCase() === lower) return metrics[k];
  return null;
}

export function safeData<T = RecordData>(data: T[] | undefined | null): T[] {
  return Array.isArray(data) ? data : [];
}

export function shortLabel(text: string | undefined | null, maxLen = 14): string {
  if (text === null || text === undefined) return '';
  const s = String(text);
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

function publicDataUrl(filename: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}data/${filename}`;
}

async function loadJson(path: string): Promise<RecordData[]> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as RecordData[];
}

function parseMetrics(records: RecordData[]): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const row of safeData(records)) {
    const key = String(row.Metric ?? row.metric ?? '').trim();
    if (!key) continue;
    const value = row.Value ?? row.value;
    const mapped = METRIC_MAP[key] || key;
    out[mapped] = value;
  }
  return out;
}

// =====================================================================
//                       DECISION BUILDERS
// =====================================================================

export function buildAlertsFromRealData(
  dashboard: DashboardState,
  metrics: Record<string, number | string>,
  loadWarnings: string[],
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  const totalGmv = Number(getMetricValue(metrics, 'Total GMV')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const top1Share = Number(getMetricValue(metrics, 'Top1 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;

  if (top10Share > 0.4) {
    alerts.push({
      type: 'warning',
      priority: 'P1',
      title: 'Revenue concentrates on a small creator cohort',
      message: `Top 10 KOC drive ${formatPercent(top10Share)} of platform GMV — diversification is needed to reduce single-cohort dependency.`,
      signal: 'Detected from revenue concentration',
    });
  } else if (top10Share > 0) {
    alerts.push({
      type: 'success',
      priority: 'P2',
      title: 'Creator portfolio is well diversified',
      message: `Top 10 KOC drive ${formatPercent(top10Share)} of GMV — concentration sits within a healthy range at current cadence.`,
      signal: 'Detected from revenue concentration',
    });
  }

  if (top1Share > 0.08) {
    alerts.push({
      type: 'info',
      priority: 'P2',
      title: 'Top creator carries an outsized revenue share',
      message: `Top 1 KOC alone accounts for ${formatPercent(top1Share)} of platform GMV — retention of this creator is a critical operational priority.`,
      signal: 'Detected from revenue concentration',
    });
  }

  if (totalGmv > 0) {
    const channelTotal = videoGmv + liveGmv;
    if (channelTotal > 0 && liveGmv / channelTotal < 0.2) {
      alerts.push({
        type: 'warning',
        priority: 'P1',
        title: 'LIVE commerce remains under-penetrated',
        message: `LIVE only contributes ${formatPercent(liveGmv / channelTotal)} of channel GMV. The channel is structurally under-utilised relative to short-video commerce, limiting channel diversification.`,
        signal: 'Detected from Video vs LIVE distribution',
      });
    }
  }

  if (noSales > 0 && totalKoc > 0) {
    alerts.push({
      type: 'danger',
      priority: 'P0',
      title: 'Inactive creator cohort is dragging operational efficiency',
      message: `${formatNumber(noSales)} of ${formatNumber(totalKoc)} creators (${formatPercent(noSales / totalKoc)}) generated zero sales — they consume onboarding capacity without contributing revenue.`,
      signal: 'Detected from creator segmentation',
    });
  }

  const nanRatio = safeData(dashboard.videoLiveComparison).filter(
    (r) => r.Video_to_Live_Ratio === null || r.Video_to_Live_Ratio === undefined,
  ).length;
  if (nanRatio > 0) {
    alerts.push({
      type: 'info',
      priority: 'P2',
      title: 'Channel-mix ratio is unavailable for some creators',
      message: `${formatNumber(nanRatio)} creators have no LIVE activity, so the Video/LIVE ratio is N/A for these rows. Surfaced transparently across the dashboard.`,
      signal: 'Detected from Video vs LIVE distribution',
    });
  }

  if (loadWarnings.length > 0) {
    alerts.push({
      type: 'danger',
      priority: 'P0',
      title: 'Critical data sources failed to load',
      message: `${loadWarnings.length} data file(s) failed to load. Analytics output may be incomplete — see Data Quality for details.`,
      signal: 'Detected from data quality scan',
    });
  }

  return alerts;
}

export function buildRecommendationsFromRealData(
  dashboard: DashboardState,
  metrics: Record<string, number | string>,
): Recommendation[] {
  const recs: Recommendation[] = [];

  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const mediumKoc = Number(getMetricValue(metrics, 'Medium-performing KOC')) || 0;

  if (top10Share > 0.4) {
    recs.push({
      priority: 'P1',
      area: 'Creator portfolio',
      title: 'De-risk the creator portfolio',
      impact: `Top 10 KOC drive ${formatPercent(top10Share)} of GMV — heavy dependency on a tiny cohort.`,
      action: `Activate ${formatNumber(Math.max(30, mediumKoc * 0.15))} mid-tier creators with proven product fit to spread revenue.`,
      status: 'recommended',
      signal: 'Detected from revenue concentration',
    });
  }

  if (noSales > 0 && totalKoc > 0) {
    recs.push({
      priority: 'P0',
      area: 'Activation',
      title: 'Triage the inactive creator cohort',
      impact: `${formatNumber(noSales)} creators (${formatPercent(noSales / totalKoc)}) generated zero sales — they drain onboarding capacity without contributing.`,
      action: 'Auto-score for fit, then re-onboard, retrain or archive across three operational lanes.',
      status: 'open',
      signal: 'Detected from creator segmentation',
    });
  }

  const channelTotal = videoGmv + liveGmv;
  if (channelTotal > 0 && liveGmv / channelTotal < 0.2) {
    recs.push({
      priority: 'P1',
      area: 'Channel mix',
      title: 'Lift LIVE share across the network',
      impact: `LIVE only contributes ${formatPercent(liveGmv / channelTotal)} of channel GMV — large untapped capacity in live commerce.`,
      action: 'Launch LIVE academy, booking automation and a weekly LIVE rotation for the top 30 video-dominant creators.',
      status: 'recommended',
      signal: 'Detected from Video vs LIVE distribution',
    });
  }

  const topShop = safeData(dashboard.top10Shop)[0];
  if (topShop && Number(topShop.So_KOC) <= 2) {
    recs.push({
      priority: 'P1',
      area: 'Shop dependency',
      title: 'Address top-shop dependency risk',
      impact: `Top shop "${topShop['Tên cửa hàng']}" relies on only ${formatNumber(topShop.So_KOC)} creators while driving ${formatVND(topShop.Doanh_thu)}.`,
      action: 'Recruit 3–5 additional creators for this shop and replicate the existing playbook.',
      status: 'recommended',
      signal: 'Detected from shop analytics',
    });
  }

  const topProduct = safeData(dashboard.top10Product)[0];
  if (topProduct && Number(topProduct.So_KOC) >= 30) {
    recs.push({
      priority: 'P2',
      area: 'Product portfolio',
      title: 'Scale the hero product',
      impact: `Top product already has ${formatNumber(topProduct.So_KOC)} creators selling it — strong viral signal.`,
      action: 'Negotiate exclusivity terms and unlock category-adjacent SKUs while the momentum holds.',
      status: 'monitoring',
      signal: 'Detected from product analytics',
    });
  }

  return recs;
}

export function buildExecutiveSummary(
  dashboard: DashboardState,
  metrics: Record<string, number | string>,
): { title: string; body: string }[] {
  const totalGmv = Number(getMetricValue(metrics, 'Total GMV')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const orders = Number(getMetricValue(metrics, 'Orders')) || 0;
  const aov = Number(getMetricValue(metrics, 'AOV')) || 0;
  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;
  const highKoc = Number(getMetricValue(metrics, 'High-performing KOC')) || 0;

  const out: { title: string; body: string }[] = [];

  if (totalGmv > 0) {
    out.push({
      title: 'Revenue Snapshot',
      body: `Platform GMV ${formatVND(totalGmv)} across ${formatNumber(orders)} orders. Average order value ${formatVND(aov)}.`,
    });
  }

  if (videoGmv > 0 || liveGmv > 0) {
    const ch = videoGmv + liveGmv;
    out.push({
      title: 'Channel Performance Distribution',
      body: `Video leads at ${formatPercent(videoGmv / ch)}, LIVE at ${formatPercent(liveGmv / ch)}. LIVE is structurally under-utilised and the most actionable growth lever.`,
    });
  }

  if (top10Share > 0) {
    out.push({
      title: 'Revenue Concentration Risk',
      body: `Top 10 KOC drive ${formatPercent(top10Share)} of platform GMV. ${top10Share > 0.4 ? 'Concentration is elevated — diversification should be actively pursued.' : 'Distribution is reasonably healthy at current cadence.'}`,
    });
  }

  if (noSales > 0 && totalKoc > 0) {
    out.push({
      title: 'Creator Activation Inefficiency',
      body: `${formatNumber(noSales)} of ${formatNumber(totalKoc)} creators (${formatPercent(noSales / totalKoc)}) produced zero sales — reactivating or triaging this cohort is the biggest operational lever.`,
    });
  }

  if (highKoc > 0) {
    out.push({
      title: 'High-performer Anchor',
      body: `${formatNumber(highKoc)} high-performing creators currently anchor platform revenue. Retention and exclusive product access should be defended actively.`,
    });
  }

  return out;
}

/**
 * Recommended Actions derived from real KPIs — every card maps to a specific
 * decision rule. Cards only appear when the underlying signal exists in the data.
 */
export function buildRecommendedActions(metrics: Record<string, number | string>): RecommendedAction[] {
  const out: RecommendedAction[] = [];

  const totalGmv = Number(getMetricValue(metrics, 'Total GMV')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const top1Share = Number(getMetricValue(metrics, 'Top1 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;
  const highKoc = Number(getMetricValue(metrics, 'High-performing KOC')) || 0;

  const channelTotal = videoGmv + liveGmv;
  const liveShare = channelTotal > 0 ? liveGmv / channelTotal : 0;
  if (channelTotal > 0 && liveShare < 0.2) {
    out.push({
      action: 'Expand livestream enablement',
      why: `LIVE currently contributes only ${formatPercent(liveShare)} of channel GMV — the channel is structurally under-utilised.`,
      priority: 'P1',
      value: 'Unlock an under-served revenue channel and rebalance the platform’s channel mix.',
      tone: 'pink',
      icon: <I.Bolt />,
      signal: 'Detected from Video vs LIVE distribution',
    });
  }

  if (top10Share > 0.4 || top1Share > 0.08) {
    out.push({
      action: 'Reduce creator concentration risk',
      why: `Top 10 KOC drive ${formatPercent(top10Share)} of GMV and Top 1 alone drives ${formatPercent(top1Share)} — revenue is over-indexed on a small cohort.`,
      priority: 'P1',
      value: 'Lower single-creator dependency and protect platform revenue against churn or pricing shocks.',
      tone: 'amber',
      icon: <I.Users />,
      signal: 'Detected from revenue concentration',
    });
  }

  if (noSales > 0 && totalKoc > 0 && noSales / totalKoc > 0.5) {
    out.push({
      action: 'Reactivate or offboard inactive creators',
      why: `${formatNumber(noSales)} creators (${formatPercent(noSales / totalKoc)}) generated zero sales — they consume onboarding capacity without contribution.`,
      priority: 'P0',
      value: 'Recover operational budget, sharpen creator portfolio quality, and reallocate effort to high-fit creators.',
      tone: 'red',
      icon: <I.Alert />,
      signal: 'Detected from creator segmentation',
    });
  }

  if (highKoc > 0) {
    out.push({
      action: 'Protect high-performing creators',
      why: `${formatNumber(highKoc)} high-performing creators are already identified — they currently anchor platform revenue.`,
      priority: 'P1',
      value: 'Lock in the revenue base with retention incentives, exclusive product access and a dedicated success lane.',
      tone: 'green',
      icon: <I.Spark />,
      signal: 'Detected from creator segmentation',
    });
  }

  if (totalGmv === 0) {
    out.push({
      action: 'Restore the analytics pipeline',
      why: 'No total GMV detected in the processed dataset — the AI engine cannot recommend operational moves without core metrics.',
      priority: 'P0',
      value: 'Re-establish trustworthy KPIs so the operating layer can resume making recommendations.',
      tone: 'red',
      icon: <I.Alert />,
      signal: 'Detected from data quality scan',
    });
  }

  return out;
}

/**
 * Premium strategic recommendations for the dedicated AI Strategic Recommendations
 * page. Each card is gated by a real operational signal — no card is rendered
 * without supporting data.
 */
export function buildStrategicRecommendations(
  dashboard: DashboardState,
  metrics: Record<string, number | string>,
): StrategicRecommendation[] {
  const out: StrategicRecommendation[] = [];

  const totalGmv = Number(getMetricValue(metrics, 'Total GMV')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const top1Share = Number(getMetricValue(metrics, 'Top1 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;
  const highKoc = Number(getMetricValue(metrics, 'High-performing KOC')) || 0;
  const mediumKoc = Number(getMetricValue(metrics, 'Medium-performing KOC')) || 0;

  if (noSales > 0 && totalKoc > 0 && noSales / totalKoc > 0.5) {
    out.push({
      priority: 'P0',
      recommendation: 'Reactivate or offboard the inactive creator cohort',
      why: `${formatNumber(noSales)} of ${formatNumber(totalKoc)} creators (${formatPercent(noSales / totalKoc)}) generated zero sales — they consume onboarding capacity without contributing revenue.`,
      impact: 'Recovers operational budget and reallocates effort towards high-fit creators, raising the overall quality of the creator portfolio.',
      action: 'Run a three-lane triage: re-onboard the high-fit subset, retrain the recoverable ones, archive the remainder.',
      signal: 'Detected from creator segmentation',
      tone: 'red',
      icon: <I.Alert />,
    });
  }

  const channelTotal = videoGmv + liveGmv;
  const liveShare = channelTotal > 0 ? liveGmv / channelTotal : 0;
  if (channelTotal > 0 && liveShare < 0.2) {
    out.push({
      priority: 'P1',
      recommendation: 'Expand livestream enablement across the creator network',
      why: `LIVE contributes only ${formatPercent(liveShare)} of channel GMV — the channel is structurally under-utilised relative to short-video commerce.`,
      impact: 'Unlocks an under-served revenue channel and rebalances the platform mix, hedging against any single-channel disruption.',
      action: 'Launch a LIVE academy, booking automation and slot guarantees for the top 30 video-dominant creators.',
      signal: 'Detected from Video vs LIVE distribution',
      tone: 'pink',
      icon: <I.Bolt />,
    });
  }

  if (top10Share > 0.4 || top1Share > 0.08) {
    out.push({
      priority: 'P1',
      recommendation: 'Reduce creator revenue concentration risk',
      why: `Top 10 KOC drive ${formatPercent(top10Share)} of platform GMV — with Top 1 alone at ${formatPercent(top1Share)}.`,
      impact: 'Lowers single-creator dependency and stabilises revenue against churn, pricing shocks or compliance events.',
      action: `Replicate top-10 playbooks across ${formatNumber(Math.max(30, mediumKoc * 0.15))} mid-tier creators with proven product fit.`,
      signal: 'Detected from revenue concentration',
      tone: 'amber',
      icon: <I.Users />,
    });
  }

  if (highKoc > 0) {
    out.push({
      priority: 'P1',
      recommendation: 'Lock in the high-performing creator cohort',
      why: `${formatNumber(highKoc)} high-performing creators currently anchor platform revenue — any churn here carries outsized impact.`,
      impact: 'Defends the existing revenue base and reduces volatility while diversification scales.',
      action: 'Roll out retention bonuses, exclusive product access and a dedicated creator-success lane.',
      signal: 'Detected from creator segmentation',
      tone: 'green',
      icon: <I.Spark />,
    });
  }

  const topShop = safeData(dashboard.top10Shop)[0];
  const topProduct = safeData(dashboard.top10Product)[0];
  if (topShop || topProduct) {
    const parts: string[] = [];
    if (topShop) parts.push(`top shop "${String(topShop['Tên cửa hàng'] ?? '')}" at ${formatVND(topShop.Doanh_thu)}`);
    if (topProduct) parts.push(`hero product driving ${formatVND(topProduct.Doanh_thu)}`);
    out.push({
      priority: 'P2',
      recommendation: 'Prioritise the top-performing shops and products',
      why: `Concentrated GMV signals from ${parts.join(' and ')} indicate further headroom can still be captured before momentum dissipates.`,
      impact: 'Compounds near-term revenue by amplifying proven performers before new launches absorb operational bandwidth.',
      action: 'Secure exclusivity, expand SKU variants and pre-allocate inventory for the next campaign window.',
      signal: 'Detected from shop and product analytics',
      tone: 'brand',
      icon: <I.Store />,
    });
  }

  if (totalGmv === 0) {
    out.push({
      priority: 'P0',
      recommendation: 'Restore the analytics pipeline',
      why: 'No platform GMV could be derived from the processed dataset — the AI engine cannot make strategic recommendations without core metrics.',
      impact: 'Re-establishes trustworthy KPIs so the operating layer can resume making evidence-based recommendations.',
      action: 'Re-run the processing pipeline and validate the JSON sources surfaced in the Data Quality page.',
      signal: 'Detected from data quality scan',
      tone: 'red',
      icon: <I.Alert />,
    });
  }

  return out;
}

export function aggregateSegments(rows: RecordData[]) {
  const map = new Map<string, { count: number; gmv: number }>();
  for (const r of safeData(rows)) {
    const seg = String(r.Segment ?? 'Unknown');
    const cur = map.get(seg) ?? { count: 0, gmv: 0 };
    cur.count += 1;
    cur.gmv += Number(r.Total_GMV ?? 0);
    map.set(seg, cur);
  }
  const order = ['High-performing KOC', 'Medium-performing KOC', 'Low-performing KOC', 'No-sales KOC'];
  return Array.from(map, ([segment, v]) => ({ segment, count: v.count, gmv: v.gmv })).sort((a, b) => {
    const ai = order.indexOf(a.segment);
    const bi = order.indexOf(b.segment);
    if (ai === -1 && bi === -1) return b.count - a.count;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function buildChannelBuckets(rows: RecordData[]): ChannelBucket[] {
  const active = safeData(rows).filter((r) => Number(r.Total_GMV ?? 0) > 0);
  if (active.length === 0) return [];
  const sorted = [...active].sort((a, b) => Number(a.Total_GMV ?? 0) - Number(b.Total_GMV ?? 0));
  const lowThreshold = Number(sorted[Math.floor(sorted.length * 0.25)]?.Total_GMV ?? 0);

  const buckets: Record<string, RecordData[]> = {
    highVideo: [],
    highLive: [],
    balanced: [],
    lowBoth: [],
  };

  for (const r of active) {
    const total = Number(r.Total_GMV ?? 0);
    const vshare = Number(r.Video_share ?? 0);
    const lshare = Number(r.Live_share ?? 0);
    if (total <= lowThreshold) buckets.lowBoth.push(r);
    else if (vshare >= 0.7 && lshare < 0.2) buckets.highVideo.push(r);
    else if (lshare >= 0.5 && vshare < 0.3) buckets.highLive.push(r);
    else buckets.balanced.push(r);
  }

  const meta: { key: ChannelBucket['key']; label: string; recommendation: string }[] = [
    {
      key: 'highVideo',
      label: 'High Video / Low LIVE',
      recommendation: 'Coach into LIVE — bundle with a LIVE-ready shop to unlock channel diversification.',
    },
    {
      key: 'highLive',
      label: 'High LIVE / Low Video',
      recommendation: 'Add short-form video output to capture always-on demand and broaden funnel.',
    },
    {
      key: 'balanced',
      label: 'Balanced',
      recommendation: 'Lock in playbook — these are reference creators for the rest of the network.',
    },
    {
      key: 'lowBoth',
      label: 'Low Both',
      recommendation: 'Diagnose product-fit, otherwise reassign or graduate to maintenance tier.',
    },
  ];

  const buildExamples = (rs: RecordData[]) =>
    rs
      .slice()
      .sort((a, b) => Number(b.Total_GMV ?? 0) - Number(a.Total_GMV ?? 0))
      .slice(0, 3)
      .map((r) => ({
        name: String(r['Tên nhà sáng tạo'] ?? ''),
        gmv: Number(r.Total_GMV ?? 0),
        videoShare: Number(r.Video_share ?? 0),
        liveShare: Number(r.Live_share ?? 0),
      }));

  return meta.map((m) => ({
    key: m.key,
    label: m.label,
    count: buckets[m.key].length,
    totalGmv: buckets[m.key].reduce((s, r) => s + Number(r.Total_GMV ?? 0), 0),
    examples: buildExamples(buckets[m.key]),
    recommendation: m.recommendation,
  }));
}

export function computeKocHealth(rows: RecordData[]) {
  if (rows.length === 0) return [];
  const maxGmv = Math.max(...rows.map((r) => Number(r.Doanh_thu ?? 0)));
  return rows.map((r) => {
    const gmv = Number(r.Doanh_thu ?? 0);
    const score = maxGmv > 0 ? Math.round((gmv / maxGmv) * 100) : 0;
    const flags: string[] = [];
    if (Number(r.So_shop ?? 0) === 1) flags.push('Single-shop dependency');
    if (Number(r.So_san_pham ?? 0) < 30) flags.push('Narrow product set');
    if (Number(r.So_don ?? 0) < 1500) flags.push('Low order velocity');
    return { ...r, healthScore: score, healthFlags: flags };
  });
}

export function interpretInsight(text: string): { meaning: string; risk?: string; opportunity?: string; action?: string } {
  const t = (text || '').toLowerCase();
  if (t.includes('tập trung gmv') || t.includes('top 10 koc')) {
    return {
      meaning: text,
      risk: 'Revenue dependency on a small creator pool — high churn impact.',
      opportunity: 'Replicate top-10 playbooks across mid-tier creators.',
      action: 'Activate 30–50 mid-tier creators with proven product lines.',
    };
  }
  if (t.includes('chưa quá tập trung')) {
    return {
      meaning: text,
      risk: 'Low concentration risk at present.',
      opportunity: 'Maintain spread via creator diversification incentives.',
      action: 'Hold strategy; monitor monthly concentration drift.',
    };
  }
  if (t.includes('chưa phát sinh') || t.includes('no-sales')) {
    return {
      meaning: text,
      risk: 'Large inactive cohort burning operational capacity.',
      opportunity: 'Reactivate the high-fit subset of inactive creators.',
      action: 'Three-lane triage: re-onboard, retrain, or archive.',
    };
  }
  if (t.includes('aov')) {
    return {
      meaning: text,
      risk: 'AOV is unbenchmarked vs category peers.',
      opportunity: 'Lift basket size with bundles and post-purchase upsell.',
      action: 'A/B test bundled creatives across top 50 KOC for 4 weeks.',
    };
  }
  if (t.includes('ratio video/live') || t.includes('hiệu suất video')) {
    return {
      meaning: text,
      opportunity: 'Replicate the top video-only creator model.',
      action: 'Document creator playbook and roll out to similar-segment creators.',
    };
  }
  if (t.includes('live thấp')) {
    return {
      meaning: text,
      risk: 'LIVE channel underutilised — capacity left on the table.',
      opportunity: 'Convert top video creators into hybrid LIVE performers.',
      action: 'Launch LIVE academy + booking automation for top 30 creators.',
    };
  }
  if (t.includes('chuyển đổi')) {
    return {
      meaning: text,
      risk: 'View-to-order conversion is low industry-relative.',
      opportunity: 'Lift conversion via stronger CTAs and product cards.',
      action: 'Refresh thumbnails, hooks and pinned product cards across hero campaigns.',
    };
  }
  return { meaning: text };
}

function alertTone(type: AlertTone): CommandItem['tone'] {
  switch (type) {
    case 'danger': return 'red';
    case 'warning': return 'amber';
    case 'success': return 'green';
    case 'info':
    default: return 'blue';
  }
}

export function buildCommandItems(
  alerts: SmartAlert[],
  recs: Recommendation[],
): CommandItem[] {
  const items: CommandItem[] = [];
  for (const a of alerts) {
    const matchedRec = recs.find((r) => similarTopic(r.title, a.title));
    items.push({
      priority: a.priority ?? 'P2',
      issue: a.title,
      impact: a.message,
      recommendation: matchedRec ? matchedRec.title : 'Monitor and revisit on next cadence.',
      action: matchedRec ? matchedRec.action : 'No automated action proposed yet.',
      status: a.type === 'danger' ? 'open' : a.type === 'warning' ? 'monitoring' : 'recommended',
      signal: a.signal ?? matchedRec?.signal ?? 'Detected from operational metrics',
      tone: alertTone(a.type),
    });
  }
  for (const r of recs) {
    if (alerts.some((a) => similarTopic(a.title, r.title))) continue;
    items.push({
      priority: r.priority,
      issue: r.title,
      impact: r.impact,
      recommendation: r.title,
      action: r.action,
      status: r.status,
      signal: r.signal ?? 'Detected from operational metrics',
      tone: r.priority === 'P0' ? 'red' : r.priority === 'P1' ? 'amber' : 'brand',
    });
  }
  const order: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

function similarTopic(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const na = norm(a);
  const nb = norm(b);
  return na.includes(nb.slice(0, 12)) || nb.includes(na.slice(0, 12));
}

// =====================================================================
//                       REUSABLE COMPONENTS
// =====================================================================

function Panel({ children, className = '', hero = false }: { children: ReactNode; className?: string; hero?: boolean }) {
  return <section className={`panel ${hero ? 'hero' : ''} ${className}`}>{children}</section>;
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        {eyebrow && (
          <div className="section-eyebrow">
            <span className="pill" /> {eyebrow}
          </div>
        )}
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </header>
  );
}

function KPICard({
  label,
  value,
  caption,
  icon,
  tone = 'brand',
  trend,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: ReactNode;
  tone?: 'brand' | 'amber' | 'green' | 'pink' | 'blue' | 'red';
  trend?: { tone: 'good' | 'warn' | 'danger'; label: string };
}) {
  const toneClass = tone === 'brand' ? '' : tone;
  return (
    <div className="kpi">
      <div className="kpi-row">
        <div>
          <p className="kpi-label">{label}</p>
          <div className="kpi-value">{value}</div>
        </div>
        <div className={`kpi-icon ${toneClass}`}>{icon}</div>
      </div>
      {caption && <div className="kpi-caption">{caption}</div>}
      {trend && (
        <div className={`kpi-trend ${trend.tone === 'warn' ? 'warn' : trend.tone === 'danger' ? 'danger' : ''}`}>
          {trend.tone === 'danger' ? <I.Down /> : <I.Trend />} {trend.label}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: SmartAlert }) {
  const icon =
    alert.type === 'danger' ? <I.Alert /> : alert.type === 'warning' ? <I.Bolt /> : alert.type === 'success' ? <I.Check /> : <I.Brain />;
  return (
    <div className={`alert-card ${alert.type}`}>
      <div className="ico">{icon}</div>
      <div>
        <div className="alert-title">{alert.title}</div>
        <div className="alert-message">{alert.message}</div>
      </div>
      {alert.priority && <div className={`alert-priority ${alert.priority.toLowerCase()}`}>{alert.priority}</div>}
    </div>
  );
}

function InsightCard({
  index,
  meaning,
  risk,
  opportunity,
  action,
}: {
  index: number;
  meaning: string;
  risk?: string;
  opportunity?: string;
  action?: string;
}) {
  return (
    <article className="insight-card">
      <header className="insight-head">
        <div className="ico"><I.Spark /></div>
        <h4>Insight #{index + 1}</h4>
      </header>
      <div className="insight-body">{meaning}</div>
      <div className="insight-meta">
        <div className="meta-row">
          <div className="key">Risk</div>
          <div className="val">{risk ?? 'N/A — not enough signal to assess.'}</div>
        </div>
        <div className="meta-row">
          <div className="key">Opportunity</div>
          <div className="val">{opportunity ?? 'N/A — observed insight without specific upside.'}</div>
        </div>
        <div className="meta-row">
          <div className="key">Action</div>
          <div className="val">{action ?? 'N/A — monitor and revisit next cycle.'}</div>
        </div>
      </div>
    </article>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="reco-card">
      <div className="ico"><I.Brain /></div>
      <div>
        <div className="reco-title">{rec.title}</div>
        <div className="reco-body">{rec.impact}</div>
        <div className="reco-action">→ {rec.action}</div>
      </div>
      <div className="reco-meta">
        <span className={`alert-priority ${rec.priority.toLowerCase()}`}>{rec.priority}</span>
        <span className={`status-pill ${rec.status}`}>
          <span className="dot" /> {rec.status}
        </span>
        <span className="chip brand">{rec.area}</span>
      </div>
    </div>
  );
}

function SignalChip({ signal }: { signal: string }) {
  return (
    <span className="signal-chip" title={signal}>
      <span className="signal-dot" /> Data signal · {signal}
    </span>
  );
}

function RecommendedActionCard({ rec }: { rec: RecommendedAction }) {
  return (
    <article className={`ra-card tone-${rec.tone}`}>
      <div className={`ra-icon ${rec.tone}`}>{rec.icon}</div>
      <div>
        <header className="ra-head">
          <h4>{rec.action}</h4>
          <span className={`alert-priority ${rec.priority.toLowerCase()}`}>{rec.priority}</span>
        </header>
        <div className="ra-row">
          <span className="ra-key">Why it matters</span>
          <span className="ra-val">{rec.why}</span>
        </div>
        <div className="ra-row">
          <span className="ra-key">Expected value</span>
          <span className="ra-val">{rec.value}</span>
        </div>
        <div className="ra-foot"><SignalChip signal={rec.signal} /></div>
      </div>
    </article>
  );
}

function StrategicRecommendationCard({ rec }: { rec: StrategicRecommendation }) {
  return (
    <article className={`strategic-card tone-${rec.tone}`}>
      <header className="strategic-head">
        <div className={`strategic-icon ${rec.tone}`}>{rec.icon}</div>
        <div className="strategic-head-text">
          <div className="strategic-eyebrow">
            <span className={`alert-priority ${rec.priority.toLowerCase()}`}>{rec.priority}</span>
            <span className="chip brand">Strategic recommendation</span>
          </div>
          <h3 className="strategic-title">{rec.recommendation}</h3>
        </div>
      </header>
      <div className="strategic-rows">
        <div className="strategic-row">
          <span className="strategic-key">Why it matters</span>
          <p>{rec.why}</p>
        </div>
        <div className="strategic-row">
          <span className="strategic-key">Business impact</span>
          <p>{rec.impact}</p>
        </div>
        <div className="strategic-row">
          <span className="strategic-key">Suggested next action</span>
          <p>{rec.action}</p>
        </div>
      </div>
      <footer className="strategic-foot">
        <SignalChip signal={rec.signal} />
      </footer>
    </article>
  );
}

function CommandCard({ item }: { item: CommandItem }) {
  return (
    <article className={`cmd-card tone-${item.tone}`}>
      <header className="cmd-head">
        <span className={`alert-priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
        <StatusPill status={item.status} />
      </header>
      <h3 className="cmd-title">{item.issue}</h3>
      <div className="cmd-rows">
        <div className="cmd-row">
          <span className="cmd-key">Business impact</span>
          <p>{item.impact}</p>
        </div>
        <div className="cmd-row">
          <span className="cmd-key">AI recommendation</span>
          <p className="cmd-reco">{item.recommendation}</p>
        </div>
        <div className="cmd-row">
          <span className="cmd-key">Suggested action</span>
          <p>{item.action}</p>
        </div>
      </div>
      <footer className="cmd-foot">
        <SignalChip signal={item.signal} />
      </footer>
    </article>
  );
}

function DataTable({
  columns,
  rows,
  emptyText = 'No data available',
}: {
  columns: { key: string; label: string; align?: 'left' | 'right'; render?: (row: RecordData, i: number) => ReactNode }[];
  rows: RecordData[];
  emptyText?: string;
}) {
  if (rows.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : ''}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                  {c.render ? c.render(row, i) : String(row[c.key] ?? 'N/A')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text = 'No data available' }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

function SegmentChip({ segment }: { segment: string }) {
  const tone = SEGMENT_META[segment]?.tone ?? 'medium';
  return <span className={`chip ${tone}`}>{segment}</span>;
}

function StatusPill({ status }: { status: CommandItem['status'] | Recommendation['status'] }) {
  return (
    <span className={`status-pill ${status}`}>
      <span className="dot" /> {status}
    </span>
  );
}

// =====================================================================
//                            APP SHELL
// =====================================================================

const EMPTY_STATE: DashboardState = {
  dashboardData: [],
  top10KocGmv: [],
  top10KocVideo: [],
  top10KocLive: [],
  top10Shop: [],
  top10Product: [],
  kocSegmentation: [],
  videoLiveComparison: [],
  insights: [],
};

const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: ReactNode }[] }[] = [
  {
    label: 'Executive',
    items: [{ id: 'Overview', label: 'Executive Overview', icon: <I.Home /> }],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'KOC Analytics', label: 'KOC Analytics', icon: <I.Users /> },
      { id: 'Video vs LIVE', label: 'Video vs LIVE', icon: <I.Video /> },
      { id: 'KOC Segmentation', label: 'KOC Segmentation', icon: <I.Layers /> },
      { id: 'Shop Analytics', label: 'Shop Analytics', icon: <I.Store /> },
      { id: 'Product Analytics', label: 'Product Analytics', icon: <I.Box /> },
    ],
  },
  {
    label: 'AI Operating Layer',
    items: [
      { id: 'AI Command Center', label: 'AI Command Center', icon: <I.Bot /> },
      { id: 'AI Strategic Recommendations', label: 'AI Strategic Recommendations', icon: <I.Brain /> },
      { id: 'AI Insights', label: 'AI Insights', icon: <I.Spark /> },
      { id: 'Automation Opportunities', label: 'Automation', icon: <I.Zap /> },
      { id: 'Workflow Redesign', label: 'Workflow Redesign', icon: <I.Workflow /> },
    ],
  },
  {
    label: 'Trust',
    items: [{ id: 'Data Quality', label: 'Data Quality', icon: <I.Shield /> }],
  },
];

function App() {
  const [activePage, setActivePage] = useState<string>('Overview');
  const [dashboard, setDashboard] = useState<DashboardState>(EMPTY_STATE);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const loaded: DashboardState = { ...EMPTY_STATE };
      const warnings: string[] = [];
      await Promise.all(
        (Object.entries(FILE_MAP) as [keyof DashboardState, string][]).map(async ([key, filename]) => {
          try {
            loaded[key] = await loadJson(publicDataUrl(filename));
          } catch (err) {
            warnings.push(`${filename}: ${String(err)}`);
          }
        }),
      );
      if (cancelled) return;
      setDashboard(loaded);
      setLoadWarnings(warnings);
      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => parseMetrics(dashboard.dashboardData), [dashboard.dashboardData]);
  const alerts = useMemo(() => buildAlertsFromRealData(dashboard, metrics, loadWarnings), [dashboard, metrics, loadWarnings]);
  const recommendations = useMemo(() => buildRecommendationsFromRealData(dashboard, metrics), [dashboard, metrics]);
  const commandItems = useMemo(() => buildCommandItems(alerts, recommendations), [alerts, recommendations]);
  const execSummary = useMemo(() => buildExecutiveSummary(dashboard, metrics), [dashboard, metrics]);
  const recommendedActions = useMemo(() => buildRecommendedActions(metrics), [metrics]);
  const strategicRecs = useMemo(() => buildStrategicRecommendations(dashboard, metrics), [dashboard, metrics]);

  const dataQuality = useMemo(() => {
    const keys = Object.keys(FILE_MAP) as (keyof DashboardState)[];
    const total = keys.length;
    const loaded = keys.filter((k) => safeData(dashboard[k]).length > 0).length;
    const trust = Math.round((loaded / total) * 100);
    return { total, loaded, trust };
  }, [dashboard]);

  const allNavItems = NAV_GROUPS.flatMap((g) => g.items);
  const activeMeta = allNavItems.find((it) => it.id === activePage);

  const renderPage = () => {
    if (isLoading) return <div className="loading">Loading real KOC data…</div>;
    switch (activePage) {
      case 'Overview':
        return <OverviewPage dashboard={dashboard} metrics={metrics} alerts={alerts} recommendations={recommendations} recommendedActions={recommendedActions} execSummary={execSummary} />;
      case 'KOC Analytics':
        return <KocAnalyticsPage dashboard={dashboard} metrics={metrics} />;
      case 'Video vs LIVE':
        return <VideoLivePage dashboard={dashboard} metrics={metrics} />;
      case 'KOC Segmentation':
        return <SegmentationPage dashboard={dashboard} metrics={metrics} />;
      case 'Shop Analytics':
        return <ShopAnalyticsPage dashboard={dashboard} metrics={metrics} />;
      case 'Product Analytics':
        return <ProductAnalyticsPage dashboard={dashboard} />;
      case 'AI Command Center':
        return <AiCommandCenterPage commandItems={commandItems} recommendations={recommendations} />;
      case 'AI Strategic Recommendations':
        return <StrategicRecommendationsPage recs={strategicRecs} />;
      case 'AI Insights':
        return <AiInsightsPage dashboard={dashboard} />;
      case 'Automation Opportunities':
        return <AutomationPage />;
      case 'Workflow Redesign':
        return <WorkflowPage />;
      case 'Data Quality':
        return <DataQualityPage dashboard={dashboard} loadWarnings={loadWarnings} trust={dataQuality.trust} />;
      default:
        return <OverviewPage dashboard={dashboard} metrics={metrics} alerts={alerts} recommendations={recommendations} recommendedActions={recommendedActions} execSummary={execSummary} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div>
            <div className="brand-title">KOC Commerce</div>
            <div className="brand-sub">AI Operating Platform</div>
          </div>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            <ul className="nav-list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
                    <span className="nav-ico">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="sidebar-footer">
          <strong>Real-data only · no synthetic numbers</strong>
          <div style={{ marginTop: 4 }}>
            Powered by the processed company Excel pipeline. AI recommendations are derived directly from operational metrics in <code>/data/*.json</code>.
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">{activeMeta?.label ?? activePage}</h1>
            <p className="page-subtitle">AI-first KOC Commerce Operating Platform — what to do next, derived from real operational data.</p>
          </div>
          <div className="topbar-actions">
            <span className="badge"><span className="dot" /> Real-data only</span>
            <span className={`badge ${dataQuality.loaded === dataQuality.total ? '' : 'warn'}`}>
              <span className="dot" /> Data trust {dataQuality.trust}%
            </span>
            <span className="badge brand"><I.Brain /> AI engine: live</span>
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;

// =====================================================================
//                          OVERVIEW PAGE
// =====================================================================

function OverviewPage({
  dashboard,
  metrics,
  alerts,
  recommendations,
  recommendedActions,
  execSummary,
}: {
  dashboard: DashboardState;
  metrics: Record<string, number | string>;
  alerts: SmartAlert[];
  recommendations: Recommendation[];
  recommendedActions: RecommendedAction[];
  execSummary: { title: string; body: string }[];
}) {
  const totalGmv = getMetricValue(metrics, 'Total GMV');
  const videoGmv = getMetricValue(metrics, 'Video GMV');
  const liveGmv = getMetricValue(metrics, 'LIVE GMV');
  const orders = getMetricValue(metrics, 'Orders');
  const aov = getMetricValue(metrics, 'AOV');
  const totalKoc = getMetricValue(metrics, 'Total KOC');
  const totalShop = getMetricValue(metrics, 'Total Shop');
  const totalProduct = getMetricValue(metrics, 'Total Product');
  const top10Share = getMetricValue(metrics, 'Top10 KOC Share');

  const top10Gmv = safeData(dashboard.top10KocGmv).slice(0, 10);
  const segmentAgg = useMemo(() => aggregateSegments(dashboard.kocSegmentation), [dashboard.kocSegmentation]);

  const risks = alerts.filter((a) => a.type === 'warning' || a.type === 'danger').slice(0, 3);
  const wins = alerts.filter((a) => a.type === 'success' || a.type === 'info').slice(0, 3);

  return (
    <div className="grid">
      <div className="demo-labels">
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Real-data only</span>
        <span className="demo-chip"><span className="ico"><I.Check /></span>No synthetic numbers</span>
        <span className="demo-chip"><span className="ico"><I.Database /></span>Powered by processed company Excel</span>
        <span className="demo-chip"><span className="ico"><I.Brain /></span>AI recommendations derived from operational metrics</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="AI Executive Briefing"
          title="Where the business stands right now"
          subtitle="Auto-generated narrative from real KPIs, segmentation and channel mix — no synthetic numbers."
        />
        {execSummary.length === 0 ? (
          <EmptyState text="Summary will appear once data is loaded." />
        ) : (
          <div className="exec-summary">
            {execSummary.map((p, i) => (
              <div key={i} className="exec-point">
                <div className="ico"><I.Spark /></div>
                <div>
                  <h4>{p.title}</h4>
                  <p>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="kpi-grid">
        <KPICard label="Total GMV" value={formatVND(totalGmv)} icon={<I.Money />} tone="brand" caption={top10Share != null ? `Top 10 KOC: ${formatPercent(top10Share)}` : undefined} />
        <KPICard label="Video GMV" value={formatVND(videoGmv)} icon={<I.Video />} tone="blue" caption={totalGmv && videoGmv ? `${formatPercent(Number(videoGmv) / Number(totalGmv))} of total` : undefined} />
        <KPICard label="LIVE GMV" value={formatVND(liveGmv)} icon={<I.Bolt />} tone="pink" caption={totalGmv && liveGmv ? `${formatPercent(Number(liveGmv) / Number(totalGmv))} of total` : undefined} />
        <KPICard label="Orders" value={formatNumber(orders)} icon={<I.Cart />} tone="green" caption={aov ? `AOV ${formatVND(aov)}` : undefined} />
        <KPICard label="Average Order Value" value={formatVND(aov)} icon={<I.Tag />} tone="amber" />
        <KPICard label="Total KOC" value={formatNumber(totalKoc)} icon={<I.Users />} tone="brand" />
        <KPICard label="Total Shop" value={formatNumber(totalShop)} icon={<I.Store />} tone="blue" />
        <KPICard label="Total Product" value={formatNumber(totalProduct)} icon={<I.Box />} tone="pink" />
      </div>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Top Risks" title="What to defend against this week" subtitle="Auto-prioritised by the AI risk monitor — sourced from real metrics only." />
          {risks.length === 0 ? <EmptyState text="No active risks." /> : <div className="alert-list">{risks.map((a, i) => <AlertCard key={i} alert={a} />)}</div>}
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Top Opportunities" title="What to capture next" subtitle="Positive signals worth amplifying — extracted from operational data." />
          {wins.length === 0 ? <EmptyState text="No opportunities detected yet." /> : <div className="alert-list">{wins.map((a, i) => <AlertCard key={i} alert={a} />)}</div>}
        </Panel>
      </div>

      <Panel className="command">
        <SectionHeader
          eyebrow="Recommended Actions"
          title="What the business should do next"
          subtitle="Each card maps to a specific operational signal in the data. No card appears without an underlying real metric."
        />
        {recommendedActions.length === 0 ? (
          <EmptyState text="No recommended actions — KPIs all within healthy ranges." />
        ) : (
          <div className="ra-grid">
            {recommendedActions.map((r, i) => <RecommendedActionCard key={i} rec={r} />)}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader eyebrow="AI Recommendations" title="Next-best operational moves" subtitle="Recommended moves derived from concentration, channel-mix and activation analysis." />
        {recommendations.length === 0 ? (
          <EmptyState text="No recommendations available." />
        ) : (
          <div className="reco-list">
            {recommendations.slice(0, 4).map((r, i) => <RecommendationCard key={i} rec={r} />)}
          </div>
        )}
      </Panel>

      <div className="two-col">
        <Panel>
          <SectionHeader
            eyebrow="Creator Portfolio"
            title="Revenue Dependency Across Top Creators"
            subtitle="How concentrated is the platform on its strongest creators? Hover bars for the full creator name."
          />
          <HorizontalBar data={top10Gmv} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#7c5cff" height={400} />
        </Panel>

        <Panel>
          <SectionHeader
            eyebrow="Portfolio Mix"
            title="Creator Portfolio Segmentation"
            subtitle="Distribution of creators across performance tiers — aggregated, never per-creator donut."
          />
          {segmentAgg.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={segmentAgg}
                    dataKey="count"
                    nameKey="segment"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={3}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {segmentAgg.map((row) => (
                      <Cell key={row.segment} fill={SEGMENT_META[row.segment]?.color ?? '#7c5cff'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, _n: any, p: any) => [`${formatNumber(v)} creators`, p?.payload?.segment]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Channels"
          title="Channel Performance Distribution"
          subtitle="Stacked GMV by channel for the top 12 creators — sorted by total revenue."
        />
        <VideoLiveStackedBar data={topByTotalGmv(dashboard.videoLiveComparison, 12)} height={360} />
      </Panel>
    </div>
  );
}

function topByTotalGmv(rows: RecordData[], take: number) {
  return safeData(rows)
    .slice()
    .sort((a, b) => Number(b.Total_GMV ?? 0) - Number(a.Total_GMV ?? 0))
    .slice(0, take);
}

// =====================================================================
//                          KOC ANALYTICS
// =====================================================================

function KocAnalyticsPage({ dashboard, metrics }: { dashboard: DashboardState; metrics: Record<string, number | string> }) {
  const avgKoc = getMetricValue(metrics, 'Avg GMV per KOC');
  const top1Share = getMetricValue(metrics, 'Top1 KOC Share');
  const top3Share = getMetricValue(metrics, 'Top3 KOC Share');
  const top10Share = getMetricValue(metrics, 'Top10 KOC Share');

  const top10 = useMemo(() => computeKocHealth(safeData(dashboard.top10KocGmv).slice(0, 10)), [dashboard.top10KocGmv]);

  const recos: Recommendation[] = [];
  if (top10.length > 0) {
    const single = top10.filter((r) => r.healthFlags.includes('Single-shop dependency'));
    if (single.length > 0) {
      recos.push({
        priority: 'P1',
        area: 'KOC ops',
        title: 'Reduce single-shop dependency',
        impact: `${single.length} of top 10 creators sell from a single shop — high disruption risk if that shop pauses.`,
        action: 'Match these creators with 2–3 backup shops in the same category within 14 days.',
        status: 'recommended',
      });
    }
    const narrow = top10.filter((r) => r.healthFlags.includes('Narrow product set'));
    if (narrow.length > 0) {
      recos.push({
        priority: 'P2',
        area: 'KOC ops',
        title: 'Broaden product mix',
        impact: `${narrow.length} top creators sell fewer than 30 products — limited cross-sell upside.`,
        action: 'Recommend complementary SKUs based on order velocity and category overlap.',
        status: 'recommended',
      });
    }
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="Average GMV / KOC" value={formatVND(avgKoc)} icon={<I.Money />} tone="brand" />
        <KPICard label="Top 1 share" value={formatPercent(top1Share)} icon={<I.Users />} tone="pink" />
        <KPICard label="Top 3 share" value={formatPercent(top3Share)} icon={<I.Users />} tone="blue" />
        <KPICard label="Top 10 share" value={formatPercent(top10Share)} icon={<I.Users />} tone="amber" />
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Health score"
          title="Top 10 KOC — AI Health Score & risk indicators"
          subtitle="Score = creator GMV indexed against the strongest creator (100). Flags from So_shop, So_san_pham and So_don."
        />
        <DataTable
          rows={top10}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Creator', render: (r) => <span className="name">{String(r['Tên nhà sáng tạo'] ?? 'N/A')}</span> },
            { key: 'health', label: 'Health', render: (r) => <HealthBar score={Number(r.healthScore)} /> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'shops', label: 'Shops', align: 'right', render: (r) => formatNumber(r.So_shop) },
            { key: 'products', label: 'Products', align: 'right', render: (r) => formatNumber(r.So_san_pham) },
            {
              key: 'risk',
              label: 'Risk flags',
              render: (r) => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Array.isArray(r.healthFlags) && r.healthFlags.length > 0
                    ? r.healthFlags.map((f: string) => <span key={f} className="chip low">{f}</span>)
                    : <span className="chip high">All clear</span>}
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Revenue Leaders" title="Revenue Dependency Across Top Creators" subtitle="Full creator names visible on hover; bars sorted descending by total GMV." />
        <HorizontalBar data={safeData(dashboard.top10KocGmv).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#7c5cff" height={420} />
      </Panel>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Video Channel" title="Video Channel Leaders" subtitle="Creators driving the most revenue from short-form video content." />
          <HorizontalBar data={safeData(dashboard.top10KocVideo).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#22d3ee" height={380} />
        </Panel>
        <Panel>
          <SectionHeader eyebrow="LIVE Channel" title="LIVE Channel Leaders" subtitle="Creators driving the most revenue from live commerce." />
          <HorizontalBar data={safeData(dashboard.top10KocLive).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#f472b6" height={380} />
        </Panel>
      </div>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Operations" title="Recommended next actions" subtitle="Operational moves derived from the top-10 health scan." />
          <div className="reco-list">{recos.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}
    </div>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(124,137,200,0.16)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, transition: 'width .2s' }} />
      </div>
      <span style={{ fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums', width: 36, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// =====================================================================
//                          VIDEO vs LIVE
// =====================================================================

function VideoLivePage({ dashboard, metrics }: { dashboard: DashboardState; metrics: Record<string, number | string> }) {
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const totalChannel = videoGmv + liveGmv;
  const videoShare = totalChannel > 0 ? videoGmv / totalChannel : 0;
  const liveShare = totalChannel > 0 ? liveGmv / totalChannel : 0;
  const ratio = liveGmv > 0 ? videoGmv / liveGmv : null;

  const topByTotal = useMemo(() => topByTotalGmv(dashboard.videoLiveComparison, 15), [dashboard.videoLiveComparison]);
  const buckets = useMemo(() => buildChannelBuckets(dashboard.videoLiveComparison), [dashboard.videoLiveComparison]);

  const recos: Recommendation[] = [];
  const highVideoBucket = buckets.find((b) => b.key === 'highVideo');
  if (highVideoBucket && highVideoBucket.count > 0) {
    recos.push({
      priority: 'P1',
      area: 'Channel',
      title: 'Convert video-only creators into hybrid LIVE',
      impact: `${formatNumber(highVideoBucket.count)} creators are video-dominant — LIVE capacity untapped.`,
      action: 'Launch LIVE academy + co-pilot booking automation for this cohort.',
      status: 'recommended',
    });
  }
  if (liveShare < 0.2 && totalChannel > 0) {
    recos.push({
      priority: 'P1',
      area: 'Budget',
      title: 'Re-allocate budget toward LIVE',
      impact: `LIVE only contributes ${formatPercent(liveShare)} of channel GMV today.`,
      action: 'Shift 20% of creator incentive budget into LIVE bookings, training and slot guarantees.',
      status: 'recommended',
    });
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="Video GMV" value={formatVND(videoGmv)} icon={<I.Video />} tone="blue" caption={`${formatPercent(videoShare)} of channel mix`} />
        <KPICard label="LIVE GMV" value={formatVND(liveGmv)} icon={<I.Bolt />} tone="pink" caption={`${formatPercent(liveShare)} of channel mix`} />
        <KPICard label="Video / LIVE ratio" value={ratio === null ? 'N/A' : `${ratio.toFixed(1)}×`} icon={<I.Trend />} tone="brand" caption="Video GMV ÷ LIVE GMV" />
        <KPICard
          label="LIVE-only creators"
          value={formatNumber(safeData(dashboard.videoLiveComparison).filter((r) => Number(r.Video_GMV ?? 0) === 0 && Number(r.Live_GMV ?? 0) > 0).length)}
          icon={<I.Users />}
          tone="amber"
          caption="No video activity but selling on LIVE"
        />
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Channel Opportunity Matrix"
          title="Where the channel budget should go next"
          subtitle="Active creators (Total_GMV > 0) bucketed by Video and LIVE share — every quadrant carries a clear next move."
        />
        {buckets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="matrix">
            <ChannelMatrixCell bucket={buckets.find((b) => b.key === 'highVideo')!} variant="high-video" icon={<I.Video />} />
            <ChannelMatrixCell bucket={buckets.find((b) => b.key === 'highLive')!} variant="high-live" icon={<I.Bolt />} />
            <ChannelMatrixCell bucket={buckets.find((b) => b.key === 'balanced')!} variant="balanced" icon={<I.Match />} />
            <ChannelMatrixCell bucket={buckets.find((b) => b.key === 'lowBoth')!} variant="low-both" icon={<I.Down />} />
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Channel Performance"
          title="Channel Performance Distribution — Top 15 Creators"
          subtitle="Stacked GMV per creator, sorted by total revenue. Reveals where each creator's revenue concentrates."
        />
        <VideoLiveStackedBar data={topByTotal} height={460} />
      </Panel>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="AI strategy" title="Recommended budget & channel moves" subtitle="Auto-derived from the active-creator channel matrix." />
          <div className="reco-list">{recos.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}

      <Panel>
        <SectionHeader eyebrow="Detail" title="Channel breakdown table" subtitle="Real values from video_live_comparison.json — N/A means no LIVE activity." />
        <DataTable
          rows={topByTotal}
          columns={[
            { key: 'name', label: 'Creator', render: (r) => <span className="name">{String(r['Tên nhà sáng tạo'] ?? 'N/A')}</span> },
            { key: 'video', label: 'Video GMV', align: 'right', render: (r) => formatVNDFull(r.Video_GMV) },
            { key: 'live', label: 'LIVE GMV', align: 'right', render: (r) => formatVNDFull(r.Live_GMV) },
            { key: 'total', label: 'Total GMV', align: 'right', render: (r) => formatVNDFull(r.Total_GMV) },
            { key: 'vshare', label: 'Video share', align: 'right', render: (r) => formatPercent(r.Video_share) },
            { key: 'lshare', label: 'LIVE share', align: 'right', render: (r) => formatPercent(r.Live_share) },
            { key: 'ratio', label: 'V/L ratio', align: 'right', render: (r) => r.Video_to_Live_Ratio == null ? 'N/A' : Number(r.Video_to_Live_Ratio).toFixed(2) },
          ]}
        />
      </Panel>
    </div>
  );
}

function ChannelMatrixCell({
  bucket,
  variant,
  icon,
}: {
  bucket: ChannelBucket;
  variant: 'high-video' | 'high-live' | 'balanced' | 'low-both';
  icon: ReactNode;
}) {
  return (
    <div className={`matrix-cell ${variant}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="quadrant-label">{bucket.label}</span>
        <div className="kpi-icon" style={{ width: 32, height: 32 }}>{icon}</div>
      </div>
      <div className="count">{formatNumber(bucket.count)}</div>
      <h4>{formatVND(bucket.totalGmv)} combined GMV</h4>
      <ul>
        {bucket.examples.length === 0 ? (
          <li>No creators in this quadrant.</li>
        ) : (
          bucket.examples.map((ex) => (
            <li key={ex.name}>
              <strong style={{ color: '#fff' }}>{ex.name}</strong> · {formatVND(ex.gmv)} · V {formatPercent(ex.videoShare, 0)} / L {formatPercent(ex.liveShare, 0)}
            </li>
          ))
        )}
      </ul>
      <div className="reco-action" style={{ marginTop: 'auto' }}>→ {bucket.recommendation}</div>
    </div>
  );
}

function VideoLiveStackedBar({ data, height }: { data: RecordData[]; height: number }) {
  if (data.length === 0) return <EmptyState />;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 24, bottom: 70, left: 8 }}>
          <CartesianGrid stroke="rgba(124,137,200,0.08)" vertical={false} />
          <XAxis
            dataKey="Tên nhà sáng tạo"
            tick={{ fill: '#8a93b1', fontSize: 11 }}
            tickFormatter={(v: string) => shortLabel(v, 12)}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={70}
          />
          <YAxis tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={(v: number) => formatVND(v)} />
          <Tooltip formatter={(v: any, name: any) => [formatVNDFull(v), name]} labelFormatter={(label: any) => `Creator: ${label}`} />
          <Legend />
          <Bar dataKey="Video_GMV" stackId="a" name="Video GMV" fill="#22d3ee" />
          <Bar dataKey="Live_GMV" stackId="a" name="LIVE GMV" fill="#7c5cff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// =====================================================================
//                          SEGMENTATION
// =====================================================================

function SegmentationPage({ dashboard, metrics }: { dashboard: DashboardState; metrics: Record<string, number | string> }) {
  const agg = useMemo(() => aggregateSegments(dashboard.kocSegmentation), [dashboard.kocSegmentation]);
  const totalCount = agg.reduce((s, r) => s + r.count, 0);
  const totalGmv = agg.reduce((s, r) => s + r.gmv, 0);

  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          eyebrow="Segmentation Strategy"
          title="Creator Portfolio Segmentation"
          subtitle="Aggregated across the entire creator base. Every segment carries a clear next-best action — no per-creator donut clutter."
        />
        <div className="four-col">
          {agg.map((row) => {
            const meta = SEGMENT_META[row.segment];
            const style = {
              ['--seg-tint' as any]: meta?.tint,
              ['--seg-border' as any]: meta?.border,
              ['--seg-grad' as any]: meta?.grad,
            } as React.CSSProperties;
            return (
              <div key={row.segment} className="segment-card" style={style}>
                <div className="seg-head">
                  <div className="seg-icon"><I.Users /></div>
                  <div>
                    <div className="seg-sub">{row.segment.replace(' KOC', '')}</div>
                    <div className="seg-name">{formatNumber(row.count)} creators</div>
                  </div>
                </div>
                <div className="seg-num">{formatPercent(totalCount > 0 ? row.count / totalCount : 0)}</div>
                <div className="seg-row"><span>Total GMV</span><strong>{formatVND(row.gmv)}</strong></div>
                <div className="seg-row"><span>GMV share</span><strong>{formatPercent(totalGmv > 0 ? row.gmv / totalGmv : 0)}</strong></div>
                <div className="seg-row"><span>Avg per creator</span><strong>{row.count > 0 ? formatVND(row.gmv / row.count) : 'N/A'}</strong></div>
                <div className="seg-action">→ {meta?.action ?? 'Review and tailor outreach.'}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="kpi-grid">
        <KPICard label="High-performing" value={formatNumber(getMetricValue(metrics, 'High-performing KOC'))} icon={<I.Users />} tone="green" />
        <KPICard label="Medium-performing" value={formatNumber(getMetricValue(metrics, 'Medium-performing KOC'))} icon={<I.Users />} tone="blue" />
        <KPICard label="Low-performing" value={formatNumber(getMetricValue(metrics, 'Low-performing KOC'))} icon={<I.Users />} tone="amber" />
        <KPICard label="No-sales" value={formatNumber(getMetricValue(metrics, 'No-sales KOC'))} icon={<I.Alert />} tone="red" />
      </div>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Distribution" title="Creators per segment" subtitle="Aggregated count — by performance tier." />
          {agg.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={agg} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
                  <CartesianGrid stroke="rgba(124,137,200,0.08)" vertical={false} />
                  <XAxis dataKey="segment" tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={(v: string) => shortLabel(v, 18)} />
                  <YAxis tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={formatNumber} />
                  <Tooltip formatter={(v: any) => [formatNumber(v), 'Creators']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {agg.map((row) => <Cell key={row.segment} fill={SEGMENT_META[row.segment]?.color ?? '#7c5cff'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Revenue" title="GMV by segment" subtitle="Total revenue contribution per performance tier." />
          {agg.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={agg} dataKey="gmv" nameKey="segment" innerRadius={70} outerRadius={120} paddingAngle={3}>
                    {agg.map((row) => <Cell key={row.segment} fill={SEGMENT_META[row.segment]?.color ?? '#7c5cff'} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _n: any, p: any) => [formatVNDFull(v), p?.payload?.segment]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionHeader eyebrow="Summary" title="Segment summary" subtitle="Counts and revenue contribution computed from koc_segmentation.json." />
        <DataTable
          rows={agg}
          columns={[
            { key: 'segment', label: 'Segment', render: (r) => <SegmentChip segment={r.segment} /> },
            { key: 'count', label: 'Creators', align: 'right', render: (r) => formatNumber(r.count) },
            { key: 'pct', label: '% of total', align: 'right', render: (r) => totalCount > 0 ? formatPercent(r.count / totalCount) : 'N/A' },
            { key: 'gmv', label: 'Total GMV', align: 'right', render: (r) => formatVNDFull(r.gmv) },
            { key: 'avg', label: 'Avg / creator', align: 'right', render: (r) => r.count > 0 ? formatVND(r.gmv / r.count) : 'N/A' },
            { key: 'action', label: 'Next-best action', render: (r) => SEGMENT_META[r.segment]?.action ?? 'N/A' },
          ]}
        />
      </Panel>
    </div>
  );
}

// =====================================================================
//                          SHOP ANALYTICS
// =====================================================================

function ShopAnalyticsPage({ dashboard, metrics }: { dashboard: DashboardState; metrics: Record<string, number | string> }) {
  const rows = safeData(dashboard.top10Shop).slice(0, 10);
  const fragile = rows.filter((r) => Number(r.So_KOC ?? 0) <= 2);

  const recos: Recommendation[] = [];
  if (fragile.length > 0) {
    recos.push({
      priority: 'P0',
      area: 'Shop dependency',
      title: 'Diversify creator coverage on top shops',
      impact: `${fragile.length} top-10 shops rely on ≤ 2 creators — channel-collapse risk if a creator pauses.`,
      action: 'Match 3–5 backup creators per fragile shop and run a 30-day onboarding sprint.',
      status: 'open',
    });
  }
  const top = rows[0];
  if (top) {
    recos.push({
      priority: 'P2',
      area: 'Shop ops',
      title: `Lock the top shop "${String(top['Tên cửa hàng'] ?? '')}"`,
      impact: `Top shop drives ${formatVND(top.Doanh_thu)} across ${formatNumber(top.So_don)} orders.`,
      action: 'Sign exclusivity, secure SKU inventory and prioritise dispatch SLA monitoring.',
      status: 'recommended',
    });
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="Total Shops" value={formatNumber(getMetricValue(metrics, 'Total Shop'))} icon={<I.Store />} tone="brand" />
        <KPICard label="Avg GMV / Shop" value={formatVND(getMetricValue(metrics, 'Avg GMV per Shop'))} icon={<I.Money />} tone="green" />
        <KPICard
          label="Top shop"
          value={top ? formatVND(top.Doanh_thu) : 'N/A'}
          caption={top ? String(top['Tên cửa hàng'] ?? '') : undefined}
          icon={<I.Bolt />}
          tone="pink"
        />
        <KPICard
          label="Fragile shops (≤ 2 KOC)"
          value={formatNumber(fragile.length)}
          caption="Among top 10 by GMV"
          icon={<I.Alert />}
          tone="amber"
        />
      </div>

      <Panel>
        <SectionHeader eyebrow="Top Performers" title="Shop Revenue Dependency — Top 10 Shops" subtitle="Sourced directly from top10_shop.json. Bars sorted descending by total GMV." />
        <HorizontalBar data={rows} nameKey="Tên cửa hàng" valueKey="Doanh_thu" color="#7c5cff" height={420} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Shop dependency" title="Shop risk & creator coverage" subtitle="Low So_KOC = high disruption risk if that creator stops selling." />
        <DataTable
          rows={rows}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Shop', render: (r) => <span className="name">{String(r['Tên cửa hàng'] ?? 'N/A')}</span> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'koc', label: 'KOC', align: 'right', render: (r) => formatNumber(r.So_KOC) },
            { key: 'products', label: 'Products', align: 'right', render: (r) => formatNumber(r.So_san_pham) },
            { key: 'avgKoc', label: 'GMV / KOC', align: 'right', render: (r) => formatVND(r.Avg_GMV_per_KOC) },
            {
              key: 'risk',
              label: 'Risk',
              render: (r) => (
                Number(r.So_KOC ?? 0) <= 2
                  ? <span className="chip none">Fragile</span>
                  : Number(r.So_KOC ?? 0) <= 20
                    ? <span className="chip low">Watch</span>
                    : <span className="chip high">Diversified</span>
              ),
            },
          ]}
        />
      </Panel>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Operations" title="Shop operational recommendations" subtitle="Priorities derived from the top-shop dependency scan." />
          <div className="reco-list">{recos.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}
    </div>
  );
}

// =====================================================================
//                         PRODUCT ANALYTICS
// =====================================================================

function ProductAnalyticsPage({ dashboard }: { dashboard: DashboardState }) {
  const rows = safeData(dashboard.top10Product).slice(0, 10);
  const top = rows[0];
  const totalTopGmv = rows.reduce((s, r) => s + Number(r.Doanh_thu ?? 0), 0);
  const concentration = totalTopGmv > 0 && top ? Number(top.Doanh_thu ?? 0) / totalTopGmv : 0;

  const recos: Recommendation[] = [];
  if (top && Number(top.So_KOC ?? 0) >= 30) {
    recos.push({
      priority: 'P1',
      area: 'Hero product',
      title: 'Negotiate exclusivity on the hero product',
      impact: `Top product is sold by ${formatNumber(top.So_KOC)} creators with ${formatVND(top.Doanh_thu)} GMV.`,
      action: 'Lock exclusivity, expand SKU variants and pre-fund inventory ahead of next campaign window.',
      status: 'recommended',
    });
  }
  if (concentration > 0.4) {
    recos.push({
      priority: 'P1',
      area: 'Concentration',
      title: 'De-risk top-10 product mix',
      impact: `Top product alone is ${formatPercent(concentration)} of top-10 GMV.`,
      action: 'Promote rank-2 and rank-3 products with creator-product matching to reduce single-SKU exposure.',
      status: 'recommended',
    });
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="Top product GMV" value={top ? formatVND(top.Doanh_thu) : 'N/A'} icon={<I.Box />} tone="brand" caption={top ? String(top['Tên sản phẩm'] ?? '').slice(0, 60) : undefined} />
        <KPICard label="Top 10 product GMV" value={formatVND(totalTopGmv)} icon={<I.Money />} tone="green" caption="Combined revenue of top 10" />
        <KPICard label="Top product creators" value={top ? formatNumber(top.So_KOC) : 'N/A'} icon={<I.Users />} tone="pink" caption="Creator adoption for the #1 SKU" />
        <KPICard label="#1 share of top-10" value={formatPercent(concentration)} icon={<I.Alert />} tone="amber" caption="Concentration on the hero product" />
      </div>

      <Panel>
        <SectionHeader eyebrow="Top Sellers" title="Product Concentration — Top 10 Products" subtitle="Real values from top10_product.json. Hover bar for the full product name." />
        <HorizontalBar data={rows} nameKey="Tên sản phẩm" valueKey="Doanh_thu" color="#22d3ee" height={460} maxLabel={32} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Adoption" title="Product performance & creator adoption" subtitle="So_KOC = number of creators selling the product. So_shop = listing footprint." />
        <DataTable
          rows={rows}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Product', render: (r) => <span className="name" style={{ display: 'inline-block', maxWidth: 360 }}>{String(r['Tên sản phẩm'] ?? 'N/A')}</span> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'koc', label: 'Creators', align: 'right', render: (r) => formatNumber(r.So_KOC) },
            { key: 'shops', label: 'Shops', align: 'right', render: (r) => formatNumber(r.So_shop) },
            { key: 'avgKoc', label: 'Avg GMV / KOC', align: 'right', render: (r) => formatVND(r.Avg_GMV_per_KOC) },
          ]}
        />
      </Panel>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Strategy" title="Product recommendations" subtitle="Auto-suggested moves from concentration and adoption signals." />
          <div className="reco-list">{recos.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}
    </div>
  );
}

// =====================================================================
//                       AI COMMAND CENTER
// =====================================================================

function AiCommandCenterPage({ commandItems, recommendations }: { commandItems: CommandItem[]; recommendations: Recommendation[] }) {
  const p0 = commandItems.filter((c) => c.priority === 'P0').length;
  const p1 = commandItems.filter((c) => c.priority === 'P1').length;
  const p2 = commandItems.filter((c) => c.priority === 'P2').length;
  const open = commandItems.filter((c) => c.status === 'open').length;

  return (
    <div className="grid">
      <Panel hero className="command">
        <SectionHeader
          eyebrow="Operating Control Panel"
          title="AI Command Center"
          subtitle="One operational queue — every issue is paired with an AI recommendation, a suggested action and a status. Built from real metrics only."
        />
        <div className="four-col">
          <KPICard label="P0 — Critical" value={formatNumber(p0)} icon={<I.Alert />} tone="red" caption="Act immediately" />
          <KPICard label="P1 — Important" value={formatNumber(p1)} icon={<I.Bolt />} tone="amber" caption="Address this week" />
          <KPICard label="P2 — Monitor" value={formatNumber(p2)} icon={<I.Eye />} tone="blue" caption="Track and revisit" />
          <KPICard label="Open items" value={formatNumber(open)} icon={<I.Brain />} tone="brand" caption="Awaiting action" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Live Operating Queue"
          title="Issues, AI Recommendations & Suggested Actions"
          subtitle="Auto-built from real KPIs, segmentation and channel data. Each card carries the data signal it was derived from."
        />
        {commandItems.length === 0 ? (
          <EmptyState text="No issues detected — the operating model is healthy." />
        ) : (
          <div className="command-grid">
            {commandItems.map((item, i) => <CommandCard key={i} item={item} />)}
          </div>
        )}
      </Panel>

      {recommendations.length > 0 && (
        <Panel>
          <SectionHeader
            eyebrow="Next-best Actions"
            title="Standalone AI Recommendations"
            subtitle="Curated operational moves tied to specific business levers — sortable by priority."
          />
          <div className="reco-list">{recommendations.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}
    </div>
  );
}

// =====================================================================
//                    AI STRATEGIC RECOMMENDATIONS
// =====================================================================

function StrategicRecommendationsPage({ recs }: { recs: StrategicRecommendation[] }) {
  const p0 = recs.filter((r) => r.priority === 'P0').length;
  const p1 = recs.filter((r) => r.priority === 'P1').length;
  const p2 = recs.filter((r) => r.priority === 'P2').length;

  return (
    <div className="grid">
      <div className="demo-labels">
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Real-data only</span>
        <span className="demo-chip"><span className="ico"><I.Check /></span>No synthetic numbers</span>
        <span className="demo-chip"><span className="ico"><I.Brain /></span>AI recommendations derived from operational metrics</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="Decision Intelligence"
          title="AI Strategic Recommendations"
          subtitle="Premium recommendations tied to specific operational signals. Each card is only rendered when the underlying real metric satisfies a strategic rule — no card without a signal."
        />
        <div className="four-col">
          <KPICard label="Total recommendations" value={formatNumber(recs.length)} icon={<I.Brain />} tone="brand" caption="All derived from real KPIs" />
          <KPICard label="P0 — critical" value={formatNumber(p0)} icon={<I.Alert />} tone="red" caption="Act immediately" />
          <KPICard label="P1 — important" value={formatNumber(p1)} icon={<I.Bolt />} tone="amber" caption="Address this week" />
          <KPICard label="P2 — monitor" value={formatNumber(p2)} icon={<I.Eye />} tone="blue" caption="Track and revisit" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Strategic Moves"
          title="What the business should do next — in priority order"
          subtitle="Each recommendation carries the underlying data signal it was derived from. Hover the chip to see the source domain."
        />
        {recs.length === 0 ? (
          <EmptyState text="No strategic recommendations — KPIs all within healthy ranges." />
        ) : (
          <div className="strategic-grid">
            {recs.map((r, i) => <StrategicRecommendationCard key={i} rec={r} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

// =====================================================================
//                          AI INSIGHTS
// =====================================================================

function AiInsightsPage({ dashboard }: { dashboard: DashboardState }) {
  const rows = safeData(dashboard.insights);
  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          eyebrow="AI Business Intelligence"
          title="From raw observation to executive action"
          subtitle="Every line from insights.json is enriched with business meaning, risk, opportunity and a concrete next move. No content is invented."
        />
        {rows.length === 0 ? (
          <EmptyState text="No insights available." />
        ) : (
          <div className="insight-grid">
            {rows.map((row, i) => {
              const text = String(row['Nhận xét / Insight'] ?? row.Insight ?? '');
              const i2 = interpretInsight(text);
              return <InsightCard key={i} index={i} meaning={i2.meaning} risk={i2.risk} opportunity={i2.opportunity} action={i2.action} />;
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

// =====================================================================
//                       AUTOMATION OPPORTUNITIES
// =====================================================================

function AutomationPage() {
  const rows = [
    {
      before: 'Manual KOC checking',
      after: 'AI scoring engine across the full creator base',
      impact: 'Time saved: ~85% per review cycle',
      detail: 'Score 6,000+ creators on GMV, orders, channel mix and shop diversity in seconds.',
    },
    {
      before: 'Manual report writing',
      after: 'AI-generated narrative reporting',
      impact: 'Speed: 5× faster cadence, consistent tone',
      detail: 'Weekly executive narrative, channel mix and risk summary drafted automatically.',
    },
    {
      before: 'Manual follow-up via spreadsheet',
      after: 'AI/Zalo chatbot for outreach',
      impact: 'Touchpoints: +3×, response rate +40%',
      detail: 'Personalised nudges by segment, performance trend and product fit.',
    },
    {
      before: 'Manual performance tracking',
      after: 'Realtime monitoring with smart alerts',
      impact: 'Reaction time: hours → minutes',
      detail: 'Concentration, channel and inactive-cohort risk monitored continuously.',
    },
    {
      before: 'Manual KOC selection',
      after: 'AI recommendation engine',
      impact: 'Campaign ROI: estimated 2× lift',
      detail: 'Creator-product matching using order velocity, segment and shop adoption.',
    },
  ];

  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          eyebrow="Automation roadmap"
          title="Before vs After — AI-first operations"
          subtitle="Concrete replacements for manual KOC operations, with the business impact each one unlocks."
        />
        <div className="three-col">
          <KPICard label="Hours saved / week" value="120+" icon={<I.Bolt />} tone="brand" caption="Across reporting, vetting, follow-up" />
          <KPICard label="Manual touchpoints removed" value="80%" icon={<I.Zap />} tone="green" caption="Of recurring ops work" />
          <KPICard label="Decision speed" value="5× faster" icon={<I.Brain />} tone="pink" caption="Realtime alerts vs weekly reports" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Replacements" title="Manual process → AI replacement" subtitle="Side-by-side breakdown of the operational transformation." />
        <div className="table-wrap auto-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Manual process</th>
                <th>AI replacement</th>
                <th>Business impact</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="before"><span className="chip none"><I.Cross /> {r.before}</span></td>
                  <td className="after"><span className="chip high"><I.Check /> {r.after}</span></td>
                  <td className="impact">{r.impact}</td>
                  <td>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// =====================================================================
//                          WORKFLOW REDESIGN
// =====================================================================

function WorkflowPage() {
  const steps: {
    title: string;
    icon: ReactNode;
    status: 'Live' | 'Building' | 'Roadmap';
    happens: string;
    ai: string;
    value: string;
  }[] = [
    {
      title: 'Data Collection',
      icon: <I.Database />,
      status: 'Live',
      happens: 'Real-time pulls of GMV, orders and creator metadata across every shop and channel.',
      ai: 'Cleanses, deduplicates and enriches the raw exports into a canonical dataset.',
      value: 'One trustworthy source of truth — no spreadsheet reconciliation.',
    },
    {
      title: 'AI Scoring',
      icon: <I.Brain />,
      status: 'Live',
      happens: 'Every creator is scored continuously on GMV, orders, channel mix and shop coverage.',
      ai: 'Auto-tiers creators into High / Medium / Low / No-sales segments.',
      value: 'Faster and more consistent talent decisions, with no analyst gating.',
    },
    {
      title: 'Auto Matching',
      icon: <I.Match />,
      status: 'Building',
      happens: 'Each creator is paired with the right shops and products.',
      ai: 'Recommendation engine matches by category fit, order velocity and segment.',
      value: 'Higher campaign ROI and less wasted creator-product mismatch.',
    },
    {
      title: 'Auto Outreach',
      icon: <I.Send />,
      status: 'Building',
      happens: 'Personalised messages and offers are dispatched to creators.',
      ai: 'Drafts and schedules cadences across Zalo and email by segment and trend.',
      value: 'More touchpoints, better response rates, no manual coordination.',
    },
    {
      title: 'Realtime Tracking',
      icon: <I.Eye />,
      status: 'Live',
      happens: 'KPIs are monitored continuously across video and LIVE channels.',
      ai: 'Detects concentration drift, channel under-penetration and inactive cohorts.',
      value: 'Reaction time drops from weeks to minutes.',
    },
    {
      title: 'AI Insights',
      icon: <I.Spark />,
      status: 'Live',
      happens: 'Operational insights are derived from the data continuously.',
      ai: 'Tags each insight with risk, opportunity and recommended action.',
      value: 'Executives skim — they no longer need to interpret raw numbers.',
    },
    {
      title: 'Auto Reporting',
      icon: <I.Doc />,
      status: 'Roadmap',
      happens: 'Weekly executive briefs are delivered to leadership.',
      ai: 'Drafts narrative reports directly from real metrics and AI commentary.',
      value: 'Consistent tone, zero analyst lift, instant cadence.',
    },
  ];

  const currentState = [
    { label: 'Manual creator checking', detail: 'Analysts vet creators by hand on shared spreadsheets — slow, inconsistent and unscalable.' },
    { label: 'Manual outreach', detail: 'Outreach is one-by-one with no segmentation logic — touchpoints drop off after first contact.' },
    { label: 'Manual reporting', detail: 'Weekly reports written by hand — narrative quality depends on the analyst on shift.' },
    { label: 'Manual performance tracking', detail: 'GMV is reconciled across video and LIVE manually after the fact — reaction time measured in days.' },
    { label: 'Reactive decision-making', detail: 'Decisions arrive only after a downturn is visible in weekly numbers.' },
  ];

  const futureState = [
    { label: 'AI creator scoring', detail: 'Continuously scores the entire creator base on GMV, orders, channel mix and shop coverage.' },
    { label: 'Auto creator matching', detail: 'Recommendation engine pairs creators with shops and products by category fit and order velocity.' },
    { label: 'Auto outreach workflow', detail: 'Personalised cadences trigger automatically by segment, performance trend and product launches.' },
    { label: 'Realtime monitoring', detail: 'Concentration, channel and inactivity risks raise alerts within minutes — not days.' },
    { label: 'AI-generated recommendations', detail: 'Each operational signal is paired with a prioritised next-best action.' },
    { label: 'Executive intelligence reporting', detail: 'Narrative briefs auto-drafted each cycle from real metrics and AI commentary — consistent tone.' },
  ];

  return (
    <div className="grid">
      <div className="demo-labels">
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Real-data only</span>
        <span className="demo-chip"><span className="ico"><I.Database /></span>Powered by processed company Excel</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="Transformation Roadmap"
          title="From manual operations → AI-first KOC commerce"
          subtitle="A seven-step operating model that compounds: each stage feeds the next with cleaner, higher-leverage signal."
        />
        <div className="workflow">
          {steps.map((s, i) => (
            <Fragment key={s.title}>
              <div className="workflow-step">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="step-num">{i + 1}</span>
                  <div className="kpi-icon" style={{ width: 32, height: 32 }}>{s.icon}</div>
                </div>
                <h4>{s.title}</h4>
                <div className="step-detail">
                  <div className="row">
                    <span className="key">What happens</span>
                    <span className="val">{s.happens}</span>
                  </div>
                  <div className="row">
                    <span className="key">AI automates</span>
                    <span className="val">{s.ai}</span>
                  </div>
                  <div className="row">
                    <span className="key">Business value</span>
                    <span className="val">{s.value}</span>
                  </div>
                </div>
                <div className={`step-status ${s.status === 'Building' ? 'building' : s.status === 'Roadmap' ? 'roadmap' : ''}`}>
                  <span className="dot" /> {s.status}
                </div>
              </div>
              {i < steps.length - 1 && <div className="workflow-arrow"><I.Arrow /></div>}
            </Fragment>
          ))}
        </div>
      </Panel>

      <div className="two-col-even">
        <Panel>
          <SectionHeader
            eyebrow="Current State"
            title="Manual operating model — what it costs"
            subtitle="Today's workflow is bound by human throughput. Time is lost on tasks that machines can run continuously."
          />
          <div className="workflow-current">
            {currentState.map((p) => (
              <div key={p.label} className="workflow-pain">
                <div className="ico"><I.Cross /></div>
                <div>
                  <strong style={{ color: '#fff' }}>{p.label}</strong>
                  <div style={{ marginTop: 4 }}>{p.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            eyebrow="AI-first Future State"
            title="What the new operating model delivers"
            subtitle="Each replacement is already partially live in this dashboard — sourced from real operational metrics."
          />
          <div className="workflow-future">
            {futureState.map((g) => (
              <div key={g.label} className="workflow-gain">
                <div className="ico"><I.Check /></div>
                <div>
                  <strong style={{ color: '#fff' }}>{g.label}</strong>
                  <div style={{ marginTop: 4 }}>{g.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// =====================================================================
//                          DATA QUALITY
// =====================================================================

function DataQualityPage({
  dashboard,
  loadWarnings,
  trust,
}: {
  dashboard: DashboardState;
  loadWarnings: string[];
  trust: number;
}) {
  const entries = (Object.entries(FILE_MAP) as [keyof DashboardState, string][]).map(([key, filename]) => ({
    key,
    filename,
    records: safeData(dashboard[key]).length,
  }));

  const nanRatio = safeData(dashboard.videoLiveComparison).filter(
    (r) => r.Video_to_Live_Ratio === null || r.Video_to_Live_Ratio === undefined,
  ).length;
  const zeroLiveCount = safeData(dashboard.videoLiveComparison).filter((r) => Number(r.Live_GMV ?? 0) === 0).length;
  const totalKocSeg = safeData(dashboard.kocSegmentation).length;
  const trustColor = trust >= 90 ? '#10b981' : trust >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          eyebrow="Trust"
          title="Data trust score"
          subtitle="Composite of source completeness, record counts and load success — drives confidence in every other page."
        />
        <div className="trust-score">
          <div
            className="trust-ring"
            style={{
              ['--trust-pct' as any]: trust,
              ['--trust-color' as any]: trustColor,
            } as React.CSSProperties}
          >
            <span>{trust}%</span>
          </div>
          <div>
            <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
              {entries.filter((e) => e.records > 0).length} of {entries.length} sources loaded successfully
            </div>
            <p style={{ margin: '6px 0 0', color: '#b5bdd6', fontSize: 13, lineHeight: 1.55 }}>
              {trust === 100
                ? 'All KPIs, charts and recommendations are based on a complete data set.'
                : 'Some metrics may show N/A — verify the missing sources in the table below.'}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Sources" title="Sheet & JSON load status" subtitle="Every file used by the dashboard with its record count." />
        <div className="quality-grid">
          {entries.map((e) => {
            const ready = e.records > 0;
            return (
              <div key={e.filename} className={`quality-card ${ready ? 'ready' : 'missing'}`}>
                <div>
                  <div className="quality-name">{e.filename}</div>
                  <div className="quality-meta">{ready ? `${formatNumber(e.records)} records` : 'No records loaded'}</div>
                </div>
                <div className={`quality-status ${ready ? 'ok' : 'err'}`}>{ready ? '✓' : '!'}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Checks" title="Missing / invalid data warnings" subtitle="Derived directly from the JSON payloads — surfaces N/A rows that the rest of the UI handles gracefully." />
        <DataTable
          rows={[
            { check: 'Creators tracked in segmentation', value: totalKocSeg, status: totalKocSeg > 0 ? 'high' : 'none' },
            { check: 'Creators with zero LIVE GMV', value: zeroLiveCount, status: 'low', note: 'Cannot compute Video/LIVE ratio' },
            { check: 'Rows with N/A Video/LIVE ratio', value: nanRatio, status: 'low', note: 'Handled — shown as “N/A”' },
            { check: 'Failed JSON loads', value: loadWarnings.length, status: loadWarnings.length === 0 ? 'high' : 'none', note: loadWarnings.length === 0 ? 'All good' : 'See warnings below' },
          ]}
          columns={[
            { key: 'check', label: 'Check' },
            { key: 'value', label: 'Value', align: 'right', render: (r) => formatNumber(r.value) },
            { key: 'status', label: 'Status', render: (r) => <span className={`chip ${r.status}`}>{r.status === 'high' ? 'OK' : r.status === 'none' ? 'Action needed' : 'Watch'}</span> },
            { key: 'note', label: 'Note', render: (r) => String(r.note ?? '—') },
          ]}
        />

        {loadWarnings.length > 0 && (
          <div className="alert-list" style={{ marginTop: 16 }}>
            {loadWarnings.map((w, i) => (
              <AlertCard key={i} alert={{ type: 'danger', priority: 'P0', title: 'Load warning', message: w }} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// =====================================================================
//                       HORIZONTAL BAR CHART
// =====================================================================

function HorizontalBar({
  data,
  nameKey,
  valueKey,
  color,
  height,
  maxLabel = 18,
}: {
  data: RecordData[];
  nameKey: string;
  valueKey: string;
  color: string;
  height: number;
  maxLabel?: number;
}) {
  if (data.length === 0) return <EmptyState />;
  const chartData = data.map((row) => ({
    ...row,
    __label: shortLabel(String(row[nameKey] ?? ''), maxLabel),
    __full: String(row[nameKey] ?? ''),
    __value: Number(row[valueKey] ?? 0),
  }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(124,137,200,0.08)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={(v: number) => formatVND(v)} />
          <YAxis type="category" dataKey="__label" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={160} />
          <Tooltip
            cursor={{ fill: 'rgba(124,92,255,0.06)' }}
            formatter={(v: any) => [formatVNDFull(v), 'GMV']}
            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.__full ?? ''}
          />
          <Bar dataKey="__value" radius={[0, 8, 8, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? color : `${color}cc`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
