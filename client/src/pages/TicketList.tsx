import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useRealtime } from '../hooks/useRealtime';
import type { Ticket } from '../types';

function severityBadge(severity: string) {
  switch (severity) {
    case 'Critical':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200/80';
    case 'High':
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80';
    case 'Medium':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80';
    default:
      return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80';
  }
}

function severityStripe(severity: string) {
  switch (severity) {
    case 'Critical': return 'severity-stripe-critical';
    case 'High': return 'severity-stripe-high';
    case 'Medium': return 'severity-stripe-medium';
    default: return 'severity-stripe-low';
  }
}

function statusDot(status: string) {
  switch (status) {
    case 'Resolved':
    case 'Closed':
      return 'bg-emerald-500';
    case 'In Progress':
      return 'bg-indigo-500';
    case 'Pending Info':
      return 'bg-amber-500';
    case 'Assigned':
      return 'bg-blue-500';
    default:
      return 'bg-slate-400';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'Resolved':
    case 'Closed':
      return 'text-emerald-700';
    case 'In Progress':
      return 'text-indigo-700';
    case 'Pending Info':
      return 'text-amber-700';
    default:
      return 'text-slate-700';
  }
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    DB: 'bg-purple-500', Server: 'bg-red-500', Bug: 'bg-rose-500', Access: 'bg-amber-500',
    HR: 'bg-teal-500', Billing: 'bg-cyan-500', Feature: 'bg-blue-500', Other: 'bg-slate-400',
  };
  return map[cat] ?? 'bg-slate-400';
}

type StatCardProps = { label: string; value: number; icon: React.ReactNode; accent?: string };
function StatCard({ label, value, icon, accent = 'from-slate-50 to-white' }: StatCardProps) {
  return (
    <div className={`card anim-scale-in flex items-center gap-4 bg-gradient-to-br ${accent} p-4`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 text-slate-600">
        {icon}
      </span>
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function TicketList() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [severity, setSeverity] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (department.trim()) params.set('department', department.trim());
      if (severity) params.set('severity', severity);
      if (query.trim()) params.set('q', query.trim());
      params.set('sort', sort);
      params.set('order', order);
      apiGet<Ticket[]>(`/api/tickets?${params.toString()}`)
        .then(setRows)
        .catch(() => {})
        .finally(() => { if (!silent) setLoading(false); });
    },
    [status, department, severity, query, sort, order]
  );

  async function handleRestore(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiPost(`/api/tickets/${id}/restore`, {});
      load(true);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { load(false); }, [load]);
  useRealtime(() => load(true));

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, t) => {
        acc.total += 1;
        if (t.effective_severity === 'Critical') acc.critical += 1;
        if (t.status === 'Pending Info') acc.pendingInfo += 1;
        if (t.auto_resolved === 1) acc.autoResolved += 1;
        return acc;
      },
      { total: 0, critical: 0, pendingInfo: 0, autoResolved: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ticket Queue"
        description="Monitor, filter, and manage all tickets in real-time. Updates appear instantly via server-push."
      />

      {/* ── Stat cards ── */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible Tickets" value={summary.total} accent="from-indigo-50/60 to-white"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h3"/></svg>}
        />
        <StatCard label="Critical" value={summary.critical} accent="from-red-50/60 to-white"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
        />
        <StatCard label="Pending Info" value={summary.pendingInfo} accent="from-amber-50/60 to-white"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
        />
        <StatCard label="Auto-Resolved" value={summary.autoResolved} accent="from-emerald-50/60 to-white"
          icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
        />
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 outline-none"
              value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any</option>
              <option>New</option><option>Assigned</option><option>In Progress</option>
              <option>Pending Info</option><option>Resolved</option><option>Closed</option>
              <option value="Deleted">Deleted (History)</option>
            </select>
          </label>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Department
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm outline-none"
              value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT" />
          </label>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Severity
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 outline-none"
              value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Any</option>
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </label>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Search
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm outline-none"
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Subject, body, email" />
          </label>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Sort By
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 outline-none"
              value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Created</option><option value="updated">Updated</option><option value="severity">Severity</option>
            </select>
          </label>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            Order
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 outline-none"
              value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}>
              <option value="desc">Newest first</option><option value="asc">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-premium min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Ticket</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Assignee</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Severity</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
                      <p className="text-sm text-slate-500">Loading tickets…</p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M8 8h8M8 12h5M8 16h3" />
                      </svg>
                      <p className="text-sm font-medium text-slate-500">No tickets match these filters</p>
                      <p className="text-xs text-slate-400">Try adjusting the filters or create a new ticket.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className={`transition ${severityStripe(t.effective_severity)} ${t.deleted_at ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5 align-top">
                      <Link className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline" to={`/tickets/${t.id}`}>
                        {t.subject}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${categoryColor(t.category)}`} />
                        <span className="text-xs text-slate-500">{t.category}</span>
                        {t.auto_resolved === 1 && (
                          <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 ml-1">Auto</span>
                        )}
                        {t.escalated === 1 && (
                          <span className="badge bg-red-50 text-red-700 ring-1 ring-red-200/60 ml-1">Escalated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {t.deleted_at ? (
                        <div className="flex flex-col gap-2">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs font-semibold w-fit">
                            Deleted
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                            Auto-deletes in 30 days
                          </span>
                          <button
                            onClick={(e) => handleRestore(e, t.id)}
                            className="w-fit text-xs font-semibold px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                          >
                            Restore Ticket
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${statusDot(t.status)}`} />
                          <span className={`text-sm font-medium ${statusColor(t.status)}`}>{t.status}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {t.assignee ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[0.5625rem] font-bold text-indigo-700">
                            {t.assignee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                          <span className="text-sm text-slate-800 truncate max-w-[120px]">{t.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top text-sm text-slate-700">{t.assigned_department ?? '—'}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`badge ${severityBadge(t.effective_severity)}`}>{t.effective_severity}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-sm tabular-nums text-slate-500">
                      {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      <span className="ml-1 text-slate-400">{new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
