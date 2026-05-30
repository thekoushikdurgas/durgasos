import React from 'react';
import { HistoryItem, HttpMethod, ApiRequest } from './types';
import {
  Activity,
  TrendingUp,
  Zap,
  Clock,
  ThumbsUp,
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Plus,
  Flame,
  BarChart2,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface AnalyticsViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onAddHistoryItems: (items: HistoryItem[]) => void;
  onLoadRequestToBuilder: (req: Partial<ApiRequest>) => void;
}

const getEndpointPath = (rawUrl: string): string => {
  if (!rawUrl) return '/';
  try {
    let path = rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const url = new URL(rawUrl);
      path = url.pathname;
    } else {
      if (path.includes('?')) {
        path = path.split('?')[0];
      }
      path = path.replace(/^(https?:\/\/)?([^\/]+)/, '');
    }

    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Normalize IDs to make groupings look clean and professional
    const parts = path.split('/');
    const normalizedParts = parts.map((part) => {
      if (!part) return '';
      const isNumeric = /^\d+$/.test(part);
      const isUuid =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(part);
      if (isNumeric) return ':id';
      if (isUuid) return ':uuid';
      return part;
    });

    return normalizedParts.join('/') || '/';
  } catch (e) {
    return rawUrl;
  }
};

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  history,
  onClearHistory,
  onAddHistoryItems,
  onLoadRequestToBuilder,
}) => {
  const [timeWindow, setTimeWindow] = React.useState<'1h' | '6h' | '24h'>('24h');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());

  // Set up auto-refresh simulation ticker
  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefreshed(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 400);
  };

  // Generate demo traffic covering the last 24 hours to populate graphs with beautiful data
  const handleGenerateDemoTraffic = () => {
    const endpoints = [
      {
        url: 'https://api.durgasman.dev/v1/auth/login',
        method: HttpMethod.POST,
        baseTime: 120,
        failChance: 0.05,
      },
      {
        url: 'https://api.durgasman.dev/v1/users/profile',
        method: HttpMethod.GET,
        baseTime: 80,
        failChance: 0.02,
      },
      {
        url: 'https://api.durgasman.dev/v1/products',
        method: HttpMethod.GET,
        baseTime: 180,
        failChance: 0.08,
      },
      {
        url: 'https://api.durgasman.dev/v1/products/85',
        method: HttpMethod.PUT,
        baseTime: 250,
        failChance: 0.1,
      },
      {
        url: 'https://api.durgasman.dev/v1/orders/create',
        method: HttpMethod.POST,
        baseTime: 380,
        failChance: 0.15,
      },
      {
        url: 'https://api.durgasman.dev/v1/analytics/reports',
        method: HttpMethod.GET,
        baseTime: 750,
        failChance: 0.25,
      },
      {
        url: 'https://api.durgasman.dev/v1/notifications',
        method: HttpMethod.GET,
        baseTime: 45,
        failChance: 0.01,
      },
    ];

    const now = Date.now();
    const demoItems: HistoryItem[] = [];

    // Create 45 random request records spread over last 24 hours
    for (let i = 0; i < 45; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

      // Hourly distribution: more events around business hours, spread over 24h
      const ageHours = Math.random() * 24;
      const timestamp = now - ageHours * 60 * 60 * 1000;

      const isFailed = Math.random() < endpoint.failChance;
      const status = isFailed
        ? [400, 401, 403, 500, 502][Math.floor(Math.random() * 5)]
        : [200, 201, 204][Math.floor(Math.random() * 3)];

      // Random variance inside response times
      const responseTime = Math.max(
        15,
        Math.round(endpoint.baseTime * (0.6 + Math.random() * 0.9) + (status >= 500 ? 400 : 0))
      );
      const sizeNumeric = Math.round(Math.random() * 8 + 1);

      demoItems.push({
        id: crypto.randomUUID(),
        timestamp,
        method: endpoint.method,
        url: endpoint.url,
        body:
          endpoint.method === HttpMethod.POST || endpoint.method === HttpMethod.PUT
            ? '{"demo": true, "status": "processed"}'
            : '',
        headers: [
          { id: crypto.randomUUID(), key: 'Accept', value: 'application/json', enabled: true },
        ],
        responseStatus: status,
        responseStatusText: status >= 400 ? 'Client/Server Error' : 'OK',
        responseTime,
        responseSize: `${sizeNumeric}.${Math.floor(Math.random() * 9)} KB`,
        responseHeaders: { 'content-type': 'application/json' },
        responseData: { success: !isFailed, dummy: true },
      });
    }

    // Sort by timestamp ascending to look natural
    demoItems.sort((a, b) => a.timestamp - b.timestamp);
    onAddHistoryItems(demoItems);
  };

  // Filter history based on selected time horizon
  const filteredHistory = React.useMemo(() => {
    const horizonMs = timeWindow === '1h' ? 3600000 : timeWindow === '6h' ? 21600000 : 86400000;
    const cutoff = lastRefreshed.getTime() - horizonMs;
    // We only process items containing responseTime (resolved requests)
    return history.filter((h) => h.timestamp >= cutoff && h.responseTime !== undefined);
  }, [history, timeWindow, lastRefreshed]);

  const handleExportTrafficCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      'ID',
      'Timestamp (UTC)',
      'Timestamp (Raw)',
      'Method',
      'URL',
      'Endpoint Path',
      'Response Status',
      'Response Status Text',
      'Latency (ms)',
      'Response Size',
      'Request Headers Count',
      'Errors/Exception',
    ];

    const rows = filteredHistory.map((item) => {
      const cleanPath = getEndpointPath(item.url);
      const isoTime = new Date(item.timestamp).toISOString();

      const parts = [
        item.id,
        isoTime,
        item.timestamp.toString(),
        item.method,
        item.url,
        cleanPath,
        item.responseStatus !== undefined ? item.responseStatus.toString() : 'N/A',
        item.responseStatusText || '',
        item.responseTime !== undefined ? item.responseTime.toString() : 'N/A',
        item.responseSize || '0 KB',
        (item.headers || []).length.toString(),
        item.responseError || '',
      ];

      return parts.map((val) => `"${val.replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const timestampStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.setAttribute('download', `traffic-audit-all-${timeWindow}-${timestampStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for Metrics Panel
  const metrics = React.useMemo(() => {
    if (filteredHistory.length === 0) {
      return { total: 0, avgLatency: 0, successRate: 0, maxLatency: 0, errorRate: 0 };
    }

    const total = filteredHistory.length;
    let sumLatency = 0;
    let maxLatency = 0;
    let successCount = 0;

    filteredHistory.forEach((h) => {
      const lat = h.responseTime || 0;
      sumLatency += lat;
      if (lat > maxLatency) maxLatency = lat;

      const st = h.responseStatus || 0;
      if (st >= 200 && st < 400) {
        successCount++;
      }
    });

    return {
      total,
      avgLatency: Math.round(sumLatency / total),
      successRate: Math.round((successCount / total) * 100),
      maxLatency,
      errorRate: Math.round(((total - successCount) / total) * 100),
    };
  }, [filteredHistory]);

  // Prepare Status Distribution
  const statusSummary = React.useMemo(() => {
    let success = 0; // 2xx
    let redirect = 0; // 3xx
    let clientErr = 0; // 4xx
    let serverErr = 0; // 5xx
    let networkErr = 0; // failed

    filteredHistory.forEach((h) => {
      const status = h.responseStatus;
      if (status === undefined || status === 0) {
        networkErr++;
      } else if (status >= 200 && status < 300) {
        success++;
      } else if (status >= 300 && status < 400) {
        redirect++;
      } else if (status >= 400 && status < 500) {
        clientErr++;
      } else if (status >= 500) {
        serverErr++;
      }
    });

    const total = filteredHistory.length || 1;

    return [
      {
        name: '2xx Success',
        value: success,
        percent: Math.round((success / total) * 100),
        color: '#10b981',
        bgClass: 'bg-emerald-500',
      },
      {
        name: '3xx Redirect',
        value: redirect,
        percent: Math.round((redirect / total) * 100),
        color: '#3b82f6',
        bgClass: 'bg-blue-500',
      },
      {
        name: '4xx Client Error',
        value: clientErr,
        percent: Math.round((clientErr / total) * 100),
        color: '#f59e0b',
        bgClass: 'bg-amber-500',
      },
      {
        name: '5xx Server Error',
        value: serverErr,
        percent: Math.round((serverErr / total) * 100),
        color: '#ef4444',
        bgClass: 'bg-rose-500',
      },
      {
        name: 'Failed Connections',
        value: networkErr,
        percent: Math.round((networkErr / total) * 100),
        color: '#64748b',
        bgClass: 'bg-slate-500',
      },
    ].filter((v) => v.value > 0);
  }, [filteredHistory]);

  // Group by Normalized Endpoint Path to compute Latency & Hit count
  const endpointData = React.useMemo(() => {
    const groupMap: Record<string, { totalTime: number; count: number; method: string }> = {};

    filteredHistory.forEach((h) => {
      const path = getEndpointPath(h.url);
      const key = `${h.method} ${path}`;
      if (!groupMap[key]) {
        groupMap[key] = { totalTime: 0, count: 0, method: h.method };
      }
      groupMap[key].totalTime += h.responseTime || 0;
      groupMap[key].count += 1;
    });

    const items = Object.entries(groupMap).map(([key, data]) => {
      const [method, path] = key.split(' ');
      const avg = Math.round(data.totalTime / data.count);

      let textClass = 'text-emerald-400';
      let bgClass = 'bg-emerald-500';
      if (avg >= 500) {
        textClass = 'text-rose-400';
        bgClass = 'bg-rose-500';
      } else if (avg >= 250) {
        textClass = 'text-amber-400';
        bgClass = 'bg-amber-500';
      } else if (avg >= 150) {
        textClass = 'text-blue-400';
        bgClass = 'bg-blue-500';
      }

      return {
        name: path,
        method,
        avgLatency: avg,
        hits: data.count,
        textClass,
        bgClass,
        fullName: `${method} ${path}`,
      };
    });

    return items.sort((a, b) => b.avgLatency - a.avgLatency);
  }, [filteredHistory]);

  // Timeline Hour Binning (Last 24 Hours / Last 6 Hours / Last 1 hour)
  const timelineData = React.useMemo(() => {
    const now = lastRefreshed.getTime();

    if (timeWindow === '1h') {
      const bins = Array.from({ length: 12 }).map((_, idx) => {
        const binTime = now - (11 - idx) * 5 * 60 * 1000;
        return {
          label: new Date(binTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          startTime: binTime - 5 * 60 * 1000,
          endTime: binTime,
          totalLatency: 0,
          count: 0,
        };
      });

      filteredHistory.forEach((h) => {
        const binIndex = bins.findIndex(
          (b) => h.timestamp >= b.startTime && h.timestamp < b.endTime
        );
        if (binIndex !== -1) {
          bins[binIndex].totalLatency += h.responseTime || 0;
          bins[binIndex].count += 1;
        }
      });

      return bins.map((b) => ({
        time: b.label,
        avgLatency: b.count > 0 ? Math.round(b.totalLatency / b.count) : 0,
        requests: b.count,
      }));
    } else if (timeWindow === '6h') {
      const bins = Array.from({ length: 12 }).map((_, idx) => {
        const binTime = now - (11 - idx) * 30 * 60 * 1000;
        return {
          label: new Date(binTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          startTime: binTime - 30 * 60 * 1000,
          endTime: binTime,
          totalLatency: 0,
          count: 0,
        };
      });

      filteredHistory.forEach((h) => {
        const binIndex = bins.findIndex(
          (b) => h.timestamp >= b.startTime && h.timestamp < b.endTime
        );
        if (binIndex !== -1) {
          bins[binIndex].totalLatency += h.responseTime || 0;
          bins[binIndex].count += 1;
        }
      });

      return bins.map((b) => ({
        time: b.label,
        avgLatency: b.count > 0 ? Math.round(b.totalLatency / b.count) : 0,
        requests: b.count,
      }));
    } else {
      const bins = Array.from({ length: 24 }).map((_, idx) => {
        const binTime = now - (23 - idx) * 60 * 60 * 1000;
        return {
          label: new Date(binTime).toLocaleTimeString([], { hour: '2-digit' }),
          startTime: binTime - 60 * 60 * 1000,
          endTime: binTime,
          totalLatency: 0,
          count: 0,
        };
      });

      filteredHistory.forEach((h) => {
        const binIndex = bins.findIndex(
          (b) => h.timestamp >= b.startTime && h.timestamp < b.endTime
        );
        if (binIndex !== -1) {
          bins[binIndex].totalLatency += h.responseTime || 0;
          bins[binIndex].count += 1;
        }
      });

      return bins.map((b) => ({
        time: b.label,
        avgLatency: b.count > 0 ? Math.round(b.totalLatency / b.count) : 0,
        requests: b.count,
      }));
    }
  }, [filteredHistory, timeWindow, lastRefreshed]);

  const recentRequestsList = React.useMemo(() => {
    return filteredHistory.slice(0, 10);
  }, [filteredHistory]);

  const getMethodBadge = (m: HttpMethod) => {
    switch (m) {
      case HttpMethod.GET:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            GET
          </span>
        );
      case HttpMethod.POST:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            POST
          </span>
        );
      case HttpMethod.PUT:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            PUT
          </span>
        );
      case HttpMethod.PATCH:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
            PATCH
          </span>
        );
      case HttpMethod.DELETE:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            DEL
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {m}
          </span>
        );
    }
  };

  const getLatencyBadge = (lat: number) => {
    if (lat < 150)
      return <span className="text-[10px] font-mono font-bold text-emerald-400">{lat}ms</span>;
    if (lat < 350)
      return <span className="text-[10px] font-mono font-bold text-sky-400">{lat}ms</span>;
    if (lat < 600)
      return <span className="text-[10px] font-mono font-bold text-amber-400">{lat}ms</span>;
    return (
      <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-0.5">
        <Flame size={10} className="text-rose-500 shrink-0" />
        {lat}ms
      </span>
    );
  };

  const getStatusCodeSpan = (status?: number) => {
    if (!status) return <span className="text-slate-550 font-bold">ERR</span>;
    if (status >= 200 && status < 300)
      return <span className="text-emerald-400 font-bold">{status}</span>;
    if (status >= 300 && status < 400)
      return <span className="text-blue-400 font-bold">{status}</span>;
    if (status >= 400 && status < 500)
      return <span className="text-amber-400 font-bold">{status}</span>;
    return <span className="text-rose-400 font-bold">{status}</span>;
  };

  // Find max values in timeline and endpoints to normalize bar charts proportionally
  const maxTimelineLatency = Math.max(...timelineData.map((d) => d.avgLatency), 1);
  const maxTimelineRequests = Math.max(...timelineData.map((d) => d.requests), 1);
  const maxEndpointLatency = Math.max(...endpointData.map((d) => d.avgLatency), 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* ANALYTICS HEADER */}
      <div className="h-14 border-b border-slate-850 bg-[#050608]/70 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
            <Activity className="text-orange-500" size={16} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-1.5">
              Traffic performance analytics <Sparkles size={11} className="text-orange-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold">
              Live traffic streams and latency profiler covering the active observation window
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selectors */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
            {(['1h', '6h', '24h'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timeWindow === w
                    ? 'bg-orange-600/10 text-orange-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {w === '1h' ? 'Last Hour' : w === '6h' ? 'Last 6 Hours' : 'Last 24 Hours'}
              </button>
            ))}
          </div>

          {/* Autorefresh simulation checkbox */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                : 'bg-slate-900/40 border-slate-800 text-slate-500'
            }`}
            title="Update dashboard dynamically as simulated actions complete"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
            />
            {autoRefresh ? 'Auto-Live: ON' : 'Auto-Live: OFF'}
          </button>

          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 hover:bg-slate-850 rounded-lg text-slate-500 hover:text-white border border-slate-850 hover:border-slate-700 transition-all cursor-pointer ${isRefreshing ? 'animate-spin text-orange-400' : ''}`}
            title="Re-query traffic log dataset"
          >
            <RefreshCw size={13} />
          </button>

          {/* Seed Traffic Log button */}
          <button
            onClick={handleGenerateDemoTraffic}
            className="px-3.5 py-1.5 bg-slate-900 border border-orange-500/20 hover:border-orange-500/50 text-orange-400 hover:text-orange-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Seed Traffic Log
          </button>

          {/* Export Traffic CSV button */}
          {filteredHistory.length > 0 && (
            <button
              onClick={handleExportTrafficCSV}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-805 hover:border-slate-700 hover:text-white text-slate-350 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export current traffic dataset as a CSV report for external performance auditing"
              id="export-traffic-csv-btn"
            >
              <Download size={13} className="text-orange-500" /> Export CSV Report
            </button>
          )}

          {/* Clear performance dataset button */}
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Empty complete request-response histographic logs?')) {
                  onClearHistory();
                }
              }}
              className="p-1.5 hover:bg-rose-955/20 rounded-lg text-slate-500 hover:text-rose-400 border border-slate-850 hover:border-rose-900/30 transition-all cursor-pointer"
              title="Delete absolute history streams"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* METRICS DASHBOARD KPI STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-[#08090d] border border-slate-850 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Activity size={32} className="text-orange-500" />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Total Hits
            </span>
            <span className="text-xl font-black text-white">{metrics.total}</span>
            <p className="text-[9px] text-slate-600 mt-1 font-bold">
              Processed requests within timeline
            </p>
          </div>

          <div className="p-4 bg-[#08090d] border border-slate-850 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={32} className="text-emerald-500" />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Average Latency
            </span>
            <span className="text-xl font-black text-emerald-400">
              {metrics.avgLatency}
              <span className="text-xs text-slate-500 font-bold ml-0.5">ms</span>
            </span>
            <p className="text-[9px] text-slate-600 mt-1 font-bold">
              Latency across processed APIs
            </p>
          </div>

          <div className="p-4 bg-[#08090d] border border-slate-850 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <ThumbsUp size={32} className="text-blue-500" />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Client Success
            </span>
            <span className="text-xl font-black text-blue-400">
              {metrics.successRate}
              <span className="text-xs text-slate-500 font-bold ml-0.5">%</span>
            </span>
            <p className="text-[9px] text-slate-600 mt-1 font-bold">
              Proportion of success responses (2xx/3xx)
            </p>
          </div>

          <div className="p-4 bg-[#08090d] border border-slate-855 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Flame size={32} className="text-rose-500" />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Peak Response Time
            </span>
            <span className="text-xl font-black text-rose-400">
              {metrics.maxLatency}
              <span className="text-xs text-slate-500 font-bold ml-0.5">ms</span>
            </span>
            <p className="text-[9px] text-slate-600 mt-1 font-bold">
              Max registered bottleneck delay
            </p>
          </div>

          <div className="p-4 bg-[#08090d] border border-slate-850 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <AlertCircle size={32} className="text-amber-500" />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Error Frequency
            </span>
            <span className="text-xl font-black text-amber-500">
              {metrics.errorRate}
              <span className="text-xs text-slate-500 font-bold ml-0.5">%</span>
            </span>
            <p className="text-[9px] text-slate-600 mt-1 font-bold">
              Unfinished or 4xx/5xx failures ratio
            </p>
          </div>
        </div>

        {/* CONTAINER FOR CHARTS */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-6">
            {/* LARGE LAYOUT: TIMELINE HISTOGRAM & STATUS GROUPS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TIMELINE HISTOGRAM: 2/3 COLUMN */}
              <div className="lg:col-span-2 p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-orange-500" /> Latency &amp; Request
                    Volume Timeline
                  </h3>
                  <span className="text-[10px] text-slate-500 block italic mt-0.5">
                    Observation histogram mapping response latencies and volume intervals
                  </span>
                </div>

                {/* HISTOGRAM CONTAINER */}
                <div className="h-48 w-full flex items-end gap-1.5 border-b border-l border-slate-800 pb-2 pl-2">
                  {timelineData.map((d, idx) => {
                    const heightLatPct = (d.avgLatency / maxTimelineLatency) * 100;
                    const heightReqPct = (d.requests / maxTimelineRequests) * 100;

                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-[#020408] border border-slate-800 text-[9px] font-mono p-2 rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none min-w-[80px] text-left">
                          <p className="text-slate-500 font-bold mb-0.5">{d.time}</p>
                          <p className="text-orange-400">Latency: {d.avgLatency}ms</p>
                          <p className="text-blue-400">Requests: {d.requests}</p>
                        </div>

                        {/* Request Volume mini bar */}
                        <div
                          className="w-1 bg-blue-500/25 rounded-t-sm transition-all"
                          style={{ height: `${heightReqPct * 0.7}%` }}
                        />
                        {/* Latency main bar */}
                        <div
                          className="w-2.5 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t transition-all mt-1"
                          style={{ height: `${heightLatPct * 0.9}%` }}
                        />

                        {/* Tiny label */}
                        <span className="text-[7px] text-slate-600 font-mono mt-1.5 truncate max-w-[24px]">
                          {d.time.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest px-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 bg-orange-500 rounded-sm" /> Average Latency
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 bg-blue-500/30 rounded-sm" /> Request Count
                    </span>
                  </div>
                  <span className="text-slate-600 font-mono">Binned by active window</span>
                </div>
              </div>

              {/* HTTP RESPONSE STATUS GROUPS: 1/3 COLUMN */}
              <div className="p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-orange-500" /> HTTP Response Status
                  </h3>
                  <span className="text-[10px] text-slate-500 block italic mt-0.5">
                    Proportionate response group classification
                  </span>
                </div>

                {/* STACKED BAR CHART */}
                <div className="space-y-4 py-3">
                  <div className="h-5 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                    {statusSummary.map((item, idx) => (
                      <div
                        key={idx}
                        className={`${item.bgClass} h-full transition-all`}
                        style={{ width: `${item.percent}%` }}
                        title={`${item.name}: ${item.value} hits (${item.percent}%)`}
                      />
                    ))}
                  </div>

                  <div className="text-center">
                    <span className="text-2xl font-black text-white">{metrics.successRate}%</span>
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest block">
                      Success Connection Rate
                    </span>
                  </div>
                </div>

                {/* DETAILS LIST */}
                <div className="space-y-1.5 pt-3 border-t border-slate-900">
                  {statusSummary.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-[10px] font-mono"
                    >
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${item.bgClass}`} />
                        {item.name}
                      </span>
                      <span className="text-slate-200 font-bold">
                        {item.value} ({item.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* APM BAR LIST: AVERAGE LATENCY PER ENDPOINT */}
            <div className="p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-orange-500" /> Average Latency profile per
                  Endpoint Path
                </h3>
                <span className="text-[10px] text-slate-500 block italic mt-0.5">
                  Detailed analysis mapping performance delays. UUIDs/IDs have been normalized into
                  uniform tags to allow coherent aggregation.
                </span>
              </div>

              <div className="space-y-3">
                {endpointData.length > 0 ? (
                  endpointData.map((entry, index) => {
                    const widthPercent = (entry.avgLatency / maxEndpointLatency) * 100;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-2 truncate pr-4">
                            {getMethodBadge(entry.method as HttpMethod)}
                            <span className="text-slate-300 font-semibold truncate">
                              {entry.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-slate-500">{entry.hits} hits</span>
                            <span className={`${entry.textClass} font-bold`}>
                              {entry.avgLatency}ms
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`${entry.bgClass} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-655 italic text-[11px] font-mono">
                    No endpoint data registered in this observation frame.
                  </div>
                )}
              </div>

              {/* Speed Legends */}
              <div className="flex items-center gap-4 pt-1.5 border-t border-slate-900 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <span>Threshold Limits:</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fast (&lt;150ms)
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Normal (&lt;250ms)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Slow (&lt;500ms)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Critical (500ms+)
                </span>
              </div>
            </div>

            {/* REAL-TIME SIMULATION FEED PANEL */}
            <div className="p-5 bg-[#08090d] border border-slate-850 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-orange-500" /> Feed Log: Recent Live
                    Traffic Hits
                  </h3>
                  <span className="text-[10px] text-slate-500 block italic mt-0.5">
                    Auto-scrolling stream mapping active HTTP connection attempts in real-time
                  </span>
                </div>
                <span className="text-[8px] bg-slate-950 px-2 py-1 border border-slate-850 rounded font-mono text-slate-500 uppercase font-black">
                  SHOWING LATEST {recentRequestsList.length} EVENT DATA
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-350">
                  <thead className="bg-[#050608] text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-850">
                    <tr>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Endpoint URL Path</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Latency</th>
                      <th className="px-4 py-2.5 text-right">Response Size</th>
                      <th className="px-4 py-2.5 text-right">Age</th>
                      <th className="px-4 py-2.5 text-center">Sandbox Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                    {recentRequestsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-4 py-2">{getMethodBadge(item.method)}</td>
                        <td
                          className="px-4 py-2 font-semibold text-slate-200 truncate max-w-[400px]"
                          title={item.url}
                        >
                          {item.url}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {getStatusCodeSpan(item.responseStatus)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {getLatencyBadge(item.responseTime || 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          {item.responseSize || '0 B'}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() =>
                              onLoadRequestToBuilder({
                                method: item.method,
                                url: item.url,
                                body: item.body || '',
                                headers: item.headers || [],
                              })
                            }
                            className="p-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-orange-500/30 text-slate-400 hover:text-orange-400 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            title="Load endpoint signature into interactive Builder"
                          >
                            Load to Builder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-28 p-8 border border-slate-850/60 rounded-2xl bg-slate-950/20 max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse">
              <Activity size={20} className="text-slate-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                No Performance History Registered
              </h3>
              <p className="text-[10px] text-slate-505 font-semibold max-w-sm mx-auto leading-relaxed">
                Connect and trigger mock server routes, hit external sandbox services, or kickstart
                the graph metrics directly inside the system by pushing the &apos;Seed Traffic
                Log&apos; button above.
              </p>
            </div>
            <button
              onClick={handleGenerateDemoTraffic}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white rounded-lg transition-all shadow-lg hover:shadow-orange-500/10 uppercase tracking-widest cursor-pointer"
            >
              Seed Rich Simulation Traffic
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
