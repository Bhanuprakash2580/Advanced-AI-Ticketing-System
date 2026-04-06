import { useCallback, useEffect, useState } from 'react';
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
import { apiGet } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useRealtime } from '../hooks/useRealtime';
import type { Analytics } from '../types';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function MetricCard({ label, value, sub, icon, accent = 'from-slate-50 to-white' }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; accent?: string;
}) {
  return (
    <div className={`card anim-scale-in flex items-start gap-3 bg-gradient-to-br ${accent} p-4`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 text-slate-600">
        {icon}
      </span>
      <div>
        <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
        {sub && <p className="text-[0.625rem] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(() => {
    apiGet<Analytics>('/api/analytics').then(setData).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime(load);

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <p className="text-sm text-slate-500">Loading analytics…</p>
      </div>
    );
  }

  const totalTickets = data.totals.open + data.totals.resolved + data.totals.autoResolved;
  const loadChart = data.departmentLoad.map((d) => ({ name: d.department, open: d.c }));
  const avgChart = data.avgResolutionMinutesByDepartment.map((d) => ({ name: d.department, minutes: d.avgMinutes }));
  const catChart = data.topCategoriesWeek.map((c, i) => ({ name: c.category, value: c.c, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const autoRate = data.autoResolutionSuccessRate;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Real-time operational metrics — ticket volume, routing load, resolution speed, recurring categories, and automation effectiveness."
      />

      {/* ── Metric cards ── */}
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total Tickets" value={totalTickets} accent="from-indigo-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8M8 12h5"/></svg>} />
        <MetricCard label="Open" value={data.totals.open} accent="from-blue-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>} />
        <MetricCard label="Resolved" value={data.totals.resolved} sub="by humans" accent="from-emerald-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>} />
        <MetricCard label="Auto-Resolved" value={data.totals.autoResolved} sub="by AI" accent="from-violet-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>} />
        <MetricCard label="Escalated" value={data.totals.escalated} sub="2h SLA breach" accent="from-red-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>} />
        <MetricCard
          label="Auto Success Rate"
          value={autoRate != null ? `${autoRate}%` : '—'}
          sub="helpful feedback"
          accent="from-teal-50/60 to-white"
          icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department load */}
        <div className="card anim-slide-up p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-indigo-500">
              <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
            </svg>
            <h3 className="text-sm font-bold text-slate-900">Open Tickets by Department</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Current distribution of unresolved workload.</p>
          <div className="h-72">
            {loadChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No open tickets</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loadChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} cursor={{fill: '#f8fafc'}} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="open" fill="#6366f1" name="Open Tickets" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Avg resolution */}
        <div className="card anim-slide-up p-5" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-sky-500">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <h3 className="text-sm font-bold text-slate-900">Average Resolution Time</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Minutes from creation to resolved, by department.</p>
          <div className="h-72">
            {avgChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No resolved data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" axisLine={false} tickLine={false} />
                  <YAxis stroke="#e2e8f0" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} cursor={{fill: '#f8fafc'}} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="minutes" fill="#0ea5e9" name="Resolution Meta (min)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Categories + Gauge + Cards ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top categories (pie chart) */}
        <div className="card anim-slide-up p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-purple-500">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <h3 className="text-sm font-bold text-slate-900">Top Categories (7d)</h3>
          </div>
          {catChart.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Not enough history yet.</p>
          ) : (
            <>
              <div className="flex justify-center mt-2">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={catChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                      {catChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {catChart.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-slate-700">{c.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-slate-900">{c.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Auto-resolution gauge */}
        <div className="card anim-slide-up p-5 flex flex-col items-center justify-center" style={{ animationDelay: '60ms' }}>
          <h3 className="text-sm font-bold text-slate-900 mb-4">Auto-Resolution Quality</h3>
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="url(#gauge-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(autoRate ?? 0) * 0.97} 100`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-bold text-slate-900">{autoRate != null ? `${autoRate}%` : '—'}</p>
              <p className="text-[0.5625rem] text-slate-400 uppercase tracking-wide">Helpful</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 max-w-[200px]">
            {autoRate != null
              ? 'Based on Yes/No feedback from auto-resolved tickets.'
              : 'Will appear after tickets receive helpful feedback.'}
          </p>
        </div>

        {/* Operational cards */}
        <div className="space-y-4" style={{ animationDelay: '120ms' }}>
          <div className="card anim-slide-up p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📊</span>
              <h3 className="text-sm font-bold text-slate-900">Operations Readout</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {data.totals.open > 0
                ? `${data.totals.open} ticket(s) still need action across the desk right now.`
                : 'No open tickets at the moment — all clear.'}
            </p>
          </div>
          <div className="card anim-slide-up p-5" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⚡</span>
              <h3 className="text-sm font-bold text-slate-900">Automation Signal</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {autoRate != null
                ? `Auto-resolution is landing at ${autoRate}% helpful feedback so far.`
                : 'Feedback data will appear after auto-resolved tickets receive Yes/No responses.'}
            </p>
          </div>
          <div className="card anim-slide-up p-5" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🚨</span>
              <h3 className="text-sm font-bold text-slate-900">Escalation Watch</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {data.totals.escalated > 0
                ? `${data.totals.escalated} ticket(s) triggered the 2-hour pickup escalation rule.`
                : 'No pickup SLA breaches detected — response times are on track.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
