import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import sequelize from '../db/sequelize';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_for_client'
  | 'ready_for_review'
  | 'changes_requested'
  | 'completed';

class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<number>;
  declare engagementId: number;
  declare taskTemplateId: CreationOptional<number | null>;
  declare assignedToUserId: CreationOptional<number | null>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<TaskStatus>;
  declare dueDate: CreationOptional<Date | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // populated by eager loads
  declare engagement?: NonAttribute<import('./Engagement').default>;
  declare assignedTo?: NonAttribute<import('./User').default>;
  declare taskTemplate?: NonAttribute<import('./TaskTemplate').default>;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    engagementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'engagements', key: 'id' },
      onDelete: 'CASCADE',
    },
    taskTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'task_templates', key: 'id' },
      onDelete: 'SET NULL',
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'not_started',
        'in_progress',
        'waiting_for_client',
        'ready_for_review',
        'changes_requested',
        'completed'
      ),
      allowNull: false,
      defaultValue: 'not_started',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tasks',
    indexes: [
      { fields: ['engagementId'] },
      { fields: ['assignedToUserId'] },
      { fields: ['status'] },
      { fields: ['dueDate'] },
    ],
  }
);

export default Task;
