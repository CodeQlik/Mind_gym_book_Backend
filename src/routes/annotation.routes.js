import express from "express";
import {
  saveAnnotation,
  getBookAnnotations,
  updateAnnotation,
  deleteAnnotation,
} from "../controllers/annotation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

// Annotation Routes
router.post("/", verifyJWT, saveAnnotation);
router.get("/:id", verifyJWT, getBookAnnotations);
router.patch("/:id", verifyJWT, updateAnnotation);
router.delete("/:id", verifyJWT, deleteAnnotation);

export default router;
