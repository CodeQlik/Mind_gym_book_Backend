import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../controllers/wishlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/add", upload.none(), addToWishlist);
router.get("/", getWishlist);
router.delete("/remove/:id", removeFromWishlist);
router.post("/toggle", upload.none(), toggleWishlist);

export default router;
