import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath || !fs.existsSync(localFilePath)) {
            throw new Error("File not found at the specified path");
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "mindgymbook/images",
            access_mode: "public"  
        });

        console.log("file uploaded successfully", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log(error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

const deleteFromCloudinary = async (public_id) => {
    try {
        await cloudinary.uploader.destroy(public_id);
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };
