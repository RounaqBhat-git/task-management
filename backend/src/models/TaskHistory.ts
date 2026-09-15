import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import sequelize from '../db/sequelize';
import type { TaskStatus } from './Task';

class TaskHistory extends Model<
  InferAttributes<TaskHistory>,
  InferCreationAttributes<TaskHistory>
> {
  declare id: CreationOptional<number>;
  declare taskId: number;
  declare changedByUserId: number;
  declare fromStatus: TaskStatus;
  declare toStatus: TaskStatus;
  declare comment: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  // No updatedAt — history rows are immutable
  declare updatedAt: CreationOptional<Date>;

  // populated by eager loads
  declare changedBy?: NonAttribute<import('./User').default>;
}

TaskHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tasks', key: 'id' },
      onDelete: 'CASCADE',
    },
    changedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    fromStatus: {
      type: DataTypes.ENUM(
        'not_started',
        'in_progress',
        'waiting_for_client',
        'ready_for_review',
        'changes_requested',
        'completed'
      ),
      allowNull: false,
    },
    toStatus: {
      type: DataTypes.ENUM(
        'not_started',
        'in_progress',
        'waiting_for_client',
        'ready_for_review',
        'changes_requested',
        'completed'
      ),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'task_history',
    updatedAt: false, // history rows are immutable
    indexes: [
      { fields: ['taskId'] },
      { fields: ['changedByUserId'] },
    ],
  }
);

export default TaskHistory;
