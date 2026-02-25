import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  secure: true,
});

const publicId =
  "mindgymbook/books/pdfs/pdf_file-1771755384697-20009563_io90ac";

const url = cloudinary.url(publicId, {
  resource_type: "raw", // ✅ FIXED
  type: "authenticated", // keep if uploaded as authenticated
  sign_url: true,
  secure: true,
  format: "pdf",
});

console.log("TEST_URL:", url);
