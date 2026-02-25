import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  syncProgress,
  getProgress,
  getMyLibrary,
  addHighlight,
  getHighlights,
  deleteHighlight,
} from "../controllers/readingSync.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/progress/:bookId", syncProgress);
router.get("/progress/:bookId", getProgress);
router.get("/my-library", getMyLibrary);

router.post("/highlights/:bookId", addHighlight);
router.get("/highlights/:bookId", getHighlights);
router.delete("/highlights/:id", deleteHighlight);

export default router;
