/**
 * Central model registry.
 * Import from here everywhere — never import individual model files directly
 * outside of this module, so associations are always guaranteed to be set up.
 */

import User from './User';
import Client from './Client';
import ServiceType from './ServiceType';
import TaskTemplate from './TaskTemplate';
import Engagement from './Engagement';
import Task from './Task';
import TaskHistory from './TaskHistory';

// ServiceType <-> TaskTemplate
ServiceType.hasMany(TaskTemplate, {
  foreignKey: 'serviceTypeId',
  as: 'taskTemplates',
});
TaskTemplate.belongsTo(ServiceType, {
  foreignKey: 'serviceTypeId',
  as: 'serviceType',
});

// Engagement <-> Client / ServiceType / User
Client.hasMany(Engagement, { foreignKey: 'clientId', as: 'engagements' });
Engagement.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

ServiceType.hasMany(Engagement, {
  foreignKey: 'serviceTypeId',
  as: 'engagements',
});
Engagement.belongsTo(ServiceType, {
  foreignKey: 'serviceTypeId',
  as: 'serviceType',
});

User.hasMany(Engagement, {
  foreignKey: 'createdByUserId',
  as: 'createdEngagements',
});
Engagement.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

// Engagement <-> Task
Engagement.hasMany(Task, { foreignKey: 'engagementId', as: 'tasks' });
Task.belongsTo(Engagement, { foreignKey: 'engagementId', as: 'engagement' });

// Task <-> TaskTemplate
TaskTemplate.hasMany(Task, { foreignKey: 'taskTemplateId', as: 'tasks' });
Task.belongsTo(TaskTemplate, {
  foreignKey: 'taskTemplateId',
  as: 'taskTemplate',
});

// Task <-> User (assignee)
User.hasMany(Task, { foreignKey: 'assignedToUserId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });

// Task <-> TaskHistory
Task.hasMany(TaskHistory, { foreignKey: 'taskId', as: 'history' });
TaskHistory.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

User.hasMany(TaskHistory, {
  foreignKey: 'changedByUserId',
  as: 'taskHistoryEntries',
});
TaskHistory.belongsTo(User, { foreignKey: 'changedByUserId', as: 'changedBy' });

export { User, Client, ServiceType, TaskTemplate, Engagement, Task, TaskHistory };
