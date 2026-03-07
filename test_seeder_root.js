import "dotenv/config";
import { User } from "./src/models/index.js";
import sequelize from "./src/config/db.js";
import seedAdmin from "./src/seeders/admin.seeder.js";

const runTestSeq = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB Authenticated");
    await seedAdmin();
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

runTestSeq();
