import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  registerSeller,
  getSellerProfile,
  createListing,
  getActiveListings,
  getPendingSellers,
  approveSeller,
  approveListing,
  releaseEscrow,
} from "../controllers/marketplace.controller.js";

const router = express.Router();

// User/Seller Routes
router.post("/register", verifyJWT, registerSeller);
router.get("/profile", verifyJWT, getSellerProfile);
router.post("/listing/:sellerId", verifyJWT, createListing);
router.get("/listings", getActiveListings); // Public

// Admin Routes
router.get("/admin/pending-sellers", verifyJWT, isAdmin, getPendingSellers);
router.patch("/admin/approve-seller/:id", verifyJWT, isAdmin, approveSeller);
router.patch("/admin/approve-listing/:id", verifyJWT, isAdmin, approveListing);
router.post(
  "/admin/release-escrow/:orderId",
  verifyJWT,
  isAdmin,
  releaseEscrow,
);

export default router;
