import express from "express";
import {
  createOrder,
  verifyPayment,
  createBookOrder,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/create-order", createOrder); // Subscription
router.post("/create-book-order", createBookOrder); // Direct book purchase
router.post("/verify-payment", verifyPayment);

export default router;
