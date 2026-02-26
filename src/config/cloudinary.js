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
      return null;
    }

    const isPdf = localFilePath.toLowerCase().endsWith(".pdf");

    const uploadFolder =
      folderName || (isPdf ? "mindgymbook/pdfs" : "mindgymbook/images");

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: isPdf ? "image" : "image",
      type: isPdf ? "authenticated" : "upload",
      folder: uploadFolder,
      use_filename: true,
      unique_filename: true,
      pages: isPdf ? true : false,
      image_metadata: isPdf ? true : false,
      // 🚀 PROFESSIONAL FIX: Cloudinary will pre-generate the 5-page preview
      eager: isPdf ? [{ page: "1-5", format: "pdf" }] : [],
      eager_async: false, // Wait for it so we can use it immediately
    });

    // Delete local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // Delete local file even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    // Extract meaningful error message
    const errorMsg =
      error.message ||
      (error.error && error.error.message) ||
      JSON.stringify(error);

    fs.appendFileSync(
      "cloudinary_error.log",
      `${new Date().toISOString()} - ${errorMsg}\n`,
    );
    return null;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
    return true;
  } catch (error) {
    return false;
  }
};

export { cloudinary, uploadOnCloudinary, deleteFromCloudinary };
