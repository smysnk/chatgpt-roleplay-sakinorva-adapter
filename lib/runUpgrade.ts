import { DataTypes } from "sequelize";
import { extractResultMetadata } from "@/lib/runMetadata";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";
import { initializeSmysnkRunModel, SmysnkRun } from "@/lib/models/SmysnkRun";
import { initializeRunModel, Run } from "@/lib/models/Run";

let upgradePromise: Promise<void> | null = null;

const shouldUpdateScores = (scores: Record<string, number> | null) => !scores || !Object.keys(scores).length;

const toAbsoluteScores = (scores: Record<string, number> | null) =>
  scores
    ? Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.abs(value)]))
    : null;

const normalizeTableName = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = (value as { tableName?: string; name?: string }).tableName ??
    (value as { name?: string }).name;
  return typeof candidate === "string" ? candidate : null;
};

export const runRunUpgrades = async () => {
  if (!upgradePromise) {
    upgradePromise = (async () => {
      initializeRunModel();
      const queryInterface = Run.sequelize?.getQueryInterface();
      if (!queryInterface) {
        return;
      }
      const tables = await queryInterface.showAllTables();
      const tableNames = new Set(tables.map(normalizeTableName).filter(Boolean));
      if (!tableNames.has("interactions") && !tableNames.has("smysnk_runs")) {
        return;
      }

      if (tableNames.has("interactions")) {
        initializeInteractionModel();
        const table = await queryInterface.describeTable("interactions");
        if (!("runMode" in table)) {
          await queryInterface.addColumn("interactions", "runMode", {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "ai"
          });
        }
      }

      if (tableNames.has("runs")) {
        const runTable = await queryInterface.describeTable("runs");
        if (!("state" in runTable)) {
          await queryInterface.addColumn("runs", "state", {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "COMPLETED"
          });
        }
        if (!("errors" in runTable)) {
          await queryInterface.addColumn("runs", "errors", {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
          });
        }
        if (!("redditProfile" in runTable)) {
          await queryInterface.addColumn("runs", "redditProfile", {
            type: DataTypes.JSON,
            allowNull: true
          });
        }
        if (!("questionMode" in runTable)) {
          await queryInterface.addColumn("runs", "questionMode", {
            type: DataTypes.STRING(20),
            allowNull: true
          });
        }
        if (!("questionCount" in runTable)) {
          await queryInterface.addColumn("runs", "questionCount", {
            type: DataTypes.INTEGER,
            allowNull: true
          });
        }
        if (!("questionIds" in runTable)) {
          await queryInterface.addColumn("runs", "questionIds", {
            type: DataTypes.JSON,
            allowNull: true
          });
        }
        if (!("analysis" in runTable)) {
          await queryInterface.addColumn("runs", "analysis", {
            type: DataTypes.JSON,
            allowNull: true
          });
        }
      }

      const existingRuns = await Run.findAll({ attributes: ["slug"] });
      const existingSlugs = new Set(existingRuns.map((run) => run.slug));

      if (tableNames.has("interactions")) {
        const interactions = await Interaction.findAll();
        const updates = interactions.map(async (interaction) => {
          if (!interaction.resultsHtmlFragment || !shouldUpdateScores(interaction.functionScores)) {
            return;
          }
          const metadata = extractResultMetadata(interaction.resultsHtmlFragment);
          if (!Object.keys(metadata.functionScores).length) {
            return;
          }
          await interaction.update({ functionScores: metadata.functionScores });
        });
        await Promise.all(updates);

        const needsMode = interactions.filter((interaction) => !interaction.runMode);
        if (needsMode.length) {
          await Promise.all(needsMode.map((interaction) => interaction.update({ runMode: "ai" })));
        }

        const runCreates = interactions
          .filter((interaction) => !existingSlugs.has(interaction.slug))
          .map((interaction) =>
            Run.create({
              slug: interaction.slug,
              indicator: "sakinorva",
              runMode: (interaction.runMode as "ai" | "user" | "reddit") ?? "ai",
              state: "COMPLETED",
              errors: 0,
              subject: interaction.character,
              context: interaction.context,
              questionMode: null,
              questionCount: interaction.answers?.length ?? null,
              questionIds: null,
              analysis: null,
              answers: interaction.answers,
              explanations: interaction.explanations,
              responses: null,
              functionScores: toAbsoluteScores(interaction.functionScores),
              createdAt: interaction.createdAt,
              updatedAt: interaction.updatedAt
            })
          );
        await Promise.all(runCreates);
      }

      if (tableNames.has("smysnk_runs")) {
        initializeSmysnkRunModel();
        const smysnkRuns = await SmysnkRun.findAll();
        const runCreates = smysnkRuns
          .filter((run) => !existingSlugs.has(run.slug))
          .map((run) =>
            Run.create({
              slug: run.slug,
              indicator: "smysnk",
              runMode: run.runMode,
              state: "COMPLETED",
              errors: 0,
              subject: run.subject ?? "Self",
              context: run.context,
              questionMode: null,
              questionCount: run.responses?.length ?? null,
              questionIds: null,
              analysis: null,
              answers: null,
              explanations: null,
              responses: run.responses,
              functionScores: run.scores,
              createdAt: run.createdAt,
              updatedAt: run.updatedAt
            })
          );
        await Promise.all(runCreates);
      }
    })();
  }
  await upgradePromise;
};
