import type { TaskStatus } from '@/lib/types';

const STYLES: Record<TaskStatus, string> = {
  not_started:        'bg-zinc-100 text-zinc-600',
  in_progress:        'bg-blue-100 text-blue-700',
  waiting_for_client: 'bg-yellow-100 text-yellow-700',
  ready_for_review:   'bg-purple-100 text-purple-700',
  changes_requested:  'bg-orange-100 text-orange-700',
  completed:          'bg-green-100 text-green-700',
};

const LABELS: Record<TaskStatus, string> = {
  not_started:        'Not Started',
  in_progress:        'In Progress',
  waiting_for_client: 'Waiting for Client',
  ready_for_review:   'Ready for Review',
  changes_requested:  'Changes Requested',
  completed:          'Completed',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'changes_requested') {
    return (
      <span className={`inline-flex flex-col items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight text-center ${STYLES[status]}`}>
        <span>Changes</span>
        <span>Requested</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
