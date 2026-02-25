import express from "express";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  createOrder,
  verifyPayment,
  createBookOrder,
  getAllPayments,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/create-subscription-order", createOrder); // Subscription
router.post("/create-book-order", createBookOrder); // Direct book purchase
router.post("/verify-payment", verifyPayment);

// Admin Routes
router.get("/admin/all", isAdmin, getAllPayments);

export default router;
