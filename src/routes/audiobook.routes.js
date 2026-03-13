import { Router } from "express";
import audiobookController from "../controllers/audiobook.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import upload from "../middlewares/multer.js";

const router = Router();

// Public routes (if any)
router.get("/all", audiobookController.getAllAudiobooks);
router.get("/:id", audiobookController.getAudiobookById);

// Admin only routes
router.use(verifyJWT, isAdmin);

router.post(
  "/add",
  upload.fields([
    { name: "audio_file", maxCount: 1 },
    { name: "audio_files", maxCount: 50 }
  ]),
  audiobookController.createAudiobook
);

router.put(
  "/update/:id",
  upload.fields([{ name: "audio_file", maxCount: 1 }]),
  audiobookController.updateAudiobook
);
router.put("/toggle-status/:id", audiobookController.toggleAudiobookStatus);
router.delete("/delete/:id", audiobookController.deleteAudiobook);

export default router;
