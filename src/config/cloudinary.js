import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "mindgymbook";
    let resource_type = "auto";
    let public_id = `${file.fieldname}_${Date.now()}`;

    if (file.fieldname === "pdf_file") {
      folder = "mindgymbook/books/pdf";
      resource_type = "raw";
      // To match user's previous request: no extension in public_id for PDFs
      public_id = `pdf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    } else if (file.fieldname === "thumbnail") {
      folder = "mindgymbook/books/thumbnails";
    } else if (file.fieldname === "cover_image") {
      folder = "mindgymbook/books/covers";
    } else if (file.fieldname === "images") {
      folder = "mindgymbook/books/gallery";
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: public_id,
    };
  },
});

export const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return false;

    // First try as image (default)
    let res = await cloudinary.uploader.destroy(public_id);

    // If not found or not deleted, try as raw (PDFs/EPUBs)
    if (res.result !== "ok") {
      res = await cloudinary.uploader.destroy(public_id, {
        resource_type: "raw",
      });
    }

    // If still not deleted, try as video (Audio/Video frequently use this)
    if (res.result !== "ok") {
      res = await cloudinary.uploader.destroy(public_id, {
        resource_type: "video",
      });
    }

    return res.result === "ok";
  } catch (error) {
    console.error("Cloudinary Delete Error:", error.message);
    return false;
  }
};

export const uploadOnCloudinary = async (localFilePath, folderName = "") => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) return null;

    const extension = localFilePath.toLowerCase().split(".").pop();
    const isRaw = ["pdf", "epub"].includes(extension);
    const isAudio = ["mp3", "wav", "m4a", "ogg", "aac"].includes(extension);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: isRaw ? "raw" : isAudio ? "video" : "auto",
      type: isRaw ? "authenticated" : "upload", // Secure raw files
      folder: folderName || "mindgymbook",
    });

    // Cleanup: Remove local file after upload success
    try {
      fs.unlinkSync(localFilePath);
    } catch (e) {
      console.warn("Failed to delete temp file:", localFilePath);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    // Cleanup: Remove local file on failure too
    try {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (e) {}
    return null;
  }
};

export { cloudinary, storage };
