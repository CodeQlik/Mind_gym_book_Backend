import { Router } from "express";
import {
  getAllBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public routes
router.get("/", getAllBlogs);
router.get("/:slug", getBlogBySlug);

// Admin routes
router.post("/", verifyJWT, isAdmin, upload.single("image"), createBlog);
router.put("/:id", verifyJWT, isAdmin, upload.single("image"), updateBlog);
router.delete("/:id", verifyJWT, isAdmin, deleteBlog);

export default router;
