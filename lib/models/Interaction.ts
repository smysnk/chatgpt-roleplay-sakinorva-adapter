import { DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "@/lib/db";

export class Interaction extends Model<
  InferAttributes<Interaction>,
  InferCreationAttributes<Interaction>
> {
  declare id: number;
  declare character: string;
  declare context: string | null;
  declare answers: number[];
  declare explanations: string[];
  declare resultsHtmlFragment: string;
  declare resultsSummary: string;
  declare createdAt: Date;
  declare updatedAt: Date;
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
    }
  },
  {
    sequelize,
    tableName: "interactions"
  }
);
