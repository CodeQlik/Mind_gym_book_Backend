import express from 'express';
import { registerUser, login, logout, getUserProfile, updateProfile, changePassword, forgotPassword, resetPassword } from '../controllers/user.controller.js';
import upload from '../middlewares/multer.js';
import { registerValidation, loginValidation, updateProfileValidation, changePasswordValidation, forgotPasswordValidation, resetPasswordValidation } from '../validations/user.validation.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', upload.fields([
    { name: 'profile_image', maxCount: 1 }
]), registerValidation, registerUser);


router.post('/login', loginValidation, login);
router.post('/logout', verifyJWT, logout);
router.get('/profile', verifyJWT, getUserProfile);
router.put('/update-profile', verifyJWT, upload.fields([
    { name: 'profile_image', maxCount: 1 }
]), updateProfileValidation, updateProfile);

router.post('/change-password', verifyJWT, changePasswordValidation, changePassword);

router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);


export default router;



