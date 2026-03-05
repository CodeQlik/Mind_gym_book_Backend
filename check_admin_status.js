import "dotenv/config";
import { User } from "./src/models/index.js";
import sequelize from "./src/config/db.js";

const checkAdmin = async () => {
  try {
    const adminEmail = "ashokvarma9636@gmail.com";
    const admin = await User.findOne({
      where: { email: adminEmail, user_type: "admin" },
    });
    if (admin) {
      console.log("SUCCESS: Admin found in database:", admin.email);
    } else {
      console.log(
        "NOT FOUND: Admin with email ashokvarma9636@gmail.com not found.",
      );
    }
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await sequelize.close();
  }
};

checkAdmin();
