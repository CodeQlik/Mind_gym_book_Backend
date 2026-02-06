import express from 'express';
import { registerAdmin } from '../controllers/userController.js';
import upload from '../middleware/multer.js';

const router = express.Router();

router.post('/admin/register', upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'kyc_document_front', maxCount: 1 },
    { name: 'kyc_document_back', maxCount: 1 }
]), registerAdmin);

export default router;
