import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { getSequelize } from "@/lib/db";

export class Run extends Model<InferAttributes<Run>, InferCreationAttributes<Run>> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare indicator: "sakinorva" | "smysnk";
  declare runMode: "ai" | "user";
  declare subject: string;
  declare context: CreationOptional<string | null>;
  declare answers: CreationOptional<number[] | null>;
  declare explanations: CreationOptional<string[] | null>;
  declare responses: CreationOptional<{ questionId: string; answer: number; rationale: string }[] | null>;
  declare functionScores: CreationOptional<Record<string, number> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

let initialized = false;

export const initializeRunModel = () => {
  if (initialized) {
    return;
  }
  Run.init(
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
      indicator: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      runMode: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      subject: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      context: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: true
      },
      explanations: {
        type: DataTypes.JSON,
        allowNull: true
      },
      responses: {
        type: DataTypes.JSON,
        allowNull: true
      },
      functionScores: {
        type: DataTypes.JSON,
        allowNull: true
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
      tableName: "runs"
    }
  );
  initialized = true;
};
