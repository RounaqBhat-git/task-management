'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { engagementsApi, clientsApi, serviceTypesApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import type { Engagement, Client, ServiceType } from '@/lib/types';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300',
  cancelled: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const canCreate = user?.role === 'admin' || user?.role === 'manager';

  const [form, setForm] = useState({
    clientId: '', serviceTypeId: '', title: '',
    periodDate: '', dueDate: '', notes: '',
  });

  function load() {
    setLoading(true);
    engagementsApi.list()
      .then((r) => { setEngagements(r.data.data); setPage(1); })
      .catch(() => setError('Failed to load engagements'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (canCreate) {
      clientsApi.list().then((r) => setClients(r.data.data)).catch(() => {});
      serviceTypesApi.list().then((r) => setServiceTypes(r.data.data)).catch(() => {});
    }
  }, [canCreate]);

  const totalPages = Math.max(1, Math.ceil(engagements.length / PAGE_SIZE));

  const paginatedEngagements = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return engagements.slice(start, start + PAGE_SIZE);
  }, [engagements, page]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await engagementsApi.create({
        clientId: Number(form.clientId),
        serviceTypeId: Number(form.serviceTypeId),
        title: form.title,
        periodDate: new Date(form.periodDate).toISOString(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ clientId: '', serviceTypeId: '', title: '', periodDate: '', dueDate: '', notes: '' });
      load();
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create engagement'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Engagements</h1>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg px-4 py-2 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-all duration-200 active:scale-95 shadow-xs"
            >
              {showForm ? 'Cancel' : '+ New Engagement'}
            </button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-6 mb-6 grid grid-cols-2 gap-4 shadow-sm animate-scale-in">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Client</label>
              <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Service Type</label>
              <select required value={form.serviceTypeId} onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600">
                <option value="">Select service…</option>
                {serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Period Date</label>
              <input required type="date" value={form.periodDate} onChange={(e) => setForm({ ...form, periodDate: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Due Date (optional)</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600" />
            </div>
            {formError && <p className="col-span-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2">Cancel</button>
              <button type="submit" disabled={submitting} className="text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg px-4 py-2 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Engagement'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-xs">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                <div className="space-y-2 w-1/2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-150 dark:bg-zinc-800/60 rounded w-1/2" />
                </div>
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20" />
              </div>
            ))
          ) : paginatedEngagements.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">No engagements found.</p>
          ) : (
            paginatedEngagements.map((eng) => (
              <Link key={eng.id} href={`/engagements/${eng.id}`}
                className="group flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {eng.title}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {eng.client?.name ?? '—'} · {eng.serviceType?.name ?? '—'} · Period: {eng.periodKey}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {eng.dueDate && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                      {new Date(eng.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 capitalize ${STATUS_STYLES[eng.status] ?? ''}`}>
                    {eng.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={engagements.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </main>
    </AuthGuard>
  );
}

