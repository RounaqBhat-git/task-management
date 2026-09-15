import type { TaskStatus } from '../models/Task';
import type { UserRole } from '../models/User';
import { ForbiddenError, ConflictError } from './errors';

/**
 * Allowed transitions map.
 * Key   = current status
 * Value = set of statuses the task may move TO
 */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started:        ['in_progress'],
  in_progress:        ['ready_for_review', 'waiting_for_client'],
  waiting_for_client: ['in_progress'],
  ready_for_review:   ['completed', 'changes_requested'],
  changes_requested:  ['in_progress'],
  completed:          [],   // terminal
};

/**
 * Transitions that ONLY a manager or admin may trigger.
 */
const MANAGER_ONLY_TRANSITIONS: TaskStatus[] = ['completed', 'changes_requested'];

/**
 * Validates that the requested transition is:
 *   1. A valid state-machine move
 *   2. Allowed for the requesting user's role
 *   3. Not a self-approval (team_member cannot approve their own work)
 *
 * Throws ForbiddenError or ConflictError if any rule is violated.
 */
export function validateTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: UserRole,
  requestingUserId: number,
  assignedToUserId: number | null
): void {
  // 1. Valid state-machine move?
  const allowed = TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new ConflictError(
      `Invalid transition: '${from}' → '${to}'. ` +
        `Allowed next states: [${allowed.join(', ') || 'none'}]`
    );
  }

  // 2. Manager-only transitions
  if (MANAGER_ONLY_TRANSITIONS.includes(to) && role === 'team_member') {
    throw new ForbiddenError(
      `Only a manager or admin can move a task to '${to}'`
    );
  }

  // 3. Team members can only move tasks assigned to themselves
  if (role === 'team_member') {
    if (assignedToUserId !== requestingUserId) {
      throw new ForbiddenError(
        'You can only update the status of tasks assigned to you'
      );
    }
  }

  // 4. Prevent self-approval
  if (to === 'completed' && assignedToUserId === requestingUserId) {
    throw new ForbiddenError('You cannot approve your own work');
  }
}
