import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../db/sequelize';

class TaskTemplate extends Model<
  InferAttributes<TaskTemplate>,
  InferCreationAttributes<TaskTemplate>
> {
  declare id: CreationOptional<number>;
  declare serviceTypeId: number;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare orderIndex: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TaskTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    serviceTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'service_types', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'task_templates',
    indexes: [{ fields: ['serviceTypeId', 'orderIndex'] }],
  }
);

export default TaskTemplate;
