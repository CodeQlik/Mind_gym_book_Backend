import "dotenv/config";
import sequelize, { connectDB } from "./src/config/db.js";
import { app } from "./src/app.js";
import "./src/models/index.js";
import seedAdmin from "./src/seeders/admin.seeder.js";
import initCronJobs from "./src/utils/cronJobs.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Ensure DB exists and authenticate
    await connectDB();

    // 2. Sync models (Create/Alter tables)
    // await sequelize.sync({ alter: true });
    await sequelize.sync();

    // 3. Seed admin user
    await seedAdmin();

    // 4. Start Cron Jobs
    initCronJobs();

    // 5. Start listening
    app.listen(PORT, () => {});
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
