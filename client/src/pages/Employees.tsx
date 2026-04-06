import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useRealtime } from '../hooks/useRealtime';
import type { Employee } from '../types';

const DEFAULT_DEPARTMENTS = ['Engineering', 'DevOps', 'Finance', 'HR', 'IT', 'Product', 'Marketing', 'Legal'];

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function tagsToInput(raw: string) {
  return parseTags(raw).join(', ');
}

function deptColor(dept: string) {
  const m: Record<string, string> = {
    Engineering: 'from-violet-500 to-indigo-600',
    DevOps: 'from-orange-500 to-red-500',
    Finance: 'from-emerald-500 to-teal-600',
    HR: 'from-pink-500 to-rose-500',
    IT: 'from-blue-500 to-cyan-500',
    Product: 'from-purple-500 to-fuchsia-500',
    Marketing: 'from-amber-500 to-orange-500',
    Legal: 'from-slate-500 to-gray-600',
  };
  return m[dept] ?? 'from-slate-500 to-gray-500';
}

function availBadge(av: string) {
  if (av === 'Available') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (av === 'Busy') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
}

function availDot(av: string) {
  if (av === 'Available') return 'bg-emerald-500';
  if (av === 'Busy') return 'bg-amber-500';
  return 'bg-slate-400';
}

export function Employees() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [availability, setAvailability] = useState<'Available' | 'Busy' | 'On Leave'>('Available');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('Engineering');
  const [editRole, setEditRole] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editAvailability, setEditAvailability] = useState<'Available' | 'Busy' | 'On Leave'>('Available');
  const [editActive, setEditActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Employee[]>('/api/employees').then(setRows).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime(load);

  const deptOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_DEPARTMENTS, ...rows.map((r) => r.department)])).sort();
  }, [rows]);

  const selectedEmployee = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedEmployee) return;
    setEditName(selectedEmployee.name);
    setEditEmail(selectedEmployee.email);
    setEditDepartment(selectedEmployee.department);
    setEditRole(selectedEmployee.role);
    setEditTagsInput(tagsToInput(selectedEmployee.skill_tags));
    setEditAvailability(selectedEmployee.availability as typeof editAvailability);
    setEditActive(selectedEmployee.active === 1);
  }, [selectedEmployee]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim() || !role.trim()) {
      setFormError('Name, email, and role are required.');
      return;
    }
    try {
      await apiPost('/api/employees', {
        name: name.trim(), email: email.trim(), department: department.trim(),
        role: role.trim(), skill_tags: tagsInput.split(',').map((v) => v.trim()).filter(Boolean),
        availability,
      });
      setName(''); setEmail(''); setRole(''); setTagsInput('API, Documentation');
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add employee.');
    }
  }

  async function saveEmployee() {
    if (!selectedEmployee) return;
    setEditError(null);
    try {
      await apiPatch(`/api/employees/${selectedEmployee.id}`, {
        name: editName.trim(), email: editEmail.trim(), department: editDepartment.trim(),
        role: editRole.trim(), skill_tags: editTagsInput.split(',').map((v) => v.trim()).filter(Boolean),
        availability: editAvailability, active: editActive,
      });
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save employee.');
    }
  }

  const activeCount = rows.filter((r) => r.active === 1).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee Directory"
        description="Manage the team roster. AI uses skill tags, current load, and availability to pick the best assignee for each ticket."
      >
        <span className="badge bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{activeCount} active</span>
        <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200">{rows.length} total</span>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        {/* ── Add form ── */}
        <form onSubmit={handleAdd} className="card anim-slide-up p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-indigo-600">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" strokeLinecap="round" />
            </svg>
            <h3 className="text-sm font-bold text-slate-900">Add Employee</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              Email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              Department
              <select value={department} onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none">
                {deptOptions.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              Role
              <input required value={role} onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
              Skill Tags (comma-separated)
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none"
                placeholder="Database, Payroll, Networking" />
            </label>
            <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              Availability
              <select value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none">
                <option>Available</option><option>Busy</option><option>On Leave</option>
              </select>
            </label>
          </div>
          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          <button type="submit"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-800 transition">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            Add Employee
          </button>
        </form>

        {/* ── Edit panel ── */}
        <section className="card anim-slide-up p-6" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-slate-500">
                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-sm font-bold text-slate-900">Edit Employee</h3>
            </div>
          </div>

          {!selectedEmployee ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.5}>
                <circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              </svg>
              <p className="text-sm text-slate-500">Select an employee from the table below</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  Name
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
                </label>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  Email
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
                </label>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  Department
                  <select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none">
                    {deptOptions.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  Role
                  <input value={editRole} onChange={(e) => setEditRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
                </label>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  Skill Tags
                  <input value={editTagsInput} onChange={(e) => setEditTagsInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  Availability
                  <select value={editAvailability} onChange={(e) => setEditAvailability(e.target.value as typeof editAvailability)}
                    className="mt-1 block rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none">
                    <option>Available</option><option>Busy</option><option>On Leave</option>
                  </select>
                </label>
                <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Active in routing
                </label>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <button type="button" onClick={saveEmployee}
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                Save Changes
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── Employee table ── */}
      <div className="card overflow-hidden anim-slide-up" style={{ animationDelay: '120ms' }}>
        <div className="overflow-x-auto">
          <table className="table-premium min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Person</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Skills</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Load</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Avg Resolve</th>
                <th className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                const tags = parseTags(row.skill_tags);
                const selected = selectedId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer transition ${row.active ? '' : 'opacity-50'} ${selected ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200/40' : ''}`}
                    onClick={() => { setSelectedId(row.id); setEditError(null); }}
                  >
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${deptColor(row.department)} text-[0.625rem] font-bold text-white shadow-sm`}>
                          {row.name.split(' ').map(n => n[0]).join('')}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{row.name}</p>
                          <p className="text-xs text-slate-500 truncate">{row.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-slate-700">{row.department}</td>
                    <td className="max-w-[240px] px-4 py-3.5 align-top">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="badge bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">{tag}</span>
                        ))}
                        {tags.length > 4 && <span className="text-[0.625rem] text-slate-400">+{tags.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(row.current_load * 20, 100)}%` }} />
                        </div>
                        <span className="text-sm tabular-nums font-medium text-slate-700">{row.current_load}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-sm tabular-nums text-slate-700">
                      {row.avg_resolution_minutes != null ? `${row.avg_resolution_minutes} min` : '—'}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          {row.availability === 'Available' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                          <span className={`relative inline-flex h-2 w-2 rounded-full ${availDot(row.availability)}`} />
                        </span>
                        <span className={`badge ${availBadge(row.availability)}`}>{row.availability}</span>
                        {!row.active && <span className="badge bg-red-50 text-red-600 ring-1 ring-red-200 ml-1">Inactive</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
