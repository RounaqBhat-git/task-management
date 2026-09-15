'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { engagementsApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import type { Engagement } from '@/lib/types';
import Link from 'next/link';

export default function EngagementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);
  const [rollMsg, setRollMsg] = useState('');

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  function load() {
    engagementsApi.get(Number(id))
      .then((r) => setEngagement(r.data.data))
      .catch(() => setError('Failed to load engagement'));
  }

  useEffect(() => { load(); }, [id]);

  async function handleRollover() {
    setRolling(true);
    setRollMsg('');
    try {
      const r = await engagementsApi.rollover(Number(id));
      setRollMsg(`✓ New engagement created for period ${r.data.data.periodKey}`);
    } catch (err: unknown) {
      setRollMsg(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Rollover failed'
      );
    } finally {
      setRolling(false);
    }
  }

  if (!engagement && !error) {
    return (
      <AuthGuard><Navbar />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-sm text-zinc-400">Loading…</p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {engagement && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs text-zinc-400 mb-1">
                  <Link href="/engagements" className="hover:underline">Engagements</Link> /
                </p>
                <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white">{engagement.title}</h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {engagement.client?.name} · {engagement.serviceType?.name} · Period: {engagement.periodKey}
                  {engagement.dueDate && ` · Due: ${new Date(engagement.dueDate).toLocaleDateString()}`}
                </p>
              </div>
              {canManage && engagement.serviceType?.recurrenceType !== 'one_time' && (
                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                  <button
                    onClick={handleRollover}
                    disabled={rolling}
                    className="text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                  >
                    {rolling ? 'Rolling over…' : 'Rollover →'}
                  </button>
                  {rollMsg && <p className="text-xs text-zinc-500">{rollMsg}</p>}
                </div>
              )}
            </div>

            {/* Tasks container */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Task</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Assigned To</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Due</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {(engagement.tasks ?? []).length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">No tasks found</td></tr>
                    )}
                    {(engagement.tasks ?? []).map((task) => (
                      <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{task.title}</td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{task.assignedTo?.name ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
                        <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 text-xs font-mono">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/tasks/${task.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {(engagement.tasks ?? []).length === 0 ? (
                  <p className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">No tasks found</p>
                ) : (
                  (engagement.tasks ?? []).map((task) => (
                    <div key={task.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{task.title}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Assigned: {task.assignedTo?.name ?? 'Unassigned'}</span>
                        <Link href={`/tasks/${task.id}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          View details →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

    </AuthGuard>
  );
}
