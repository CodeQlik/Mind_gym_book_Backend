import bcrypt from "bcryptjs";
import { User } from "../models/index.js";

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "ashokvarma9636@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

    console.log(`[SEEDER]: Checking for admin with email: ${adminEmail}`);
    const existingAdmin = await User.findOne({
      where: {
        email: adminEmail,
        user_type: "admin",
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
    console.log(`[SEEDER]: New admin created successfully: ${adminEmail}`);
  } catch (error) {
    console.error(`[SEEDER ERROR]: ${error.message}`);
  }
};

export default seedAdmin;
