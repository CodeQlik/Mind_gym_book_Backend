import express from "express";
import {
  getPageBySlug,
  getAllPagesAdmin,
  createOrUpdatePage,
  deletePage,
} from "../controllers/cms.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Public Routes
router.get("/page/:slug", getPageBySlug);

// Admin Routes
router.get("/admin/all", verifyJWT, isAdmin, getAllPagesAdmin);
router.post("/admin/save", verifyJWT, isAdmin, createOrUpdatePage);
router.delete("/admin/:id", verifyJWT, isAdmin, deletePage);

export default router;
