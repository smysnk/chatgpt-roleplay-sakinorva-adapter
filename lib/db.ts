import path from "path";
import { Sequelize } from "sequelize";

const storagePath = process.env.SQLITE_STORAGE ?? path.join(process.cwd(), "data.sqlite");

let sequelize: Sequelize | null = null;

let initialization: Promise<void> | null = null;

export const getSequelize = () => {
  if (!sequelize) {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: storagePath,
      logging: false
    });
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
