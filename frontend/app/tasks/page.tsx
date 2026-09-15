'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';
import { tasksApi } from '@/lib/api';
import type { Task, TaskStatus } from '@/lib/types';

const PAGE_SIZE = 10;

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All',                value: '' },
  { label: 'Not Started',        value: 'not_started' },
  { label: 'In Progress',        value: 'in_progress' },
  { label: 'Waiting for Client', value: 'waiting_for_client' },
  { label: 'Ready for Review',   value: 'ready_for_review' },
  { label: 'Changes Requested',  value: 'changes_requested' },
  { label: 'Completed',          value: 'completed' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
    setLoading(true);
    tasksApi.list(filter ? { status: filter as TaskStatus } : {})
      .then((r) => setTasks(r.data.data))
      .catch(() => setError('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tasks.slice(start, start + PAGE_SIZE);
  }, [tasks, page]);

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Tasks</h1>
        </div>

        {/* Status filter tabs - horizontally scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs rounded-full px-3 py-1.5 border shrink-0 transition-all duration-200 active:scale-95 ${
                filter === f.value
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Engagement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Due</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" /></td>
                      <td className="px-4 py-4"><div className="h-3 bg-zinc-150 dark:bg-zinc-800/60 rounded w-1/2" /></td>
                      <td className="px-4 py-4"><div className="h-3 bg-zinc-150 dark:bg-zinc-800/60 rounded w-1/3" /></td>
                      <td className="px-4 py-4"><div className="h-3 bg-zinc-150 dark:bg-zinc-800/60 rounded w-16" /></td>
                      <td className="px-4 py-4"><div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-24" /></td>
                    </tr>
                  ))
                ) : paginatedTasks.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">No tasks found.</td></tr>
                ) : (
                  paginatedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors duration-150">
                      <td className="px-4 py-3.5">
                        <Link href={`/tasks/${task.id}`} className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400 text-xs">
                        {task.engagement ? (
                          <Link href={`/engagements/${task.engagementId}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {task.engagement.title}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">{task.assignedTo?.name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-zinc-400 dark:text-zinc-500 text-xs font-mono">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={task.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  <div className="h-3 bg-zinc-150 dark:bg-zinc-800/60 rounded w-1/2" />
                </div>
              ))
            ) : paginatedTasks.length === 0 ? (
              <p className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">No tasks found.</p>
            ) : (
              paginatedTasks.map((task) => (
                <div key={task.id} className="p-4 space-y-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/tasks/${task.id}`} className="font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 transition-colors">
                      {task.title}
                    </Link>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-y-1">
                    <span>
                      {task.engagement?.title ?? '—'} · {task.assignedTo?.name ?? 'Unassigned'}
                    </span>
                    {task.dueDate && (
                      <span className="font-mono text-[11px] text-zinc-400">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={tasks.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </main>

    </AuthGuard>
  );
}


