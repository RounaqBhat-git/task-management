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
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {engagement && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-zinc-400 mb-1">
                  <Link href="/engagements" className="hover:underline">Engagements</Link> /
                </p>
                <h1 className="text-xl font-semibold text-zinc-900">{engagement.title}</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {engagement.client?.name} · {engagement.serviceType?.name} · Period: {engagement.periodKey}
                  {engagement.dueDate && ` · Due: ${new Date(engagement.dueDate).toLocaleDateString()}`}
                </p>
              </div>
              {canManage && engagement.serviceType?.recurrenceType !== 'one_time' && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleRollover}
                    disabled={rolling}
                    className="text-sm border border-zinc-300 rounded-lg px-4 py-2 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {rolling ? 'Rolling over…' : 'Rollover →'}
                  </button>
                  {rollMsg && <p className="text-xs text-zinc-500">{rollMsg}</p>}
                </div>
              )}
            </div>

            {/* Tasks table */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Task</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Assigned To</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Due</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(engagement.tasks ?? []).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-zinc-400 text-xs">No tasks</td></tr>
                  )}
                  {(engagement.tasks ?? []).map((task) => (
                    <tr key={task.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{task.title}</td>
                      <td className="px-4 py-3 text-zinc-500">{task.assignedTo?.name ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/tasks/${task.id}`} className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
