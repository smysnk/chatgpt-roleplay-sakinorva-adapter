const path = require("path");
const { DataTypes, Sequelize } = require("sequelize");

const defaultSqlitePath = path.join(process.cwd(), "data.sqlite");
const sqlitePath = process.env.SQLITE_STORAGE ?? defaultSqlitePath;
const databaseUrl = process.env.DATABASE_URL;
const batchSize = Number(process.env.IMPORT_BATCH_SIZE ?? 200);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to import into Postgres.");
}

const sqlite = new Sequelize({
  dialect: "sqlite",
  storage: sqlitePath,
  logging: false
});

const postgres = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false
});

const defineRun = (sequelize) =>
  sequelize.define(
    "Run",
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
      character: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      subject: {
        type: DataTypes.STRING(80),
        allowNull: true
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
      tableName: "runs",
      timestamps: false
    }
  );

const defineInteraction = (sequelize) =>
  sequelize.define(
    "Interaction",
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
      tableName: "interactions",
      timestamps: false
    }
  );

const defineSmysnkRun = (sequelize) =>
  sequelize.define(
    "SmysnkRun",
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
      tableName: "smysnk_runs",
      timestamps: false
    }
  );

const parseJson = (value, fallback) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeRow = (row) => {
  const answers = parseJson(row.answers, []);
  const explanations = parseJson(row.explanations, []);
  const responses = parseJson(row.responses, []);
  const functionScores = parseJson(row.functionScores, null);

  return {
    ...row,
    answers: Array.isArray(answers) ? answers : [],
    explanations: Array.isArray(explanations) ? explanations : [],
    responses: Array.isArray(responses) ? responses : [],
    functionScores: functionScores && typeof functionScores === "object" ? functionScores : null
  };
};

const chunkRows = (rows, size) => {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
};

const importData = async () => {
  const RunSqlite = defineRun(sqlite);
  const RunPostgres = defineRun(postgres);

  await sqlite.authenticate();
  await postgres.authenticate();
  await RunPostgres.sync();

  const queryInterface = sqlite.getQueryInterface();
  const tables = (await queryInterface.showAllTables()).map((name) => name.toString().toLowerCase());
  let normalized = [];

  if (tables.includes("runs")) {
    const rows = await RunSqlite.findAll({ raw: true });
    normalized = rows.map(normalizeRow);
  } else {
    const InteractionSqlite = defineInteraction(sqlite);
    const SmysnkRunSqlite = defineSmysnkRun(sqlite);
    if (tables.includes("interactions")) {
      const rows = await InteractionSqlite.findAll({ raw: true });
      normalized.push(
        ...rows.map((row) => ({
          indicator: "sakinorva",
          runMode: row.runMode || "ai",
          character: row.character,
          context: row.context,
          answers: parseJson(row.answers, []),
          explanations: parseJson(row.explanations, []),
          functionScores: parseJson(row.functionScores, null),
          grantType: row.grantType,
          secondType: row.secondType,
          thirdType: row.thirdType,
          axisType: row.axisType,
          myersType: row.myersType,
          slug: row.slug,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }))
      );
    }
    if (tables.includes("smysnk_runs")) {
      const rows = await SmysnkRunSqlite.findAll({ raw: true });
      normalized.push(
        ...rows.map((row) => ({
          indicator: "smysnk",
          runMode: row.runMode,
          subject: row.subject,
          context: row.context,
          responses: parseJson(row.responses, []),
          functionScores: parseJson(row.scores, null),
          slug: row.slug,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }))
      );
    }
  }

  if (normalized.length === 0) {
    console.log("No rows found in sqlite database.");
    return;
  }

  const batches = chunkRows(normalized, Number.isFinite(batchSize) ? batchSize : 200);
  let imported = 0;

  for (const batch of batches) {
    await RunPostgres.bulkCreate(batch);
    imported += batch.length;
    console.log(`Imported ${imported}/${normalized.length} runs.`);
  }

  console.log("Import complete.");
};

const main = async () => {
  try {
    await importData();
  } finally {
    await Promise.allSettled([sqlite.close(), postgres.close()]);
  }
};

main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
