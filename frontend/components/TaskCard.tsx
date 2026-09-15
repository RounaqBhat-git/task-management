// TaskCard component for displaying a task as a stylized card
'use client';

import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Task } from '@/lib/types';

export default function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow hover:-translate-y-1 p-4 mb-3 slide-up fade-in"
    >
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {task.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {task.engagement?.title ?? '—'} · {task.assignedTo?.name ?? 'Unassigned'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          <StatusBadge status={task.status} />
        </div>
      </div>
    </Link>
  );
}
