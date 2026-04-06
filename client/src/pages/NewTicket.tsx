import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api';
import { PageHeader } from '../components/PageHeader';
import type { Ticket } from '../types';

const EXAMPLES = [
  {
    label: 'Access Request',
    emoji: '🔒',
    color: 'from-amber-500/10 to-orange-500/10 border-amber-200/60',
    subject: 'Locked out of payroll dashboard after password reset',
    body: "I reset my password this morning and can sign into email, but payroll now says my account is locked. I need access before today's reimbursement run.",
  },
  {
    label: 'Server Incident',
    emoji: '🔥',
    color: 'from-red-500/10 to-rose-500/10 border-red-200/60',
    subject: 'API latency spike causing timeouts for customer sync',
    body: 'Our sync worker has been timing out for the last 20 minutes. Response time jumped from 300ms to 9s and several jobs are now stuck in retry.',
  },
  {
    label: 'HR Services',
    emoji: '📋',
    color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200/60',
    subject: 'Where can I find the parental leave policy?',
    body: 'I need the latest internal policy for parental leave and the steps for submitting the request in the HR portal.',
  },
  {
    label: 'IT Support',
    emoji: '🔑',
    color: 'from-blue-500/10 to-indigo-500/10 border-blue-200/60',
    subject: 'How do I reset my VPN password?',
    body: 'I forgot my VPN password and cannot connect to the corporate network. How do I reset it?',
  },
  {
    label: 'Database Issue',
    emoji: '🗄️',
    color: 'from-purple-500/10 to-violet-500/10 border-purple-200/60',
    subject: 'Customer records showing data corruption in orders table',
    body: 'Multiple customer order records from the past 48 hours appear to have NULL values in required fields. This is causing downstream data pipelines to fail.',
  },
  {
    label: 'Billing Query',
    emoji: '💰',
    color: 'from-cyan-500/10 to-sky-500/10 border-cyan-200/60',
    subject: 'Reimbursement for Q2 travel still not processed',
    body: 'I submitted my Q2 travel reimbursement 3 weeks ago with all receipts attached. The finance portal still shows it as pending. Can someone check the status?',
  },
];

const STEPS = [
  { num: '01', title: 'AI Analysis', desc: 'Category, severity, sentiment, confidence, and suggested resolution path are generated as a structured contract.' },
  { num: '02', title: 'Auto-resolve or Route', desc: 'Simple questions (FAQs, password resets) are resolved instantly. Complex issues are routed to the right department.' },
  { num: '03', title: 'Smart Assignment', desc: 'The best employee is picked using skill tags, current workload, and live availability from the directory.' },
];

export function NewTicket() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('requester@company.internal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ticket = await apiPost<Ticket>('/api/tickets', {
        subject,
        body,
        requester_email: email,
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="New Request"
        description="Submit an internal issue in plain language. AI analyzes it, then either auto-resolves or routes it to the correct department and assignee."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        {/* ── Submit form ── */}
        <form
          onSubmit={handleSubmit}
          className="card anim-slide-up p-6"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Subject
              </label>
              <input
                id="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="body" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Details
              </label>
              <textarea
                id="body"
                required
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe what happened, how urgent it is, who is affected, and any error messages."
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800" role="alert">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Analyzing with AI…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Submit for Analysis
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── How it works ── */}
        <section className="card anim-slide-up overflow-hidden bg-slate-50 border-slate-200 border p-6 z-[1]" style={{ animationDelay: '80ms' }}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-slate-500">How Triage Works</p>
          <div className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {i < STEPS.length - 1 && (
                  <span className="absolute -bottom-4 left-7 h-4 w-px bg-gradient-to-b from-slate-300 to-transparent" />
                )}
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[0.625rem] font-bold text-indigo-600 border border-indigo-100">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-600">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Quick Templates ── */}
      <section className="card anim-slide-up p-6" style={{ animationDelay: '160ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Quick Dispatch Templates</h3>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">One-click simulation</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setSubject(ex.subject);
                setBody(ex.body);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group rounded-xl border bg-gradient-to-br p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${ex.color}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{ex.emoji}</span>
                <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-slate-600">{ex.label}</span>
              </div>
              <p className="mt-2.5 text-sm font-medium text-slate-900">{ex.subject}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-2">{ex.body}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
