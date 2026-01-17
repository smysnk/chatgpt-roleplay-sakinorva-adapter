import path from "path";
import { Sequelize } from "sequelize";

const storagePath = process.env.SQLITE_STORAGE ?? path.join(process.cwd(), "data.sqlite");
const dbDialect = (process.env.DB_DIALECT ?? "postgres").toLowerCase();

let sequelize: Sequelize | null = null;

let initialization: Promise<void> | null = null;

export const getSequelize = () => {
  if (!sequelize) {
    if (dbDialect === "sqlite") {
      sequelize = new Sequelize({
        dialect: "sqlite",
        storage: storagePath,
        logging: false
      });
    } else {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("DATABASE_URL is required when using the postgres database connector.");
      }
      sequelize = new Sequelize(databaseUrl, {
        dialect: "postgres",
        logging: false
      });
    }
  }
  return sequelize;
};

export const initializeDatabase = async () => {
  if (!initialization) {
    initialization = getSequelize()
      .sync()
      .then(async () => {
        const { runRunUpgrades } = await import("@/lib/runUpgrade");
        await runRunUpgrades();
      });
  }
  await initialization;
};

export default getSequelize;
