import path from "path";
import { Sequelize } from "sequelize";

const storagePath = process.env.SQLITE_STORAGE ?? path.join(process.cwd(), "data.sqlite");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: storagePath,
  logging: false
});

let initialization: Promise<void> | null = null;

export const initializeDatabase = async () => {
  if (!initialization) {
    initialization = sequelize.sync();
  }
  await initialization;
};

export default sequelize;
