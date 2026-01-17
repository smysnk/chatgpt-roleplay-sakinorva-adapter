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
  const functionScores = parseJson(row.functionScores, null);

  return {
    ...row,
    answers: Array.isArray(answers) ? answers : [],
    explanations: Array.isArray(explanations) ? explanations : [],
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
  const InteractionSqlite = defineInteraction(sqlite);
  const InteractionPostgres = defineInteraction(postgres);

  await sqlite.authenticate();
  await postgres.authenticate();
  await InteractionPostgres.sync();

  const rows = await InteractionSqlite.findAll({ raw: true });
  const normalized = rows.map(normalizeRow);

  if (normalized.length === 0) {
    console.log("No rows found in sqlite database.");
    return;
  }

  const batches = chunkRows(normalized, Number.isFinite(batchSize) ? batchSize : 200);
  let imported = 0;

  for (const batch of batches) {
    await InteractionPostgres.bulkCreate(batch);
    imported += batch.length;
    console.log(`Imported ${imported}/${normalized.length} interactions.`);
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
