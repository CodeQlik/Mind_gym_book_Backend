import express from 'express';
import { registerUser, login, logout } from '../controllers/user.controller.js';
import upload from '../middlewares/multer.js';
import { registerValidation, loginValidation } from '../validations/user.validation.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', upload.fields([
    { name: 'profile_image', maxCount: 1 }
]), registerValidation, registerUser);


router.post('/login', loginValidation, login);
router.post('/logout', verifyJWT, logout);



export default router;
