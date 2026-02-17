import express from "express";
import {
  registerUser,
  login,
  logout,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  verifyEmail,
  sendOTP,
  getAllUsers,
  updateUser,
  getUserById,
  deleteUser,
  searchUsers,
} from "../controllers/user.controller.js";
import upload from "../middlewares/multer.js";
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  deleteAccountValidation,
  verifyEmailValidation,
  sendOTPValidation,
} from "../validations/user.validation.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// OTP & Verification (Prioritized for reliability)
router.post("/send-registration-otp", validate(sendOTPValidation), sendOTP);
router.post("/verify-registration-otp", validate(verifyEmailValidation), verifyEmail);

// Public Routes (Website & Application)
router.post(
  "/register",
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  validate(registerValidation),
  registerUser,
);

router.post("/login", validate(loginValidation), login);
router.post(
  "/forgot-password",
  validate(forgotPasswordValidation),
  forgotPassword,
);
router.post(
  "/reset-password",
  validate(resetPasswordValidation),
  resetPassword,
);

// Authenticated User Routes (Website & Application)
router.post("/logout", verifyJWT, logout);
router.get("/profile", verifyJWT, getUserProfile);
router.put(
  "/update-profile",
  verifyJWT,
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  validate(updateProfileValidation),
  updateProfile,
);
router.post(
  "/change-password",
  verifyJWT,
  validate(changePasswordValidation),
  changePassword,
);
router.delete(
  "/delete-account",
  verifyJWT,
  validate(deleteAccountValidation),
  deleteAccount,
);

// Admin Only Routes (Admin Panel)
router.get("/all-users", verifyJWT, isAdmin, getAllUsers);
router.get("/search", verifyJWT, isAdmin, searchUsers);
router.get("/:id", verifyJWT, isAdmin, getUserById);
router.put(
  "/update/:id",
  verifyJWT,
  isAdmin,
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  validate(updateProfileValidation),
  updateUser,
);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteUser);

export default router;
