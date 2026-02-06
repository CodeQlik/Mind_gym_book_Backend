import express from 'express';
const router = express.Router();
import { addAddress, getAddresses } from '../controllers/addressController.js';

router.post('/', addAddress);
router.get('/', getAddresses);

export default router;
