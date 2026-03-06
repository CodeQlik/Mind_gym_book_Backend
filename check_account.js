import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  secure: true,
});

async function checkAccount() {
  try {
    const result = await cloudinary.api.usage();
    console.log("Account Details:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("API Error:", error.message);
  }
}

checkAccount();
