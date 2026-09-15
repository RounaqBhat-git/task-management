export type UserRole = 'admin' | 'manager' | 'team_member';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_for_client'
  | 'ready_for_review'
  | 'changes_requested'
  | 'completed';

export type EngagementStatus = 'active' | 'completed' | 'cancelled';

export interface Client {
  id: number;
  name: string;
  contactEmail?: string | null;
  isActive: boolean;
}

export interface ServiceType {
  id: number;
  name: string;
  recurrenceType: 'one_time' | 'monthly' | 'quarterly' | 'annually';
  isActive: boolean;
  taskTemplates?: TaskTemplate[];
}

export interface TaskTemplate {
  id: number;
  title: string;
  orderIndex: number;
}

export interface Engagement {
  id: number;
  title: string;
  status: EngagementStatus;
  periodKey: string;
  dueDate?: string | null;
  startDate?: string | null;
  notes?: string | null;
  client?: Client;
  serviceType?: ServiceType;
  createdByUserId: number;
  tasks?: Task[];
}

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  dueDate?: string | null;
  notes?: string | null;
  engagementId: number;
  assignedToUserId?: number | null;
  assignedTo?: { id: number; name: string; email: string } | null;
  taskTemplate?: { id: number; title: string } | null;
  engagement?: { id: number; title: string; periodKey: string; dueDate?: string | null };
  history?: TaskHistoryEntry[];
}

export interface TaskHistoryEntry {
  id: number;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  comment?: string | null;
  createdAt: string;
  changedBy?: { id: number; name: string };
}

export interface DashboardData {
  summary: {
    open: number;
    overdue: number;
    dueToday: number;
    waitingForClient: number;
    waitingForReview: number;
  };
  overdueTask: Task[];
  dueTodayTasks: Task[];
  waitingForClientTasks: Task[];
  waitingForReviewTasks: Task[];
  recentOpenTasks: Task[];
}
