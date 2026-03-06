import express from "express";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  createSubscriptionOrder,
  createPhysicalBookPayment,
  verifyPayment,
  getAllPayments,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

// APP: Subscription
// Step 1: Create Razorpay order for subscription
router.post("/create-subscription-order", createSubscriptionOrder);

// WEBSITE: Physical Book
// Step 2: After cart checkout creates DB order → create Razorpay payment order
router.post("/create-physical-payment", createPhysicalBookPayment);

//  SHARED: Verify (handles both subscription + physical)
router.post("/verify", verifyPayment);

// ADMIN
router.get("/admin/all", isAdmin, getAllPayments);

export default router;
