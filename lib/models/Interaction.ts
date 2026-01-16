import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { getSequelize } from "@/lib/db";

export class Interaction extends Model<
  InferAttributes<Interaction>,
  InferCreationAttributes<Interaction>
> {
  declare id: CreationOptional<number>;
  declare slug: string;
  declare character: string;
  declare context: CreationOptional<string | null>;
  declare answers: number[];
  declare explanations: string[];
  declare resultsHtmlFragment: string;
  declare resultsSummary: string;
  declare grantType: CreationOptional<string | null>;
  declare secondType: CreationOptional<string | null>;
  declare thirdType: CreationOptional<string | null>;
  declare axisType: CreationOptional<string | null>;
  declare myersType: CreationOptional<string | null>;
  declare functionScores: CreationOptional<Record<string, number> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

let initialized = false;

export const initializeInteractionModel = () => {
  if (initialized) {
    return;
  }
  Interaction.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      character: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING(140),
        allowNull: false,
        unique: true
      },
      context: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: false
      },
      explanations: {
        type: DataTypes.JSON,
        allowNull: false
      },
      resultsHtmlFragment: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      resultsSummary: {
        type: DataTypes.STRING(240),
        allowNull: false
      },
      grantType: {
        type: DataTypes.STRING(40),
        allowNull: true
      },
      secondType: {
        type: DataTypes.STRING(40),
        allowNull: true
      },
      thirdType: {
        type: DataTypes.STRING(40),
        allowNull: true
      },
      axisType: {
        type: DataTypes.STRING(40),
        allowNull: true
      },
      myersType: {
        type: DataTypes.STRING(40),
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
      tableName: "interactions"
    }
  );
  initialized = true;
};
