import bcrypt from "bcryptjs";
import { User } from "../models/index.js";

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@mindgym.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

    const existingAdmin = await User.findOne({
      where: {
        email: adminEmail,
      },
    });

    if (existingAdmin) {
      console.log(`[SEEDER]: Admin already exists. Skipping.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const newAdmin = await User.create({
      name: "System Admin",
      email: adminEmail,
      password: hashedPassword,
      user_type: "admin",
      phone: "9636366250",
      is_active: true,
      kyc_status: "approved",
      profile: {
        url: "",
        public_id: "",
        initials: "SA",
      },
    });
  } catch (error) {
    if (
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      console.error(
        `[SEEDER ERROR]: Validation error - ${error.errors.map((e) => e.message).join(", ")}`,
      );
    } else {
      console.error(`[SEEDER ERROR]: ${error.message}`);
    }
  }
};

export default seedAdmin;
