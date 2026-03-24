import express from "express";
import { getSettings, updateSettings } from "../controllers/setting.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// Public route to get site settings (for frontend footer/header)
router.get("/", getSettings);

// Admin only route to update settings
router.post(
  "/update",
  verifyJWT,
  isAdmin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "admin_signature", maxCount: 1 },
  ]),
  updateSettings
);

export default router;
