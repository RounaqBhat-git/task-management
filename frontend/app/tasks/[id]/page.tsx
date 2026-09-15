'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { tasksApi, usersApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import type { AuthUser, Task, TaskStatus } from '@/lib/types';

// Workflow state machine
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started:        ['in_progress'],
  in_progress:        ['ready_for_review', 'waiting_for_client'],
  waiting_for_client: ['in_progress'],
  ready_for_review:   ['completed', 'changes_requested'],
  changes_requested:  ['in_progress'],
  completed:          [],
};

const MANAGER_ONLY: TaskStatus[] = ['completed', 'changes_requested'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started:        'Not Started',
  in_progress:        'In Progress',
  waiting_for_client: 'Waiting for Client',
  ready_for_review:   'Ready for Review',
  changes_requested:  'Changes Requested',
  completed:          'Completed',
};

/**
 * Returns the status buttons the current user is allowed to see for this task.
 *
 * Rules (mirrors backend validateTransition):
 *   1. Only reachable states from current status.
 *   2. team_member cannot trigger manager-only transitions.
 *   3. team_member can only act on tasks assigned to themselves.
 *   4. Nobody can approve (→ completed) a task assigned to themselves.
 */
function allowedTransitions(task: Task, user: AuthUser): TaskStatus[] {
  const reachable = TRANSITIONS[task.status];
  if (reachable.length === 0) return [];

  const role = user.role;
  const isAssignedToMe = task.assignedToUserId === user.id;

  // team_member: must own the task, cannot do manager-only transitions
  if (role === 'team_member') {
    if (!isAssignedToMe) return [];
    return reachable.filter((s) => !MANAGER_ONLY.includes(s));
  }

  // manager / admin: can do everything in the state machine except
  // approve a task assigned to themselves (self-approval rule)
  return reachable.filter((s) => {
    if (s === 'completed' && isAssignedToMe) return false;
    return true;
  });
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>([]);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [comment, setComment] = useState('');
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');
  // Assign state
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Load user from localStorage on client only (avoids SSR mismatch)
  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    // Fetch team members for the assign dropdown if manager or admin
    if (u && (u.role === 'admin' || u.role === 'manager')) {
      usersApi.teamMembers()
        .then((r) => setTeamMembers(r.data.data))
        .catch(() => {}); // non-critical, dropdown just stays empty
    }
  }, []);

  function load() {
    tasksApi.get(Number(id))
      .then((r) => {
        const t = r.data.data;
        setTask(t);
        // Keep dropdown in sync with current assignee
        setSelectedAssignee(t.assignedToUserId ? String(t.assignedToUserId) : '');
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (status === 403) {
          setError('You don\'t have permission to view this task.');
        } else if (status === 404) {
          setError('Task not found.');
        } else {
          setError(msg ?? 'Failed to load task.');
        }
      });
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function transition(toStatus: TaskStatus) {
    setTxError('');
    setTxSuccess('');
    setTransitioning(true);
    try {
      await tasksApi.updateStatus(Number(id), toStatus, comment || undefined);
      setComment('');
      setTxSuccess(`Status updated to "${STATUS_LABELS[toStatus]}"`);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Transition failed';
      setTxError(msg);
    } finally {
      setTransitioning(false);
    }
  }

  async function handleAssign() {
    setAssignError('');
    setAssignSuccess('');
    setAssigning(true);
    try {
      const assignedToUserId = selectedAssignee ? Number(selectedAssignee) : null;
      await tasksApi.assign(Number(id), assignedToUserId);
      const name = assignedToUserId
        ? teamMembers.find((m) => m.id === assignedToUserId)?.name ?? 'selected user'
        : 'nobody';
      setAssignSuccess(`Assigned to ${name}`);
      load(); // refresh so "Assigned To" in header card updates too
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Assign failed';
      setAssignError(msg);
    } finally {
      setAssigning(false);
    }
  }

  if (!task && !error) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Loading…</p>
        </main>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
            <Link href="/tasks" className="text-xs text-zinc-400 hover:underline">
              ← Back to Tasks
            </Link>
          </div>
        </main>
      </AuthGuard>
    );
  }

  const transitions = task && user ? allowedTransitions(task, user) : [];

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {task && (
          <div className="flex flex-col gap-5 sm:gap-6">

            {/* Breadcrumb */}
            <p className="text-xs text-zinc-400">
              <Link href="/tasks" className="hover:underline">Tasks</Link>
              {task.engagement && (
                <> / <Link href={`/engagements/${task.engagementId}`} className="hover:underline">
                  {task.engagement.title}
                </Link></>
              )}
            </p>

            {/* Header card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white pr-2">{task.title}</h1>
                <div className="shrink-0"><StatusBadge status={task.status} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Assigned To</p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">{task.assignedTo?.name ?? <span className="text-zinc-400">Unassigned</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Due Date</p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium font-mono text-xs">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-zinc-400">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Engagement</p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">{task.engagement?.title ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Period</p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">{task.engagement?.periodKey ?? '—'}</p>
                </div>
              </div>
              {task.notes && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Notes</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}
            </div>

            {/* ── Assign / Reassign card (manager & admin only) ── */}
            {user && (user.role === 'admin' || user.role === 'manager') && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
                  {task.assignedToUserId ? 'Reassign Task' : 'Assign Task'}
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedAssignee}
                    onChange={(e) => {
                      setSelectedAssignee(e.target.value);
                      setAssignSuccess('');
                      setAssignError('');
                    }}
                    className="flex-1 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                  >
                    <option value="">— Unassigned —</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {task.assignedToUserId === m.id ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={
                      assigning ||
                      selectedAssignee === (task.assignedToUserId ? String(task.assignedToUserId) : '')
                    }
                    className="text-xs sm:text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg px-4 py-2 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 transition-all shrink-0 active:scale-95"
                  >
                    {assigning ? 'Saving…' : task.assignedToUserId ? 'Reassign' : 'Assign'}
                  </button>
                </div>
                {assignSuccess && (
                  <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2 mt-3">
                    ✓ {assignSuccess}
                  </p>
                )}
                {assignError && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 mt-3">
                    {assignError}
                  </p>
                )}
              </div>
            )}

            {/* ── Status transition controls ── */}
            {task.status !== 'completed' && user && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Update Status</h2>

                {transitions.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                    {user.role === 'team_member' && task.assignedToUserId !== user.id
                      ? 'This task is not assigned to you — only the assignee can change its status.'
                      : 'No actions available for this status.'}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
                      Current status: <strong className="text-zinc-700 dark:text-zinc-300">{STATUS_LABELS[task.status]}</strong>
                    </p>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Optional comment (visible in history)…"
                      rows={2}
                      className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                      {transitions.map((s) => (
                        <button
                          key={s}
                          onClick={() => transition(s)}
                          disabled={transitioning}
                          className="w-full sm:w-auto text-xs sm:text-sm font-semibold border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 disabled:opacity-40 transition-all active:scale-95 text-center"
                        >
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    {txSuccess && (
                      <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2 mt-3">
                        {txSuccess}
                      </p>
                    )}
                    {txError && (
                      <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 mt-3">
                        {txError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Completed banner */}
            {task.status === 'completed' && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl px-4 sm:px-6 py-4 text-xs sm:text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ This task is completed.
              </div>
            )}

            {/* History */}
            {task.history && task.history.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">History</h2>
                <div className="flex flex-col gap-3">
                  {task.history.map((h) => (
                    <div key={h.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 text-xs border-b sm:border-b-0 border-zinc-100 dark:border-zinc-800 pb-2 sm:pb-0">
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono shrink-0 pt-0.5 text-[11px]">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{h.changedBy?.name ?? 'Unknown'}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {' '}moved from{' '}
                          <span className="font-medium">{STATUS_LABELS[h.fromStatus]}</span>
                          {' '}→{' '}
                          <span className="font-medium">{STATUS_LABELS[h.toStatus]}</span>
                        </span>
                        {h.comment && (
                          <p className="text-zinc-500 dark:text-zinc-400 italic mt-0.5">"{h.comment}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

    </AuthGuard>
  );
}
