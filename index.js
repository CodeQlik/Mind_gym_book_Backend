import "dotenv/config";
import sequelize, { connectDB } from "./src/config/db.js";
import { app } from "./src/app.js";
import "./src/models/index.js";
import seedAdmin from "./src/seeders/admin.seeder.js";
import initCronJobs from "./src/utils/cronJobs.js";

import { createServer } from "http";
import { initSocket } from "./src/utils/socket.js";
import { connectRedis } from "./src/config/redis.js";

const PORT = process.env.PORT || 5000;
const server = createServer(app);

const startServer = async () => {
  try {
    // 1. Ensure DB exists and authenticate
    await connectDB();

    // 2. Connect Redis
    await connectRedis();

    // 2. Sync models (Create tables if not exist)
    await sequelize.sync();

    // 3. Seed admin user
    await seedAdmin();

    // 4. Start Cron Jobs
    initCronJobs();

    // 5. Initialize Socket.IO
    initSocket(server);

    // 6. Start listening
    server.listen(PORT, () => {});
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
