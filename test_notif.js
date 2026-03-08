import "dotenv/config";
import notificationService from "./src/services/notification.service.js";
import sequelize from "./src/config/db.js";
import { User } from "./src/models/index.js";

const testNotification = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database Connected.");

    // 1. अपना ईमेल यहाँ डालें जिसे टेस्ट करना है
    const testEmail = "ak228308@gmail.com";

    const user = await User.findOne({ where: { email: testEmail } });
    if (!user) {
      console.error(
        "❌ User not found! Please use an email that exists in your database.",
      );
      return;
    }

    console.log(`🚀 Sending ORDER notification to: ${user.email}`);

    // 2. ORDER टाइप की नोटिफिकेशन भेजें (यह Email + Push दोनों ट्रिगर करेगा)
    await notificationService.sendToUser(
      user.id,
      "ORDER_PLACED",
      "Order Confirmed! 📦",
      "Hi {user_name}, your order for 'The Psychology of Money' has been placed successfully. Thank you for shopping with Mind Gym Book!",
    );

    console.log("✅ Test completed! Check your Email/Inbox.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

testNotification();
