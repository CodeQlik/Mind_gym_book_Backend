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
  getAllUsers,
  updateUser,
  getUserById,
  deleteUser,
  searchUsers,
  refreshAccessToken,
  sendRegistrationOTP,
  verifyRegistrationOTP,
  googleLogin,
  updateTTSPreferences,
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
  adminUpdateUserValidation,
} from "../validations/user.validation.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// Public Routes (Website & Application)
router.post(
  "/register",
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  validate(registerValidation),
  registerUser,
);

router.post("/login", validate(loginValidation), login);
router.post("/google-login", googleLogin);
router.post("/refresh-token", refreshAccessToken);
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
// Registration OTP Flow (Pre-registration email verification)
router.post(
  "/send-registration-otp",
  validate(sendOTPValidation),
  sendRegistrationOTP,
);
router.post(
  "/verify-registration-otp",
  validate(verifyEmailValidation),
  verifyRegistrationOTP,
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
router.patch("/update-tts-preferences", verifyJWT, updateTTSPreferences);

// Admin Only Routes (Admin Panel)
router.get("/all-users", verifyJWT, isAdmin, getAllUsers);
router.get("/search", verifyJWT, isAdmin, searchUsers);
router.get("/:id", verifyJWT, isAdmin, getUserById);
router.put(
  "/update/:id",
  verifyJWT,
  isAdmin,
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  validate(adminUpdateUserValidation),
  updateUser,
);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteUser);

export default router;
