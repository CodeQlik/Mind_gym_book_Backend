import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);

  // Create a dummy file
  const testFile = path.resolve("test-image.txt");
  fs.writeFileSync(testFile, "this is a test file for cloudinary");

  try {
    console.log("Attempting test upload...");
    const response = await cloudinary.uploader.upload(testFile, {
      resource_type: "raw",
      folder: "test-folder",
    });
    console.log("Upload Success!");
    console.log("URL:", response.secure_url);
  } catch (error) {
    console.error("Upload Failed!");
    console.error(error);
  } finally {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
}

testUpload();
