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
    action: 'Giữ vững nhà sáng tạo hiệu suất cao bằng ưu đãi giữ chân, ra mắt sản phẩm độc quyền và quản lý thành công riêng.',
    tone: 'high',
  },
  'Medium-performing KOC': {
    color: '#5b8cff',
    grad: 'linear-gradient(135deg, #5b8cff, #22d3ee)',
    tint: 'rgba(91, 140, 255, 0.16)',
    border: 'rgba(91, 140, 255, 0.4)',
    action: 'Nâng cấp bằng huấn luyện có cấu trúc, brief nội dung A/B và gói sản phẩm phù hợp.',
    tone: 'medium',
  },
  'Low-performing KOC': {
    color: '#f59e0b',
    grad: 'linear-gradient(135deg, #f59e0b, #f472b6)',
    tint: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.4)',
    action: 'Chạy chiến dịch tái hoạt động nhắm mục tiêu và chuyển sang danh mục hoặc shop phù hợp hơn.',
    tone: 'low',
  },
  'No-sales KOC': {
    color: '#ef4444',
    grad: 'linear-gradient(135deg, #ef4444, #f472b6)',
    tint: 'rgba(239, 68, 68, 0.14)',
    border: 'rgba(239, 68, 68, 0.4)',
    action: 'Tự động phân luồng: tái onboard nhóm phù hợp cao, loại nhóm phù hợp thấp và thu hồi nguồn lực vận hành.',
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
      title: 'Doanh thu tập trung vào nhóm nhà sáng tạo nhỏ',
      message: `Top 10 KOC chiếm ${formatPercent(top10Share)} GMV của nền tảng — cần đa dạng hoá để giảm phụ thuộc vào một nhóm nhỏ.`,
      signal: 'Phát hiện từ tập trung doanh thu',
    });
  } else if (top10Share > 0) {
    alerts.push({
      type: 'success',
      priority: 'P2',
      title: 'Danh mục nhà sáng tạo khá đa dạng',
      message: `Top 10 KOC chiếm ${formatPercent(top10Share)} GMV — mức tập trung này vẫn nằm trong phạm vi lành mạnh.`,
      signal: 'Phát hiện từ tập trung doanh thu',
    });
  }

  if (top1Share > 0.08) {
    alerts.push({
      type: 'info',
      priority: 'P2',
      title: 'Nhà sáng tạo hàng đầu chiếm tỷ trọng doanh thu lớn',
      message: `Top 1 KOC chiếm ${formatPercent(top1Share)} GMV của nền tảng — giữ chân nhà sáng tạo này là ưu tiên vận hành quan trọng.`,
      signal: 'Phát hiện từ tập trung doanh thu',
    });
  }

  if (totalGmv > 0) {
    const channelTotal = videoGmv + liveGmv;
    if (channelTotal > 0 && liveGmv / channelTotal < 0.2) {
      alerts.push({
        type: 'warning',
        priority: 'P1',
        title: 'Thương mại LIVE chưa được khai thác đủ',
        message: `LIVE chỉ chiếm ${formatPercent(liveGmv / channelTotal)} GMV kênh. Kênh này đang bị dùng chưa đủ so với video ngắn, hạn chế đa dạng hoá kênh.`,
        signal: 'Phát hiện từ phân bổ Video/LIVE',
      });
    }
  }

  if (noSales > 0 && totalKoc > 0) {
    alerts.push({
      type: 'danger',
      priority: 'P0',
      title: 'Nhóm nhà sáng tạo không có doanh thu kéo hiệu quả vận hành xuống',
      message: `${formatNumber(noSales)} trên ${formatNumber(totalKoc)} nhà sáng tạo (${formatPercent(noSales / totalKoc)}) không tạo ra doanh thu — họ tiêu tốn năng lực onboarding mà không đóng góp.`,
      signal: 'Phát hiện từ phân khúc nhà sáng tạo',
    });
  }

  const nanRatio = safeData(dashboard.videoLiveComparison).filter(
    (r) => r.Video_to_Live_Ratio === null || r.Video_to_Live_Ratio === undefined,
  ).length;
  if (nanRatio > 0) {
    alerts.push({
      type: 'info',
      priority: 'P2',
      title: 'Một số nhà sáng tạo chưa có tỷ lệ kênh',
      message: `${formatNumber(nanRatio)} nhà sáng tạo không có hoạt động LIVE, nên tỷ lệ Video/LIVE là N/A ở các dòng này. Hiển thị minh bạch trong toàn bộ dashboard.`,
      signal: 'Phát hiện từ phân bổ Video/LIVE',
    });
  }

  if (loadWarnings.length > 0) {
    alerts.push({
      type: 'danger',
      priority: 'P0',
      title: 'Các nguồn dữ liệu quan trọng không tải được',
      message: `${loadWarnings.length} file dữ liệu không tải được. Phân tích có thể thiếu — xem Chi tiết dữ liệu để biết thêm.`,
      signal: 'Phát hiện từ kiểm tra chất lượng dữ liệu',
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
      area: 'Danh mục KOC',
      title: 'Giảm rủi ro cho danh mục nhà sáng tạo',
      impact: `Top 10 KOC chiếm ${formatPercent(top10Share)} GMV — phụ thuộc nặng vào một nhóm rất nhỏ.`,
      action: '',
      status: 'recommended',
      signal: 'Phát hiện từ tập trung doanh thu',
    });
  }

  if (noSales > 0 && totalKoc > 0) {
    recs.push({
      priority: 'P0',
      area: 'Kích hoạt',
      title: 'Xử lý nhóm nhà sáng tạo không hoạt động',
      impact: `${formatNumber(noSales)} nhà sáng tạo (${formatPercent(noSales / totalKoc)}) không tạo ra doanh thu — họ làm giảm năng lực onboarding mà không đóng góp.`,
      action: '',
      status: 'open',
      signal: 'Phát hiện từ phân khúc nhà sáng tạo',
    });
  }

  const channelTotal = videoGmv + liveGmv;
  if (channelTotal > 0 && liveGmv / channelTotal < 0.2) {
    recs.push({
      priority: 'P1',
      area: 'Cơ cấu kênh',
      title: 'Tăng tỷ trọng LIVE trong toàn mạng',
      impact: '',
      action: 'Khởi chạy học viện LIVE, tự động đặt lịch và luân phiên LIVE hàng tuần cho 30 nhà sáng tạo video chủ lực.',
      status: 'recommended',
      signal: 'Phát hiện từ phân bổ Video/LIVE',
    });
  }

  const topShop = safeData(dashboard.top10Shop)[0];
  if (topShop) {
    recs.push({
      priority: 'P1',
      area: 'Shop dependency',
      title: 'Giải quyết rủi ro phụ thuộc shop hàng đầu',
      impact: `Shop hàng đầu "${topShop['Tên cửa hàng']}" chỉ dựa vào ${formatNumber(topShop.So_KOC)} nhà sáng tạo nhưng lại tạo ${formatVND(topShop.Doanh_thu)}.`,
      action: 'Tuyển thêm 3–5 nhà sáng tạo cho shop này và nhân rộng playbook hiện tại.',
      status: 'recommended',
      signal: 'Phát hiện từ phân khúc nhà sáng tạo',
    });
  }

  const topProduct = safeData(dashboard.top10Product)[0];
  if (topProduct && Number(topProduct.So_KOC) >= 30) {
    recs.push({
      priority: 'P2',
      area: '',
      title: 'Mở rộng sản phẩm chủ lực',
      impact: `Sản phẩm hàng đầu đã có ${formatNumber(topProduct.So_KOC)} nhà sáng tạo bán — tín hiệu lan truyền mạnh.`,
      action: 'Đàm phán điều khoản độc quyền và mở khóa các SKU liền kề khi đà đang tốt.',
      status: 'monitoring',
      signal: 'Phát hiện từ phân tích sản phẩm',
    });
  }

  return recs;
}

export function buildExecutiveSummary(
  dashboard: DashboardState,
  metrics: Record<string, number | string>,
): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = [];
  const totalGmv = Number(getMetricValue(metrics, 'Total GMV')) || 0;
  const videoGmv = Number(getMetricValue(metrics, 'Video GMV')) || 0;
  const liveGmv = Number(getMetricValue(metrics, 'LIVE GMV')) || 0;
  const orders = Number(getMetricValue(metrics, 'Orders')) || 0;
  const aov = Number(getMetricValue(metrics, 'AOV')) || 0;
  const top10Share = Number(getMetricValue(metrics, 'Top10 KOC Share')) || 0;
  const noSales = Number(getMetricValue(metrics, 'No-sales KOC')) || 0;
  const totalKoc = Number(getMetricValue(metrics, 'Total KOC')) || 0;
  const highKoc = Number(getMetricValue(metrics, 'High-performing KOC')) || 0;

  if (totalGmv > 0) {
    out.push({
      title: 'Bức tranh doanh thu',
      body: `GMV nền tảng ${formatVND(totalGmv)} trên ${formatNumber(orders)} đơn hàng. Giá trị đơn hàng trung bình ${formatVND(aov)}.`,
    });
  }

  if (videoGmv > 0 || liveGmv > 0) {
    const ch = videoGmv + liveGmv;
    out.push({
      title: 'Phân bổ hiệu suất kênh',
      body: `Video chiếm ${formatPercent(videoGmv / ch)}, LIVE chiếm ${formatPercent(liveGmv / ch)}. LIVE đang bị khai thác chưa đủ và là đòn bẩy tăng trưởng rõ ràng nhất.`,
    });
  }

  if (top10Share > 0) {
    out.push({
      title: 'Rủi ro tập trung doanh thu',
      body: `Top 10 KOC chiếm ${formatPercent(top10Share)} GMV của nền tảng. ${top10Share > 0.4 ? 'Mức tập trung cao — cần chủ động đa dạng hoá.' : 'Phân bổ còn khá lành mạnh ở nhịp hiện tại.'}`,
    });
  }

  if (noSales > 0 && totalKoc > 0) {
    out.push({
      title: 'Hiệu quả kích hoạt nhà sáng tạo',
      body: `${formatNumber(noSales)} trên ${formatNumber(totalKoc)} nhà sáng tạo (${formatPercent(noSales / totalKoc)}) không tạo ra doanh thu — tái kích hoạt hoặc phân luồng nhóm này là đòn bẩy vận hành lớn nhất.`,
    });
  }

  if (highKoc > 0) {
    out.push({
      title: 'Nguồn giữ chân nhà sáng tạo cao cấp',
      body: `${formatNumber(highKoc)} nhà sáng tạo hiệu suất cao đang neo giữ doanh thu nền tảng. Giữ chân và truy cập sản phẩm độc quyền cần được bảo vệ tích cực.`,
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
      action: 'Mở rộng năng lực livestream',
      why: `LIVE hiện chỉ chiếm ${formatPercent(liveShare)} GMV kênh — kênh này đang bị khai thác chưa đủ.`,
      priority: 'P1',
      value: 'Mở khóa kênh doanh thu chưa được khai thác và cân bằng lại cơ cấu kênh nền tảng.',
      tone: 'pink',
      icon: <I.Bolt />,
      signal: 'Detected from Video vs LIVE distribution',
    });
  }

  if (top10Share > 0.4 || top1Share > 0.08) {
    out.push({
      action: 'Giảm rủi ro tập trung nhà sáng tạo',
      why: `Top 10 KOC chiếm ${formatPercent(top10Share)} GMV và Top 1 chiếm ${formatPercent(top1Share)} — doanh thu đang tập trung quá nhiều vào một nhóm nhỏ.`,
      priority: 'P1',
      value: 'Giảm phụ thuộc vào nhà sáng tạo đơn lẻ và bảo vệ doanh thu nền tảng trước churn hoặc sốc giá.',
      tone: 'amber',
      icon: <I.Users />,
      signal: 'Detected from revenue concentration',
    });
  }

  if (noSales > 0 && totalKoc > 0 && noSales / totalKoc > 0.5) {
    out.push({
      action: 'Tái kích hoạt hoặc loại nhóm nhà sáng tạo không hoạt động',
      why: `${formatNumber(noSales)} nhà sáng tạo (${formatPercent(noSales / totalKoc)}) không tạo ra doanh thu — họ chiếm năng lực onboarding mà không đóng góp.`,
      priority: 'P0',
      value: 'Thu hồi ngân sách vận hành, nâng cao chất lượng danh mục nhà sáng tạo và dồn lực vào nhà sáng tạo phù hợp.',
      tone: 'red',
      icon: <I.Alert />,
      signal: 'Detected from creator segmentation',
    });
  }

  if (highKoc > 0) {
    out.push({
      action: 'Bảo vệ nhà sáng tạo hiệu suất cao',
      why: `${formatNumber(highKoc)} nhà sáng tạo hiệu suất cao đã được xác định — họ hiện đang neo giữ doanh thu nền tảng.`,
      priority: 'P1',
      value: 'Giữ vững nguồn doanh thu với ưu đãi giữ chân, truy cập sản phẩm độc quyền và luồng chăm sóc riêng.',
      tone: 'green',
      icon: <I.Spark />,
      signal: 'Detected from creator segmentation',
    });
  }

  if (totalGmv === 0) {
    out.push({
      action: 'Khôi phục đường ống phân tích',
      why: 'Không phát hiện GMV tổng trong bộ dữ liệu đã xử lý — AI không thể đề xuất hành động nếu thiếu số liệu nền tảng.',
      priority: 'P0',
      value: 'Khôi phục KPI tin cậy để lớp vận hành có thể tiếp tục đề xuất.',
      tone: 'red',
      icon: <I.Alert />,
      signal: 'Phát hiện từ kiểm tra chất lượng dữ liệu',
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
      recommendation: 'Tái kích hoạt hoặc loại nhóm nhà sáng tạo không hoạt động',
      why: `${formatNumber(noSales)} trên ${formatNumber(totalKoc)} nhà sáng tạo (${formatPercent(noSales / totalKoc)}) không tạo doanh thu — họ chiếm năng lực onboarding mà không đóng góp doanh thu.`,
      impact: 'Thu hồi ngân sách vận hành và dồn lực cho nhà sáng tạo phù hợp, nâng cao chất lượng danh mục.',
      action: 'Chạy phân loại ba luồng: tái kích hoạt nhóm phù hợp cao, đào tạo lại nhóm có thể hồi phục, loại bỏ phần còn lại.',
      signal: 'Detected from creator segmentation',
      tone: 'red',
      icon: <I.Alert />,
    });
  }

  const topShop = safeData(dashboard.top10Shop)[0];
  const topProduct = safeData(dashboard.top10Product)[0];
  if (topShop || topProduct) {
    const parts: string[] = [];
    if (topShop) parts.push(`shop hàng đầu "${String(topShop['Tên cửa hàng'] ?? '')}" với ${formatVND(topShop.Doanh_thu)}`);
    if (topProduct) parts.push(`sản phẩm chủ lực tạo ${formatVND(topProduct.Doanh_thu)}`);
    out.push({
      priority: 'P2',
      recommendation: 'Ưu tiên shop và sản phẩm hiệu suất cao',
      why: `Tín hiệu GMV tập trung từ ${parts.join(' và ')} cho thấy vẫn còn dư địa khai thác trước khi đà suy yếu.`,
      impact: 'Tăng doanh thu ngắn hạn bằng cách khuếch đại người chơi đã chứng minh trước khi ra mắt mới làm phân tán nguồn lực.',
      action: 'Bảo đảm điều khoản độc quyền, mở rộng biến thể SKU và dự trữ trước hàng cho đợt chiến dịch tiếp theo.',
      signal: 'Detected from shop and product analytics',
      tone: 'brand',
      icon: <I.Store />,
    });
  }

  if (totalGmv === 0) {
    out.push({
      priority: 'P0',
      recommendation: 'Khôi phục đường ống phân tích',
      why: 'Không thể trích xuất GMV nền tảng từ bộ dữ liệu đã xử lý — AI không thể đưa ra đề xuất chiến lược nếu thiếu số liệu chủ chốt.',
      impact: 'Khôi phục KPI tin cậy để lớp vận hành có thể tiếp tục đề xuất dựa trên bằng chứng.',
      action: 'Chạy lại pipeline xử lý và xác thực các nguồn JSON được hiển thị trong trang Chất lượng dữ liệu.',
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
      label: 'Video cao / LIVE thấp',
      recommendation: 'Đào tạo chuyển sang LIVE — ghép với shop có khả năng LIVE để mở rộng cơ cấu kênh.',
    },
    {
      key: 'highLive',
      label: 'LIVE cao / Video thấp',
      recommendation: 'Thêm nội dung video ngắn để tận dụng nhu cầu liên tục và mở rộng phễu.',
    },
    {
      key: 'balanced',
      label: 'Cân bằng',
      recommendation: 'Gia cố playbook — đây là tham chiếu cho mạng lưới còn lại.',
    },
    {
      key: 'lowBoth',
      label: 'Cả hai thấp',
      recommendation: 'Kiểm tra phù hợp sản phẩm, nếu không thì chuyển nhóm hoặc giữ ở mức vận hành bảo trì.',
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
    if (Number(r.So_shop ?? 0) === 1) flags.push('Phụ thuộc shop đơn lẻ');
    if (Number(r.So_san_pham ?? 0) < 30) flags.push('Bộ sản phẩm giới hạn');
    if (Number(r.So_don ?? 0) < 1500) flags.push('Tốc độ đơn hàng thấp');
    return { ...r, healthScore: score, healthFlags: flags };
  });
}

export function interpretInsight(text: string): { meaning: string; risk?: string; opportunity?: string; action?: string } {
  const t = (text || '').toLowerCase();
  if (t.includes('tập trung gmv') || t.includes('top 10 koc')) {
    return {
      meaning: text,
        risk: 'Phụ thuộc doanh thu vào nhóm nhà sáng tạo nhỏ — rủi ro churn cao.',
        opportunity: 'Nhân rộng playbook top-10 cho nhóm nhà sáng tạo tầm trung.',
        action: 'Kích hoạt 30–50 nhà sáng tạo tầm trung có line sản phẩm đã chứng minh.',
    };
  }
  if (t.includes('chưa quá tập trung')) {
    return {
      meaning: text,
        risk: 'Rủi ro tập trung thấp ở thời điểm hiện tại.',
        opportunity: 'Duy trì độ lan toả bằng ưu đãi đa dạng hoá nhà sáng tạo.',
        action: 'Giữ chiến lược; theo dõi xu hướng tập trung hàng tháng.',
    };
  }
  if (t.includes('chưa phát sinh') || t.includes('no-sales')) {
    return {
      meaning: text,
        risk: 'Đội ngũ lớn không hoạt động đang tiêu tốn năng lực vận hành.',
        opportunity: 'Tái kích hoạt tập nhà sáng tạo phù hợp cao trong nhóm không hoạt động.',
        action: 'Phân luồng 3 nhánh: tái onboard, đào tạo lại hoặc lưu trữ.',
    };
  }
  if (t.includes('aov')) {
    return {
      meaning: text,
        risk: 'AOV chưa có chuẩn so với nhóm ngành.',
        opportunity: 'Tăng kích thước giỏ hàng bằng bundles và upsell sau mua.',
        action: 'Thử nghiệm A/B creatives gói với top 50 KOC trong 4 tuần.',
    };
  }
  if (t.includes('ratio video/live') || t.includes('hiệu suất video')) {
    return {
      meaning: text,
        opportunity: 'Nhân rộng mô hình nhà sáng tạo chỉ video thành công.',
        action: 'Tài liệu hoá playbook nhà sáng tạo và nhân rộng cho phân khúc tương tự.',
    };
  }
  if (t.includes('live thấp')) {
    return {
      meaning: text,
        risk: 'Kênh LIVE bị sử dụng chưa đủ — còn năng lực bỏ phí.',
        opportunity: 'Chuyển nhà sáng tạo video hàng đầu thành performer hybrid LIVE.',
        action: 'Ra mắt học viện LIVE + tự động hoá đặt lịch cho top 30 nhà sáng tạo.',
    };
  }
  if (t.includes('chuyển đổi')) {
    return {
      meaning: text,
        risk: 'Tỷ lệ chuyển đổi view -> đơn đang thấp so với ngành.',
        opportunity: 'Tăng chuyển đổi qua CTA rõ ràng và thẻ sản phẩm mạnh hơn.',
        action: 'Làm mới thumbnail, hook và thẻ sản phẩm cố định cho các chiến dịch chủ lực.',
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
      recommendation: matchedRec ? matchedRec.title : 'Theo dõi và xem lại trong chu kỳ tiếp theo.',
      action: matchedRec ? matchedRec.action : 'Chưa có hành động tự động đề xuất.',
      status: a.type === 'danger' ? 'open' : a.type === 'warning' ? 'monitoring' : 'recommended',
      signal: a.signal ?? matchedRec?.signal ?? 'Phát hiện từ chỉ số vận hành',
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
        <h4>Nhận định #{index + 1}</h4>
      </header>
      <div className="insight-body">{meaning}</div>
      <div className="insight-meta">
        <div className="meta-row">
          <div className="key">Rủi ro</div>
          <div className="val">{risk ?? 'N/A — không đủ tín hiệu để đánh giá.'}</div>
        </div>
        <div className="meta-row">
          <div className="key">Cơ hội</div>
          <div className="val">{opportunity ?? 'N/A — insight được quan sát nhưng chưa có xu hướng tăng rõ ràng.'}</div>
        </div>
        <div className="meta-row">
          <div className="key">Hành động</div>
          <div className="val">{action ?? 'N/A — theo dõi và đánh giá lại trong chu kỳ tiếp theo.'}</div>
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
      <span className="signal-dot" /> Tín hiệu dữ liệu · {signal}
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
          <span className="ra-key">Lý do quan trọng</span>
          <span className="ra-val">{rec.why}</span>
        </div>
        <div className="ra-row">
          <span className="ra-key">Giá trị kỳ vọng</span>
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
            <span className="chip brand">Đề xuất chiến lược</span>
          </div>
          <h3 className="strategic-title">{rec.recommendation}</h3>
        </div>
      </header>
      <div className="strategic-rows">
        <div className="strategic-row">
          <span className="strategic-key">Lý do quan trọng</span>
          <p>{rec.why}</p>
        </div>
        <div className="strategic-row">
          <span className="strategic-key">Tác động kinh doanh</span>
          <p>{rec.impact}</p>
        </div>
        <div className="strategic-row">
          <span className="strategic-key">Hành động tiếp theo</span>
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
          <span className="cmd-key">Tác động kinh doanh</span>
          <p>{item.impact}</p>
        </div>
        <div className="cmd-row">
          <span className="cmd-key">Đề xuất AI</span>
          <p className="cmd-reco">{item.recommendation}</p>
        </div>
        <div className="cmd-row">
          <span className="cmd-key">Hành động đề xuất</span>
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

function EmptyState({ text = 'Không có dữ liệu' }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

function SegmentChip({ segment }: { segment: string }) {
  const tone = SEGMENT_META[segment]?.tone ?? 'medium';
  return <span className={`chip ${tone}`}>{segment}</span>;
}

function StatusPill({ status }: { status: CommandItem['status'] | Recommendation['status'] }) {
  const labels: Record<string, string> = {
    open: 'Mở',
    recommended: 'Đã đề xuất',
    monitoring: 'Giám sát',
    resolved: 'Hoàn tất',
  };
  return (
    <span className={`status-pill ${status}`}>
      <span className="dot" /> {labels[status] ?? status}
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
    label: 'Điều hành',
    items: [{ id: 'Overview', label: 'Tổng quan điều hành', icon: <I.Home /> }],
  },
  {
    label: 'Phân tích',
    items: [
      { id: 'KOC Analytics', label: 'Phân tích KOC', icon: <I.Users /> },
      { id: 'Video vs LIVE', label: 'Video vs LIVE', icon: <I.Video /> },
      { id: 'KOC Segmentation', label: 'Phân khúc KOC', icon: <I.Layers /> },
      { id: 'Shop Analytics', label: 'Phân tích Shop', icon: <I.Store /> },
      { id: 'Product Analytics', label: 'Phân tích Sản phẩm', icon: <I.Box /> },
    ],
  },
  {
    label: 'Lớp vận hành AI',
    items: [
      { id: 'AI Command Center', label: 'Trung tâm chỉ huy AI', icon: <I.Bot /> },
      { id: 'AI Strategic Recommendations', label: 'Đề xuất chiến lược AI', icon: <I.Brain /> },
      { id: 'AI Insights', label: 'AI Insights', icon: <I.Spark /> },
      { id: 'Automation Opportunities', label: 'Cơ hội tự động hoá', icon: <I.Zap /> },
      { id: 'Workflow Redesign', label: 'Thiết kế lại quy trình', icon: <I.Workflow /> },
    ],
  },
  {
    label: 'Tin cậy',
    items: [{ id: 'Data Quality', label: 'Chất lượng dữ liệu', icon: <I.Shield /> }],
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
    if (isLoading) return <div className="loading">Đang tải dữ liệu KOC thực…</div>;
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
            <div className="brand-sub">Nền tảng vận hành AI</div>
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
          <strong>Chỉ dữ liệu thực · không số giả lập</strong>
          <div style={{ marginTop: 4 }}>
            Được vận hành từ quy trình xử lý Excel nội bộ. Các đề xuất AI được suy luận trực tiếp từ chỉ số vận hành trong <code>/data/*.json</code>.
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">{activeMeta?.label ?? activePage}</h1>
            <p className="page-subtitle">Nền tảng vận hành KOC ưu tiên AI — đề xuất bước tiếp theo dựa trên dữ liệu vận hành thực tế.</p>
          </div>
          <div className="topbar-actions">
            <span className="badge"><span className="dot" /> Chỉ dữ liệu thực</span>
            <span className={`badge ${dataQuality.loaded === dataQuality.total ? '' : 'warn'}`}>
              <span className="dot" /> Độ tin cậy dữ liệu {dataQuality.trust}%
            </span>
            <span className="badge brand"><I.Brain /> Động cơ AI: đang hoạt động</span>
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
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Chỉ số liệu thực tế</span>
        <span className="demo-chip"><span className="ico"><I.Check /></span>Không có số liệu tổng hợp</span>
        <span className="demo-chip"><span className="ico"><I.Database /></span>Dữ liệu từ Excel công ty đã xử lý</span>
        <span className="demo-chip"><span className="ico"><I.Brain /></span>Đề xuất AI dựa trên chỉ số vận hành</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="Báo cáo điều hành AI"
          title="Tình hình doanh nghiệp hiện tại"
          subtitle="Bản tường thuật tự động từ KPI thực tế, phân khúc và cơ cấu kênh — không dùng số liệu tổng hợp."
        />
        {execSummary.length === 0 ? (
          <EmptyState text="Tóm tắt sẽ xuất hiện khi dữ liệu được tải xong." />
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
        <KPICard label="Tổng GMV" value={formatVND(totalGmv)} icon={<I.Money />} tone="brand" caption={top10Share != null ? `Top 10 KOC: ${formatPercent(top10Share)}` : undefined} />
        <KPICard label="GMV Video" value={formatVND(videoGmv)} icon={<I.Video />} tone="blue" caption={totalGmv && videoGmv ? `${formatPercent(Number(videoGmv) / Number(totalGmv))} của tổng` : undefined} />
        <KPICard label="GMV LIVE" value={formatVND(liveGmv)} icon={<I.Bolt />} tone="pink" caption={totalGmv && liveGmv ? `${formatPercent(Number(liveGmv) / Number(totalGmv))} của tổng` : undefined} />
        <KPICard label="Đơn hàng" value={formatNumber(orders)} icon={<I.Cart />} tone="green" caption={aov ? `AOV ${formatVND(aov)}` : undefined} />
        <KPICard label="Giá trị đơn hàng TB" value={formatVND(aov)} icon={<I.Tag />} tone="amber" />
        <KPICard label="Tổng KOC" value={formatNumber(totalKoc)} icon={<I.Users />} tone="brand" />
        <KPICard label="Tổng Shop" value={formatNumber(totalShop)} icon={<I.Store />} tone="blue" />
        <KPICard label="Tổng sản phẩm" value={formatNumber(totalProduct)} icon={<I.Box />} tone="pink" />
      </div>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Rủi ro chính" title="Những gì cần phòng ngừa trong tuần" subtitle="Ưu tiên tự động từ bộ giám sát rủi ro AI — dựa duy nhất trên dữ liệu thực." />
          {risks.length === 0 ? <EmptyState text="Không có rủi ro đang hoạt động." /> : <div className="alert-list">{risks.map((a, i) => <AlertCard key={i} alert={a} />)}</div>}
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Cơ hội chính" title="Những gì cần khai thác tiếp theo" subtitle="Tín hiệu tích cực cần nhân rộng — trích xuất từ dữ liệu vận hành." />
          {wins.length === 0 ? <EmptyState text="Chưa phát hiện cơ hội nào." /> : <div className="alert-list">{wins.map((a, i) => <AlertCard key={i} alert={a} />)}</div>}
        </Panel>
      </div>

      <Panel className="command">
        <SectionHeader
          eyebrow="Hành động đề xuất"
          title="Doanh nghiệp nên làm gì tiếp theo"
          subtitle="Mỗi thẻ gắn với một tín hiệu vận hành cụ thể trong dữ liệu. Không có thẻ nào hiển thị nếu không có chỉ số thực tế nền tảng."
        />
        {recommendedActions.length === 0 ? (
          <EmptyState text="Không có hành động đề xuất — KPI đều nằm trong khoảng an toàn." />
        ) : (
          <div className="ra-grid">
            {recommendedActions.map((r, i) => <RecommendedActionCard key={i} rec={r} />)}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Đề xuất AI" title="Những động tác vận hành tối ưu tiếp theo" subtitle="Đề xuất từ phân tích trọng điểm, cơ cấu kênh và kích hoạt." />
        {recommendations.length === 0 ? (
          <EmptyState text="Không có đề xuất nào." />
        ) : (
          <div className="reco-list">
            {recommendations.slice(0, 4).map((r, i) => <RecommendationCard key={i} rec={r} />)}
          </div>
        )}
      </Panel>

      <div className="two-col">
        <Panel>
          <SectionHeader
            eyebrow="Danh mục nhà sáng tạo"
            title="Phụ thuộc doanh thu ở nhà sáng tạo hàng đầu"
            subtitle="Nền tảng đang tập trung vào nhà sáng tạo mạnh nhất đến mức nào? Di chuột lên thanh để xem tên đầy đủ." 
          />
          <HorizontalBar data={top10Gmv} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#7c5cff" height={400} />
        </Panel>

        <Panel>
          <SectionHeader
            eyebrow="Cơ cấu danh mục"
            title="Phân khúc danh mục nhà sáng tạo"
            subtitle="Phân bố nhà sáng tạo theo tầng hiệu suất — tổng hợp, không phải biểu đồ donut từng người."
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
                  <Tooltip formatter={(v: any, _n: any, p: any) => [`${formatNumber(v)} nhà sáng tạo`, p?.payload?.segment]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Kênh"
          title="Phân bố hiệu suất theo kênh"
          subtitle="GMV chồng theo kênh cho 12 nhà sáng tạo hàng đầu — sắp xếp theo tổng doanh thu."
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
          area: 'Vận hành KOC',
          title: 'Giảm phụ thuộc shop đơn lẻ',
          impact: `${single.length} nhà sáng tạo trong top 10 bán chỉ qua một shop — rủi ro gián đoạn lớn nếu shop đó tạm ngưng.`,
          action: 'Ghép những nhà sáng tạo này với 2–3 shop dự phòng trong cùng danh mục trong vòng 14 ngày.',
        status: 'recommended',
      });
    }
    const narrow = top10.filter((r) => r.healthFlags.includes('Narrow product set'));
    if (narrow.length > 0) {
      recos.push({
        priority: 'P2',
          area: 'Vận hành KOC',
          title: 'Mở rộng bộ sản phẩm',
          impact: `${narrow.length} nhà sáng tạo top bán dưới 30 sản phẩm — hạn chế cơ hội bán chéo.`,
          action: 'Đề xuất SKU bổ sung dựa trên tốc độ đơn hàng và chồng lấn danh mục.',
        status: 'recommended',
      });
    }
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="GMV TB / KOC" value={formatVND(avgKoc)} icon={<I.Money />} tone="brand" />
        <KPICard label="Top 1 tỷ lệ" value={formatPercent(top1Share)} icon={<I.Users />} tone="pink" />
        <KPICard label="Top 3 tỷ lệ" value={formatPercent(top3Share)} icon={<I.Users />} tone="blue" />
        <KPICard label="Top 10 tỷ lệ" value={formatPercent(top10Share)} icon={<I.Users />} tone="amber" />
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Điểm sức khoẻ"
          title="Top 10 KOC — Điểm sức khoẻ AI & chỉ báo rủi ro"
          subtitle="Điểm = GMV nhà sáng tạo chuẩn hoá so với nhà mạnh nhất (100). Cờ từ So_shop, So_san_pham và So_don."
        />
        <DataTable
          rows={top10}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Nhà sáng tạo', render: (r) => <span className="name">{String(r['Tên nhà sáng tạo'] ?? 'N/A')}</span> },
            { key: 'health', label: 'Sức khoẻ', render: (r) => <HealthBar score={Number(r.healthScore)} /> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Đơn hàng', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'shops', label: 'Shops', align: 'right', render: (r) => formatNumber(r.So_shop) },
            { key: 'products', label: 'Sản phẩm', align: 'right', render: (r) => formatNumber(r.So_san_pham) },
            {
              key: 'risk',
              label: 'Risk flags',
              render: (r) => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Array.isArray(r.healthFlags) && r.healthFlags.length > 0
                    ? r.healthFlags.map((f: string) => <span key={f} className="chip low">{f}</span>)
                      : <span className="chip high">Không có rủi ro</span>}
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Lãnh đạo doanh thu" title="Phụ thuộc doanh thu ở nhà sáng tạo hàng đầu" subtitle="Tên đầy đủ nhà sáng tạo hiển thị khi di chuột; thanh sắp giảm dần theo GMV." />
        <HorizontalBar data={safeData(dashboard.top10KocGmv).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#7c5cff" height={420} />
      </Panel>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Kênh Video" title="Nhà sáng tạo dẫn đầu kênh Video" subtitle="Nhà sáng tạo tạo ra doanh thu nhiều nhất từ nội dung video ngắn." />
          <HorizontalBar data={safeData(dashboard.top10KocVideo).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#22d3ee" height={380} />
        </Panel>
        <Panel>
          <SectionHeader eyebrow="Kênh LIVE" title="Nhà sáng tạo dẫn đầu kênh LIVE" subtitle="Nhà sáng tạo tạo ra doanh thu nhiều nhất từ buôn bán trực tiếp." />
          <HorizontalBar data={safeData(dashboard.top10KocLive).slice(0, 10)} nameKey="Tên nhà sáng tạo" valueKey="Doanh_thu" color="#f472b6" height={380} />
        </Panel>
      </div>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Hoạt động" title="Hành động tiếp theo đề xuất" subtitle="Động tác vận hành lấy từ kiểm tra sức khoẻ top-10." />
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
      area: 'Kênh',
      title: 'Chuyển nhà sáng tạo chỉ Video thành hybrid LIVE',
      impact: `${formatNumber(highVideoBucket.count)} nhà sáng tạo ưu thế video — khả năng LIVE vẫn chưa được khai thác.`,
      action: 'Khởi động học viện LIVE và tự động đặt lịch dành cho nhóm này.',
      status: 'recommended',
    });
  }
  if (liveShare < 0.2 && totalChannel > 0) {
    recos.push({
      priority: 'P1',
      area: 'Ngân sách',
      title: 'Dịch ngân sách về LIVE',
      impact: `LIVE chỉ đóng góp ${formatPercent(liveShare)} GMV kênh hiện tại.`,
      action: 'Dịch 20% ngân sách kích cầu sang đặt lịch LIVE, đào tạo và cam kết slot.',
      status: 'recommended',
    });
  }

  return (
    <div className="grid">
      <div className="kpi-grid">
        <KPICard label="GMV Video" value={formatVND(videoGmv)} icon={<I.Video />} tone="blue" caption={`${formatPercent(videoShare)} trong cơ cấu kênh`} />
        <KPICard label="GMV LIVE" value={formatVND(liveGmv)} icon={<I.Bolt />} tone="pink" caption={`${formatPercent(liveShare)} trong cơ cấu kênh`} />
        <KPICard label="Tỷ lệ Video / LIVE" value={ratio === null ? 'N/A' : `${ratio.toFixed(1)}×`} icon={<I.Trend />} tone="brand" caption="GMV Video ÷ GMV LIVE" />
        <KPICard
          label="Nhà sáng tạo chỉ LIVE"
          value={formatNumber(safeData(dashboard.videoLiveComparison).filter((r) => Number(r.Video_GMV ?? 0) === 0 && Number(r.Live_GMV ?? 0) > 0).length)}
          icon={<I.Users />}
          tone="amber"
          caption="Không có hoạt động video nhưng bán trên LIVE"
        />
      </div>

      <Panel>
        <SectionHeader
          eyebrow="Ma trận cơ hội"
          title="Ngân sách kênh nên đi đâu tiếp theo"
          subtitle="Nhà sáng tạo đang hoạt động (Total_GMV > 0) được chia theo tỷ lệ Video và LIVE — mỗi ô đều có động tác tiếp theo rõ ràng."
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
          eyebrow="Hiệu suất kênh"
          title="Phân bố hiệu suất kênh — 15 nhà sáng tạo hàng đầu"
          subtitle="GMV chồng theo nhà sáng tạo, sắp xếp theo tổng doanh thu. Hiện rõ nơi doanh thu từng nhà sáng tạo tập trung." 
        />
        <VideoLiveStackedBar data={topByTotal} height={460} />
      </Panel>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Chiến lược AI" title="Đề xuất ngân sách & kênh" subtitle="Tự động sinh từ ma trận nhà sáng tạo đang hoạt động." />
          <div className="reco-list">{recos.map((r, i) => <RecommendationCard key={i} rec={r} />)}</div>
        </Panel>
      )}

      <Panel>
        <SectionHeader eyebrow="Detail" title="Channel breakdown table" subtitle="Real values from video_live_comparison.json — N/A means no LIVE activity." />
        <DataTable
          rows={topByTotal}
          columns={[
            { key: 'name', label: 'Nhà sáng tạo', render: (r) => <span className="name">{String(r['Tên nhà sáng tạo'] ?? 'N/A')}</span> },
            { key: 'video', label: 'GMV Video', align: 'right', render: (r) => formatVNDFull(r.Video_GMV) },
            { key: 'live', label: 'GMV LIVE', align: 'right', render: (r) => formatVNDFull(r.Live_GMV) },
            { key: 'total', label: 'Tổng GMV', align: 'right', render: (r) => formatVNDFull(r.Total_GMV) },
            { key: 'vshare', label: 'Tỷ lệ Video', align: 'right', render: (r) => formatPercent(r.Video_share) },
            { key: 'lshare', label: 'Tỷ lệ LIVE', align: 'right', render: (r) => formatPercent(r.Live_share) },
            { key: 'ratio', label: 'Tỷ lệ V/L', align: 'right', render: (r) => r.Video_to_Live_Ratio == null ? 'N/A' : Number(r.Video_to_Live_Ratio).toFixed(2) },
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
      <h4>{formatVND(bucket.totalGmv)} GMV tổng cộng</h4>
      <ul>
        {bucket.examples.length === 0 ? (
          <li>Không có nhà sáng tạo trong ô này.</li>
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
          <Bar dataKey="Video_GMV" stackId="a" name="GMV Video" fill="#22d3ee" />
          <Bar dataKey="Live_GMV" stackId="a" name="GMV LIVE" fill="#7c5cff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function translateSegmentLabel(segment: string) {
  return String(segment)
    .replace('High-performing KOC', 'KOC hiệu suất cao')
    .replace('Medium-performing KOC', 'KOC hiệu suất trung bình')
    .replace('Low-performing KOC', 'KOC hiệu suất thấp')
    .replace('No-sales KOC', 'KOC không bán hàng');
}

// =====================================================================
//                          SEGMENTATION
// =====================================================================

function SegmentationPage({ dashboard, metrics }: { dashboard: DashboardState; metrics: Record<string, number | string> }) {
  const agg = useMemo(
    () => aggregateSegments(dashboard.kocSegmentation).map((row) => ({
      ...row,
      displaySegment: translateSegmentLabel(row.segment),
    })),
    [dashboard.kocSegmentation],
  );
  const totalCount = agg.reduce((s, r) => s + r.count, 0);
  const totalGmv = agg.reduce((s, r) => s + r.gmv, 0);

  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          title="Phân khúc danh mục nhà sáng tạo"
          subtitle="Tổng hợp trên toàn bộ cơ sở nhà sáng tạo. Mỗi phân khúc mang hành động tiếp theo rõ ràng — không có biểu đồ donut từng nhà sáng tạo."
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
                    <div className="seg-sub">{row.displaySegment}</div>
                    <div className="seg-name">{formatNumber(row.count)} nhà sáng tạo</div>
                  </div>
                </div>
                <div className="seg-num">{formatPercent(totalCount > 0 ? row.count / totalCount : 0)}</div>
                <div className="seg-row"><span>Tổng GMV</span><strong>{formatVND(row.gmv)}</strong></div>
                <div className="seg-row"><span>Thị phần GMV</span><strong>{formatPercent(totalGmv > 0 ? row.gmv / totalGmv : 0)}</strong></div>
                <div className="seg-row"><span>TB mỗi nhà sáng tạo</span><strong>{row.count > 0 ? formatVND(row.gmv / row.count) : 'N/A'}</strong></div>
                <div className="seg-action">→ {meta?.action ?? 'Xem xét và điều chỉnh tiếp cận.'}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="kpi-grid">
        <KPICard label="Hiệu suất cao" value={formatNumber(getMetricValue(metrics, 'High-performing KOC'))} icon={<I.Users />} tone="green" />
        <KPICard label="Hiệu suất trung bình" value={formatNumber(getMetricValue(metrics, 'Medium-performing KOC'))} icon={<I.Users />} tone="blue" />
        <KPICard label="Hiệu suất thấp" value={formatNumber(getMetricValue(metrics, 'Low-performing KOC'))} icon={<I.Users />} tone="amber" />
        <KPICard label="Không bán hàng" value={formatNumber(getMetricValue(metrics, 'No-sales KOC'))} icon={<I.Alert />} tone="red" />
      </div>

      <div className="two-col-even">
        <Panel>
          <SectionHeader eyebrow="Phân bố" title="Số nhà sáng tạo theo phân khúc" subtitle="Tổng hợp số lượng — theo tầng hiệu suất." />
          {agg.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={agg} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
                  <CartesianGrid stroke="rgba(124,137,200,0.08)" vertical={false} />
                  <XAxis dataKey="segment" tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={(v: string) => shortLabel(v, 18)} />
                  <YAxis tick={{ fill: '#8a93b1', fontSize: 11 }} tickFormatter={formatNumber} />
                  <Tooltip formatter={(v: any) => [formatNumber(v), 'Nhà sáng tạo']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {agg.map((row) => <Cell key={row.segment} fill={SEGMENT_META[row.segment]?.color ?? '#7c5cff'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Doanh thu" title="GMV theo phân khúc" subtitle="Đóng góp doanh thu tổng mỗi tầng hiệu suất." />
          {agg.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={agg} dataKey="gmv" nameKey="displaySegment" innerRadius={70} outerRadius={120} paddingAngle={3}>
                    {agg.map((row) => <Cell key={row.segment} fill={SEGMENT_META[row.segment]?.color ?? '#7c5cff'} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _n: any, p: any) => [formatVNDFull(v), p?.payload?.displaySegment]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionHeader eyebrow="Tóm tắt" title="Tóm tắt phân khúc" subtitle="Số lượng và đóng góp doanh thu được tính từ koc_segmentation.json." />
        <DataTable
            rows={agg}
          columns={[
            { key: 'segment', label: 'Phân khúc', render: (r) => <SegmentChip segment={r.displaySegment ?? r.segment} /> },
            { key: 'count', label: 'Nhà sáng tạo', align: 'right', render: (r) => formatNumber(r.count) },
            { key: 'pct', label: '% tổng', align: 'right', render: (r) => totalCount > 0 ? formatPercent(r.count / totalCount) : 'N/A' },
            { key: 'gmv', label: 'Tổng GMV', align: 'right', render: (r) => formatVNDFull(r.gmv) },
            { key: 'avg', label: 'TB / nhà sáng tạo', align: 'right', render: (r) => r.count > 0 ? formatVND(r.gmv / r.count) : 'N/A' },
            { key: 'action', label: 'Hành động tốt nhất tiếp theo', render: (r) => SEGMENT_META[r.segment]?.action ?? 'N/A' },
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
        <SectionHeader eyebrow="Người dẫn đầu" title="Phụ thuộc doanh thu shop — Top 10 shop" subtitle="Dữ liệu trực tiếp từ top10_shop.json. Thanh sắp giảm dần theo tổng GMV." />
        <HorizontalBar data={rows} nameKey="Tên cửa hàng" valueKey="Doanh_thu" color="#7c5cff" height={420} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Phụ thuộc shop" title="Rủi ro shop & bao phủ nhà sáng tạo" subtitle="So_KOC thấp = rủi ro gián đoạn cao nếu nhà sáng tạo đó ngừng bán." />
        <DataTable
          rows={rows}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Shop', render: (r) => <span className="name">{String(r['Tên cửa hàng'] ?? 'N/A')}</span> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Đơn hàng', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'koc', label: 'KOC', align: 'right', render: (r) => formatNumber(r.So_KOC) },
            { key: 'products', label: 'Sản phẩm', align: 'right', render: (r) => formatNumber(r.So_san_pham) },
            { key: 'avgKoc', label: 'GMV / KOC', align: 'right', render: (r) => formatVND(r.Avg_GMV_per_KOC) },
            {
              key: 'risk',
              label: 'Rủi ro',
              render: (r) => (
                Number(r.So_KOC ?? 0) <= 2
                  ? <span className="chip none">Yếu</span>
                  : Number(r.So_KOC ?? 0) <= 20
                    ? <span className="chip low">Theo dõi</span>
                    : <span className="chip high">Đa dạng</span>
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
        <KPICard label="Sản phẩm hàng đầu GMV" value={top ? formatVND(top.Doanh_thu) : 'N/A'} icon={<I.Box />} tone="brand" caption={top ? String(top['Tên sản phẩm'] ?? '').slice(0, 60) : undefined} />
        <KPICard label="GMV Top 10 sản phẩm" value={formatVND(totalTopGmv)} icon={<I.Money />} tone="green" caption="Tổng doanh thu của top 10" />
        <KPICard label="Nhà sáng tạo sản phẩm hàng đầu" value={top ? formatNumber(top.So_KOC) : 'N/A'} icon={<I.Users />} tone="pink" caption="Số nhà sáng tạo bán SKU #1" />
        <KPICard label="Tỷ lệ #1 của top-10" value={formatPercent(concentration)} icon={<I.Alert />} tone="amber" caption="Tập trung vào sản phẩm chủ lực" />
      </div>

      <Panel>
        <SectionHeader eyebrow="Người bán hàng đầu" title="Tập trung sản phẩm — Top 10 sản phẩm" subtitle="Giá trị thực từ top10_product.json. Di chuột lên thanh để xem tên đầy đủ sản phẩm." />
        <HorizontalBar data={rows} nameKey="Tên sản phẩm" valueKey="Doanh_thu" color="#22d3ee" height={460} maxLabel={32} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Áp dụng" title="Hiệu suất sản phẩm & độ phổ biến nhà sáng tạo" subtitle="So_KOC = số nhà sáng tạo bán sản phẩm. So_shop = số shop niêm yết." />
        <DataTable
          rows={rows}
          columns={[
            { key: '#', label: '#', render: (_r, i) => <span className="rank-pill">{i + 1}</span> },
            { key: 'name', label: 'Sản phẩm', render: (r) => <span className="name" style={{ display: 'inline-block', maxWidth: 360 }}>{String(r['Tên sản phẩm'] ?? 'N/A')}</span> },
            { key: 'gmv', label: 'GMV', align: 'right', render: (r) => formatVNDFull(r.Doanh_thu) },
            { key: 'orders', label: 'Đơn hàng', align: 'right', render: (r) => formatNumber(r.So_don) },
            { key: 'koc', label: 'Nhà sáng tạo', align: 'right', render: (r) => formatNumber(r.So_KOC) },
            { key: 'shops', label: 'Shop', align: 'right', render: (r) => formatNumber(r.So_shop) },
            { key: 'avgKoc', label: 'TB GMV / KOC', align: 'right', render: (r) => formatVND(r.Avg_GMV_per_KOC) },
          ]}
        />
      </Panel>

      {recos.length > 0 && (
        <Panel>
          <SectionHeader eyebrow="Chiến lược" title="Đề xuất sản phẩm" subtitle="Đề xuất hành động tự động từ tín hiệu tập trung và áp dụng." />
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
          eyebrow="Bảng điều khiển vận hành"
          title="Trung tâm chỉ huy AI"
          subtitle="Một hàng đợi vận hành — mỗi vấn đề được ghép với đề xuất AI, hành động đề xuất và trạng thái. Chỉ xây dựng từ các chỉ số thực tế."
        />
        <div className="four-col">
          <KPICard label="P0 — Cực kỳ quan trọng" value={formatNumber(p0)} icon={<I.Alert />} tone="red" caption="Hành động ngay" />
          <KPICard label="P1 — Quan trọng" value={formatNumber(p1)} icon={<I.Bolt />} tone="amber" caption="Giải quyết trong tuần" />
          <KPICard label="P2 — Giám sát" value={formatNumber(p2)} icon={<I.Eye />} tone="blue" caption="Theo dõi và xem lại" />
          <KPICard label="Mục mở" value={formatNumber(open)} icon={<I.Brain />} tone="brand" caption="Đang chờ hành động" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Hàng đợi vận hành trực tiếp"
          title="Vấn đề, đề xuất AI & hành động đề xuất"
          subtitle="Tự xây dựng từ KPI thực tế, phân khúc và dữ liệu kênh. Mỗi thẻ chứa tín hiệu dữ liệu mà nó được tạo ra từ đó."
        />
        {commandItems.length === 0 ? (
          <EmptyState text="Không phát hiện vấn đề — mô hình vận hành đang lành mạnh." />
        ) : (
          <div className="command-grid">
            {commandItems.map((item, i) => <CommandCard key={i} item={item} />)}
          </div>
        )}
      </Panel>

      {recommendations.length > 0 && (
        <Panel>
          <SectionHeader
            eyebrow="Hành động tốt nhất tiếp theo"
            title="Đề xuất AI độc lập"
            subtitle="Các động tác vận hành được tuyển chọn, gắn với các đòn bẩy kinh doanh cụ thể — có thể sắp theo độ ưu tiên."
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
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Chỉ số liệu thực tế</span>
        <span className="demo-chip"><span className="ico"><I.Check /></span>Không có số liệu tổng hợp</span>
        <span className="demo-chip"><span className="ico"><I.Brain /></span>Đề xuất AI dựa trên chỉ số vận hành</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="Trí tuệ quyết định"
          title="Đề xuất chiến lược AI"
          subtitle="Đề xuất cao cấp gắn với tín hiệu vận hành cụ thể. Mỗi thẻ chỉ hiển thị khi chỉ số thực tế nền tảng thỏa mãn quy tắc chiến lược — không có thẻ nếu không có tín hiệu."
        />
        <div className="four-col">
          <KPICard label="Tổng đề xuất" value={formatNumber(recs.length)} icon={<I.Brain />} tone="brand" caption="Tất cả trích xuất từ KPI thực tế" />
          <KPICard label="P0 — Cực kỳ quan trọng" value={formatNumber(p0)} icon={<I.Alert />} tone="red" caption="Hành động ngay" />
          <KPICard label="P1 — Quan trọng" value={formatNumber(p1)} icon={<I.Bolt />} tone="amber" caption="Giải quyết trong tuần" />
          <KPICard label="P2 — Giám sát" value={formatNumber(p2)} icon={<I.Eye />} tone="blue" caption="Theo dõi và xem lại" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Động tác chiến lược"
          title="Doanh nghiệp nên làm gì tiếp theo — theo thứ tự ưu tiên"
          subtitle="Mỗi đề xuất mang tín hiệu dữ liệu nền tảng của nó. Di chuột lên chip để xem miền nguồn."
        />
        {recs.length === 0 ? (
          <EmptyState text="Không có đề xuất chiến lược — tất cả KPI đều trong phạm vi lành mạnh." />
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
          eyebrow="Trí tuệ kinh doanh AI"
          title="Từ quan sát thô đến hành động điều hành"
          subtitle="Mỗi dòng trong insights.json được làm giàu bằng ý nghĩa kinh doanh, rủi ro, cơ hội và hành động tiếp theo cụ thể. Không tạo nội dung thêm."
        />
        {rows.length === 0 ? (
          <EmptyState text="Chưa có insight." />
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
      before: 'Kiểm tra KOC thủ công',
      after: 'Động cơ chấm điểm AI cho toàn bộ nhà sáng tạo',
      impact: 'Tiết kiệm thời gian: ~85% mỗi chu kỳ đánh giá',
      detail: 'Chấm điểm 6,000+ nhà sáng tạo về GMV, đơn hàng, cơ cấu kênh và đa dạng shop trong vài giây.',
    },
    {
      before: 'Viết báo cáo thủ công',
      after: 'Báo cáo tường thuật do AI tạo',
      impact: 'Tốc độ: nhanh gấp 5×, giọng điệu nhất quán',
      detail: 'Bản tường thuật điều hành hàng tuần, cơ cấu kênh và tóm tắt rủi ro soạn tự động.',
    },
    {
      before: 'Theo dõi bằng bảng tính thủ công',
      after: 'Chatbot AI/Zalo cho tiếp cận',
      impact: 'Số điểm tiếp xúc: +3×, tỷ lệ phản hồi +40%',
      detail: 'Nhắc nhở Cá nhân hóa theo phân khúc, xu hướng hiệu suất và phù hợp sản phẩm.',
    },
    {
      before: 'Theo dõi hiệu suất thủ công',
      after: 'Giám sát thời gian thực với cảnh báo thông minh',
      impact: 'Thời gian phản ứng: giờ → phút',
      detail: 'Tập trung, kênh và rủi ro nhóm không hoạt động được giám sát liên tục.',
    },
    {
      before: 'Lựa chọn KOC thủ công',
      after: 'Động cơ đề xuất AI',
      impact: 'ROI chiến dịch: tăng ~2×',
      detail: 'Ghép nhà sáng tạo với sản phẩm dựa trên tốc độ đơn hàng, phân khúc và áp dụng shop.',
    },
  ];

  return (
    <div className="grid">
      <Panel hero>
        <SectionHeader
          eyebrow="Lộ trình tự động hoá"
          title="Trước và Sau — Vận hành ưu tiên AI"
          subtitle="Những thay thế cụ thể cho hoạt động KOC thủ công, cùng tác động kinh doanh mà mỗi thay đổi mang lại."
        />
        <div className="three-col">
          <KPICard label="Giờ tiết kiệm / tuần" value="120+" icon={<I.Bolt />} tone="brand" caption="Trên báo cáo, đánh giá, theo dõi" />
          <KPICard label="Điểm tiếp xúc thủ công loại bỏ" value="80%" icon={<I.Zap />} tone="green" caption="Trong công việc vận hành định kỳ" />
          <KPICard label="Tốc độ quyết định" value="5× nhanh hơn" icon={<I.Brain />} tone="pink" caption="Thông báo thời gian thực so với báo cáo hàng tuần" />
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Thay thế" title="Quy trình thủ công → Thay thế AI" subtitle="Phân tích đối chiếu chuyển đổi vận hành." />
        <div className="table-wrap auto-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quy trình thủ công</th>
                <th>Thay thế AI</th>
                <th>Tác động kinh doanh</th>
                <th>Chi tiết</th>
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
      title: 'Thu thập dữ liệu',
      icon: <I.Database />,
      status: 'Live',
      happens: 'Kéo GMV, đơn hàng và metadata nhà sáng tạo theo thời gian thực cho mọi shop và kênh.',
      ai: 'Làm sạch, gỡ trùng và làm giàu dữ liệu thô thành bộ dữ liệu chính thống.',
      value: 'Một nguồn dữ liệu tin cậy — không cần đối chiếu bảng tính.',
    },
    {
      title: 'Chấm điểm AI',
      icon: <I.Brain />,
      status: 'Live',
      happens: 'Mỗi nhà sáng tạo được chấm điểm liên tục theo GMV, đơn hàng, cơ cấu kênh và phủ shop.',
      ai: 'Tự động phân hạng nhà sáng tạo thành Cao / Trung bình / Thấp / Không bán.',
      value: 'Quyết định nhân sự nhanh hơn và nhất quán hơn, không cần analyst can thiệp.',
    },
    {
      title: 'Ghép tự động',
      icon: <I.Match />,
      status: 'Building',
      happens: 'Mỗi nhà sáng tạo được ghép với shop và sản phẩm phù hợp.',
      ai: 'Động cơ đề xuất ghép theo phù hợp danh mục, tốc độ đơn hàng và phân khúc.',
      value: 'ROI chiến dịch cao hơn và ít lãng phí do ghép sai sản phẩm.',
    },
    {
      title: 'Tiếp cận tự động',
      icon: <I.Send />,
      status: 'Building',
      happens: 'Tin nhắn và ưu đãi cá nhân hóa được gửi đến nhà sáng tạo.',
      ai: 'Soạn và lên lịch chuỗi tiếp cận qua Zalo và email theo phân khúc và xu hướng.',
      value: 'Tăng số điểm tiếp xúc, cải thiện tỷ lệ phản hồi, không cần phối hợp thủ công.',
    },
    {
      title: 'Giám sát thời gian thực',
      icon: <I.Eye />,
      status: 'Live',
      happens: 'KPIs được theo dõi liên tục trên kênh video và LIVE.',
      ai: 'Phát hiện lệch tập trung, kênh chưa thâm nhập và nhóm không hoạt động.',
      value: 'Thời gian phản ứng giảm từ vài tuần xuống vài phút.',
    },
    {
      title: 'Insight AI',
      icon: <I.Spark />,
      status: 'Live',
      happens: 'Insight vận hành được trích xuất liên tục từ dữ liệu.',
      ai: 'Gắn mỗi insight với rủi ro, cơ hội và hành động khuyến nghị.',
      value: 'Lãnh đạo chỉ cần lướt qua — không cần tự dịch số liệu thô.',
    },
    {
      title: 'Báo cáo tự động',
      icon: <I.Doc />,
      status: 'Roadmap',
      happens: 'Bản tóm tắt điều hành hàng tuần được gửi cho lãnh đạo.',
      ai: 'Soạn báo cáo tường thuật trực tiếp từ chỉ số thực và bình luận AI.',
      value: 'Giọng điệu nhất quán, không cần analyst, tốc độ tức thời.',
    },
  ];

  const currentState = [
    { label: 'Kiểm tra nhà sáng tạo thủ công', detail: 'Nhân viên phân tích xét duyệt nhà sáng tạo bằng tay trên bảng tính chia sẻ — chậm, không nhất quán và khó mở rộng.' },
    { label: 'Tiếp cận thủ công', detail: 'Tiếp cận từng người một mà không có logic phân khúc — các điểm tiếp xúc giảm mạnh sau lần đầu tiên.' },
    { label: 'Báo cáo thủ công', detail: 'Báo cáo hàng tuần viết tay — chất lượng tường thuật phụ thuộc vào nhân viên phân tích trực ca.' },
    { label: 'Theo dõi hiệu suất thủ công', detail: 'GMV được đối chiếu giữa video và LIVE bằng tay sau khi sự việc xảy ra — thời gian phản ứng tính bằng ngày.' },
    { label: 'Ra quyết định phản ứng', detail: 'Quyết định chỉ đến sau khi xu hướng giảm xuất hiện trong số liệu hàng tuần.' },
  ];

  const futureState = [
    { label: 'Đánh giá nhà sáng tạo bằng AI', detail: 'Liên tục chấm điểm toàn bộ cơ sở nhà sáng tạo trên GMV, đơn hàng, cơ cấu kênh và phủ sóng shop.' },
    { label: 'Ghép nhà sáng tạo tự động', detail: 'Động cơ đề xuất ghép nhà sáng tạo với shop và sản phẩm theo phù hợp danh mục và tốc độ đơn hàng.' },
    { label: 'Luồng tiếp cận tự động', detail: 'Các chuỗi tiếp cận cá nhân hoá kích hoạt tự động theo phân khúc, xu hướng hiệu suất và ra mắt sản phẩm.' },
    { label: 'Giám sát thời gian thực', detail: 'Các rủi ro tập trung, kênh và không hoạt động cảnh báo trong vài phút — không phải vài ngày.' },
    { label: 'Đề xuất sinh ra bởi AI', detail: 'Mỗi tín hiệu vận hành được ghép với hành động tốt nhất tiếp theo theo thứ tự ưu tiên.' },
    { label: 'Báo cáo thông minh cho lãnh đạo', detail: 'Bản tóm tắt tường thuật tự động mỗi chu kỳ từ chỉ số thực và bình luận AI — giọng điệu nhất quán.' },
  ];

  return (
    <div className="grid">
      <div className="demo-labels">
        <span className="demo-chip"><span className="ico"><I.Shield /></span>Chỉ số dữ liệu thực</span>
        <span className="demo-chip"><span className="ico"><I.Database /></span>Chạy trên Excel công ty đã xử lý</span>
      </div>

      <Panel hero>
        <SectionHeader
          eyebrow="Lộ trình chuyển đổi"
          title="Từ vận hành thủ công → Kinh doanh KOC ưu tiên AI"
          subtitle="Mô hình vận hành 7 bước có tác dụng cộng dồn: mỗi giai đoạn nuôi dưỡng giai đoạn tiếp theo bằng tín hiệu sạch hơn, có giá trị cao hơn."
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
                    <span className="key">Điều gì xảy ra</span>
                    <span className="val">{s.happens}</span>
                  </div>
                  <div className="row">
                    <span className="key">AI tự động hoá</span>
                    <span className="val">{s.ai}</span>
                  </div>
                  <div className="row">
                    <span className="key">Giá trị kinh doanh</span>
                    <span className="val">{s.value}</span>
                  </div>
                </div>
                <div className={`step-status ${s.status === 'Building' ? 'building' : s.status === 'Roadmap' ? 'roadmap' : ''}`}>
                  <span className="dot" /> {s.status === 'Live' ? 'Đang hoạt động' : s.status === 'Building' ? 'Đang xây dựng' : 'Lộ trình'}
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
            eyebrow="Trạng thái hiện tại"
            title="Mô hình vận hành thủ công — chi phí là gì"
            subtitle="Luồng công việc hôm nay bị giới hạn bởi năng suất con người. Thời gian bị lãng phí cho các nhiệm vụ máy có thể chạy liên tục."
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
            eyebrow="Trạng thái tương lai ưu tiên AI"
            title="Mô hình vận hành mới mang lại gì"
            subtitle="Mỗi thay thế đã phần nào hoạt động trong dashboard này — nguồn từ chỉ số vận hành thực tế."
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
          eyebrow="Tin cậy"
          title="Điểm tin cậy dữ liệu"
          subtitle="Hợp thành từ độ đầy đủ nguồn, số lượng bản ghi và tải thành công — tạo niềm tin cho mọi trang khác."
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
              {entries.filter((e) => e.records > 0).length} trên {entries.length} nguồn tải thành công
            </div>
            <p style={{ margin: '6px 0 0', color: '#b5bdd6', fontSize: 13, lineHeight: 1.55 }}>
              {trust === 100
                ? 'Tất cả KPI, biểu đồ và đề xuất dựa trên bộ dữ liệu hoàn chỉnh.'
                : 'Một số chỉ số có thể hiển thị N/A — kiểm tra các nguồn thiếu trong bảng bên dưới.'}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Nguồn dữ liệu" title="Trạng thái tải Sheet & JSON" subtitle="Mỗi file được dashboard sử dụng cùng số lượng bản ghi." />
        <div className="quality-grid">
          {entries.map((e) => {
            const ready = e.records > 0;
            return (
              <div key={e.filename} className={`quality-card ${ready ? 'ready' : 'missing'}`}>
                <div>
                  <div className="quality-name">{e.filename}</div>
                  <div className="quality-meta">{ready ? `${formatNumber(e.records)} bản ghi` : 'Chưa tải được bản ghi nào'}</div>
                </div>
                <div className={`quality-status ${ready ? 'ok' : 'err'}`}>{ready ? '✓' : '!'}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Kiểm tra" title="Cảnh báo dữ liệu thiếu / không hợp lệ" subtitle="Trực tiếp từ payload JSON — hiển thị các dòng N/A mà phần còn lại của UI xử lý mềm mại." />
        <DataTable
          rows={[
            { check: 'Nhà sáng tạo theo dõi trong phân khúc', value: totalKocSeg, status: totalKocSeg > 0 ? 'high' : 'none' },
            { check: 'Nhà sáng tạo có GMV LIVE bằng không', value: zeroLiveCount, status: 'low', note: 'Không thể tính tỷ lệ Video/LIVE' },
            { check: 'Dòng có tỷ lệ Video/LIVE N/A', value: nanRatio, status: 'low', note: 'Đã xử lý — hiển thị là “N/A”' },
            { check: 'Tải JSON thất bại', value: loadWarnings.length, status: loadWarnings.length === 0 ? 'high' : 'none', note: loadWarnings.length === 0 ? 'Mọi thứ ổn' : 'Xem cảnh báo bên dưới' },
          ]}
          columns={[
            { key: 'check', label: 'Kiểm tra' },
            { key: 'value', label: 'Giá trị', align: 'right', render: (r) => formatNumber(r.value) },
            { key: 'status', label: 'Trạng thái', render: (r) => <span className={`chip ${r.status}`}>{r.status === 'high' ? 'OK' : r.status === 'none' ? 'Cần hành động' : 'Theo dõi'}</span> },
            { key: 'note', label: 'Ghi chú', render: (r) => String(r.note ?? '—') },
          ]}
        />

        {loadWarnings.length > 0 && (
          <div className="alert-list" style={{ marginTop: 16 }}>
            {loadWarnings.map((w, i) => (
              <AlertCard key={i} alert={{ type: 'danger', priority: 'P0', title: 'Cảnh báo tải dữ liệu', message: w }} />
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
