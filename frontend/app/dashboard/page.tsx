'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { dashboardApi } from '@/lib/api';
import type { DashboardData, Task } from '@/lib/types';
import Link from 'next/link';

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const isAlert = highlight && value > 0;
  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
        isAlert
          ? 'border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/25'
          : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-bold ${isAlert ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {value}
        </span>
        {isAlert && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </div>
      <span className={`text-xs font-medium ${isAlert ? 'text-red-700 dark:text-red-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {label}
      </span>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 sm:py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors gap-2"
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
          {task.title}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
          {task.engagement?.title ?? '—'} · {task.assignedTo?.name ?? 'Unassigned'}
        </span>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/50">
        {task.dueDate && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        <StatusBadge status={task.status} />
      </div>
    </Link>
  );
}

function TaskSection({ title, tasks }: { title: string; tasks: Task[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          {tasks.length}
        </span>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-xs overflow-hidden">
        {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-800" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-800" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.get()
      .then((r) => setData(r.data.data))
      .catch(() => setError('Failed to load dashboard'));
  }, []);

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Dashboard</h1>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        {data ? (
          <div className="flex flex-col gap-6 sm:gap-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              <SummaryCard label="Open Tasks"           value={data.summary.open} />
              <SummaryCard label="Overdue"              value={data.summary.overdue}           highlight />
              <SummaryCard label="Due Today"            value={data.summary.dueToday}          highlight />
              <SummaryCard label="Waiting for Client"   value={data.summary.waitingForClient} />
              <SummaryCard label="Waiting for Review"   value={data.summary.waitingForReview} />
            </div>

            {/* Task lists */}
            <TaskSection title="Overdue"            tasks={data.overdueTask} />
            <TaskSection title="Due Today"          tasks={data.dueTodayTasks} />
            <TaskSection title="Waiting for Review" tasks={data.waitingForReviewTasks} />
            <TaskSection title="Waiting for Client" tasks={data.waitingForClientTasks} />
            <TaskSection title="Recent Open Tasks"  tasks={data.recentOpenTasks} />
          </div>
        ) : (
          !error && <DashboardSkeleton />
        )}
      </main>
    </AuthGuard>
  );
}

