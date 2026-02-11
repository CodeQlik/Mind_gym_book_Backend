import express from "express";
import {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addToCartValidation,
  updateQuantityValidation,
} from "../validations/cart.validation.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

// All cart routes require authentication
router.use(verifyJWT);

router.post("/add", upload.none(), addToCartValidation, addToCart);
router.get("/", getCart);
router.put(
  "/update/:id",
  upload.none(),
  updateQuantityValidation,
  updateQuantity,
);
router.delete("/remove/:id", removeFromCart);
router.delete("/clear", clearCart);

export default router;
