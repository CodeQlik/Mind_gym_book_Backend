import express from "express";
import {
  saveNote,
  getUserNotes,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

// Note Routes
router.post("/saveNote", saveNote);
router.get("/getAllNotes", getUserNotes);
router.put("/updateNote/:id", updateNote);
router.delete("/deleteNote/:id", deleteNote);

export default router;
