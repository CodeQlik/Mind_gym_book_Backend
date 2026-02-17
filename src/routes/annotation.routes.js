import express from "express";
import {
  saveNote,
  getUserNotes,
  updateNote,
  deleteNote,
} from "../controllers/annotation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

// Note Routes
router.post("/", saveNote);
router.get("/all", getUserNotes);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;
