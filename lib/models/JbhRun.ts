import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { getSequelize } from "@/lib/db";

export class JbhRun extends Model<
  InferAttributes<JbhRun>,
  InferCreationAttributes<JbhRun>
> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare runMode: "ai" | "user";
  declare subject: CreationOptional<string | null>;
  declare context: CreationOptional<string | null>;
  declare responses: { questionId: string; answer: number }[];
  declare scores: Record<string, number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

let initialized = false;

export const initializeJbhRunModel = () => {
  if (initialized) {
    return;
  }
  JbhRun.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      slug: {
        type: DataTypes.STRING(140),
        allowNull: false,
        unique: true
      },
      runMode: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      subject: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      context: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      responses: {
        type: DataTypes.JSON,
        allowNull: false
      },
      scores: {
        type: DataTypes.JSON,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize: getSequelize(),
      tableName: "jbh_runs"
    }
  );
  initialized = true;
};
