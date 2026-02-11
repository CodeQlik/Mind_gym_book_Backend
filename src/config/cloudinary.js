import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folderName = "") => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      console.error("Upload Error: File not found at path:", localFilePath);
      return null;
    }

    const isPdf = localFilePath.toLowerCase().endsWith(".pdf");

    const uploadFolder =
      folderName || (isPdf ? "mindgymbook/pdfs" : "mindgymbook/images");

    console.log(
      `Uploading to Cloudinary: ${localFilePath} -> Folder: ${uploadFolder}`,
    );

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: uploadFolder,
      use_filename: true,
      unique_filename: true,
      access_mode: "public",
    });

    // Clean up local file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error detail:", error);
    // Ensure cleanup on failure
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
