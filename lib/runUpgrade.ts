import { DataTypes } from "sequelize";
import { extractResultMetadata } from "@/lib/runMetadata";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";
import { initializeSmysnkRunModel, SmysnkRun } from "@/lib/models/SmysnkRun";
import { initializeRunModel, Run } from "@/lib/models/Run";

let upgradePromise: Promise<void> | null = null;

const toAbsoluteScores = (scores: Record<string, number> | null) =>
  scores
    ? Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.abs(value)]))
    : null;

const normalizeTableName = (name: string) => name.toString().toLowerCase();

export const runRunUpgrades = async () => {
  if (!upgradePromise) {
    upgradePromise = (async () => {
      initializeRunModel();
      const sequelize = Run.sequelize;
      if (!sequelize) {
        return;
      }
      const queryInterface = sequelize.getQueryInterface();
      await Run.sync();

      const tables = await queryInterface.showAllTables();
      const tableNames = new Set(tables.map(normalizeTableName));

      const existingRuns = await Run.findAll({ attributes: ["slug"] });
      const existingSlugs = new Set(existingRuns.map((run) => run.slug));

      if (tableNames.has("interactions")) {
        initializeInteractionModel();
        const interactionTable = await queryInterface.describeTable("interactions");
        if (!("runMode" in interactionTable)) {
          await queryInterface.addColumn("interactions", "runMode", {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "ai"
          });
        }
        const interactions = await Interaction.findAll();
        for (const interaction of interactions) {
          if (existingSlugs.has(interaction.slug)) {
            continue;
          }
          const extractedScores =
            interaction.functionScores && Object.keys(interaction.functionScores).length
              ? interaction.functionScores
              : interaction.resultsHtmlFragment
                ? extractResultMetadata(interaction.resultsHtmlFragment).functionScores
                : null;
          const functionScores =
            extractedScores && Object.keys(extractedScores).length ? toAbsoluteScores(extractedScores) : null;

          await Run.create({
            slug: interaction.slug,
            indicator: "sakinorva",
            runMode: interaction.runMode || "ai",
            character: interaction.character,
            context: interaction.context,
            answers: interaction.answers,
            explanations: interaction.explanations,
            functionScores,
            grantType: interaction.grantType,
            secondType: interaction.secondType,
            thirdType: interaction.thirdType,
            axisType: interaction.axisType,
            myersType: interaction.myersType,
            createdAt: interaction.createdAt,
            updatedAt: interaction.updatedAt
          });
          existingSlugs.add(interaction.slug);
        }
      }

      if (tableNames.has("smysnk_runs")) {
        initializeSmysnkRunModel();
        const smysnkRuns = await SmysnkRun.findAll();
        for (const run of smysnkRuns) {
          if (existingSlugs.has(run.slug)) {
            continue;
          }
          const functionScores =
            run.scores && Object.keys(run.scores).length ? toAbsoluteScores(run.scores) : null;
          await Run.create({
            slug: run.slug,
            indicator: "smysnk",
            runMode: run.runMode,
            subject: run.subject,
            context: run.context,
            responses: run.responses,
            functionScores,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt
          });
          existingSlugs.add(run.slug);
        }
      }
    })();
  }
  await upgradePromise;
};
