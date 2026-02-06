import express from 'express';
import { addAddress, getMyAddresses, getAddressById, updateAddress, deleteAddress } from '../controllers/address.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { addressValidation } from '../validations/address.validation.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/add', addressValidation, addAddress);
router.get('/my-addresses', getMyAddresses);
router.get('/:id', getAddressById);
router.put('/update/:id', addressValidation, updateAddress);
router.delete('/delete/:id', deleteAddress);



export default router;
