import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useRealtime } from '../hooks/useRealtime';

type NotificationRow = {
  id: string;
  ticket_id: string;
  to_email: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationsPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('notify_email') ?? 'requester@company.internal');
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (email.trim()) params.set('email', email.trim());
    apiGet<NotificationRow[]>(`/api/notifications?${params.toString()}`)
      .then(setRows)
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false); });
  }, [email]);

  useEffect(() => {
    localStorage.setItem('notify_email', email);
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(() => load(true));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inbox"
        description="Simulated email notifications for ticket updates. Filter by the address you care about to see the history."
      />

      <div className="card max-w-lg p-5 anim-slide-up">
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Inbox address
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.internal"
            />
          </div>
        </label>
      </div>

      <div className="space-y-4">
        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
            <p className="text-sm text-slate-500">Retrieving notifications…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-16 text-center anim-slide-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">No notifications found</p>
              <p className="mt-1 text-xs text-slate-400">Waiting for updates for {email}...</p>
            </div>
          </div>
        ) : (
          <div className="stagger space-y-4">
            {rows.map((n) => (
              <article
                key={n.id}
                className={[
                  'card anim-scale-in p-5 transition-all',
                  n.read_at
                    ? 'border-slate-100 bg-white shadow-sm'
                    : 'border-indigo-100 bg-indigo-50/20 ring-1 ring-indigo-500/5',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                       {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                       <h3 className="truncate font-bold text-slate-900">{n.subject}</h3>
                    </div>
                    <time className="mt-1 block text-[0.6875rem] font-medium text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </time>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-slate-50 hover:text-indigo-700"
                      to={`/tickets/${n.ticket_id}`}
                    >
                      View Ticket
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                    {!n.read_at ? (
                      <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => apiPost(`/api/notifications/${n.id}/read`, {}).then(() => load(true))}
                      >
                        Mark as read
                      </button>
                    ) : (
                       <span className="px-3 py-1.5 text-xs font-medium text-slate-400">Read</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50/50 p-4 ring-1 ring-slate-100">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{n.body}</pre>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
