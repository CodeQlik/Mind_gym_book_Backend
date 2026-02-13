import express from "express";
import {
  upsertAnnotation,
  getMyAnnotations,
  deleteAnnotation,
} from "../controllers/annotation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/save", upsertAnnotation);
router.get("/book/:bookId", getMyAnnotations);
router.delete("/:id", deleteAnnotation);

export default router;
