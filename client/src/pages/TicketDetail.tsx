import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPatch, apiPost, apiDelete } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useRealtime } from '../hooks/useRealtime';
import type { Employee, Ticket, TimelineEvent } from '../types';

const STATUSES = ['New', 'Assigned', 'In Progress', 'Pending Info', 'Resolved', 'Closed'] as const;
const DEFAULT_DEPARTMENTS = ['Engineering', 'DevOps', 'Finance', 'HR', 'IT', 'Product', 'Marketing', 'Legal'];

/* ── Helpers ── */
function severityBadge(sev: string) {
  const m: Record<string, string> = {
    Critical: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    High: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    Low: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  };
  return m[sev] ?? m.Low;
}

function sentimentIcon(s: string) {
  if (s === 'Frustrated') return '😠';
  if (s === 'Polite') return '😊';
  return '😐';
}

function eventIcon(type: string) {
  switch (type) {
    case 'ai': return { bg: 'bg-violet-100', fg: 'text-violet-600', icon: '🤖' };
    case 'auto_resolve': return { bg: 'bg-emerald-100', fg: 'text-emerald-600', icon: '✅' };
    case 'assignment': return { bg: 'bg-blue-100', fg: 'text-blue-600', icon: '👤' };
    case 'status': return { bg: 'bg-indigo-100', fg: 'text-indigo-600', icon: '🔄' };
    case 'note': return { bg: 'bg-amber-100', fg: 'text-amber-700', icon: '📝' };
    case 'request_info': return { bg: 'bg-orange-100', fg: 'text-orange-600', icon: '❓' };
    case 'feedback': return { bg: 'bg-teal-100', fg: 'text-teal-600', icon: '💬' };
    case 'escalation': return { bg: 'bg-red-100', fg: 'text-red-600', icon: '🚨' };
    default: return { bg: 'bg-slate-100', fg: 'text-slate-600', icon: '•' };
  }
}

export function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      Promise.all([
        apiGet<Ticket>(`/api/tickets/${id}`),
        apiGet<TimelineEvent[]>(`/api/tickets/${id}/timeline`),
        apiGet<Employee[]>('/api/employees'),
      ])
        .then(([t, tl, dir]) => {
          setTicket(t);
          setTimeline(tl);
          setEmployees(dir);
          setStatus(t.status);
          setAssignDept(t.assigned_department ?? t.suggested_department ?? '');
          setAssignEmpId(t.assigned_employee_id ?? '');
        })
        .catch(() => {})
        .finally(() => { if (!silent) setLoading(false); });
    },
    [id]
  );

  useEffect(() => { load(false); }, [load]);
  useRealtime(() => load(true));

  async function saveStatus() {
    if (!id) return;
    setError(null);
    try {
      const updated = await apiPatch<Ticket>(`/api/tickets/${id}`, {
        status,
        internal_note: note.trim() || undefined,
        actor: 'agent',
      });
      setTicket(updated);
      setNote('');
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  async function sendInfoRequest() {
    if (!id) return;
    setError(null);
    try {
      await apiPost(`/api/tickets/${id}/request-info`, { message: infoMessage, actor: 'agent' });
      setInfoMessage('');
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
    }
  }

  async function sendFeedback(helpful: boolean) {
    if (!id) return;
    setError(null);
    try {
      const updated = await apiPost<Ticket>(`/api/tickets/${id}/feedback`, { helpful });
      setTicket(updated);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record feedback.');
    }
  }

  async function saveAssignment() {
    if (!id || !assignDept.trim()) return;
    setError(null);
    try {
      const updated = await apiPatch<Ticket>(`/api/tickets/${id}/assignment`, {
        department: assignDept.trim(),
        employeeId: assignEmpId || null,
        actor: 'ops-admin',
      });
      setTicket(updated);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update assignment.');
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await apiDelete(`/api/tickets/${id}`);
      navigate('/tickets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete ticket.');
    }
  }

  async function handleRestore() {
    if (!id) return;
    try {
      await apiPost(`/api/tickets/${id}/restore`, {});
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore ticket.');
    }
  }

  if (!id) return <p className="text-slate-600">Missing ticket id.</p>;

  if (loading && !ticket) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
        <p className="text-sm text-slate-500">Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold text-slate-900">Ticket Not Found</p>
        <p className="mt-2 text-sm text-slate-500">
          <Link className="font-medium text-indigo-600 hover:underline" to="/tickets">Back to queue</Link>
        </p>
      </div>
    );
  }

  const deptOptions = Array.from(
    new Set([...DEFAULT_DEPARTMENTS, ...employees.map((e) => e.department), ticket.assigned_department ?? '', ticket.suggested_department ?? ''].filter(Boolean))
  ).sort();

  const availableAssignees = employees.filter((e) => e.active === 1 && e.department === assignDept);

  return (
    <div className="space-y-8">
      {ticket.deleted_at && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex justify-between items-center">
          <div>
            <h3 className="text-red-800 font-medium">This ticket is in History (Deleted)</h3>
            <p className="text-sm text-red-700 mt-1">It will be permanently removed 30 days after deletion.</p>
          </div>
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-md transition-colors"
          >
            Restore Ticket
          </button>
        </div>
      )}

      <PageHeader 
        title={ticket.subject} 
        description={`#${ticket.id.slice(0, 8)} · ${ticket.requester_email}`}
        action={
          !ticket.deleted_at ? (
            <button
              onClick={handleDelete}
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
            >
              🗑️ Delete
            </button>
          ) : (
            <Link to="/tickets" className="button button-secondary text-sm">
              &larr; Back to Queue
            </Link>
          )
        }
      >
        <Link to="/tickets" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Queue
        </Link>
      </PageHeader>

      {/* ── Row 1: Original message + AI Analysis ── */}
      <div className="grid gap-6 lg:grid-cols-2 stagger">
        {/* Original message */}
        <section className="card anim-slide-up p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm">📨</span>
            <h3 className="text-sm font-bold text-slate-900">Original Message</h3>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{ticket.body}</p>
        </section>

        {/* AI analysis card */}
        <section className="card anim-slide-up overflow-hidden border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 p-5" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-sm">🤖</span>
            <h3 className="text-sm font-bold text-indigo-900">AI Analysis Contract</h3>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Category</p>
              <p className="mt-0.5 font-semibold text-indigo-900">{ticket.category}</p>
            </div>
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Severity</p>
              <p className="mt-0.5"><span className={`badge ${severityBadge(ticket.effective_severity)}`}>{ticket.effective_severity}</span></p>
            </div>
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Sentiment</p>
              <p className="mt-0.5 font-medium text-indigo-900">{sentimentIcon(ticket.sentiment)} {ticket.sentiment}</p>
            </div>
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Confidence</p>
              <p className="mt-0.5 font-bold text-indigo-900">{ticket.confidence_score}%</p>
            </div>
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Resolution Path</p>
              <p className="mt-0.5 font-medium text-indigo-900">{ticket.recommended_resolution_path}</p>
            </div>
            <div className="rounded-lg bg-white/70 p-2.5 ring-1 ring-indigo-100">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">Est. Time</p>
              <p className="mt-0.5 font-medium text-indigo-900">{ticket.estimated_resolution_minutes} min</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-white/70 p-3 ring-1 ring-indigo-100">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-500">AI Summary</p>
            <p className="mt-1 text-sm leading-relaxed text-indigo-900">{ticket.ai_summary}</p>
          </div>
        </section>
      </div>

      {/* ── Auto-response (if auto-resolved) ── */}
      {ticket.auto_resolved === 1 && ticket.auto_response && (
        <section className="card anim-slide-up border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 to-white p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-sm">✅</span>
            <h3 className="text-sm font-bold text-emerald-900">Auto-Response</h3>
            <span className="badge bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 ml-auto">Auto-Resolved</span>
          </div>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-emerald-950 rounded-lg bg-white/60 p-4 ring-1 ring-emerald-100">
            {ticket.auto_response}
          </pre>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-emerald-100 pt-4">
            <span className="text-sm font-semibold text-emerald-900">Was this helpful?</span>
            <button type="button" onClick={() => sendFeedback(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>
              Yes
            </button>
            <button type="button" onClick={() => sendFeedback(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>
              No
            </button>
            {ticket.helpful_feedback !== null && (
              <span className={`badge ml-2 ${ticket.helpful_feedback === 1 ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                {ticket.helpful_feedback === 1 ? '✓ Helpful' : '✗ Not helpful'}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── Assignment ── */}
      <section className="card anim-slide-up p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm">👤</span>
          <h3 className="text-sm font-bold text-slate-900">Assignment</h3>
          {ticket.escalated === 1 && (
            <span className="badge bg-red-50 text-red-700 ring-1 ring-red-200 ml-auto">🚨 Escalated (2h SLA)</span>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Department</p>
            <p className="mt-1 font-semibold text-slate-900">{ticket.assigned_department ?? ticket.suggested_department ?? '—'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Owner</p>
            <div className="mt-1 flex items-center gap-2">
              {ticket.assignee ? (
                <>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[0.5625rem] font-bold text-indigo-700">
                    {ticket.assignee.name.split(' ').map(n => n[0]).join('')}
                  </span>
                  <span className="font-medium text-slate-900">{ticket.assignee.name}</span>
                </>
              ) : (
                <span className="text-slate-400">Unassigned</span>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Open Load</p>
            <p className="mt-1 font-semibold text-slate-900">
              {ticket.assignee_load ?? '—'} <span className="font-normal text-slate-500">ticket(s)</span>
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Avg Resolution</p>
            <p className="mt-1 font-semibold text-slate-900">
              {ticket.assignee_avg_minutes != null ? `${ticket.assignee_avg_minutes} min` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Override assignment */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Override Assignment</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] md:items-end">
            <label className="text-[0.6875rem] font-semibold text-slate-600">
              Department
              <select className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none"
                value={assignDept} onChange={(e) => { setAssignDept(e.target.value); setAssignEmpId(''); }}>
                <option value="">Select</option>
                {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="text-[0.6875rem] font-semibold text-slate-600">
              Assignee
              <select className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none"
                value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)} disabled={!assignDept}>
                <option value="">Unassigned</option>
                {availableAssignees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.availability} · {e.current_load} open
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={saveAssignment}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
              Save
            </button>
          </div>
        </div>
      </section>

      {/* ── Work / Status ── */}
      <section className="card anim-slide-up p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-sm">⚙️</span>
          <h3 className="text-sm font-bold text-slate-900">Work on This Ticket</h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-[0.6875rem] font-semibold text-slate-600">
            Status
            <select className="mt-1 block rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none"
              value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="min-w-[200px] flex-1 text-[0.6875rem] font-semibold text-slate-600">
            Internal Note (optional)
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none"
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible in timeline" />
          </label>
          <button type="button" onClick={saveStatus}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-800 transition sm:self-end">
            Save
          </button>
        </div>

        {/* Request info */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Request More Information</h4>
          <p className="mt-1 text-xs text-slate-400">Sets status to Pending Info and notifies the requester.</p>
          <textarea
            className="mt-3 w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed outline-none"
            rows={3} value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)}
            placeholder="What information do you need from the requester?" />
          <button type="button" onClick={sendInfoRequest}
            className="mt-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Send Request
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
        )}
      </section>

      {/* ── Timeline ── */}
      <section className="anim-slide-up">
        <div className="flex items-center gap-2 mb-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm">📋</span>
          <h3 className="text-sm font-bold text-slate-900">Timeline</h3>
          <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200 ml-2">{timeline.length} events</span>
        </div>
        <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
          {timeline.map((ev, i) => {
            const ei = eventIcon(ev.event_type);
            return (
              <li key={ev.id} className="relative pb-6 last:pb-0 anim-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <span className={`absolute -left-[1.875rem] flex h-5 w-5 items-center justify-center rounded-full text-[0.625rem] ring-4 ring-white ${ei.bg}`}>
                  {ei.icon}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold capitalize text-slate-800">{ev.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-[0.625rem] text-slate-400">by {ev.actor} · {new Date(ev.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{ev.message}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
