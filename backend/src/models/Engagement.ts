import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import sequelize from '../db/sequelize';

export type EngagementStatus = 'active' | 'completed' | 'cancelled';

class Engagement extends Model<
  InferAttributes<Engagement>,
  InferCreationAttributes<Engagement>
> {
  declare id: CreationOptional<number>;
  declare clientId: number;
  declare serviceTypeId: number;
  declare createdByUserId: number;  // manager who created it — used for scoping
  declare title: string;
  declare status: CreationOptional<EngagementStatus>;
  /**
   * periodKey format:
   *   monthly     → "2026-09"
   *   quarterly   → "2026-Q3"
   *   annually    → "2026"
   *   one_time    → "one_time"  (only one allowed per client+service)
   */
  declare periodKey: string;
  declare startDate: CreationOptional<Date | null>;
  declare dueDate: CreationOptional<Date | null>;
  declare notes: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // populated by eager loads
  declare client?: NonAttribute<import('./Client').default>;
  declare serviceType?: NonAttribute<import('./ServiceType').default>;
  declare createdBy?: NonAttribute<import('./User').default>;
}

Engagement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
    },
    serviceTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'service_types', key: 'id' },
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
    },
    periodKey: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    tableName: 'engagements',
    indexes: [
      // Core duplicate-prevention constraint: one engagement per client+service+period
      {
        unique: true,
        fields: ['clientId', 'serviceTypeId', 'periodKey'],
        name: 'engagements_client_service_period_unique',
      },
      { fields: ['createdByUserId'] },
      { fields: ['status'] },
      { fields: ['dueDate'] },
    ],
  }
);

export default Engagement;
