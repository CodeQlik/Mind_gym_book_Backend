import settingService from "../services/setting.service.js";
import sendResponse from "../utils/responseHandler.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingService.getSettings();
    return sendResponse(res, 200, true, "Settings fetched successfully", settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Handle Logo Upload
    if (req.files && req.files.logo) {
      const logoResult = await uploadOnCloudinary(req.files.logo[0].path, "settings/logo");
      updateData.logo = {
        url: logoResult.secure_url,
        public_id: logoResult.public_id,
      };
    }

    // Handle Favicon Upload
    if (req.files && req.files.favicon) {
      const faviconResult = await uploadOnCloudinary(req.files.favicon[0].path, "settings/favicon");
      updateData.favicon = {
        url: faviconResult.secure_url,
        public_id: faviconResult.public_id,
      };
    }

    const settings = await settingService.updateSettings(updateData);
    return sendResponse(res, 200, true, "Settings updated successfully", settings);
  } catch (error) {
    next(error);
  }
};
